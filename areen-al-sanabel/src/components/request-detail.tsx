"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

import {
  IconApproved,
  IconBack,
  IconCalendar,
  IconCancelled,
  IconLens,
  IconNote,
  IconRejected,
  IconSend,
  IconTroop,
} from "@/components/icons";
import { ReturnPanel } from "@/components/return-panel";
import { QuarantineBadge, RoleBadge, SettlementBadge, StatusBadge, TypeBadge } from "@/components/status";
import { useSessionUser } from "@/components/session";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  CardHeader,
  ErrorBlock,
  LoadingBlock,
  Textarea,
} from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/client";
import {
  can,
  canNoteOnRequestType,
  isOpenStatus,
  lineOutstanding,
  REQUEST_STATUS_LABELS,
  type RequestType,
} from "@/lib/domain";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { revalidateStock } from "@/lib/revalidate";
import type { RequestDto } from "@/lib/types";

export function RequestDetail({ requestId }: { requestId: string }) {
  const user = useSessionUser();
  const toast = useToast();
  const router = useRouter();

  const { data, error, isLoading, mutate } = useSWR<{ request: RequestDto }>(
    `/api/requests/${requestId}`,
  );

  const [noteBody, setNoteBody] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const request = data?.request;

  async function decide(status: "APPROVED" | "REJECTED" | "UNDER_REVIEW") {
    if (!request) return;
    setBusy(status);
    try {
      await apiPost(`/api/requests/${request.id}/decision`, {
        status,
        note: decisionNote.trim() || undefined,
      });
      toast.success(`تم تحديث الطلب إلى «${REQUEST_STATUS_LABELS[status]}»`);
      setDecisionNote("");
      // الرفض يعيد كميات إلى المخزون — تُبطل بقية الشاشات معه لا بعده
      await revalidateStock();
      void mutate();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!request) return;
    setBusy("cancel");
    try {
      await apiPost(`/api/requests/${request.id}/cancel`);
      toast.success("أُلغي الطلب وأُعيدت الكميات إلى المخزون");
      await revalidateStock();
      void mutate();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    if (!request || !noteBody.trim()) return;
    setBusy("note");
    try {
      await apiPost(`/api/requests/${request.id}/notes`, { body: noteBody.trim() });
      setNoteBody("");
      void mutate();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  if (isLoading && !data) return <LoadingBlock />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBlock message={errorMessage(error)} />
        <Button variant="secondary" onClick={() => router.back()}>
          <IconBack className="size-4" />
          رجوع
        </Button>
      </div>
    );
  }
  if (!request) return null;

  const stillOpen = isOpenStatus(request.status);
  const isMine = request.requester.id === user.id;
  const canDecide = can(user.role, "requests:decide");
  const canAddNote =
    can(user.role, "requests:note") &&
    canNoteOnRequestType(user.role, request.type as RequestType);
  const canCancel = can(user.role, "requests:cancel:own") && isMine;
  const canReturn = can(user.role, "inventory:returns");

  const totalUnits = request.lines.reduce((sum, line) => sum + line.quantity, 0);
  const outstanding = request.lines.reduce((sum, line) => sum + lineOutstanding(line), 0);
  const quarantined = request.lines.reduce((sum, line) => sum + line.quarantined, 0);

  // الإرجاع متاح لطلبات العهدة المقبولة التي ما زال فيها معلّق
  const returnable =
    canReturn &&
    request.status === "APPROVED" &&
    request.type === "EQUIPMENT" &&
    outstanding > 0;

  return (
    <div className="rise">
      <Link
        href={can(user.role, "requests:read:all") ? "/requests" : "/my-requests"}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-400 transition-colors hover:text-ink-800"
      >
        <IconBack className="size-4" />
        الطلبات
      </Link>

      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular rounded-lg bg-sand-300 px-2.5 py-1 text-sm font-extrabold text-ink-900">
            {request.id}
          </span>
          <TypeBadge type={request.type} />
          <StatusBadge status={request.status} />
          {request.type === "EQUIPMENT" && request.status === "APPROVED" && (
            <SettlementBadge line={aggregate(request)} />
          )}
          <QuarantineBadge units={quarantined} unit="وحدة" />
        </div>

        <h1 className="mt-3 text-lg font-extrabold text-ink-900 sm:text-xl">
          {request.purpose || request.teamName}
        </h1>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Meta
            icon={<IconTroop className="size-4" />}
            label="مقدّم الطلب"
            value={request.requester.fullName}
            hint={request.teamName}
          />
          <Meta
            icon={<IconCalendar className="size-4" />}
            label="التقديم"
            value={formatDate(request.createdAt)}
            hint={formatRelative(request.createdAt)}
          />
          <Meta
            icon={<IconCalendar className="size-4" />}
            label="تاريخ الحاجة"
            value={request.neededOn ? formatDate(request.neededOn) : "—"}
          />
          <Meta
            icon={<IconApproved className="size-4" />}
            label="القرار"
            value={request.decidedBy?.fullName ?? "—"}
            hint={request.decidedAt ? formatDate(request.decidedAt) : undefined}
          />
        </dl>

        {request.decisionNote && (
          <p className="mt-4 rounded-lg border border-sand-200 bg-sand-50 p-3 text-sm leading-relaxed text-ink-600">
            {request.decisionNote}
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="الأصناف"
              subtitle={`${formatNumber(request.lines.length)} صنف · ${formatNumber(totalUnits)} وحدة${
                outstanding > 0 ? ` · ${formatNumber(outstanding)} في العهدة` : ""
              }`}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-sand-200 bg-sand-50 text-xs text-ink-400">
                    <th className="px-4 py-2.5 text-start font-semibold">الغرض</th>
                    <th className="px-3 py-2.5 text-start font-semibold">مطلوب</th>
                    <th className="px-3 py-2.5 text-start font-semibold">في العهدة</th>
                    <th className="px-3 py-2.5 text-start font-semibold">رجع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {request.lines.map((line) => {
                    const pending = lineOutstanding(line);
                    return (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-ink-900">{line.itemName}</span>
                          {line.itemId === null && (
                            <span className="ms-1.5 text-xs font-medium text-ember-300">
                              غير مُدرج
                            </span>
                          )}
                          {line.note && (
                            <span className="mt-0.5 block text-xs text-ink-400">
                              {line.note}
                            </span>
                          )}
                        </td>
                        <td className="tabular px-3 py-3 font-bold text-ink-800">
                          {formatNumber(line.quantity)} {line.unit}
                        </td>
                        <td className="tabular px-3 py-3">
                          {pending > 0 ? (
                            <span className="font-bold text-ember-300">
                              {formatNumber(pending)} {line.unit}
                            </span>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="tabular px-3 py-3 text-ink-500">
                          {line.returned > 0 && (
                            <span className="text-forest-600">
                              {formatNumber(line.returned)} سليم
                            </span>
                          )}
                          {line.quarantined > 0 && (
                            <span className="block text-sky-700">
                              {formatNumber(line.quarantined)} بالفحص
                            </span>
                          )}
                          {line.writtenOff > 0 && (
                            <span className="block text-crimson-600">
                              {formatNumber(line.writtenOff)} مشطوب
                            </span>
                          )}
                          {line.released > 0 && (
                            <span className="block text-ink-400">
                              {formatNumber(line.released)} فُكّ حجزه
                            </span>
                          )}
                          {line.returned +
                            line.quarantined +
                            line.writtenOff +
                            line.released ===
                            0 && "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {returnable && <ReturnPanel request={request} onDone={() => void mutate()} />}

          <Card>
            <CardHeader title="الملاحظات" icon={<IconNote className="size-5" />} />

            {request.notes && request.notes.length > 0 ? (
              <ul className="divide-y divide-sand-200">
                {request.notes.map((note) => (
                  <li key={note.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-ink-900">
                        {note.author.fullName}
                      </span>
                      <RoleBadge role={note.author.role} />
                      <span className="text-xs text-ink-400">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{note.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-ink-400">لا ملاحظات.</p>
            )}

            {canAddNote && (
              <form onSubmit={addNote} className="border-t border-sand-200 p-4 sm:p-5">
                <Textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  rows={3}
                  placeholder="أضِف ملاحظة…"
                  aria-label="إضافة ملاحظة"
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    loading={busy === "note"}
                    disabled={!noteBody.trim()}
                  >
                    <IconSend className="size-4" />
                    حفظ
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {canDecide && stillOpen && (
            <Card className="p-5">
              <h2 className="font-bold text-ink-900">القرار</h2>

              <div className="mt-3">
                <Textarea
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  rows={3}
                  placeholder="ملاحظة على القرار (اختياري)"
                  aria-label="ملاحظة على القرار"
                />
              </div>

              <div className="mt-3 space-y-2">
                <Button
                  variant="success"
                  className="w-full"
                  loading={busy === "APPROVED"}
                  onClick={() => decide("APPROVED")}
                >
                  <IconApproved className="size-4" />
                  قبول
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  loading={busy === "REJECTED"}
                  onClick={() => decide("REJECTED")}
                >
                  <IconRejected className="size-4" />
                  رفض
                </Button>
                {request.status === "PENDING" && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={busy === "UNDER_REVIEW"}
                    onClick={() => decide("UNDER_REVIEW")}
                  >
                    <IconLens className="size-4" />
                    قيد المراجعة
                  </Button>
                )}
              </div>
            </Card>
          )}

          {canCancel && stillOpen && (
            <Card className="p-5">
              <Button
                variant="secondary"
                className="w-full text-crimson-600"
                loading={busy === "cancel"}
                onClick={cancel}
              >
                <IconCancelled className="size-4" />
                إلغاء الطلب
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** مجموع أعمدة الدفتر على مستوى الطلب — لعرض شارة تسوية واحدة */
function aggregate(request: RequestDto) {
  return request.lines.reduce(
    (total, line) => ({
      deducted: total.deducted + line.deducted,
      released: total.released + line.released,
      returned: total.returned + line.returned,
      quarantined: total.quarantined + line.quarantined,
      writtenOff: total.writtenOff + line.writtenOff,
    }),
    { deducted: 0, released: 0, returned: 0, quarantined: 0, writtenOff: 0 },
  );
}

function Meta({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-sand-200 bg-sand-50 px-3.5 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-ink-900">{value}</dd>
      {hint && <dd className="text-xs text-ink-400">{hint}</dd>}
    </div>
  );
}
