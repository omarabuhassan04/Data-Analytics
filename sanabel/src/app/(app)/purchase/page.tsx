import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { ClearFilters, FilterSelect, SearchBox } from "@/components/filters";
import { TruckIcon } from "@/components/icons";
import { Pagination } from "@/components/pagination";
import {
  Alert,
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
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABEL,
  PURCHASE_STATUS_TONE,
  can,
  type PurchaseStatus,
} from "@/lib/domain";
import { formatShortDate, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { teamFilter } from "@/lib/scope";

export const metadata: Metadata = { title: "طلبات الشراء" };

const PAGE_SIZE = 20;

export default async function PurchaseListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    team?: string;
    page?: string;
  }>;
}) {
  const user = await requirePage(
    "purchase:create",
    "purchase:read:all",
    "purchase:read:decided",
  );
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const isTeam = user.role === "TEAM_LEADER";
  const decidedOnly = can(user.role, "purchase:read:decided");

  const where: Prisma.PurchaseRequestWhereInput = { ...teamFilter(user) };

  // الأدوار الرقابية ترى ما بُتّ فيه فقط — الطلب قبل القرار شأن الفرقة وقائد اللوازم
  if (decidedOnly) where.status = { in: ["APPROVED", "FULFILLED"] };

  if (sp.q) {
    where.OR = [
      { code: { contains: sp.q, mode: "insensitive" } },
      { itemName: { contains: sp.q, mode: "insensitive" } },
      { details: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (
    sp.status &&
    PURCHASE_STATUSES.includes(sp.status as PurchaseStatus) &&
    !decidedOnly
  ) {
    where.status = sp.status;
  }
  if (sp.team && !isTeam) where.teamId = Number(sp.team);

  const [total, requests, teams] = await Promise.all([
    prisma.purchaseRequest.count({ where }),
    prisma.purchaseRequest.findMany({
      where,
      include: { team: true, requester: true },
      // المعلّق أولاً: ما ينتظر قراراً يجب ألّا يُدفن تحت المكتمل
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    isTeam ? [] : prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="طلبات الشراء"
        description={
          decidedOnly
            ? "طلبات الشراء بعد اعتمادها من قائد اللوازم."
            : "للأصناف غير المتوفّرة في المقر. تحتاج موافقة قائد اللوازم قبل التوريد."
        }
        action={
          can(user.role, "purchase:create") ? (
            <LinkButton href="/purchase/new">طلب شراء جديد</LinkButton>
          ) : undefined
        }
      />

      {decidedOnly ? (
        <Alert tone="info" className="mb-4 text-sm">
          دورك رقابي: تظهر هنا الطلبات المعتمدة والموردة فقط، لا الطلبات قيد
          الدراسة.
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="ابحث برقم الطلب أو الصنف…" />
        {!decidedOnly ? (
          <FilterSelect
            paramName="status"
            label="الحالة"
            allLabel="كل الحالات"
            options={PURCHASE_STATUSES.map((status) => ({
              value: status,
              label: PURCHASE_STATUS_LABEL[status],
            }))}
          />
        ) : null}
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
            icon={<TruckIcon />}
            title="لا توجد طلبات شراء"
            description="طلب الشراء يُقدَّم عندما لا يكون الصنف متاحاً في المقر."
            action={
              can(user.role, "purchase:create") ? (
                <LinkButton href="/purchase/new" size="sm">
                  طلب شراء جديد
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>الرقم</Th>
                  <Th>الصنف المطلوب</Th>
                  <Th className="text-center">الكمية</Th>
                  {!isTeam ? <Th>الفرقة</Th> : null}
                  <Th>الحالة</Th>
                  <Th>التاريخ</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-surface-2">
                    <Td>
                      <Link
                        href={`/purchase/${request.id}`}
                        className="font-semibold text-forest-700 hover:underline"
                      >
                        {request.code}
                      </Link>
                      {request.revision > 0 ? (
                        <span className="mr-1.5 text-[11px] text-ink-400">
                          مراجعة {num(request.revision)}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="max-w-56 truncate font-medium text-ink-900">
                      {request.itemName}
                    </Td>
                    <Td className="text-center tabular-nums whitespace-nowrap">
                      {num(request.quantity)} {request.unit}
                    </Td>
                    {!isTeam ? <Td>{request.team.name}</Td> : null}
                    <Td>
                      <Badge
                        tone={PURCHASE_STATUS_TONE[request.status as PurchaseStatus]}
                      >
                        {PURCHASE_STATUS_LABEL[request.status as PurchaseStatus]}
                      </Badge>
                    </Td>
                    <Td className="text-xs whitespace-nowrap text-ink-400">
                      {formatShortDate(request.createdAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              basePath="/purchase"
              params={{ q: sp.q, status: sp.status, team: sp.team }}
            />
          </>
        )}
      </Card>
    </>
  );
}
