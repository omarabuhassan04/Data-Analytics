"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { verifyReturn } from "@/actions/returns";
import { FormError, SubmitButton } from "@/components/form";
import { CheckIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import { num } from "@/lib/format";

type Line = {
  supplyLineId: number;
  itemName: string;
  unit: string;
  remaining: number;
  claimedGood: number;
  claimedDamaged: number;
  claimedLost: number;
};

type Counts = { good: number; damaged: number; lost: number };

/**
 * شاشة التحقّق.
 *
 * الحقول تبدأ بما صرّحت به الفرقة لأنه المتوقّع في معظم الحالات، لكنها قابلة
 * للتعديل: المعتمد هو ما يعاينه قائد اللوازم لا ما ادّعته الفرقة.
 */
export function ReturnVerifyForm({
  batchId,
  batchCode,
  teamName,
  note,
  lines,
}: {
  batchId: number;
  batchCode: string;
  teamName: string;
  note: string | null;
  lines: Line[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(verifyReturn, null);

  const [counts, setCounts] = useState<Record<number, Counts>>(() =>
    Object.fromEntries(
      lines.map((line) => [
        line.supplyLineId,
        {
          good: line.claimedGood,
          damaged: line.claimedDamaged,
          lost: line.claimedLost,
        },
      ]),
    ),
  );

  useEffect(() => {
    if (state?.ok) {
      notify(
        state.data.completed
          ? "تم اعتماد الإرجاع وأُغلقت العهدة."
          : "تم اعتماد الإرجاع. ما زال جزء من العهدة قائماً.",
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router]);

  const update = (lineId: number, key: keyof Counts, value: number) => {
    setCounts((current) => ({
      ...current,
      [lineId]: { ...current[lineId], [key]: Math.max(0, value) },
    }));
  };

  const rows = lines.map((line) => {
    const c = counts[line.supplyLineId] ?? { good: 0, damaged: 0, lost: 0 };
    return { line, counts: c, sum: c.good + c.damaged + c.lost };
  });

  const over = rows.filter((row) => row.sum > row.line.remaining);
  const totalGood = rows.reduce((sum, row) => sum + row.counts.good, 0);
  const differs = rows.some(
    (row) =>
      row.counts.good !== row.line.claimedGood ||
      row.counts.damaged !== row.line.claimedDamaged ||
      row.counts.lost !== row.line.claimedLost,
  );

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="brass">
        <CheckIcon className="size-4" />
        التحقّق من الإرجاع
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`التحقّق من الإرجاع ${batchCode}`}
        description={`مقدَّم من ${teamName}. الحقول مملوءة بما صرّحت به الفرقة — عدّلها لتطابق ما عاينته.`}
        size="lg"
      >
        <form action={formAction}>
          <input type="hidden" name="batchId" value={batchId} />
          <input
            type="hidden"
            name="lines"
            value={JSON.stringify(
              rows.map((row) => ({
                supplyLineId: row.line.supplyLineId,
                good: row.counts.good,
                damaged: row.counts.damaged,
                lost: row.counts.lost,
              })),
            )}
          />

          <FormError state={state} />

          {note ? (
            <Alert tone="info" className="mb-3">
              ملاحظة الفرقة: {note}
            </Alert>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[38rem] text-right text-sm">
              <thead>
                <tr>
                  <th className="border-b border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink-500">
                    الصنف
                  </th>
                  <th className="border-b border-line bg-surface-2 px-3 py-2 text-center text-xs font-bold text-ink-500">
                    صرّحت الفرقة
                  </th>
                  <th className="border-b border-line bg-surface-2 px-3 py-2 text-center text-xs font-bold text-ok-500">
                    سليم
                  </th>
                  <th className="border-b border-line bg-surface-2 px-3 py-2 text-center text-xs font-bold text-warn-500">
                    تالف
                  </th>
                  <th className="border-b border-line bg-surface-2 px-3 py-2 text-center text-xs font-bold text-danger-500">
                    مفقود
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ line, counts: c, sum }) => (
                  <tr
                    key={line.supplyLineId}
                    className={sum > line.remaining ? "bg-danger-50" : ""}
                  >
                    <td className="border-b border-line px-3 py-2">
                      <span className="font-semibold text-ink-900">
                        {line.itemName}
                      </span>
                      <span className="mr-1 text-xs text-ink-400">
                        ({line.unit}) · في العهدة {num(line.remaining)}
                      </span>
                    </td>
                    <td className="border-b border-line px-3 py-2 text-center text-xs whitespace-nowrap text-ink-400">
                      {num(line.claimedGood)} / {num(line.claimedDamaged)} /{" "}
                      {num(line.claimedLost)}
                    </td>
                    {(["good", "damaged", "lost"] as const).map((key) => (
                      <td key={key} className="border-b border-line px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={line.remaining}
                          inputMode="numeric"
                          value={c[key]}
                          aria-label={`${
                            key === "good" ? "سليم" : key === "damaged" ? "تالف" : "مفقود"
                          } معتمد من ${line.itemName}`}
                          onChange={(event) =>
                            update(line.supplyLineId, key, Number(event.target.value) || 0)
                          }
                          className="h-9 w-16 rounded-lg border border-line-strong bg-surface text-center text-sm tabular-nums focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {over.length > 0 ? (
            <Alert tone="bad" className="mt-3">
              {over
                .map(
                  (row) =>
                    `«${row.line.itemName}»: اعتمدت ${num(row.sum)} والمتبقّي ${num(row.line.remaining)}`,
                )
                .join(" · ")}
            </Alert>
          ) : (
            <Alert tone="info" className="mt-3 text-xs">
              سيعود إلى المخزون المتاح <strong>{num(totalGood)}</strong> وحدة سليمة
              فقط. التالف والمفقود يُسجَّلان خارج المتاح ولا يزيدان الرصيد.
            </Alert>
          )}

          {differs ? (
            <Alert tone="warn" className="mt-2 text-xs">
              الكميات المعتمدة تختلف عمّا صرّحت به الفرقة — يُستحسن ذكر السبب في
              الملاحظة.
            </Alert>
          ) : null}

          <Field label="ملاحظة الاعتماد" className="mt-4" hint="اختياري">
            <Textarea name="verifyNote" rows={2} maxLength={500} />
          </Field>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton
              variant="brass"
              disabled={over.length > 0}
              pendingLabel="جارٍ الاعتماد…"
            >
              اعتماد الإرجاع
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
