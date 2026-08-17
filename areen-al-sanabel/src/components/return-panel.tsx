"use client";

import { useMemo, useState } from "react";

import { IconLantern, IconReturn } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/client";
import { lineOutstanding } from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import { revalidateStock } from "@/lib/revalidate";
import type { RequestDto, RequestLineDto } from "@/lib/types";

/** ما يُدخله المستخدم لسطر واحد — نصوص لأن الحقول قد تكون فارغة أثناء الكتابة */
type Draft = { good: string; damaged: string; lost: string };

const EMPTY: Draft = { good: "", damaged: "", lost: "" };

function toCount(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * استلام عهدة راجعة.
 *
 * الحساب هنا يطابق الخادم حرفيًا: كلاهما يستدعي lineOutstanding على
 * الأعمدة نفسها. الواجهة تمنع تجاوز المعلّق قبل الإرسال، والخادم يمنعه
 * مرة أخرى داخل المعاملة — الواجهة راحة للمستخدم لا حدّ أمني.
 */
export function ReturnPanel({
  request,
  onDone,
}: {
  request: RequestDto;
  onDone: () => void;
}) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const openLines = useMemo(
    () => request.lines.filter((line) => lineOutstanding(line) > 0),
    [request.lines],
  );

  const draftOf = (lineId: number): Draft => drafts[lineId] ?? EMPTY;

  function setField(lineId: number, field: keyof Draft, value: string) {
    setDrafts((current) => ({
      ...current,
      [lineId]: { ...draftOf(lineId), [field]: value },
    }));
  }

  /** مجموع ما أُدخل لسطر، وهل يتجاوز المعلّق */
  function lineTotals(line: RequestLineDto) {
    const draft = draftOf(line.id);
    const entered = toCount(draft.good) + toCount(draft.damaged) + toCount(draft.lost);
    const pending = lineOutstanding(line);
    return { entered, pending, over: entered > pending };
  }

  const totals = useMemo(() => {
    let good = 0;
    let damaged = 0;
    let lost = 0;
    let over = false;

    for (const line of openLines) {
      const draft = drafts[line.id] ?? EMPTY;
      const g = toCount(draft.good);
      const d = toCount(draft.damaged);
      const l = toCount(draft.lost);
      good += g;
      damaged += d;
      lost += l;
      if (g + d + l > lineOutstanding(line)) over = true;
    }

    return { good, damaged, lost, total: good + damaged + lost, over };
  }, [openLines, drafts]);

  /** كل ما هو معلّق رجع سليمًا — الحالة الغالبة بعد كل رحلة */
  function fillAllGood() {
    const next: Record<number, Draft> = {};
    for (const line of openLines) {
      next[line.id] = { good: String(lineOutstanding(line)), damaged: "", lost: "" };
    }
    setDrafts(next);
  }

  async function submit() {
    if (totals.total === 0 || totals.over) return;
    setBusy(true);
    try {
      const lines = openLines
        .map((line) => {
          const draft = draftOf(line.id);
          return {
            lineId: line.id,
            good: toCount(draft.good),
            damaged: toCount(draft.damaged),
            lost: toCount(draft.lost),
            note: note.trim() || undefined,
          };
        })
        .filter((line) => line.good + line.damaged + line.lost > 0);

      const result = await apiPost<{ outstanding: number; settled: boolean }>(
        `/api/requests/${request.id}/return`,
        { lines },
      );

      toast.success(
        result.settled
          ? "اكتمل إرجاع الطلب"
          : `تم الاستلام — ${formatNumber(result.outstanding)} وحدة ما زالت في العهدة`,
      );
      setDrafts({});
      setNote("");
      // الرصيد تغيّر: تُبطل لوحة التحكم والمخزون والدفتر والمطابقة معًا
      await revalidateStock();
      onDone();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (openLines.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="استلام إرجاع"
        icon={<IconReturn className="size-5" />}
        action={
          <Button size="sm" variant="secondary" onClick={fillAllGood}>
            الكل سليم
          </Button>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-sand-200 bg-sand-50 text-xs text-ink-400">
              <th className="px-4 py-2.5 text-start font-semibold">الغرض</th>
              <th className="px-3 py-2.5 text-start font-semibold">في العهدة</th>
              <th className="px-3 py-2.5 text-start font-semibold">سليم</th>
              <th className="px-3 py-2.5 text-start font-semibold">للفحص</th>
              <th className="px-3 py-2.5 text-start font-semibold">مفقود</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {openLines.map((line) => {
              const { entered, pending, over } = lineTotals(line);
              const draft = draftOf(line.id);

              return (
                <tr key={line.id}>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-ink-900">{line.itemName}</span>
                    {over && (
                      <span className="mt-0.5 block text-xs font-semibold text-crimson-600">
                        {formatNumber(entered)} يتجاوز المعلّق
                      </span>
                    )}
                  </td>
                  <td className="tabular px-3 py-3 font-bold text-ink-800">
                    {formatNumber(pending)} {line.unit}
                  </td>
                  {(["good", "damaged", "lost"] as const).map((field) => (
                    <td key={field} className="px-3 py-3">
                      <Input
                        type="number"
                        min={0}
                        max={pending}
                        inputMode="numeric"
                        dir="ltr"
                        aria-label={`${line.itemName} — ${
                          field === "good" ? "سليم" : field === "damaged" ? "للفحص" : "مفقود"
                        }`}
                        value={draft[field]}
                        onChange={(event) => setField(line.id, field, event.target.value)}
                        className={`h-9 w-20 px-2 py-1 text-center ${
                          over ? "border-crimson-200" : ""
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 border-t border-sand-200 p-4 sm:p-5">
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="ملاحظة على الاستلام (اختياري)"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="tabular text-sm text-ink-500">
            <span className="font-bold text-ink-900">{formatNumber(totals.total)}</span> وحدة
            {totals.damaged > 0 && (
              <span className="ms-2 inline-flex items-center gap-1 text-ember-300">
                <IconLantern className="size-3.5" />
                {formatNumber(totals.damaged)} للفحص
              </span>
            )}
            {totals.lost > 0 && (
              <span className="ms-2 text-crimson-600">
                {formatNumber(totals.lost)} مفقودة
              </span>
            )}
          </p>

          <Button
            onClick={submit}
            loading={busy}
            disabled={totals.total === 0 || totals.over}
          >
            <IconReturn className="size-4" />
            تسجيل الاستلام
          </Button>
        </div>
      </div>
    </Card>
  );
}
