# عرين السنابل — Areen Al-Sanabel

Inventory & procurement system for the Areen Al-Sanabel scouting group. The entire UI is in
Modern Standard Arabic, laid out right-to-left, and the whole permission model is enforced
server-side.

---

## Quick start

```bash
npm install
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Then open <http://localhost:3000>.

### Seeded accounts

Every seeded account uses the password `Areen@2026` (change it from **الحسابات** after first login).

| Username        | Role                             | Scope                                             |
| --------------- | -------------------------------- | ------------------------------------------------- |
| `supplies`      | قائد اللوازم (Supplies Leader)   | Full admin — inventory, accounts, all decisions    |
| `ashbal`        | مسؤول فرقة الأشبال               | Requests + own history only                       |
| `kashafa`       | مسؤول فرقة الكشافة               | Requests + own history only                       |
| `jawwala`       | مسؤول فرقة الجوالة               | Requests + own history only                       |
| `group.leader`  | قائد المجموعة                    | Read-only, everything                             |
| `deputy`        | مساعد قائد المجموعة              | Read-only, everything                             |
| `scouts.leader` | قائد الكشافين                    | Read-only + notes on **عهدة** requests only       |

The login page no longer lists these accounts. The demo panel that used to show every username and
the shared password is **hidden in all environments**, and the data behind it is built server-side —
so nothing ships to the browser unless you deliberately turn it on:

```bash
SHOW_DEMO_ACCOUNTS="true"
```

That distinction matters: the account list and password were previously hardcoded in a **client**
component, which meant they were present in the JavaScript bundle and visible in page source even
when the panel was not rendered. Hiding the UI alone would not have removed them. Verified after the
change: zero occurrences of the password or any username across all 52 built client chunks.

---

## Answers to the open questions

**1. When is stock deducted?**
On submission, not on approval. Quantities are decremented inside the same transaction that
creates the request, and restored automatically if the request is rejected or cancelled. This
keeps the "available quantity" every other team leader sees accurate while a request is pending.
Each request line stores exactly how much it deducted (`RequestLine.deducted`), so restoration is
precise and auditable even if the item's quantity was adjusted in the meantime.

**2. Can team leaders edit or cancel a pending request?**
They can **cancel** (not edit) any of their own requests while it is still `PENDING` or
`UNDER_REVIEW`; cancelling restores the reserved stock immediately. Editing was deliberately left
out — an edit would need to re-run the whole reservation diff, and cancel-and-resubmit gives the
same result with a cleaner audit trail. Only the owner can cancel, enforced server-side.

**3. Does the supplies leader get notified?**
Yes, via in-app badges. The count of open requests appears on the "جميع الطلبات" nav item and as a
banner on the dashboard, polled every 30 seconds. No email/SMS.

---

## Roles & permissions

The matrix lives in [`src/lib/domain.ts`](src/lib/domain.ts) and is the single source of truth.
Every API route calls `requirePermission(...)` before touching data — the frontend only hides
controls, it is never the security boundary.

| Permission          | قائد اللوازم | مسؤول فرقة | قائد المجموعة | المساعد | قائد الكشافين |
| ------------------- | :----------: | :--------: | :-----------: | :-----: | :-----------: |
| `inventory:read`    |      ✅      |     ✅     |      ✅       |   ✅    |      ✅       |
| `inventory:write`   |      ✅      |     —      |       —       |    —    |       —       |
| `requests:create`   |      —       |     ✅     |       —       |    —    |       —       |
| `requests:read:own` |      —       |     ✅     |       —       |    —    |       —       |
| `requests:read:all` |      ✅      |     —      |      ✅       |   ✅    |      ✅       |
| `requests:decide`   |      ✅      |     —      |       —       |    —    |       —       |
| `requests:cancel:own` |    —       |     ✅     |       —       |    —    |       —       |
| `requests:note`     |      ✅      |     —      |       —       |    —    |   عهدة only   |
| `users:manage`      |      ✅      |     —      |       —       |    —    |       —       |
| `activity:read`     |      ✅      |     —      |      ✅       |   ✅    |      ✅       |

---

## Request types

| Type         | Arabic            | When                                                | Stock effect        |
| ------------ | ----------------- | --------------------------------------------------- | ------------------- |
| `EQUIPMENT`  | طلب عهدة          | Items available in stock now                        | Deducted on submit, returned on handback |
| `ADDITIONAL` | طلب كمية إضافية   | Item exists and isn't depleted, but stock is short   | None                |
| `PURCHASE`   | طلب شراء          | Item is fully out of stock, or not in inventory      | None                |

The server enforces the distinction: an `ADDITIONAL` request for a depleted item is rejected with
a message steering the user to طلب شراء, and a `PURCHASE` request for an in-stock item is rejected
with a message steering them back to طلب عهدة.

Status lifecycle: `PENDING` → `UNDER_REVIEW` (optional) → `APPROVED` / `REJECTED`, plus
`CANCELLED` by the requester. Transitions are validated against `ALLOWED_TRANSITIONS`, so a
decided request cannot be re-decided (returns `409`).

---

## Returned-order tracking

An عهدة request lends equipment out; the tents have to come back. Stock leaves the shelf when the
request is submitted, and until the units are accounted for they are **outstanding** — physically
with the team, owned by the ledger.

### The three paths a returned unit can take

| Recorded as       | Effect on stock                        | Meaning                          |
| ----------------- | -------------------------------------- | -------------------------------- |
| `GOOD` — سليم     | back into available stock              | ready to lend again              |
| `DAMAGED` — للفحص | into **quarantine**, *not* available    | held for quality control         |
| `LOST` — مفقود    | neither balance changes                 | it left and will not return      |

Quarantined units are physically at the HQ but excluded from the available count, so a team leader
never reserves a tent that is sitting in the repair pile. Quality control then resolves each held
unit to `RELEASE` (back to available) or `WRITE_OFF` (gone).

`LOST` deliberately moves no balance: the unit was already deducted at reservation time. Its ledger
row exists to record accountability, not a quantity change — which is why `applyMovement` skips the
item update entirely for it rather than writing an empty one.

### One equation, one place

Outstanding custody is never stored. It is derived, by `lineOutstanding()` in
[`domain.ts`](src/lib/domain.ts):

```
outstanding = deducted − released − returned − quarantined − writtenOff
```

Server and browser both import that function, so a number shown on screen cannot drift from the
number the server enforces. The counters are cumulative and monotonic; a QC release moves a unit
from `quarantined` to `returned`, which leaves `outstanding` unchanged — correctly, since the unit
was already returned when it was first received.

All arithmetic is in whole units (`Int`), so rounding error is not merely unlikely, it is
unrepresentable.

### The ledger is the source of truth

Every stock change in the application goes through a single primitive — `applyMovement()` in
[`stock.ts`](src/lib/stock.ts) — which writes a `StockMovement` row carrying the signed effect on
both balances plus a post-movement snapshot. There is no `item.update` touching `quantity` or
`quarantine` anywhere else, including manual stock adjustments and item creation, which are recorded
as `ADJUST` and `OPENING` movements.

That makes reconciliation true by construction rather than by convention:

```
SUM(availableDelta)  = Item.quantity
SUM(quarantineDelta) = Item.quarantine
```

`GET /api/inventory/reconcile` checks that for every item and **reports** drift instead of silently
correcting it — a self-healing balance hides the bug that caused it. The ledger page shows the
result, and any drifted item, with its stored and computed balances side by side.

Writes are atomic: the guard is a conditional `updateMany` that only succeeds while the balance is
still sufficient, so concurrent returns cannot push a balance negative or double-restore a line.
Reads that follow a write are invalidated together by `revalidateStock()`, so the dashboard badge,
inventory counts, request detail, ledger and reconciliation all move in the same tick.

### Endpoints

| Method + path                          | Does                                        |
| -------------------------------------- | ------------------------------------------- |
| `POST /api/requests/[id]/return`       | Receive a return, line by line              |
| `GET  /api/inventory/qc`               | Units currently held for quality control    |
| `POST /api/inventory/qc/[lineId]`      | Release or write off held units             |
| `GET  /api/inventory/movements`        | The movement ledger, filterable by reason   |
| `GET  /api/inventory/reconcile`        | Balance-vs-ledger proof, with any drift     |

Receiving returns and resolving QC require the `inventory:returns` permission (قائد اللوازم).
Returns are accepted only on an `APPROVED` `EQUIPMENT` request — before handover there is nothing in
the team's hands, and a rejection or cancellation releases the reservation instead.

---

## Architecture notes

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4**
- **Prisma 6** — pinned deliberately: Prisma 7 requires driver adapters and pulls a dependency
  that wants Node ≥ 22, while this project targets Node 20.
- **Auth** — bcrypt password hashes, session as a signed JWT (HS256, `jose`) in an httpOnly
  cookie, 12-hour TTL. `getCurrentUser()` reloads the user from the database on every request, so
  deactivating an account or changing a role takes effect immediately instead of waiting for
  token expiry.
- **Edge split** — `src/lib/auth-edge.ts` holds the JWT logic used by `middleware.ts` (no Prisma,
  no bcrypt, jose imported via its granular subpaths to stay Edge-clean). `src/lib/auth.ts` is the
  Node-side module.
- **Concurrency** — stock deduction uses a conditional atomic update
  (`updateMany where quantity >= n`) rather than read-then-write, so two leaders submitting at the
  same moment can never oversell the same item, on SQLite or Postgres.
- **Audit trail** — `ActivityLog` records who did what and when, written inside the same
  transaction as the change it describes.
- **Data fetching** — SWR with focus revalidation and short polling on the screens where
  quantities and statuses actually move.

### Notable files

| Path                                                       | Purpose                                  |
| ---------------------------------------------------------- | ---------------------------------------- |
| [`src/lib/domain.ts`](src/lib/domain.ts)                   | Roles, permissions, statuses, Arabic labels |
| [`src/lib/api.ts`](src/lib/api.ts)                         | Permission guards + error → Arabic JSON  |
| [`src/lib/request-service.ts`](src/lib/request-service.ts) | Transactional stock math and transitions |
| [`src/lib/stock.ts`](src/lib/stock.ts)                     | Ledger primitive + reconciliation        |
| [`src/lib/return-service.ts`](src/lib/return-service.ts)   | Return intake and quality-control        |
| [`src/components/icons.tsx`](src/components/icons.tsx)     | The purpose-drawn scout icon set         |
| [`prisma/schema.prisma`](prisma/schema.prisma)             | Data model                               |
| [`prisma/seed.ts`](prisma/seed.ts)                         | Accounts, categories, 47 items, samples  |

---

## Switching to PostgreSQL

The schema is written to be Postgres-ready — no SQLite-specific types are used.

1. In `prisma/schema.prisma`, change the datasource provider to `postgresql`.
2. Point `DATABASE_URL` in `.env` at your Postgres instance.
3. Run `npm run db:migrate`.

One deliberate design note: `role`, `status`, and `type` are stored as `String` rather than Prisma
enums, because Prisma does not support enums on SQLite. Their allowed values are constrained in
`src/lib/domain.ts` and validated by Zod on every mutation. If you move to Postgres permanently
and want native enums, convert those three columns and swap the TypeScript unions for the
generated Prisma enums — nothing else in the codebase depends on them being strings.

---

## The login page

The login screen carries the same identity as the rest of the app rather than a separate theme: the
group badge, the name, and two fields on a single panel over the topographic grid. It is the first
screen a tired volunteer sees on a phone at the start of a camp, so it holds nothing that is not
needed to sign in.

### Deliberate decisions

- **No `autoFocus` on the first field.** Moving focus without the user asking disorients screen
  readers and hijacks the scroll position on mobile.
- **Demo accounts are server-gated.** The panel only renders when `SHOW_DEMO_ACCOUNTS=true`, and the
  list is built in the server component — a constant written in a client component ships to the
  browser and shows up in page source whether or not it is rendered.

## The interface

**One aesthetic, applied to every page.** The look is field equipment rather than campfire scenery:
flat surfaces, hairline borders, a single warm accent (brass) reserved for actions, and a faint
topographic grid behind the page. Motion is limited to element entry and the loading indicator —
there is no ambient animation.

All colour lives in `@theme` in [`globals.css`](src/app/globals.css). The `ink-*` and `sand-*` scales
keep their meaning — `ink` is text-contrast strength (900 strongest), `sand` is surface/border depth
(50 deepest) — so the whole identity can be retuned from that one block. Components carry no
hex literals; the sticky header's translucent surface is the `--surface-veil` token.

Two traps worth remembering on a dark palette:

- Scrim colours must be literal (`bg-black/70`), not palette-derived — `bg-ink-900/45` reads *light*
  when `ink-900` is a near-white.
- `bg-white` is Tailwind's built-in and does not follow the palette, so light surfaces use
  `bg-sand-100` / `bg-sand-50` explicitly.

### Icons

[`icons.tsx`](src/components/icons.tsx) is a purpose-drawn set in scout vocabulary — compass,
footlocker, knapsack, signpost, lantern, logbook, tent, cairn, rope-return — replacing the generic
icon library entirely (`lucide-react` is no longer imported anywhere in `src/`). One shared `<Icon>`
wrapper fixes the rules that make them read as a family: a 24×24 box with geometry inset to 2–22,
1.5 stroke, round caps and joins, and `currentColor` so every icon inherits its text colour. They
are `aria-hidden` by default and take a `label` only when an icon is the sole identifier.

`prefers-reduced-motion` reduces every animation and transition to nil; the layout stays complete
and readable.

## The logo

`public/logo.svg` is a vector rendition of the official group badge — the red scouting
fleur-de-lis with the white seven-pointed star, the green and black keffiyeh-style wings, golden
wheat behind, an orange rope knot below, and a Jordanian-flag ring, with
«مجموعة السنابل الكشفية / Al-Snabel Scouting Group» beneath.

Being vector, it stays crisp at every size and at the 32px favicon. To use the original raster
artwork instead:

1. Put the file in `public/` (e.g. `public/logo.png`).
2. Change `LOGO_SRC` in [`src/components/logo.tsx`](src/components/logo.tsx) to `"/logo.png"`.

That single constant drives the navbar, the mobile drawer, the login page, and the favicon — no
other edits needed. If the original has a solid background, export it with transparency so it sits
cleanly on the app's light surfaces.

---

## Environment variables

| Variable                | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`          | Prisma connection string                                         |
| `AUTH_SECRET`           | JWT signing key — **must** be replaced with a long random value in production |
| `SEED_DEFAULT_PASSWORD` | Password assigned to seeded accounts (default `Areen@2026`)      |

---

## Scripts

| Script             | Does                                             |
| ------------------ | ------------------------------------------------ |
| `npm run dev`      | Dev server                                       |
| `npm run build`    | `prisma generate` + production build             |
| `npm start`        | Serve the production build                       |
| `npm run db:migrate` | Create/apply migrations                        |
| `npm run db:seed`  | Reset and reseed demo data                       |
| `npm run db:reset` | Drop, re-migrate, reseed                         |
| `npm run db:studio` | Prisma Studio                                   |
| `npm run lint`     | ESLint                                           |
