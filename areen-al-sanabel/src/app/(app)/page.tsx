"use client";

import Link from "next/link";
import useSWR from "swr";

import {
  IconApproved,
  IconCairn,
  IconForward,
  IconFootlocker,
  IconLantern,
  IconLens,
  IconRejected,
  IconReturn,
  IconWhistle,
} from "@/components/icons";
import { useSessionUser } from "@/components/session";
import { StatusBadge, TypeBadge } from "@/components/status";
import {
  Card,
  CardHeader,
  ErrorBlock,
  LoadingBlock,
  Meter,
  PageHeader,
  Stat,
} from "@/components/ui";
import { errorMessage } from "@/lib/client";
import { can, ROLE_LABELS } from "@/lib/domain";
import { formatNumber, formatRelative } from "@/lib/format";
import type { DashboardDto } from "@/lib/types";

const STATS = [
  { key: "PENDING", label: "قيد الانتظار", icon: IconCairn, tone: "warm" as const },
  { key: "UNDER_REVIEW", label: "قيد المراجعة", icon: IconLens, tone: "neutral" as const },
  { key: "APPROVED", label: "مقبولة", icon: IconApproved, tone: "good" as const },
  { key: "REJECTED", label: "مرفوضة", icon: IconRejected, tone: "bad" as const },
];

export default function DashboardPage() {
  const user = useSessionUser();
  const { data, error, isLoading } = useSWR<DashboardDto>("/api/dashboard", {
    refreshInterval: 30_000,
  });

  const canDecide = can(user.role, "requests:decide");
  const seesAll = can(user.role, "requests:read:all");

  const totalRequests = data
    ? Object.values(data.statusCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  const inventory = data?.inventory;
  const healthy = inventory
    ? Math.max(0, inventory.totalItems - inventory.outOfStock - inventory.lowStock)
    : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="لوحة التحكم"
        description={`${ROLE_LABELS[user.role]}${user.teamName ? ` · ${user.teamName}` : ""}`}
      />

      {error && <ErrorBlock message={errorMessage(error)} />}
      {isLoading && !data && <LoadingBlock />}

      {data && (
        <>
          {canDecide && data.actionableCount > 0 && (
            <Link
              href="/requests?status=PENDING"
              className="rise flex items-center gap-3 rounded-xl border border-ember-200 bg-ember-50 p-4 transition-colors hover:border-ember-400"
            >
              <IconWhistle className="size-5 shrink-0 text-ember-400" />
              <span className="flex-1 font-bold text-ember-300">
                {formatNumber(data.actionableCount)} طلب بانتظار قرارك
              </span>
              <IconForward className="size-5 shrink-0 text-ember-400" />
            </Link>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <Stat
                  key={stat.key}
                  icon={<Icon className="size-4" />}
                  label={stat.label}
                  value={formatNumber(data.statusCounts[stat.key] ?? 0)}
                  tone={stat.tone}
                />
              );
            })}
          </div>

          {/* العهدة المعلّقة — العتاد الذي خرج ولم يرجع بعد */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat
              icon={<IconReturn className="size-4" />}
              label="عهدة لم ترجع"
              value={formatNumber(data.custody.outstandingUnits)}
              suffix="وحدة"
              hint={
                data.custody.requestCount > 0
                  ? `في ${formatNumber(data.custody.requestCount)} طلب`
                  : undefined
              }
              tone={data.custody.outstandingUnits > 0 ? "warm" : "good"}
            />
            <Stat
              icon={<IconLantern className="size-4" />}
              label="محتجز بالفحص"
              value={formatNumber(data.custody.quarantineUnits)}
              suffix="وحدة"
              tone={data.custody.quarantineUnits > 0 ? "warm" : "neutral"}
            />
            {data.custody.oldest && (
              <Stat
                icon={<IconCairn className="size-4" />}
                label="أقدم عهدة مفتوحة"
                value={formatRelative(data.custody.oldest)}
              />
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-base font-bold text-ink-900">تدفّق الطلبات</h2>
              <div className="space-y-3.5">
                <Meter
                  label="مفتوحة"
                  value={data.openCount}
                  max={totalRequests}
                  suffix="طلب"
                  tone="warm"
                />
                <Meter
                  label="مقبولة"
                  value={data.statusCounts.APPROVED ?? 0}
                  max={totalRequests}
                  suffix="طلب"
                  tone="good"
                />
              </div>
            </Card>

            {inventory && (
              <Card className="p-5">
                <h2 className="mb-4 text-base font-bold text-ink-900">جاهزية المخزون</h2>
                <div className="space-y-3.5">
                  <Meter
                    label="كمية كافية"
                    value={healthy}
                    max={inventory.totalItems}
                    suffix="صنف"
                    tone="good"
                  />
                  <Meter
                    label="كمية منخفضة"
                    value={inventory.lowStock}
                    max={inventory.totalItems}
                    suffix="صنف"
                    tone="warm"
                  />
                  <Meter
                    label="نفد"
                    value={inventory.outOfStock}
                    max={inventory.totalItems}
                    suffix="صنف"
                    tone="bad"
                  />
                </div>
              </Card>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="overflow-hidden lg:col-span-2">
              <CardHeader
                title={seesAll ? "أحدث الطلبات" : "أحدث طلباتي"}
                action={
                  <Link
                    href={seesAll ? "/requests" : "/my-requests"}
                    className="text-sm font-bold text-ember-300 hover:underline"
                  >
                    الكل
                  </Link>
                }
              />

              {data.recentRequests.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-ink-400">لا توجد طلبات.</p>
              ) : (
                <ul className="divide-y divide-sand-200">
                  {data.recentRequests.map((request) => (
                    <li key={request.id}>
                      <Link
                        href={`/requests/${request.id}`}
                        className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-sand-200 sm:px-5"
                      >
                        <span className="tabular grid size-9 shrink-0 place-items-center rounded-lg bg-sand-200 text-sm font-bold text-ink-600">
                          {request.id}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink-800">
                            {request.purpose || `${request.teamName}`}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-400">
                            {request.teamName} · {request._count.lines} صنف ·{" "}
                            {formatRelative(request.createdAt)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <TypeBadge type={request.type} />
                          <StatusBadge status={request.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-4">
              {inventory && inventory.alerts.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader
                    title="تنبيهات المخزون"
                    icon={<IconFootlocker className="size-5" />}
                    subtitle={`${formatNumber(inventory.outOfStock)} نفد · ${formatNumber(inventory.lowStock)} منخفض`}
                  />
                  <ul className="divide-y divide-sand-200">
                    {inventory.alerts.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <span className="min-w-0 truncate text-sm font-semibold text-ink-800">
                          {item.name}
                        </span>
                        <span
                          className={`tabular shrink-0 text-sm font-bold ${
                            item.level === "OUT" ? "text-crimson-600" : "text-ember-300"
                          }`}
                        >
                          {formatNumber(item.quantity)} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {data.recentActivity.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader
                    title="آخر النشاطات"
                    action={
                      <Link
                        href="/activity"
                        className="text-sm font-bold text-ember-300 hover:underline"
                      >
                        السجل
                      </Link>
                    }
                  />
                  <ul className="divide-y divide-sand-200">
                    {data.recentActivity.map((entry) => (
                      <li key={entry.id} className="px-4 py-2.5">
                        <p className="text-sm leading-relaxed text-ink-600">
                          <span className="font-bold text-ink-800">{entry.actorName}</span>{" "}
                          {entry.summary}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {formatRelative(entry.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
