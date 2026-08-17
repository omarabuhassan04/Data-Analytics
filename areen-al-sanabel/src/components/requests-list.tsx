"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

import {
  IconApproved,
  IconCalendar,
  IconCancelled,
  IconChevron,
  IconExternal,
  IconLens,
  IconNote,
  IconRejected,
  IconSignpost,
} from "@/components/icons";
import { useSessionUser } from "@/components/session";
import { StatusBadge, TypeBadge } from "@/components/status";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/client";
import { cn } from "@/lib/cn";
import {
  can,
  canNoteOnRequestType,
  isOpenStatus,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUSES,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPES,
  type RequestType,
} from "@/lib/domain";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import type { RequestDto } from "@/lib/types";

type DecisionTarget = {
  request: RequestDto;
  status: "APPROVED" | "REJECTED" | "UNDER_REVIEW";
};

export function RequestsList({
  scope,
  initialStatus,
}: {
  scope: "mine" | "all";
  initialStatus?: string;
}) {
  const user = useSessionUser();
  const toast = useToast();

  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>(initialStatus ?? "all");
  const [team, setTeam] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [decision, setDecision] = useState<DecisionTarget | null>(null);
  const [noteTarget, setNoteTarget] = useState<RequestDto | null>(null);

  const query = new URLSearchParams();
  if (scope === "mine") query.set("scope", "mine");
  if (type !== "all") query.set("type", type);
  if (status !== "all") query.set("status", status);
  if (team !== "all" && scope === "all") query.set("team", team);

  const key = `/api/requests?${query.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<{ requests: RequestDto[] }>(key, {
    refreshInterval: 25_000,
  });

  const requests = useMemo(() => data?.requests ?? [], [data]);

  const teams = useMemo(() => {
    const names = new Set<string>();
    for (const request of requests) names.add(request.teamName);
    return [...names].sort();
  }, [requests]);

  const canDecide = can(user.role, "requests:decide");
  const canNote = can(user.role, "requests:note");
  const canCancel = can(user.role, "requests:cancel:own");

  async function cancel(request: RequestDto) {
    try {
      await apiPost(`/api/requests/${request.id}/cancel`);
      toast.success(`أُلغي الطلب #${request.id} وأُعيدت الكميات إلى المخزون`);
      void mutate();
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  }

  return (
    <div>
      {/* أدوات التصفية */}
      <Card className="mb-5 p-4">
        <div
          className={cn(
            "grid gap-3",
            scope === "all" ? "sm:grid-cols-3" : "sm:grid-cols-2",
          )}
        >
          <Select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="تصفية حسب نوع الطلب"
          >
            <option value="all">كل الأنواع</option>
            {REQUEST_TYPES.map((value) => (
              <option key={value} value={value}>
                {REQUEST_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>

          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="تصفية حسب الحالة"
          >
            <option value="all">كل الحالات</option>
            {REQUEST_STATUSES.map((value) => (
              <option key={value} value={value}>
                {REQUEST_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>

          {scope === "all" && (
            <Select
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              aria-label="تصفية حسب الفرقة"
            >
              <option value="all">كل الفرق</option>
              {teams.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {data && (
          <p className="mt-3 text-xs font-medium text-ink-400">
            {formatNumber(requests.length)} طلب
          </p>
        )}
      </Card>

      {error && <ErrorBlock message={errorMessage(error)} />}
      {isLoading && !data && <LoadingBlock label="جارٍ تحميل الطلبات…" />}

      {data && requests.length === 0 && (
        <Card>
          <EmptyState
            icon={<IconSignpost className="size-6" />}
            title="لا توجد طلبات مطابقة"
          />
        </Card>
      )}

      <div className="space-y-3">
        {requests.map((request) => {
          const open = expanded === request.id;
          const isMine = request.requester.id === user.id;
          const stillOpen = isOpenStatus(request.status);

          return (
            <motion.div key={request.id} layout>
              <Card className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : request.id)}
                  aria-expanded={open}
                  className="flex w-full flex-wrap items-center gap-3 p-4 text-start transition-colors hover:bg-sand-50"
                >
                  <span className="tabular grid size-11 shrink-0 place-items-center rounded-xl bg-sand-100 text-sm font-extrabold text-ink-600">
                    #{request.id}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink-900">
                      {request.purpose || "طلب بدون وصف"}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-400">
                      {request.teamName} · {request.requester.fullName} ·{" "}
                      {formatRelative(request.createdAt)}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <TypeBadge type={request.type} />
                    <StatusBadge status={request.status} />
                    <IconChevron
                      className={cn(
                        "size-4 text-ink-400 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden border-t border-sand-200"
                    >
                      <div className="space-y-4 bg-sand-50/60 p-4 sm:p-5">
                        <div className="grid gap-3 text-sm sm:grid-cols-3">
                          <Detail label="تاريخ التقديم" value={formatDate(request.createdAt)} />
                          <Detail
                            label="تاريخ الحاجة"
                            value={
                              request.neededOn ? formatDate(request.neededOn) : "غير محدّد"
                            }
                            icon={<IconCalendar className="size-3.5" />}
                          />
                          <Detail
                            label="القرار"
                            value={
                              request.decidedBy
                                ? `${request.decidedBy.fullName} — ${formatDate(request.decidedAt)}`
                                : "لم يُبتّ بعد"
                            }
                          />
                        </div>

                        {/* أسطر الطلب */}
                        <div className="overflow-hidden rounded-xl border border-sand-200 bg-sand-100">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-sand-200 bg-sand-50 text-xs text-ink-400">
                                <th className="px-3 py-2 text-start font-semibold">الغرض</th>
                                <th className="px-3 py-2 text-start font-semibold">الكمية</th>
                                <th className="px-3 py-2 text-start font-semibold">ملاحظة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-sand-200">
                              {request.lines.map((line) => (
                                <tr key={line.id}>
                                  <td className="px-3 py-2 font-semibold text-ink-800">
                                    {line.itemName}
                                    {line.itemId === null && (
                                      <span className="ms-1.5 text-xs font-medium text-ember-600">
                                        (غير مُدرج)
                                      </span>
                                    )}
                                  </td>
                                  <td className="tabular px-3 py-2 text-ink-600">
                                    {formatNumber(line.quantity)} {line.unit}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-ink-400">
                                    {line.note || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {request.decisionNote && (
                          <p className="rounded-xl border border-sand-200 bg-sand-100 p-3 text-sm text-ink-600">
                            <span className="font-bold text-ink-800">ملاحظة القرار: </span>
                            {request.decisionNote}
                          </p>
                        )}

                        {/* الإجراءات */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/requests/${request.id}`}>
                            <Button variant="secondary" size="sm">
                              <IconExternal className="size-4" />
                              التفاصيل الكاملة
                              {(request._count?.notes ?? 0) > 0 && (
                                <span className="tabular rounded-full bg-sand-200 px-1.5 text-xs">
                                  {request._count?.notes}
                                </span>
                              )}
                            </Button>
                          </Link>

                          {canDecide && stillOpen && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => setDecision({ request, status: "APPROVED" })}
                              >
                                <IconApproved className="size-4" />
                                قبول
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setDecision({ request, status: "REJECTED" })}
                              >
                                <IconRejected className="size-4" />
                                رفض
                              </Button>
                              {request.status === "PENDING" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDecision({ request, status: "UNDER_REVIEW" })
                                  }
                                >
                                  <IconLens className="size-4" />
                                  قيد المراجعة
                                </Button>
                              )}
                            </>
                          )}

                          {canNote &&
                            canNoteOnRequestType(user.role, request.type as RequestType) && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setNoteTarget(request)}
                              >
                                <IconNote className="size-4" />
                                إضافة ملاحظة
                              </Button>
                            )}

                          {canCancel && isMine && stillOpen && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancel(request)}
                              className="text-crimson-600 hover:bg-crimson-50"
                            >
                              <IconCancelled className="size-4" />
                              إلغاء الطلب
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <DecisionModal target={decision} onClose={() => setDecision(null)} onDone={() => mutate()} />
      <NoteModal request={noteTarget} onClose={() => setNoteTarget(null)} onDone={() => mutate()} />
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-sand-200 bg-sand-100 px-3 py-2">
      <p className="flex items-center gap-1 text-xs font-semibold text-ink-400">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-ink-800">{value}</p>
    </div>
  );
}

/* --------------------------------------------------------- نافذة القرار */

const DECISION_COPY = {
  APPROVED: {
    title: "قبول الطلب",
    description: "ستبقى الكميات المحجوزة مخصومة من المخزون بصفتها عهدة لدى الفرقة.",
    confirm: "تأكيد القبول",
    variant: "success" as const,
  },
  REJECTED: {
    title: "رفض الطلب",
    description: "ستُعاد الكميات المحجوزة تلقائيًا إلى المخزون فور الرفض.",
    confirm: "تأكيد الرفض",
    variant: "danger" as const,
  },
  UNDER_REVIEW: {
    title: "تحويل الطلب إلى قيد المراجعة",
    description: "تبقى الكميات محجوزة، ويظهر للفرقة أن طلبها قيد الدراسة.",
    confirm: "تأكيد",
    variant: "primary" as const,
  },
};

function DecisionModal({
  target,
  onClose,
  onDone,
}: {
  target: DecisionTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const copy = target ? DECISION_COPY[target.status] : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;

    setSubmitting(true);
    try {
      await apiPost(`/api/requests/${target.request.id}/decision`, {
        status: target.status,
        note: note.trim() || undefined,
      });
      toast.success(
        `تم تحديث الطلب #${target.request.id} إلى «${REQUEST_STATUS_LABELS[target.status]}»`,
      );
      setNote("");
      onClose();
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title={copy?.title ?? ""}
      description={copy?.description}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="ملاحظة على القرار"
          hint="تظهر للفرقة صاحبة الطلب — مفيدة لتوضيح سبب الرفض أو شروط التسليم."
        >
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="اكتب ملاحظتك…"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" variant={copy?.variant ?? "primary"} loading={submitting}>
            {copy?.confirm}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- نافذة الملاحظة */

function NoteModal({
  request,
  onClose,
  onDone,
}: {
  request: RequestDto | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!request || !body.trim()) return;

    setSubmitting(true);
    try {
      await apiPost(`/api/requests/${request.id}/notes`, { body: body.trim() });
      toast.success("أُضيفت الملاحظة");
      setBody("");
      onClose();
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title={`ملاحظة على الطلب #${request?.id ?? ""}`}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="نص الملاحظة" required>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="اكتب ملاحظتك…"
            required
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={submitting} disabled={!body.trim()}>
            حفظ الملاحظة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
