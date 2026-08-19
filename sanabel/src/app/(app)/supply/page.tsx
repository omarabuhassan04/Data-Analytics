import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { ClearFilters, FilterSelect, SearchBox } from "@/components/filters";
import { ClipboardIcon } from "@/components/icons";
import { Pagination } from "@/components/pagination";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requirePage } from "@/lib/guard";
import {
  SUPPLY_STATUSES,
  SUPPLY_STATUS_LABEL,
  SUPPLY_STATUS_TONE,
  can,
  outstanding,
  type SupplyStatus,
} from "@/lib/domain";
import { formatShortDate, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { teamFilter } from "@/lib/scope";

export const metadata: Metadata = { title: "طلبات اللوازم" };

const PAGE_SIZE = 20;

export default async function SupplyListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    team?: string;
    page?: string;
  }>;
}) {
  const user = await requirePage("supply:read:own", "supply:read:all");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const isTeam = user.role === "TEAM_LEADER";

  const where: Prisma.SupplyRequestWhereInput = { ...teamFilter(user) };
  if (sp.q) {
    where.OR = [
      { code: { contains: sp.q, mode: "insensitive" } },
      { purpose: { contains: sp.q, mode: "insensitive" } },
      { lines: { some: { itemName: { contains: sp.q, mode: "insensitive" } } } },
    ];
  }
  if (sp.status && SUPPLY_STATUSES.includes(sp.status as SupplyStatus)) {
    where.status = sp.status;
  }
  // مرشّح الفرقة متاح للأدوار التي ترى كل الفرق فقط؛ teamFilter يتجاوزه لغيرها
  if (sp.team && !isTeam) where.teamId = Number(sp.team);

  const [total, requests, teams] = await Promise.all([
    prisma.supplyRequest.count({ where }),
    prisma.supplyRequest.findMany({
      where,
      include: { team: true, lines: true, requester: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    isTeam ? [] : prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow="السجلّات"
        title="طلبات اللوازم"
        description={
          isTeam
            ? "طلبات فرقتك والعهد المترتّبة عليها."
            : "كل طلبات اللوازم المقدّمة من الفرق."
        }
        action={
          can(user.role, "supply:create") ? (
            <LinkButton href="/supply/new">طلب جديد</LinkButton>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="ابحث برقم الطلب أو الصنف…" />
        <FilterSelect
          paramName="status"
          label="الحالة"
          allLabel="كل الحالات"
          options={SUPPLY_STATUSES.map((status) => ({
            value: status,
            label: SUPPLY_STATUS_LABEL[status],
          }))}
        />
        {!isTeam ? (
          <FilterSelect
            paramName="team"
            label="الفرقة"
            allLabel="كل الفرق"
            options={teams.map((team) => ({
              value: String(team.id),
              label: team.name,
            }))}
          />
        ) : null}
        <ClearFilters keys={["q", "status", "team"]} />
      </div>

      <Card>
        {requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardIcon />}
            title="لا توجد طلبات مطابقة"
            description="عدّل المرشّحات أو قدّم طلباً جديداً."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>الرقم</Th>
                  {!isTeam ? <Th>الفرقة</Th> : null}
                  <Th>الغرض</Th>
                  <Th className="text-center">الأصناف</Th>
                  <Th className="text-center">في العهدة</Th>
                  <Th>الحالة</Th>
                  <Th>التاريخ</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const remaining = request.lines.reduce(
                    (sum, line) => sum + outstanding(line),
                    0,
                  );
                  return (
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
                      <Td className="max-w-52 truncate text-ink-500">
                        {request.purpose ?? "—"}
                      </Td>
                      <Td className="text-center tabular-nums">
                        {num(request.lines.length)}
                      </Td>
                      <Td className="text-center">
                        {remaining > 0 ? (
                          <Badge tone="warn">{num(remaining)}</Badge>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                      </Td>
                      <Td>
                        <Badge
                          tone={SUPPLY_STATUS_TONE[request.status as SupplyStatus]}
                        >
                          {SUPPLY_STATUS_LABEL[request.status as SupplyStatus]}
                        </Badge>
                      </Td>
                      <Td className="text-xs whitespace-nowrap text-ink-400">
                        {formatShortDate(request.createdAt)}
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
              basePath="/supply"
              params={{ q: sp.q, status: sp.status, team: sp.team }}
            />
          </>
        )}
      </Card>
    </>
  );
}
