import Link from "next/link";

import {
  AlertIcon,
  BoxIcon,
  CartIcon,
  ClipboardIcon,
  HistoryIcon,
  ReturnIcon,
  TruckIcon,
} from "@/components/icons";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requirePageUser } from "@/lib/guard";
import {
  PURCHASE_STATUS_LABEL,
  PURCHASE_STATUS_TONE,
  SUPPLY_STATUS_LABEL,
  SUPPLY_STATUS_TONE,
  can,
  outstanding,
  type PurchaseStatus,
  type SupplyStatus,
} from "@/lib/domain";
import { formatShortDate, num, relativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { teamFilter } from "@/lib/scope";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const scope = teamFilter(user);
  const isTeam = user.role === "TEAM_LEADER";

  // العهد القائمة تُحسب من الأسطر مباشرة: المخزّن هو ما صُرف وما رجع،
  // والمتبقّي يُشتقّ منهما فلا يمكن أن يتناقض رقمان معروضان.
  const [
    itemCount,
    lowStock,
    openLines,
    pendingPurchases,
    awaitingReturns,
    recentSupply,
    recentPurchase,
    recentActivity,
  ] = await Promise.all([
    prisma.item.count({ where: { isActive: true } }),
    prisma.item.findMany({
      where: { isActive: true, threshold: { gt: 0 } },
      orderBy: { quantity: "asc" },
      take: 40,
      include: { category: true },
    }),
    prisma.supplyLine.findMany({
      where: {
        request: { status: { in: ["ISSUED", "AWAITING_VERIFICATION"] }, ...scope },
      },
      include: { request: { include: { team: true } } },
    }),
    prisma.purchaseRequest.count({
      where: can(user.role, "purchase:decide")
        ? { status: "PENDING" }
        : { status: "PENDING", ...scope },
    }),
    prisma.returnBatch.count({
      where: {
        status: "AWAITING_VERIFICATION",
        supplyRequest: isTeam ? scope : {},
      },
    }),
    prisma.supplyRequest.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { team: true, lines: true },
    }),
    prisma.purchaseRequest.findMany({
      where: can(user.role, "purchase:read:decided")
        ? { status: { in: ["APPROVED", "FULFILLED"] } }
        : scope,
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { team: true },
    }),
    prisma.activityLog.findMany({
      where: can(user.role, "activity:read:all")
        ? {}
        : { teamName: user.teamName ?? "—" },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
  ]);

  const belowThreshold = lowStock.filter((i) => i.quantity <= i.threshold);
  const custodyUnits = openLines.reduce((sum, line) => sum + outstanding(line), 0);
  const custodyRequests = new Set(
    openLines.filter((l) => outstanding(l) > 0).map((l) => l.requestId),
  ).size;

  return (
    <>
      <header className="mb-7">
        <p className="eyebrow mb-1.5">
          {isTeam ? user.teamName : user.roleLabel}
        </p>
        <h1 className="display text-[26px] leading-tight text-ink-900 sm:text-[30px]">
          أهلاً {user.fullName}
        </h1>
        <div className="mt-2.5 h-px w-12 bg-brass-500/70" aria-hidden />
      </header>

      {/* ما ينتظر إجراءً من هذا المستخدم يظهر أولاً وبوضوح */}
      {can(user.role, "purchase:decide") && pendingPurchases > 0 ? (
        <Alert tone="warn" className="mb-5">
          <span className="font-semibold">
            {num(pendingPurchases)} طلب شراء بانتظار قرارك.
          </span>{" "}
          <Link href="/purchase?status=PENDING" className="underline underline-offset-4">
            مراجعتها الآن
          </Link>
        </Alert>
      ) : null}

      {can(user.role, "returns:verify") && awaitingReturns > 0 ? (
        <Alert tone="warn" className="mb-5">
          <span className="font-semibold">
            {num(awaitingReturns)} دفعة إرجاع بانتظار تحقّقك.
          </span>{" "}
          <Link href="/returns" className="underline underline-offset-4">
            التحقّق منها
          </Link>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="أصناف المخزون"
          value={num(itemCount)}
          hint="الأصناف الفعّالة في المقر"
          tone="info"
          icon={<BoxIcon className="size-4" />}
          href="/inventory"
        />
        <StatCard
          label="عهد قائمة"
          value={num(custodyUnits)}
          hint={
            custodyRequests > 0
              ? `موزّعة على ${num(custodyRequests)} طلب`
              : "لا توجد عهد مفتوحة"
          }
          tone={custodyUnits > 0 ? "warn" : "muted"}
          icon={<ReturnIcon className="size-4" />}
          href="/returns"
        />
        <StatCard
          label={isTeam ? "طلبات شراء معلّقة" : "طلبات شراء بانتظار القرار"}
          value={num(pendingPurchases)}
          hint={isTeam ? "من فرقتك" : "على مستوى المجموعة"}
          tone={pendingPurchases > 0 ? "warn" : "muted"}
          icon={<TruckIcon className="size-4" />}
          href="/purchase"
        />
        {can(user.role, "inventory:manage") ? (
          <StatCard
            label="أصناف تحت حد التنبيه"
            value={num(belowThreshold.length)}
            hint="تحتاج توريداً"
            tone={belowThreshold.length > 0 ? "bad" : "ok"}
            icon={<AlertIcon className="size-4" />}
            href="/inventory?filter=low"
          />
        ) : (
          <StatCard
            label="دفعات بانتظار التحقق"
            value={num(awaitingReturns)}
            hint="إرجاعات لم تُعتمد بعد"
            tone={awaitingReturns > 0 ? "warn" : "muted"}
            icon={<ReturnIcon className="size-4" />}
            href="/returns"
          />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={isTeam ? "طلبات فرقتك الأخيرة" : "أحدث طلبات اللوازم"}
            action={
              <LinkButton href="/supply" variant="ghost" size="sm">
                الكل
              </LinkButton>
            }
          />
          {recentSupply.length === 0 ? (
            <EmptyState
              icon={<ClipboardIcon />}
              title="لا توجد طلبات لوازم بعد"
              description={
                isTeam
                  ? "ابدأ بطلب الأصناف المتاحة في المقر."
                  : "لم تقدّم أي فرقة طلباً حتى الآن."
              }
              action={
                can(user.role, "supply:create") ? (
                  <LinkButton href="/supply/new" size="sm">
                    <CartIcon className="size-4" />
                    طلب لوازم
                  </LinkButton>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>الرقم</Th>
                  {!isTeam ? <Th>الفرقة</Th> : null}
                  <Th>الأصناف</Th>
                  <Th>الحالة</Th>
                  <Th>التاريخ</Th>
                </tr>
              </thead>
              <tbody>
                {recentSupply.map((request) => (
                  <tr key={request.id} className="hover:bg-surface-2">
                    <Td>
                      <Link
                        href={`/supply/${request.id}`}
                        className="font-semibold text-forest-700 hover:underline"
                      >
                        {request.code}
                      </Link>
                    </Td>
                    {!isTeam ? <Td>{request.team.name}</Td> : null}
                    <Td className="tabular-nums">{num(request.lines.length)}</Td>
                    <Td>
                      <Badge tone={SUPPLY_STATUS_TONE[request.status as SupplyStatus]}>
                        {SUPPLY_STATUS_LABEL[request.status as SupplyStatus]}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-ink-400">
                      {formatShortDate(request.createdAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title={
              can(user.role, "purchase:read:decided")
                ? "المشتريات المعتمدة"
                : "أحدث طلبات الشراء"
            }
            action={
              <LinkButton href="/purchase" variant="ghost" size="sm">
                الكل
              </LinkButton>
            }
          />
          {recentPurchase.length === 0 ? (
            <EmptyState
              icon={<TruckIcon />}
              title="لا توجد طلبات شراء"
              description="طلبات الشراء تُقدَّم للأصناف غير المتوفّرة في المقر."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>الرقم</Th>
                  <Th>الصنف</Th>
                  {!isTeam ? <Th>الفرقة</Th> : null}
                  <Th>الحالة</Th>
                </tr>
              </thead>
              <tbody>
                {recentPurchase.map((request) => (
                  <tr key={request.id} className="hover:bg-surface-2">
                    <Td>
                      <Link
                        href={`/purchase/${request.id}`}
                        className="font-semibold text-forest-700 hover:underline"
                      >
                        {request.code}
                      </Link>
                    </Td>
                    <Td className="max-w-40 truncate">{request.itemName}</Td>
                    {!isTeam ? <Td>{request.team.name}</Td> : null}
                    <Td>
                      <Badge
                        tone={PURCHASE_STATUS_TONE[request.status as PurchaseStatus]}
                      >
                        {PURCHASE_STATUS_LABEL[request.status as PurchaseStatus]}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {can(user.role, "inventory:manage") && belowThreshold.length > 0 ? (
          <Card>
            <CardHeader
              title="أصناف تحت حد التنبيه"
              description="الرصيد بلغ الحد الأدنى أو نزل عنه"
            />
            <Table>
              <thead>
                <tr>
                  <Th>الصنف</Th>
                  <Th>التصنيف</Th>
                  <Th>المتاح</Th>
                  <Th>الحد</Th>
                </tr>
              </thead>
              <tbody>
                {belowThreshold.slice(0, 8).map((item) => (
                  <tr key={item.id} className="hover:bg-surface-2">
                    <Td className="font-semibold text-ink-900">{item.name}</Td>
                    <Td className="text-xs text-ink-400">{item.category.name}</Td>
                    <Td>
                      <Badge tone={item.quantity === 0 ? "bad" : "warn"}>
                        {num(item.quantity)} {item.unit}
                      </Badge>
                    </Td>
                    <Td className="tabular-nums text-ink-400">{num(item.threshold)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="آخر العمليات"
            action={
              <LinkButton href="/activity" variant="ghost" size="sm">
                السجل
              </LinkButton>
            }
          />
          {recentActivity.length === 0 ? (
            <EmptyState icon={<HistoryIcon />} title="لا توجد عمليات مسجّلة بعد" />
          ) : (
            <ul className="divide-y divide-line">
              {recentActivity.map((log) => (
                <li key={log.id} className="px-5 py-3">
                  <p className="text-sm text-ink-700">{log.summary}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {log.actorName} · {relativeTime(log.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
