import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReturnSubmitForm } from "@/components/return-submit-form";
import { ReturnVerifyForm } from "@/components/return-verify-form";
import {
  Badge,
  Card,
  CardHeader,
  LinkButton,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requirePage, requireTeamPage } from "@/lib/guard";
import {
  RETURN_STATUS_LABEL,
  RETURN_STATUS_TONE,
  SUPPLY_STATUS_LABEL,
  SUPPLY_STATUS_TONE,
  can,
  outstanding,
  type ReturnStatus,
  type SupplyStatus,
} from "@/lib/domain";
import { formatDate, formatDateTime, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "تفاصيل طلب اللوازم" };

export default async function SupplyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePage("supply:read:own", "supply:read:all");
  const { id } = await params;

  const requestId = Number(id);
  if (!Number.isInteger(requestId)) notFound();

  const request = await prisma.supplyRequest.findUnique({
    where: { id: requestId },
    include: {
      team: true,
      requester: true,
      lines: { orderBy: { id: "asc" } },
      returns: {
        orderBy: { submittedAt: "desc" },
        include: {
          submittedBy: true,
          verifiedBy: true,
          lines: { include: { supplyLine: true } },
        },
      },
    },
  });

  if (!request) notFound();

  // الحارس الحقيقي: قائد الفرقة لا يفتح طلب فرقة أخرى ولو عرف رقمه
  await requireTeamPage(user, request.teamId);

  const status = request.status as SupplyStatus;
  const remaining = request.lines.reduce((sum, l) => sum + outstanding(l), 0);
  const pendingBatch = request.returns.find(
    (batch) => batch.status === "AWAITING_VERIFICATION",
  );

  const canSubmitReturn =
    can(user.role, "returns:submit") &&
    user.teamId === request.teamId &&
    remaining > 0 &&
    !pendingBatch;

  const canVerify = can(user.role, "returns:verify") && Boolean(pendingBatch);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              الطلب {request.code}
            </h1>
            <Badge tone={SUPPLY_STATUS_TONE[status]}>
              {SUPPLY_STATUS_LABEL[status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {request.team.name} · قدّمه {request.requester.fullName} ·{" "}
            {formatDate(request.createdAt)}
          </p>
        </div>
        <LinkButton href="/supply" variant="outline">
          عودة للقائمة
        </LinkButton>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader
              title="أصناف الطلب"
              description={
                remaining > 0
                  ? `${num(remaining)} وحدة ما تزال في عهدة الفرقة`
                  : "أُغلقت العهدة بالكامل"
              }
              action={
                canSubmitReturn ? (
                  <ReturnSubmitForm
                    requestId={request.id}
                    requestCode={request.code}
                    lines={request.lines.map((line) => ({
                      id: line.id,
                      itemName: line.itemName,
                      unit: line.unit,
                      remaining: outstanding(line),
                    }))}
                  />
                ) : canVerify && pendingBatch ? (
                  <ReturnVerifyForm
                    batchId={pendingBatch.id}
                    batchCode={pendingBatch.code}
                    teamName={request.team.name}
                    note={pendingBatch.note}
                    lines={pendingBatch.lines.map((line) => ({
                      supplyLineId: line.supplyLineId,
                      itemName: line.supplyLine.itemName,
                      unit: line.supplyLine.unit,
                      remaining: outstanding(line.supplyLine),
                      claimedGood: line.claimedGood,
                      claimedDamaged: line.claimedDamaged,
                      claimedLost: line.claimedLost,
                    }))}
                  />
                ) : undefined
              }
            />
            <Table>
              <thead>
                <tr>
                  <Th>الصنف</Th>
                  <Th className="text-center">المصروف</Th>
                  <Th className="text-center">أُرجع سليماً</Th>
                  <Th className="text-center">تالف</Th>
                  <Th className="text-center">مفقود</Th>
                  <Th className="text-center">في العهدة</Th>
                </tr>
              </thead>
              <tbody>
                {request.lines.map((line) => {
                  const left = outstanding(line);
                  return (
                    <tr key={line.id} className="hover:bg-surface-2">
                      <Td className="font-semibold text-ink-900">
                        {line.itemName}
                        <span className="mr-1 text-xs font-normal text-ink-400">
                          ({line.unit})
                        </span>
                      </Td>
                      <Td className="text-center tabular-nums">
                        {num(line.quantity)}
                      </Td>
                      <Td className="text-center tabular-nums text-ok-500">
                        {line.returnedGood > 0 ? num(line.returnedGood) : "—"}
                      </Td>
                      <Td className="text-center tabular-nums text-warn-500">
                        {line.returnedDamaged > 0 ? num(line.returnedDamaged) : "—"}
                      </Td>
                      <Td className="text-center tabular-nums text-danger-500">
                        {line.returnedLost > 0 ? num(line.returnedLost) : "—"}
                      </Td>
                      <Td className="text-center">
                        {left > 0 ? (
                          <Badge tone="warn">{num(left)}</Badge>
                        ) : (
                          <Badge tone="ok">مغلق</Badge>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader
              title="سجل الإرجاع"
              description="كل دفعة إرجاع وما اعتمده قائد اللوازم فيها"
            />
            {request.returns.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">
                لم تُقدَّم أي دفعة إرجاع على هذا الطلب بعد.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {request.returns.map((batch) => (
                  <li key={batch.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-ink-900">
                        {batch.code}
                      </span>
                      <Badge tone={RETURN_STATUS_TONE[batch.status as ReturnStatus]}>
                        {RETURN_STATUS_LABEL[batch.status as ReturnStatus]}
                      </Badge>
                      <span className="text-xs text-ink-400">
                        قدّمها {batch.submittedBy.fullName} ·{" "}
                        {formatDateTime(batch.submittedAt)}
                      </span>
                    </div>

                    {batch.note ? (
                      <p className="mt-1.5 text-sm text-ink-500">
                        ملاحظة الفرقة: {batch.note}
                      </p>
                    ) : null}

                    <ul className="mt-2 space-y-1">
                      {batch.lines.map((line) => {
                        const verified = batch.status === "VERIFIED";
                        const good = verified ? (line.verifiedGood ?? 0) : line.claimedGood;
                        const damaged = verified
                          ? (line.verifiedDamaged ?? 0)
                          : line.claimedDamaged;
                        const lost = verified
                          ? (line.verifiedLost ?? 0)
                          : line.claimedLost;

                        return (
                          <li
                            key={line.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface-2 px-3 py-2 text-sm"
                          >
                            <span className="font-semibold text-ink-900">
                              {line.supplyLine.itemName}
                            </span>
                            <span className="text-ok-500">
                              سليم {num(good)}
                            </span>
                            <span className="text-warn-500">
                              تالف {num(damaged)}
                            </span>
                            <span className="text-danger-500">
                              مفقود {num(lost)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {batch.status === "VERIFIED" ? (
                      <p className="mt-2 text-xs text-ink-400">
                        اعتمدها {batch.verifiedBy?.fullName} ·{" "}
                        {batch.verifiedAt ? formatDateTime(batch.verifiedAt) : ""}
                        {batch.verifyNote ? ` · ${batch.verifyNote}` : ""}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-warn-500">
                        بانتظار تحقّق قائد اللوازم — لم يتغيّر المخزون بعد.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader title="بيانات الطلب" />
            <dl className="divide-y divide-line text-sm">
              <Row label="الفرقة" value={request.team.name} />
              <Row label="مقدّم الطلب" value={request.requester.fullName} />
              <Row label="الغرض" value={request.purpose ?? "—"} />
              <Row
                label="تاريخ الحاجة"
                value={request.neededOn ? formatDate(request.neededOn) : "—"}
              />
              <Row label="تاريخ التقديم" value={formatDateTime(request.createdAt)} />
              <Row
                label="تاريخ الإغلاق"
                value={
                  request.completedAt ? formatDateTime(request.completedAt) : "—"
                }
              />
            </dl>
          </Card>

          <Card>
            <CardHeader title="كيف يعمل هذا الطلب" />
            <div className="space-y-2 px-5 py-4 text-xs leading-relaxed text-ink-500">
              <p>
                طلب اللوازم يُعتمد آلياً: خُصمت الكميات من المخزون لحظة التقديم
                وصارت عهدة على الفرقة.
              </p>
              <p>
                عند الإرجاع تُدخل الفرقة ما لديها، ثم يعاين قائد اللوازم ويعتمد
                الكميات الفعلية. السليم وحده يعود إلى المتاح؛ التالف والمفقود
                يُسجَّلان ولا يعودان.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-5 py-2.5">
      <dt className="w-28 shrink-0 text-ink-400">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-ink-900">{value}</dd>
    </div>
  );
}
