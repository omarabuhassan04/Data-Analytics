import type { Metadata } from "next";
import Link from "next/link";

import { ReturnSubmitForm } from "@/components/return-submit-form";
import { ReturnVerifyForm } from "@/components/return-verify-form";
import { ReturnIcon } from "@/components/icons";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requirePage } from "@/lib/guard";
import { can, outstanding } from "@/lib/domain";
import { formatShortDate, num, relativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { teamFilter } from "@/lib/scope";

export const metadata: Metadata = { title: "العهد والإرجاع" };

export default async function ReturnsPage() {
  const user = await requirePage("returns:submit", "returns:verify");
  const isTeam = user.role === "TEAM_LEADER";
  const scope = teamFilter(user);

  const [openRequests, awaitingBatches] = await Promise.all([
    prisma.supplyRequest.findMany({
      where: { status: { in: ["ISSUED", "AWAITING_VERIFICATION"] }, ...scope },
      include: { team: true, lines: { orderBy: { id: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    can(user.role, "returns:verify")
      ? prisma.returnBatch.findMany({
          where: { status: "AWAITING_VERIFICATION" },
          include: {
            submittedBy: true,
            supplyRequest: { include: { team: true } },
            lines: { include: { supplyLine: true } },
          },
          orderBy: { submittedAt: "asc" },
        })
      : prisma.returnBatch.findMany({
          where: { status: "AWAITING_VERIFICATION", supplyRequest: scope },
          include: {
            submittedBy: true,
            supplyRequest: { include: { team: true } },
            lines: { include: { supplyLine: true } },
          },
          orderBy: { submittedAt: "asc" },
        }),
  ]);

  const withCustody = openRequests
    .map((request) => ({
      request,
      remaining: request.lines.reduce((sum, l) => sum + outstanding(l), 0),
    }))
    .filter((entry) => entry.remaining > 0);

  const totalOut = withCustody.reduce((sum, entry) => sum + entry.remaining, 0);
  const pendingIds = new Set(awaitingBatches.map((b) => b.supplyRequestId));

  return (
    <>
      <PageHeader
        title="العهد والإرجاع"
        description={
          isTeam
            ? "العهد المفتوحة على فرقتك وما قدّمته من إرجاعات."
            : "العهد المفتوحة لدى الفرق ودفعات الإرجاع بانتظار التحقّق."
        }
      />

      {/* طابور التحقّق أولاً: هو ما ينتظر إجراءً */}
      {can(user.role, "returns:verify") ? (
        <Card className="mb-5">
          <CardHeader
            title="بانتظار التحقّق"
            description={
              awaitingBatches.length > 0
                ? `${num(awaitingBatches.length)} دفعة إرجاع تحتاج معاينتك`
                : "لا توجد دفعات معلّقة"
            }
          />
          {awaitingBatches.length === 0 ? (
            <EmptyState
              icon={<ReturnIcon />}
              title="لا شيء بانتظار التحقّق"
              description="ستظهر هنا كل دفعة إرجاع تقدّمها الفرق."
            />
          ) : (
            <ul className="divide-y divide-line">
              {awaitingBatches.map((batch) => {
                const declared = batch.lines.reduce(
                  (sum, l) => sum + l.claimedGood + l.claimedDamaged + l.claimedLost,
                  0,
                );
                return (
                  <li
                    key={batch.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-ink-900">
                          {batch.code}
                        </span>
                        <Badge tone="warn">بانتظار التحقّق</Badge>
                        <Link
                          href={`/supply/${batch.supplyRequestId}`}
                          className="text-xs font-semibold text-forest-700 hover:underline"
                        >
                          الطلب {batch.supplyRequest.code}
                        </Link>
                      </div>
                      <p className="mt-1 text-xs text-ink-400">
                        {batch.supplyRequest.team.name} · قدّمها{" "}
                        {batch.submittedBy.fullName} ·{" "}
                        {relativeTime(batch.submittedAt)} · {num(declared)} وحدة
                        مصرّح بها
                      </p>
                    </div>
                    <ReturnVerifyForm
                      batchId={batch.id}
                      batchCode={batch.code}
                      teamName={batch.supplyRequest.team.name}
                      note={batch.note}
                      lines={batch.lines.map((line) => ({
                        supplyLineId: line.supplyLineId,
                        itemName: line.supplyLine.itemName,
                        unit: line.supplyLine.unit,
                        remaining: outstanding(line.supplyLine),
                        claimedGood: line.claimedGood,
                        claimedDamaged: line.claimedDamaged,
                        claimedLost: line.claimedLost,
                      }))}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={isTeam ? "عهد فرقتك المفتوحة" : "العهد المفتوحة لدى الفرق"}
          description={
            totalOut > 0
              ? `${num(totalOut)} وحدة ما تزال خارج المقر`
              : "لا توجد عهد مفتوحة"
          }
        />
        {withCustody.length === 0 ? (
          <EmptyState
            icon={<ReturnIcon />}
            title="لا توجد عهد مفتوحة"
            description={
              isTeam
                ? "كل ما صُرف لفرقتك أُرجع واعتُمد."
                : "كل العهد أُرجعت واعتُمدت."
            }
            action={
              can(user.role, "supply:create") ? (
                <LinkButton href="/supply/new" size="sm">
                  طلب لوازم
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الطلب</Th>
                {!isTeam ? <Th>الفرقة</Th> : null}
                <Th>الأصناف المتبقّية</Th>
                <Th className="text-center">الوحدات</Th>
                <Th>منذ</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {withCustody.map(({ request, remaining }) => {
                const pending = pendingIds.has(request.id);
                const openLines = request.lines.filter((l) => outstanding(l) > 0);

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
                    <Td className="max-w-64 text-xs text-ink-500">
                      {openLines
                        .map((l) => `${l.itemName} (${outstanding(l)})`)
                        .join("، ")}
                    </Td>
                    <Td className="text-center">
                      <Badge tone="warn">{num(remaining)}</Badge>
                    </Td>
                    <Td className="text-xs whitespace-nowrap text-ink-400">
                      {formatShortDate(request.createdAt)}
                    </Td>
                    <Td className="text-left">
                      {pending ? (
                        <Badge tone="info">إرجاع قيد التحقّق</Badge>
                      ) : can(user.role, "returns:submit") &&
                        user.teamId === request.teamId ? (
                        <ReturnSubmitForm
                          requestId={request.id}
                          requestCode={request.code}
                          lines={openLines.map((line) => ({
                            id: line.id,
                            itemName: line.itemName,
                            unit: line.unit,
                            remaining: outstanding(line),
                          }))}
                        />
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
