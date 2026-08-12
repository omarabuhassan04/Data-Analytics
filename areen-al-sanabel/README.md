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
| `EQUIPMENT`  | طلب عهدة          | Items available in stock now                        | Deducted on submit  |
| `ADDITIONAL` | طلب كمية إضافية   | Item exists and isn't depleted, but stock is short   | None                |
| `PURCHASE`   | طلب شراء          | Item is fully out of stock, or not in inventory      | None                |

The server enforces the distinction: an `ADDITIONAL` request for a depleted item is rejected with
a message steering the user to طلب شراء, and a `PURCHASE` request for an in-stock item is rejected
with a message steering them back to طلب عهدة.

Status lifecycle: `PENDING` → `UNDER_REVIEW` (optional) → `APPROVED` / `REJECTED`, plus
`CANCELLED` by the requester. Transitions are validated against `ALLOWED_TRANSITIONS`, so a
decided request cannot be re-decided (returns `409`).

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

## The login page — "campfire login experience"

The login screen is deliberately styled apart from the rest of the app: a dark pine-forest camp at
night that lights up when the user strikes a piece of char-wood into the fire. The card is a
weathered wood panel hung from carabiners, bound in rope with tied knots at the corners, topped by
an embroidered header band with a glowing brass compass, with an engraved camp map faint in the
grain, leather-pouch input fields, and a brass woggle crest on the "ابدأ رحلتك" button. Everything
past that door — the daily working screens — stays on the light, fast, scannable theme.

The whole scene is drawn in code — **no image assets**:

| File | Holds |
| --- | --- |
| [`campfire-scene.tsx`](src/components/campfire-scene.tsx) | Sky, stars, pine ridges, fire, embers, smoke, spark burst, the striking hand |
| [`scout-ornaments.tsx`](src/components/scout-ornaments.tsx) | Compass, rope knots, carabiners, merit badges, woggle crest, camp map |
| [`ignition.tsx`](src/components/ignition.tsx) | The lit/unlit state shared by scene and card |

Wood grain, canvas weave, leather and fabric come from SVG `feTurbulence` filters; flames are
animated SVG paths; stars, embers, smoke and sparks are CSS-animated.

### Deliberate decisions

- **Ignition never gates login.** The form is fully usable from first paint. Any click or keypress
  lights the fire, and it auto-lights after 2.6s if the user does nothing — a login screen that
  required a gesture would lock out keyboard and screen-reader users.
- **No `autoFocus` on the first field.** Autofocus fires `:focus-within` instantly, which
  straightens the card and means the 3/4 perspective would never actually be seen. It also moves
  focus without the user asking.
- **The 3/4 tilt straightens on hover or focus**, and is dropped entirely under 640px or
  `prefers-reduced-motion` — a permanently skewed form is harder to read and type into.
- **The three merit badges do real work or none at all.** In development they fill a demo account
  for each permission tier (team leader / supplies leader / read-only), announced properly via
  `aria-label`. In production they render as plain decoration, because a login page does not need
  extra buttons and a button that does nothing is worse than no button.
- **Fixed-seed PRNG, never `Math.random()`**, for star/ember/spark positions — the component also
  renders on the server, and unseeded randomness causes hydration mismatches. Trig results are
  rounded to 3 decimals for the same reason (`Math.sin`/`cos` differ in the last float digit
  between Node and the browser).
- **`prefers-reduced-motion`** removes embers, smoke, sparks and the hand, and starts the fire
  already lit and steady.
- **Every text element passes WCAG AA** on the dark panel — lowest is the header subtitle at
  6.3:1, the button label sits at 10.8:1.

## The kinetic dashboard, and the design-preview page

Two separate things, deliberately:

**`/` — the real dashboard**, restyled with the kinetic scout aesthetic: a rotating compass-and-gear
mechanism in a braided rope frame with metal clasps, LED-edged navigation with motion trails,
edge-lit holographic stat panels, fiber-optic progress straps, and a living forest backdrop with a
deer and an owl crossing the tree line through a field of drifting sparks and falling leaves.
**Every number on it comes from the database** — request status counts, open-request flow, stock
readiness, low-stock alerts, recent requests, activity log. Nothing is invented.

**`/concept` — a design preview** that realizes the visual concept literally: a walking scout
character ringed by an orbiting badge nebula with drifting knot and compass models, badge and
adventure progress, and an interactive camp map on a parchment scroll that unfurls, with pulsing
pins, flowing light trails, and working zoom and rotate. It carries a permanent banner saying the
content is sample data, and it is not linked from the app navigation.

They are separate on purpose: the concept's sections (badges, adventures, a scout avatar, a camp
map) have no counterpart in an inventory system, and putting invented progress bars in front of a
team leader checking whether there are enough tents would be worse than useless.

### Scope of the kinetic skin

The scout theme is applied to **every page** — dashboard, inventory, cart, purchase, requests,
request detail, inventory management, accounts, and activity all share the same dark surfaces,
forest backdrop and LED-edged navigation.

It is implemented as a **palette inversion rather than per-page rewrites**. The `ink-*` and `sand-*`
scales keep their meaning — `ink` is text-contrast strength (900 strongest), `sand` is
surface/border depth (50 deepest) — and only their values flipped in `@theme`. That kept roughly 250
existing utility classes working untouched and means the whole theme can be reverted from one block
in [`globals.css`](src/app/globals.css).

Two traps that came out of the flip and are worth remembering if you touch it:

- Overlays written as `bg-ink-900/45` became **light** once `ink-900` inverted. Scrim colours must
  be literal (`bg-black/65`), not palette-derived.
- `bg-white` is Tailwind's built-in and does not invert, so every light surface had to move to
  `bg-sand-100` / `bg-sand-50` explicitly.

Contrast was re-audited programmatically after the flip — every text node on every page walked, its
effective background resolved up the tree, and its ratio checked against WCAG AA (3:1 for large
text). **Zero failures** across `/inventory`, `/requests`, `/requests/[id]`, `/manage/items`
(including an open modal), `/manage/users`, `/purchase`, `/cart` and `/activity`.

| File | Holds |
| --- | --- |
| [`kinetic/forest-backdrop.tsx`](src/components/kinetic/forest-backdrop.tsx) | Three depth layers, wildlife, leaves, light motes |
| [`kinetic/mechanism.tsx`](src/components/kinetic/mechanism.tsx) | Interlocking gears and the rotating compass |
| [`kinetic/parts.tsx`](src/components/kinetic/parts.tsx) | Fiber progress, holo panels, edge stats, clasps, rope frame |
| [`concept/journey.tsx`](src/components/concept/journey.tsx) | Scout character, badge nebula, floating models |
| [`concept/camp-map.tsx`](src/components/concept/camp-map.tsx) | Parchment map, pins, trails, zoom/rotate |

Gear teeth, compass ticks and orbit positions are all generated from trigonometry **rounded to 3
decimals**, and particle placement uses a **fixed-seed PRNG** — both because these components render
on the server too, and raw `Math.sin`/`Math.random` produce hydration mismatches.

`prefers-reduced-motion` stops every gear, orbit, walk cycle, rope tension and map trail, and removes
wildlife, leaves, motes and pin halos — the layout stays complete and readable, just still. All text
on both surfaces was contrast-checked against WCAG AA (dashboard lowest 9.8:1, concept lowest 7.1:1).

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
