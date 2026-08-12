"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CircleSlash,
  Eye,
  MessageSquare,
  Send,
  ThumbsDown,
  ThumbsUp,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

import { RoleBadge, StatusBadge, TypeBadge } from "@/components/status";
import { useSessionUser } from "@/components/session";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  CardHeader,
  ErrorBlock,
  Field,
  LoadingBlock,
  Textarea,
} from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/client";
import {
  can,
  canNoteOnRequestType,
  isOpenStatus,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_DESCRIPTIONS,
  type RequestType,
} from "@/lib/domain";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/format";
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
      toast.success("أُلغي الطلب وأُعيدت الكميات المحجوزة إلى المخزون");
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
      toast.success("أُضيفت الملاحظة");
      setNoteBody("");
      void mutate();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  if (isLoading && !data) return <LoadingBlock label="جارٍ تحميل الطلب…" />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBlock message={errorMessage(error)} />
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowRight className="size-4" />
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

  const totalUnits = request.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        href={can(user.role, "requests:read:all") ? "/requests" : "/my-requests"}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-400 transition-colors hover:text-ink-800"
      >
        <ArrowRight className="size-4" />
        رجوع إلى قائمة الطلبات
      </Link>

      {/* الترويسة */}
      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular rounded-xl bg-forest-600 px-2.5 py-1 text-sm font-extrabold text-white">
                #{request.id}
              </span>
              <TypeBadge type={request.type} />
              <StatusBadge status={request.status} />
            </div>
            <h1 className="mt-3 text-xl font-extrabold text-ink-900 sm:text-2xl">
              {request.purpose || "طلب بدون وصف"}
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              {REQUEST_TYPE_DESCRIPTIONS[request.type as RequestType]}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Meta
            icon={<UserIcon className="size-4" />}
            label="مقدّم الطلب"
            value={request.requester.fullName}
            hint={request.teamName}
          />
          <Meta
            icon={<CalendarDays className="size-4" />}
            label="تاريخ التقديم"
            value={formatDate(request.createdAt)}
            hint={formatRelative(request.createdAt)}
          />
          <Meta
            icon={<CalendarDays className="size-4" />}
            label="تاريخ الحاجة"
            value={request.neededOn ? formatDate(request.neededOn) : "غير محدّد"}
          />
          <Meta
            icon={<Eye className="size-4" />}
            label="القرار"
            value={request.decidedBy?.fullName ?? "لم يُبتّ بعد"}
            hint={request.decidedAt ? formatDate(request.decidedAt) : undefined}
          />
        </dl>

        {request.decisionNote && (
          <p className="mt-4 rounded-xl border border-sand-200 bg-sand-50 p-3 text-sm leading-relaxed text-ink-600">
            <span className="font-bold text-ink-800">ملاحظة القرار: </span>
            {request.decisionNote}
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {/* الأصناف */}
          <Card>
            <CardHeader
              title="الأصناف المطلوبة"
              subtitle={`${formatNumber(request.lines.length)} صنف · ${formatNumber(totalUnits)} قطعة`}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-sand-200 bg-sand-50 text-xs text-ink-400">
                    <th className="px-4 py-2.5 text-start font-semibold">الغرض</th>
                    <th className="px-4 py-2.5 text-start font-semibold">الكمية</th>
                    <th className="px-4 py-2.5 text-start font-semibold">المحجوز</th>
                    <th className="px-4 py-2.5 text-start font-semibold">ملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {request.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 font-semibold text-ink-900">
                        {line.itemName}
                        {line.itemId === null && (
                          <span className="ms-1.5 text-xs font-medium text-ember-600">
                            (غير مُدرج في المخزون)
                          </span>
                        )}
                      </td>
                      <td className="tabular px-4 py-3 font-bold text-ink-800">
                        {formatNumber(line.quantity)} {line.unit}
                      </td>
                      <td className="tabular px-4 py-3 text-ink-500">
                        {line.deducted > 0 ? `${formatNumber(line.deducted)} ${line.unit}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-400">{line.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* الملاحظات */}
          <Card>
            <CardHeader
              title="الملاحظات"
              subtitle={`${formatNumber(request.notes?.length ?? 0)} ملاحظة`}
              icon={<MessageSquare className="size-5" />}
            />

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
              <p className="px-5 py-6 text-center text-sm text-ink-400">
                لا توجد ملاحظات على هذا الطلب بعد.
              </p>
            )}

            {canAddNote && (
              <form onSubmit={addNote} className="border-t border-sand-200 p-4 sm:p-5">
                <Field label="إضافة ملاحظة">
                  <Textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    rows={3}
                    placeholder="اكتب ملاحظتك على هذا الطلب…"
                  />
                </Field>
                <div className="mt-3 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    loading={busy === "note"}
                    disabled={!noteBody.trim()}
                  >
                    <Send className="size-4" />
                    حفظ الملاحظة
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* لوحة الإجراءات */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {canDecide && stillOpen && (
            <Card className="p-5">
              <h2 className="font-bold text-ink-900">القرار</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">
                عند الرفض تُعاد الكميات المحجوزة إلى المخزون تلقائيًا.
              </p>

              <div className="mt-4">
                <Field label="ملاحظة على القرار">
                  <Textarea
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    rows={3}
                    placeholder="اختياري — تظهر للفرقة صاحبة الطلب"
                  />
                </Field>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  variant="success"
                  className="w-full"
                  loading={busy === "APPROVED"}
                  onClick={() => decide("APPROVED")}
                >
                  <ThumbsUp className="size-4" />
                  قبول الطلب
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  loading={busy === "REJECTED"}
                  onClick={() => decide("REJECTED")}
                >
                  <ThumbsDown className="size-4" />
                  رفض الطلب
                </Button>
                {request.status === "PENDING" && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={busy === "UNDER_REVIEW"}
                    onClick={() => decide("UNDER_REVIEW")}
                  >
                    <Eye className="size-4" />
                    تحويل إلى قيد المراجعة
                  </Button>
                )}
              </div>
            </Card>
          )}

          {canCancel && stillOpen && (
            <Card className="p-5">
              <h2 className="font-bold text-ink-900">إلغاء الطلب</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">
                يمكنك إلغاء طلبك ما دام لم يُبتّ فيه. ستُعاد الكميات المحجوزة إلى المخزون فورًا.
              </p>
              <Button
                variant="secondary"
                className="mt-4 w-full text-crimson-600"
                loading={busy === "cancel"}
                onClick={cancel}
              >
                <CircleSlash className="size-4" />
                إلغاء الطلب
              </Button>
            </Card>
          )}

          {!stillOpen && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-ink-600">
                هذا الطلب مُغلق بحالة «{REQUEST_STATUS_LABELS[
                  request.status as keyof typeof REQUEST_STATUS_LABELS
                ]}» ولا يقبل تغييرًا.
              </p>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
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
    <div className="rounded-xl border border-sand-200 bg-sand-50 px-3.5 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-ink-900">{value}</dd>
      {hint && <dd className="text-xs text-ink-400">{hint}</dd>}
    </div>
  );
}
