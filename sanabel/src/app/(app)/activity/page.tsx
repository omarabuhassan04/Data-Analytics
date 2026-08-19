import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { ClearFilters, FilterSelect, SearchBox } from "@/components/filters";
import { HistoryIcon } from "@/components/icons";
import { Pagination } from "@/components/pagination";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { requirePage } from "@/lib/guard";
import { ACTION_LABEL, actionLabel, can } from "@/lib/domain";
import { formatDateTime, relativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "سجل العمليات" };

const PAGE_SIZE = 30;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const user = await requirePage("activity:read:own", "activity:read:all");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const seesAll = can(user.role, "activity:read:all");

  const where: Prisma.ActivityLogWhereInput = {};

  // قائد الفرقة يرى ما يخصّ فرقته وما فعله هو، لا شيء غير ذلك
  if (!seesAll) {
    where.OR = [
      { teamName: user.teamName ?? "—" },
      { actorId: user.id },
    ];
  }

  if (sp.q) {
    where.AND = [
      {
        OR: [
          { summary: { contains: sp.q, mode: "insensitive" } },
          { actorName: { contains: sp.q, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (sp.action && sp.action in ACTION_LABEL) where.action = sp.action;

  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) where.createdAt.gte = new Date(sp.from);
    if (sp.to) {
      // نهاية اليوم المختار، وإلا استُبعد كل ما جرى فيه
      const end = new Date(sp.to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow="التدقيق"
        title="سجل العمليات"
        description={
          seesAll
            ? "كل ما جرى في النظام: من فعله، ومتى، وعلى أي سجل."
            : "عمليات فرقتك وما نفّذته أنت."
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="ابحث في السجل…" />
        <FilterSelect
          paramName="action"
          label="نوع العملية"
          allLabel="كل العمليات"
          options={Object.entries(ACTION_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <ClearFilters keys={["q", "action", "from", "to"]} />
      </div>

      <Card>
        {logs.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon />}
            title="لا توجد عمليات مطابقة"
            description="ستظهر هنا كل عملية فور تنفيذها."
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-wrap gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="muted">{actionLabel(log.action)}</Badge>
                      <span className="text-sm text-ink-900">{log.summary}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-400">
                      {log.actorName} · {log.actorRole}
                      {log.teamName ? ` · ${log.teamName}` : ""}
                    </p>
                  </div>
                  <time
                    dateTime={log.createdAt.toISOString()}
                    title={formatDateTime(log.createdAt)}
                    className="shrink-0 text-xs whitespace-nowrap text-ink-400"
                  >
                    {relativeTime(log.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              basePath="/activity"
              params={{ q: sp.q, action: sp.action, from: sp.from, to: sp.to }}
            />
          </>
        )}
      </Card>
    </>
  );
}
