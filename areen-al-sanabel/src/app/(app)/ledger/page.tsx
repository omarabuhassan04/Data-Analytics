"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

import { IconApproved, IconReconcile, IconWhistle } from "@/components/icons";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Select,
  Stat,
} from "@/components/ui";
import { errorMessage } from "@/lib/client";
import {
  MOVEMENT_REASON_LABELS,
  MOVEMENT_REASONS,
  type MovementReason,
} from "@/lib/domain";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { ReconciliationDto, StockMovementDto } from "@/lib/types";

/** لون القيد حسب اتجاهه — دخول أو خروج أو نقل بين رصيدين */
function toneOf(movement: StockMovementDto) {
  if (movement.availableDelta > 0) return "green" as const;
  if (movement.availableDelta < 0) return "red" as const;
  if (movement.quarantineDelta !== 0) return "blue" as const;
  return "neutral" as const;
}

function signed(value: number): string {
  if (value === 0) return "—";
  return value > 0 ? `+${formatNumber(value)}` : `−${formatNumber(Math.abs(value))}`;
}

export default function LedgerPage() {
  const [reason, setReason] = useState<MovementReason | "">("");

  const movements = useSWR<{ movements: StockMovementDto[] }>(
    `/api/inventory/movements?take=100${reason ? `&reason=${reason}` : ""}`,
  );
  const reconcile = useSWR<ReconciliationDto>("/api/inventory/reconcile", {
    refreshInterval: 60_000,
  });

  const report = reconcile.data;

  return (
    <div className="space-y-5">
      <PageHeader title="دفتر الحركة" />

      {/* ------------------------------------------------------- المطابقة */}
      {report && (
        <div
          className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${
            report.balanced
              ? "border-forest-200 bg-forest-50"
              : "border-crimson-200 bg-crimson-50"
          }`}
        >
          {report.balanced ? (
            <IconApproved className="size-5 shrink-0 text-forest-600" />
          ) : (
            <IconWhistle className="size-5 shrink-0 text-crimson-600" />
          )}
          <p className="flex-1 text-sm font-bold">
            {report.balanced ? (
              <span className="text-forest-700">
                الأرصدة مطابقة للدفتر — {formatNumber(report.itemCount)} صنف
              </span>
            ) : (
              <span className="text-crimson-700">
                {formatNumber(report.driftCount)} صنف رصيده لا يطابق دفتره
              </span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<IconReconcile className="size-4" />}
          label="متاح للصرف"
          value={formatNumber(report?.totals.storedAvailable ?? 0)}
          suffix="وحدة"
        />
        <Stat
          label="مجموع الدفتر"
          value={formatNumber(report?.totals.ledgerAvailable ?? 0)}
          suffix="وحدة"
          tone={report && !report.balanced ? "bad" : "good"}
        />
        <Stat
          label="محتجز بالفحص"
          value={formatNumber(report?.totals.storedQuarantine ?? 0)}
          suffix="وحدة"
        />
        <Stat
          label="في عهدة الفرق"
          value={formatNumber(report?.totals.outstanding ?? 0)}
          suffix="وحدة"
          tone={(report?.totals.outstanding ?? 0) > 0 ? "warm" : "neutral"}
        />
      </div>

      {/* فروق المطابقة — تظهر فقط إن وُجدت */}
      {report && !report.balanced && (
        <Card className="overflow-hidden">
          <CardHeader title="فروق تحتاج مراجعة" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50 text-xs text-ink-400">
                  <th className="px-4 py-2.5 text-start font-semibold">الغرض</th>
                  <th className="px-3 py-2.5 text-start font-semibold">الرصيد</th>
                  <th className="px-3 py-2.5 text-start font-semibold">الدفتر</th>
                  <th className="px-3 py-2.5 text-start font-semibold">الفرق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {report.drifted.map((row) => (
                  <tr key={row.itemId}>
                    <td className="px-4 py-3 font-semibold text-ink-900">{row.name}</td>
                    <td className="tabular px-3 py-3 text-ink-800">
                      {formatNumber(row.storedAvailable)}
                    </td>
                    <td className="tabular px-3 py-3 text-ink-800">
                      {formatNumber(row.ledgerAvailable)}
                    </td>
                    <td className="tabular px-3 py-3 font-bold text-crimson-600">
                      {signed(row.availableDrift)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {reconcile.error && <ErrorBlock message={errorMessage(reconcile.error)} />}

      {/* --------------------------------------------------------- القيود */}
      <Card className="overflow-hidden">
        <CardHeader
          title="القيود"
          action={
            <Select
              aria-label="تصفية حسب نوع الحركة"
              value={reason}
              onChange={(event) => setReason(event.target.value as MovementReason | "")}
              className="h-9 w-44 py-1"
            >
              <option value="">كل الأنواع</option>
              {MOVEMENT_REASONS.map((value) => (
                <option key={value} value={value}>
                  {MOVEMENT_REASON_LABELS[value]}
                </option>
              ))}
            </Select>
          }
        />

        {movements.error && (
          <div className="p-4">
            <ErrorBlock message={errorMessage(movements.error)} />
          </div>
        )}
        {movements.isLoading && !movements.data && <LoadingBlock />}

        {movements.data && movements.data.movements.length === 0 && (
          <EmptyState icon={<IconReconcile className="size-6" />} title="لا قيود" />
        )}

        {movements.data && movements.data.movements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50 text-xs text-ink-400">
                  <th className="px-4 py-2.5 text-start font-semibold">الحركة</th>
                  <th className="px-3 py-2.5 text-start font-semibold">الغرض</th>
                  <th className="px-3 py-2.5 text-start font-semibold">متاح</th>
                  <th className="px-3 py-2.5 text-start font-semibold">فحص</th>
                  <th className="px-3 py-2.5 text-start font-semibold">الرصيد بعدها</th>
                  <th className="px-3 py-2.5 text-start font-semibold">المنفّذ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {movements.data.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-4 py-3">
                      <Badge tone={toneOf(movement)}>
                        {MOVEMENT_REASON_LABELS[movement.reason as MovementReason] ??
                          movement.reason}
                      </Badge>
                      {movement.requestId && (
                        <Link
                          href={`/requests/${movement.requestId}`}
                          className="ms-2 text-xs font-bold text-ember-300 hover:underline"
                        >
                          طلب {movement.requestId}
                        </Link>
                      )}
                      {movement.note && (
                        <span className="mt-0.5 block text-xs text-ink-400">
                          {movement.note}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-ink-800">
                      {movement.item?.name ?? `#${movement.itemId}`}
                    </td>
                    <td
                      className={`tabular px-3 py-3 font-bold ${
                        movement.availableDelta > 0
                          ? "text-forest-600"
                          : movement.availableDelta < 0
                            ? "text-crimson-600"
                            : "text-ink-400"
                      }`}
                    >
                      {signed(movement.availableDelta)}
                    </td>
                    <td
                      className={`tabular px-3 py-3 font-bold ${
                        movement.quarantineDelta !== 0 ? "text-sky-700" : "text-ink-400"
                      }`}
                    >
                      {signed(movement.quarantineDelta)}
                    </td>
                    <td className="tabular px-3 py-3 text-ink-600">
                      {formatNumber(movement.availableAfter)}
                      {movement.quarantineAfter > 0 && (
                        <span className="text-ink-400">
                          {" "}
                          / {formatNumber(movement.quarantineAfter)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-400">
                      <span className="block font-semibold text-ink-500">
                        {movement.actorName}
                      </span>
                      {formatDateTime(movement.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
