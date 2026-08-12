"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Eye,
  ListChecks,
  PackageSearch,
  ScrollText,
  ShoppingBasket,
  ShoppingCart,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

import { CompassMechanism } from "@/components/kinetic/mechanism";
import { EdgeStat, FiberProgress, HoloPanel, RopeFrame } from "@/components/kinetic/parts";
import { useSessionUser } from "@/components/session";
import { StatusBadge, TypeBadge } from "@/components/status";
import { ErrorBlock, LoadingBlock } from "@/components/ui";
import { errorMessage } from "@/lib/client";
import { can, GROUP_NAME, ROLE_LABELS } from "@/lib/domain";
import { formatNumber, formatRelative } from "@/lib/format";
import type { DashboardDto } from "@/lib/types";

const STATS = [
  { key: "PENDING", label: "قيد الانتظار", icon: CircleDashed, tone: "warm" as const },
  { key: "UNDER_REVIEW", label: "قيد المراجعة", icon: Eye, tone: "cool" as const },
  { key: "APPROVED", label: "مقبولة", icon: CheckCircle2, tone: "cool" as const },
  { key: "REJECTED", label: "مرفوضة", icon: XCircle, tone: "hot" as const },
];

export default function DashboardPage() {
  const user = useSessionUser();
  const { data, error, isLoading } = useSWR<DashboardDto>("/api/dashboard", {
    refreshInterval: 30_000,
  });

  const canCreate = can(user.role, "requests:create");
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
    <div className="space-y-6">
      {/* الترويسة: آلية البوصلة داخل إطار حبل مجدول */}
      <RopeFrame>
        <div className="relative bg-[rgba(6,14,16,0.82)] p-5 backdrop-blur-md sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -end-10 size-64 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(86,224,200,0.16), transparent 72%)",
            }}
          />
          <div className="relative flex flex-wrap items-center gap-5">
            <CompassMechanism size={104} className="drop-shadow-[0_0_18px_rgba(201,154,63,0.45)]" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold tracking-wide text-[#7fe6d0]">
                {ROLE_LABELS[user.role]}
                {user.teamName ? ` · ${user.teamName}` : ""}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-[#f0f8f6] sm:text-3xl">
                أهلًا بك، {user.fullName}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#a8c2bd]">
                {canDecide
                  ? `مركز قيادة مخزون مقر ${GROUP_NAME} والبتّ في طلبات الفرق.`
                  : canCreate
                    ? "تصفّح عتاد المقر، جهّز سلة العهدة، وتابع حالة طلباتك."
                    : `اطّلاع كامل على مخزون ${GROUP_NAME} وطلبات جميع الفرق.`}
              </p>

              {canCreate && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <QuickLink href="/inventory" icon={<PackageSearch className="size-4" />}>
                    تصفّح المخزون
                  </QuickLink>
                  <QuickLink href="/cart" icon={<ShoppingBasket className="size-4" />}>
                    سلة العهدة
                  </QuickLink>
                  <QuickLink href="/purchase" icon={<ShoppingCart className="size-4" />}>
                    طلب شراء
                  </QuickLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </RopeFrame>

      {error && <ErrorBlock message={errorMessage(error)} />}
      {isLoading && !data && <LoadingBlock />}

      {data && (
        <>
          {canDecide && data.actionableCount > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                href="/requests?status=PENDING"
                className="led-edge flex items-center gap-3 rounded-2xl bg-[rgba(42,20,8,0.85)] p-4 backdrop-blur-md transition-colors hover:bg-[rgba(58,28,10,0.9)]"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ffb347] text-[#2a1408]">
                  <TriangleAlert className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-bold text-[#ffd98a]">
                    {formatNumber(data.actionableCount)} طلب بانتظار إجراء منك
                  </span>
                  <span className="block text-sm text-[#c8a97c]">
                    راجع الطلبات المفتوحة واتّخذ القرار المناسب
                  </span>
                </span>
                <ArrowLeft className="size-5 shrink-0 text-[#ffb347]" />
              </Link>
            </motion.div>
          )}

          {/* شارات الحالة المضاءة */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STATS.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.35 }}
                >
                  <EdgeStat
                    icon={<Icon className="size-5" />}
                    value={data.statusCounts[stat.key] ?? 0}
                    label={stat.label}
                    tone={stat.tone}
                    delay={index * 0.4}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* أشرطة الألياف الضوئية — مقاييس حقيقية من قاعدة البيانات */}
          <div className="grid gap-4 lg:grid-cols-2">
            <HoloPanel className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#f0f8f6]">
                <ListChecks className="size-5 text-[#7fe6d0]" />
                تدفّق الطلبات
              </h2>
              <div className="space-y-4">
                <FiberProgress
                  label="طلبات مفتوحة"
                  value={data.openCount}
                  max={Math.max(totalRequests, 1)}
                  suffix="طلب"
                  hint={
                    seesAll ? "من جميع الفرق" : `من إجمالي طلبات ${user.teamName ?? "فرقتك"}`
                  }
                  tone="warm"
                />
                <FiberProgress
                  label="طلبات مقبولة"
                  value={data.statusCounts.APPROVED ?? 0}
                  max={Math.max(totalRequests, 1)}
                  suffix="طلب"
                  tone="cool"
                />
              </div>
            </HoloPanel>

            {inventory && (
              <HoloPanel className="p-5">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#f0f8f6]">
                  <PackageSearch className="size-5 text-[#7fe6d0]" />
                  جاهزية المخزون
                </h2>
                <div className="space-y-4">
                  <FiberProgress
                    label="أصناف بكمية كافية"
                    value={healthy}
                    max={Math.max(inventory.totalItems, 1)}
                    suffix="صنف"
                    tone="cool"
                  />
                  <FiberProgress
                    label="كمية منخفضة"
                    value={inventory.lowStock}
                    max={Math.max(inventory.totalItems, 1)}
                    suffix="صنف"
                    tone="warm"
                  />
                  <FiberProgress
                    label="نفد المخزون"
                    value={inventory.outOfStock}
                    max={Math.max(inventory.totalItems, 1)}
                    suffix="صنف"
                    tone="hot"
                  />
                </div>
              </HoloPanel>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* أحدث الطلبات */}
            <HoloPanel className="overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between gap-3 border-b border-[color:var(--panel-line)] p-4 sm:p-5">
                <div>
                  <h2 className="text-base font-bold text-[#f0f8f6]">
                    {seesAll ? "أحدث الطلبات" : "أحدث طلباتي"}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#8fa8a3]">
                    {seesAll ? "من جميع الفرق" : `طلبات ${user.teamName ?? "فرقتك"}`}
                  </p>
                </div>
                <Link
                  href={seesAll ? "/requests" : "/my-requests"}
                  className="text-sm font-bold text-[#7fe6d0] hover:underline"
                >
                  عرض الكل
                </Link>
              </div>

              {data.recentRequests.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-[#8fa8a3]">
                  لا توجد طلبات بعد.
                </p>
              ) : (
                <ul className="divide-y divide-[color:var(--panel-line)]">
                  {data.recentRequests.map((request) => (
                    <li key={request.id}>
                      <Link
                        href={`/requests/${request.id}`}
                        className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.04] sm:px-5"
                      >
                        <span className="tabular grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(86,224,200,0.12)] text-sm font-bold text-[#7fe6d0]">
                          #{request.id}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[#e6f4f1]">
                            {request.purpose || "طلب بدون وصف"}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#8fa8a3]">
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
            </HoloPanel>

            <div className="space-y-4">
              {inventory && (
                <HoloPanel className="overflow-hidden">
                  <div className="border-b border-[color:var(--panel-line)] p-4">
                    <h2 className="flex items-center gap-2 text-base font-bold text-[#f0f8f6]">
                      <TriangleAlert className="size-5 text-[#ffb347]" />
                      تنبيهات المخزون
                    </h2>
                    <p className="mt-0.5 text-xs text-[#8fa8a3]">
                      {formatNumber(inventory.outOfStock)} نفد ·{" "}
                      {formatNumber(inventory.lowStock)} منخفض
                    </p>
                  </div>

                  {inventory.alerts.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-[#8fa8a3]">
                      المخزون بحالة جيدة.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[color:var(--panel-line)]">
                      {inventory.alerts.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#e6f4f1]">
                              {item.name}
                            </span>
                            <span className="block text-xs text-[#8fa8a3]">
                              الحد الأدنى {formatNumber(item.threshold)} {item.unit}
                            </span>
                          </span>
                          <span
                            className={`tabular shrink-0 rounded-lg px-2 py-1 text-sm font-bold ${
                              item.level === "OUT"
                                ? "bg-[rgba(226,59,46,0.16)] text-[#ff9a8f]"
                                : "bg-[rgba(255,179,71,0.16)] text-[#ffc978]"
                            }`}
                          >
                            {formatNumber(item.quantity)} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </HoloPanel>
              )}

              {data.recentActivity.length > 0 && (
                <HoloPanel className="overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-[color:var(--panel-line)] p-4">
                    <h2 className="flex items-center gap-2 text-base font-bold text-[#f0f8f6]">
                      <ScrollText className="size-5 text-[#7fe6d0]" />
                      آخر النشاطات
                    </h2>
                    <Link
                      href="/activity"
                      className="text-sm font-bold text-[#7fe6d0] hover:underline"
                    >
                      السجل
                    </Link>
                  </div>
                  <ul className="divide-y divide-[color:var(--panel-line)]">
                    {data.recentActivity.map((entry) => (
                      <li key={entry.id} className="px-4 py-3">
                        <p className="text-sm leading-relaxed text-[#e6f4f1]">
                          <span className="font-bold">{entry.actorName}</span> {entry.summary}
                        </p>
                        <p className="mt-0.5 text-xs text-[#8fa8a3]">
                          {formatRelative(entry.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </HoloPanel>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="trail-btn led-edge inline-flex items-center gap-2 rounded-xl bg-[rgba(86,224,200,0.1)] px-3.5 py-2 text-sm font-bold text-[#b6ffe9] transition-colors hover:bg-[rgba(86,224,200,0.18)]"
    >
      <span className="relative">{icon}</span>
      <span className="relative">{children}</span>
    </Link>
  );
}
