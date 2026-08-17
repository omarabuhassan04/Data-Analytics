"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import {
  IconApproved,
  IconPlus,
  IconProcure,
  IconSend,
  IconTrash,
} from "@/components/icons";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/client";
import { formatNumber } from "@/lib/format";
import type { ItemDto, RequestDto } from "@/lib/types";

type PurchaseLine = {
  key: number;
  /** فارغ إذا كان الغرض غير مُدرج في المخزون أصلًا */
  itemId: number | null;
  itemName: string;
  quantity: number;
  note: string;
};

let lineCounter = 0;
const newLine = (): PurchaseLine => ({
  key: ++lineCounter,
  itemId: null,
  itemName: "",
  quantity: 1,
  note: "",
});

export function PurchasePage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const { data: itemsData } = useSWR<{ items: ItemDto[] }>("/api/items");

  const [lines, setLines] = useState<PurchaseLine[]>([newLine()]);
  const [purpose, setPurpose] = useState("");
  const [neededOn, setNeededOn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<RequestDto | null>(null);

  // طلبات الشراء تخصّ الأغراض التي نفدت بالكامل أو غير المُدرجة في المخزون
  const depletedItems = useMemo(
    () => (itemsData?.items ?? []).filter((item) => item.quantity <= 0),
    [itemsData],
  );

  // عند القدوم من بطاقة غرض نفد في صفحة المخزون
  const preselectId = searchParams.get("item");
  useEffect(() => {
    if (!preselectId || !itemsData) return;
    const item = itemsData.items.find((entry) => entry.id === Number(preselectId));
    if (!item) return;
    setLines((current) => {
      if (current.some((line) => line.itemId === item.id)) return current;
      const [first, ...rest] = current;
      const filled: PurchaseLine = {
        ...first,
        itemId: item.id,
        itemName: item.name,
      };
      return [filled, ...rest];
    });
  }, [preselectId, itemsData]);

  function updateLine(key: number, patch: Partial<PurchaseLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(key: number) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.key !== key),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const payload = lines
      .filter((line) => line.itemId !== null || line.itemName.trim().length > 0)
      .map((line) => ({
        itemId: line.itemId ?? undefined,
        itemName: line.itemName.trim() || undefined,
        quantity: line.quantity,
        note: line.note.trim() || undefined,
      }));

    if (payload.length === 0) {
      toast.error("أضِف غرضًا واحدًا على الأقل إلى طلب الشراء");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiPost<{ request: RequestDto }>("/api/requests", {
        type: "PURCHASE",
        purpose: purpose.trim() || undefined,
        neededOn: neededOn || undefined,
        lines: payload,
      });
      setSubmitted(response.request);
      toast.success(`تم تقديم طلب الشراء رقم #${response.request.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <Card className="p-8 text-center">
            <motion.span
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.1 }}
              className="mx-auto grid size-20 place-items-center rounded-full bg-ember-50 text-ember-600"
            >
              <IconApproved className="size-11" />
            </motion.span>
            <h2 className="mt-5 text-xl font-extrabold text-ink-900">تم تقديم الطلب</h2>
            <p className="tabular mt-2 text-sm font-bold text-ink-800">#{submitted.id}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href={`/requests/${submitted.id}`}>
                <Button>عرض الطلب</Button>
              </Link>
              <Link href="/my-requests">
                <Button variant="secondary">طلباتي</Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  setSubmitted(null);
                  setLines([newLine()]);
                  setPurpose("");
                  setNeededOn("");
                }}
              >
                طلب شراء جديد
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="طلب شراء"
      />

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader
            title="الأغراض المطلوب شراؤها"
            icon={<IconProcure className="size-5" />}
          />

          <ul className="divide-y divide-sand-200">
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <motion.li
                  key={line.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-[1fr_7rem_auto]">
                      <Field label="الغرض" required>
                        <Select
                          value={line.itemId === null ? "custom" : String(line.itemId)}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === "custom") {
                              updateLine(line.key, { itemId: null, itemName: "" });
                              return;
                            }
                            const item = depletedItems.find(
                              (entry) => entry.id === Number(value),
                            );
                            updateLine(line.key, {
                              itemId: item?.id ?? null,
                              itemName: item?.name ?? "",
                            });
                          }}
                        >
                          <option value="custom">غرض غير مُدرج في المخزون…</option>
                          {depletedItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} — {item.category.name} (نفد)
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field label="الكمية" required>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.key, {
                              quantity: Math.max(1, Number(event.target.value) || 1),
                            })
                          }
                          className="tabular text-center"
                        />
                      </Field>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length === 1}
                          aria-label="حذف السطر"
                          className="grid size-11 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-crimson-50 hover:text-crimson-600 disabled:opacity-30"
                        >
                          <IconTrash className="size-4" />
                        </button>
                      </div>
                    </div>

                    {line.itemId === null && (
                      <Field label="اسم الغرض المطلوب" required>
                        <Input
                          value={line.itemName}
                          onChange={(event) =>
                            updateLine(line.key, { itemName: event.target.value })
                          }
                          placeholder="مثال: حذاء مسير جبلي"
                        />
                      </Field>
                    )}

                    <Field label="ملاحظة">
                      <Input
                        value={line.note}
                        onChange={(event) => updateLine(line.key, { note: event.target.value })}
                        placeholder="مواصفات، مقاس، لون… (اختياري)"
                      />
                    </Field>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="p-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLines((current) => [...current, newLine()])}
            >
              <IconPlus className="size-4" />
              إضافة غرض آخر
            </Button>
          </div>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="font-bold text-ink-900">تفاصيل الطلب</h2>

            <div className="mt-4 space-y-4">
              <Field label="الغرض من الطلب">
                <Textarea
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="اكتب المناسبة أو سبب الحاجة…"
                  rows={3}
                />
              </Field>

              <Field label="تاريخ الحاجة">
                <Input
                  type="date"
                  value={neededOn}
                  onChange={(event) => setNeededOn(event.target.value)}
                />
              </Field>
            </div>

            <dl className="mt-5 flex justify-between border-t border-sand-200 pt-4 text-sm">
              <dt className="text-ink-400">عدد الأصناف</dt>
              <dd className="tabular font-bold text-ink-900">{formatNumber(lines.length)}</dd>
            </dl>

            <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting}>
              <IconSend className="size-4" />
              تقديم طلب الشراء
            </Button>
          </Card>

          <p className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-xs leading-relaxed text-ink-400">
            طلب الشراء لا يخصم من المخزون. بعد الموافقة والتزويد، يضيف قائد اللوازم الكميات
            الجديدة إلى المخزون لتصبح متاحة لطلبات العهدة.
          </p>
        </div>
      </form>
    </div>
  );
}
