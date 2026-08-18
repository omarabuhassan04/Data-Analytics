"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { submitReturn } from "@/actions/returns";
import { FormError, SubmitButton } from "@/components/form";
import { ReturnIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import { num } from "@/lib/format";

type Line = {
  id: number;
  itemName: string;
  unit: string;
  remaining: number;
};

type Counts = { good: number; damaged: number; lost: number };

export function ReturnSubmitForm({
  requestId,
  requestCode,
  lines,
}: {
  requestId: number;
  requestCode: string;
  lines: Line[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(submitReturn, null);

  const open_lines = lines.filter((line) => line.remaining > 0);

  const [counts, setCounts] = useState<Record<number, Counts>>(() =>
    Object.fromEntries(
      open_lines.map((line) => [line.id, { good: 0, damaged: 0, lost: 0 }]),
    ),
  );

  useEffect(() => {
    if (state?.ok) {
      notify(`تم تقديم الإرجاع ${state.data.code}. بانتظار تحقّق قائد اللوازم.`);
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

  const fillAllGood = () => {
    setCounts(
      Object.fromEntries(
        open_lines.map((line) => [
          line.id,
          { good: line.remaining, damaged: 0, lost: 0 },
        ]),
      ),
    );
  };

  const totals = open_lines.map((line) => {
    const c = counts[line.id] ?? { good: 0, damaged: 0, lost: 0 };
    return { line, sum: c.good + c.damaged + c.lost, counts: c };
  });

  const over = totals.filter((t) => t.sum > t.line.remaining);
  const declared = totals.reduce((sum, t) => sum + t.sum, 0);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <ReturnIcon className="size-4" />
        تقديم إرجاع
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`إرجاع عهدة الطلب ${requestCode}`}
        description="أدخل ما تُرجعه فعلياً. قائد اللوازم سيعاين ويعتمد الكميات النهائية."
        size="lg"
      >
        <form action={formAction}>
          <input type="hidden" name="supplyRequestId" value={requestId} />
          <input
            type="hidden"
            name="lines"
            value={JSON.stringify(
              totals.map((t) => ({
                supplyLineId: t.line.id,
                good: t.counts.good,
                damaged: t.counts.damaged,
                lost: t.counts.lost,
              })),
            )}
          />

          <FormError state={state} />

          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-ink-500">
              إجمالي المُدخل: <strong className="text-ink-900">{num(declared)}</strong>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={fillAllGood}>
              الكل سليم
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[34rem] text-right text-sm">
              <thead>
                <tr>
                  <th className="border-b border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink-500">
                    الصنف
                  </th>
                  <th className="border-b border-line bg-surface-2 px-3 py-2 text-center text-xs font-bold text-ink-500">
                    في العهدة
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
                {totals.map(({ line, sum, counts: c }) => (
                  <tr key={line.id} className={sum > line.remaining ? "bg-danger-50" : ""}>
                    <td className="border-b border-line px-3 py-2 font-semibold text-ink-900">
                      {line.itemName}
                      <span className="mr-1 text-xs font-normal text-ink-400">
                        ({line.unit})
                      </span>
                    </td>
                    <td className="border-b border-line px-3 py-2 text-center tabular-nums text-ink-500">
                      {num(line.remaining)}
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
                          } من ${line.itemName}`}
                          onChange={(event) =>
                            update(line.id, key, Number(event.target.value) || 0)
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
                  (t) =>
                    `«${t.line.itemName}»: أدخلت ${num(t.sum)} والمتبقّي ${num(t.line.remaining)}`,
                )
                .join(" · ")}
            </Alert>
          ) : null}

          <Field label="ملاحظة" className="mt-4" hint="اختياري — أي تفصيل يفيد المعاينة">
            <Textarea name="note" rows={2} maxLength={500} />
          </Field>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton
              disabled={declared === 0 || over.length > 0}
              pendingLabel="جارٍ التقديم…"
            >
              تقديم الإرجاع
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
