import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { ClearFilters, FilterSelect, SearchBox } from "@/components/filters";
import { LedgerIcon } from "@/components/icons";
import { Pagination } from "@/components/pagination";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requirePage } from "@/lib/guard";
import {
  STOCK_REASONS,
  STOCK_REASON_LABEL,
  type StockReason,
} from "@/lib/domain";
import { formatDateTime, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reconcile } from "@/lib/stock";

export const metadata: Metadata = { title: "دفتر الحركة" };

const PAGE_SIZE = 30;

const REASON_TONE: Record<StockReason, "ok" | "warn" | "bad" | "info" | "muted"> = {
  OPENING: "muted",
  ADJUST: "info",
  ISSUE: "warn",
  RETURN_GOOD: "ok",
  RETURN_DAMAGED: "warn",
  RETURN_LOST: "bad",
  PURCHASE_RECEIVE: "ok",
};

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; reason?: string; page?: string }>;
}) {
  await requirePage("activity:read:all");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.StockMovementWhereInput = {};
  if (sp.q) {
    where.OR = [
      { item: { name: { contains: sp.q, mode: "insensitive" } } },
      { note: { contains: sp.q, mode: "insensitive" } },
      { actorName: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.reason && STOCK_REASONS.includes(sp.reason as StockReason)) {
    where.reason = sp.reason;
  }

  const [total, movements, checks] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: { item: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    reconcile(prisma),
  ]);

  const drifted = checks.filter((check) => check.drift);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="دفتر حركة المخزون"
        description="كل تغيّر في رصيد أي صنف، بسببه ومنفّذه ووقته والرصيد الناتج عنه."
      />

      {/* إثبات المطابقة: مجموع الحركات = الرصيد المخزّن، لكل صنف */}
      <Card className="mb-5">
        <CardHeader
          title="مطابقة الأرصدة"
          description={`${num(checks.length)} صنفاً خضعت للمقارنة بين رصيدها المخزّن ومجموع حركاتها`}
        />
        <div className="px-5 py-4">
          {drifted.length === 0 ? (
            <Alert tone="ok">
              كل الأرصدة مطابقة لدفتر الحركة. لا يوجد انحراف.
            </Alert>
          ) : (
            <>
              <Alert tone="bad" title="يوجد انحراف" className="mb-3">
                {num(drifted.length)} صنفاً رصيده المخزّن لا يساوي مجموع حركاته.
                يُعرض الانحراف ولا يُصحَّح تلقائياً — التصحيح الصامت يخفي سببه.
              </Alert>
              <Table>
                <thead>
                  <tr>
                    <Th>الصنف</Th>
                    <Th className="text-center">المخزّن</Th>
                    <Th className="text-center">المحسوب</Th>
                  </tr>
                </thead>
                <tbody>
                  {drifted.map((check) => (
                    <tr key={check.id}>
                      <Td className="font-semibold text-ink-900">{check.name}</Td>
                      <Td className="text-center tabular-nums">{num(check.stored)}</Td>
                      <Td className="text-center tabular-nums text-danger-500">
                        {num(check.computed)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="ابحث بالصنف أو المنفّذ…" />
        <FilterSelect
          paramName="reason"
          label="سبب الحركة"
          allLabel="كل الأسباب"
          options={STOCK_REASONS.map((reason) => ({
            value: reason,
            label: STOCK_REASON_LABEL[reason],
          }))}
        />
        <ClearFilters keys={["q", "reason"]} />
      </div>

      <Card>
        {movements.length === 0 ? (
          <EmptyState
            icon={<LedgerIcon />}
            title="لا توجد حركات مطابقة"
            description="عدّل المرشّحات لعرض حركات أخرى."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>التاريخ</Th>
                  <Th>الصنف</Th>
                  <Th>السبب</Th>
                  <Th className="text-center">الأثر</Th>
                  <Th className="text-center">الرصيد بعدها</Th>
                  <Th>المنفّذ</Th>
                  <Th>ملاحظة</Th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const reason = movement.reason as StockReason;
                  const effect =
                    movement.delta !== 0
                      ? movement.delta
                      : movement.damagedDelta !== 0
                        ? movement.damagedDelta
                        : movement.lostDelta;
                  const affectsAvailable = movement.delta !== 0;

                  return (
                    <tr key={movement.id} className="hover:bg-surface-2">
                      <Td className="text-xs whitespace-nowrap text-ink-400">
                        {formatDateTime(movement.createdAt)}
                      </Td>
                      <Td className="font-semibold text-ink-900">
                        {movement.item.name}
                      </Td>
                      <Td>
                        <Badge tone={REASON_TONE[reason]}>
                          {STOCK_REASON_LABEL[reason] ?? reason}
                        </Badge>
                      </Td>
                      <Td className="text-center">
                        <span
                          className={
                            !affectsAvailable
                              ? "tabular-nums text-ink-400"
                              : movement.delta > 0
                                ? "font-bold tabular-nums text-ok-500"
                                : "font-bold tabular-nums text-danger-500"
                          }
                        >
                          {affectsAvailable
                            ? `${movement.delta > 0 ? "+" : "−"}${num(Math.abs(effect))}`
                            : `${num(Math.abs(effect))} خارج المتاح`}
                        </span>
                      </Td>
                      <Td className="text-center tabular-nums text-ink-700">
                        {num(movement.balanceAfter)}
                      </Td>
                      <Td className="text-xs text-ink-500">
                        {movement.actorName}
                        {movement.teamName ? (
                          <span className="block text-ink-400">{movement.teamName}</span>
                        ) : null}
                      </Td>
                      <Td className="max-w-56 text-xs text-ink-400">
                        {movement.note ?? "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              basePath="/ledger"
              params={{ q: sp.q, reason: sp.reason }}
            />
          </>
        )}
      </Card>
    </>
  );
}
