"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import {
  IconApproved,
  IconFootlocker,
  IconMinus,
  IconPlus,
  IconRestock,
  IconSend,
  IconTrash,
  IconWhistle,
} from "@/components/icons";
import { useCart } from "@/components/cart";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/client";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { ItemDto, RequestDto } from "@/lib/types";

type ExtraLine = {
  itemId: number;
  name: string;
  unit: string;
  available: number;
  extra: number;
};

export function CartPage() {
  const cart = useCart();
  const toast = useToast();
  const searchParams = useSearchParams();

  const { data: itemsData, mutate: refreshItems } = useSWR<{ items: ItemDto[] }>("/api/items", {
    refreshInterval: 15_000,
  });

  const [purpose, setPurpose] = useState("");
  const [neededOn, setNeededOn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<RequestDto | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);

  // الكميات المتاحة الحيّة — قد تتغيّر بينما المستخدم يجهّز سلته
  const liveItems = useMemo(() => {
    const map = new Map<number, ItemDto>();
    for (const item of itemsData?.items ?? []) map.set(item.id, item);
    return map;
  }, [itemsData]);

  function availableFor(itemId: number, fallback: number): number {
    return liveItems.get(itemId)?.quantity ?? fallback;
  }

  const overLines = cart.lines.filter(
    (line) => line.quantity > availableFor(line.itemId, line.available),
  );
  const hasShortage = overLines.length > 0;

  // فتح نافذة الكمية الإضافية مباشرة عند القدوم من صفحة المخزون
  const extraItemParam = searchParams.get("extra");
  useEffect(() => {
    if (extraItemParam) setExtraOpen(true);
  }, [extraItemParam]);

  async function submitEquipment(event: React.FormEvent) {
    event.preventDefault();
    if (cart.lines.length === 0) return;

    setSubmitting(true);
    try {
      const response = await apiPost<{ request: RequestDto }>("/api/requests", {
        type: "EQUIPMENT",
        purpose: purpose.trim() || undefined,
        neededOn: neededOn || undefined,
        lines: cart.lines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          note: line.note?.trim() || undefined,
        })),
      });
      cart.clear();
      setSubmitted(response.request);
      void refreshItems();
      toast.success(`تم تقديم طلب العهدة رقم #${response.request.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
      void refreshItems();
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------------------------ حالة ما بعد التقديم */

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
              className="mx-auto grid size-20 place-items-center rounded-full bg-forest-50 text-forest-600"
            >
              <IconApproved className="size-11" />
            </motion.span>
            <h2 className="mt-5 text-xl font-extrabold text-ink-900">تم تقديم طلب العهدة</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              رقم الطلب <span className="tabular font-bold text-ink-800">#{submitted.id}</span> —
              حُجزت الكميات من المخزون بانتظار قرار قائد اللوازم.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href={`/requests/${submitted.id}`}>
                <Button>عرض الطلب</Button>
              </Link>
              <Link href="/my-requests">
                <Button variant="secondary">طلباتي</Button>
              </Link>
              <Link href="/inventory">
                <Button variant="ghost" onClick={() => setSubmitted(null)}>
                  متابعة التصفّح
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  /* --------------------------------------------------------- سلة فارغة */

  if (cart.lines.length === 0) {
    return (
      <div>
        <PageHeader title="سلة العهدة" />
        <Card>
          <EmptyState
            icon={<IconFootlocker className="size-6" />}
            title="سلتك فارغة"
            action={
              <Link href="/inventory">
                <Button>تصفّح المخزون</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  /* --------------------------------------------------------- سلة العهدة */

  return (
    <div>
      <PageHeader
        title="سلة العهدة"
        description={`${formatNumber(cart.count)} صنف · ${formatNumber(cart.totalUnits)} قطعة`}
        action={
          <Button variant="ghost" size="sm" onClick={cart.clear}>
            <IconTrash className="size-4" />
            إفراغ السلة
          </Button>
        }
      />

      <AnimatePresence>
        {hasShortage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-ember-300 bg-ember-50 p-4"
          >
            <IconWhistle className="size-5 shrink-0 text-ember-600" />
            <p className="flex-1 text-sm font-semibold text-ember-700">
              بعض الكميات تتجاوز المتوفّر حاليًا في المخزون. خفّضها إلى المتاح، أو قدّم «طلب كمية
              إضافية» بالفارق.
            </p>
            <Button size="sm" variant="secondary" onClick={() => setExtraOpen(true)}>
              <IconRestock className="size-4" />
              طلب كمية إضافية
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={submitEquipment} className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title="الأغراض المطلوبة" subtitle="تُخصم الكميات من المخزون فور التقديم" />
          <ul className="divide-y divide-sand-200">
            <AnimatePresence initial={false}>
              {cart.lines.map((line) => {
                const available = availableFor(line.itemId, line.available);
                const over = line.quantity > available;

                return (
                  <motion.li
                    key={line.itemId}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-ink-900">{line.name}</h3>
                          <p
                            className={cn(
                              "mt-0.5 text-xs font-semibold",
                              over ? "text-crimson-600" : "text-ink-400",
                            )}
                          >
                            المتوفّر: {formatNumber(available)} {line.unit}
                            {over && " — الكمية المطلوبة تتجاوز المتاح"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-xl border border-sand-300 bg-sand-50">
                            <button
                              type="button"
                              onClick={() => cart.setQuantity(line.itemId, line.quantity - 1)}
                              aria-label="إنقاص الكمية"
                              className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-sand-100"
                            >
                              <IconMinus className="size-4" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(event) =>
                                cart.setQuantity(line.itemId, Number(event.target.value) || 1)
                              }
                              aria-label={`الكمية المطلوبة من ${line.name}`}
                              className={cn(
                                "tabular w-14 border-x border-sand-300 bg-transparent py-1.5 text-center text-sm font-bold focus:outline-none",
                                over ? "text-crimson-600" : "text-ink-900",
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => cart.setQuantity(line.itemId, line.quantity + 1)}
                              aria-label="زيادة الكمية"
                              className="grid size-9 place-items-center rounded-xl text-ink-500 hover:bg-sand-100"
                            >
                              <IconPlus className="size-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => cart.remove(line.itemId)}
                            aria-label={`إزالة ${line.name}`}
                            className="grid size-9 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-crimson-50 hover:text-crimson-600"
                          >
                            <IconTrash className="size-4" />
                          </button>
                        </div>
                      </div>

                      {over && (
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(line.itemId, Math.max(available, 1))}
                          disabled={available <= 0}
                          className="mt-2 text-xs font-bold text-ember-600 hover:underline disabled:opacity-50"
                        >
                          خفض الكمية إلى المتاح ({formatNumber(available)})
                        </button>
                      )}

                      <Input
                        value={line.note ?? ""}
                        onChange={(event) => cart.setNote(line.itemId, event.target.value)}
                        placeholder="ملاحظة على هذا الغرض (اختياري)"
                        className="mt-3 py-2 text-sm"
                        aria-label={`ملاحظة على ${line.name}`}
                      />
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </Card>

        {/* ملخّص الطلب */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="font-bold text-ink-900">تفاصيل الطلب</h2>

            <div className="mt-4 space-y-4">
              <Field label="الغرض من الطلب" hint="مثال: مخيّم نهاية الأسبوع في غابات دبين">
                <Textarea
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="اكتب المناسبة أو النشاط…"
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

            <dl className="mt-5 space-y-2 border-t border-sand-200 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-400">عدد الأصناف</dt>
                <dd className="tabular font-bold text-ink-900">{formatNumber(cart.count)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-400">إجمالي القطع</dt>
                <dd className="tabular font-bold text-ink-900">
                  {formatNumber(cart.totalUnits)}
                </dd>
              </div>
            </dl>

            <Button
              type="submit"
              size="lg"
              className="mt-5 w-full"
              loading={submitting}
              disabled={hasShortage}
            >
              <IconSend className="size-4" />
              تقديم طلب العهدة
            </Button>

            {hasShortage && (
              <p className="mt-2 text-center text-xs font-semibold text-crimson-600">
                عالِج الكميات غير المتوفّرة أولًا
              </p>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-sm font-bold text-ink-800">تحتاج كمية أكبر من المتوفّر؟</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">
              قدّم «طلب كمية إضافية» بالفارق، وسيتولّى قائد اللوازم تدبيره.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setExtraOpen(true)}
            >
              <IconRestock className="size-4" />
              طلب كمية إضافية
            </Button>
          </Card>
        </div>
      </form>

      <AdditionalQuantityModal
        open={extraOpen}
        onClose={() => setExtraOpen(false)}
        liveItems={liveItems}
        focusItemId={extraItemParam ? Number(extraItemParam) : null}
      />
    </div>
  );
}

/* ----------------------------------------------- نافذة طلب الكمية الإضافية */

function AdditionalQuantityModal({
  open,
  onClose,
  liveItems,
  focusItemId,
}: {
  open: boolean;
  onClose: () => void;
  liveItems: Map<number, ItemDto>;
  focusItemId: number | null;
}) {
  const cart = useCart();
  const toast = useToast();

  const [lines, setLines] = useState<ExtraLine[]>([]);
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // تُبنى الأسطر من السلة (الفائق منها) بالإضافة إلى الغرض القادم من صفحة المخزون
  useEffect(() => {
    if (!open) return;

    const collected = new Map<number, ExtraLine>();

    for (const line of cart.lines) {
      const available = liveItems.get(line.itemId)?.quantity ?? line.available;
      const extra = Math.max(0, line.quantity - available);
      collected.set(line.itemId, {
        itemId: line.itemId,
        name: line.name,
        unit: line.unit,
        available,
        extra: extra || 1,
      });
    }

    if (focusItemId && !collected.has(focusItemId)) {
      const item = liveItems.get(focusItemId);
      if (item) {
        collected.set(item.id, {
          itemId: item.id,
          name: item.name,
          unit: item.unit,
          available: item.quantity,
          extra: 1,
        });
      }
    }

    setLines([...collected.values()]);
  }, [open, cart.lines, liveItems, focusItemId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = lines.filter((line) => line.extra > 0);
    if (payload.length === 0) {
      toast.error("حدّد كمية إضافية واحدة على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiPost<{ request: RequestDto }>("/api/requests", {
        type: "ADDITIONAL",
        purpose: purpose.trim() || undefined,
        lines: payload.map((line) => ({ itemId: line.itemId, quantity: line.extra })),
      });
      toast.success(`تم تقديم طلب الكمية الإضافية رقم #${response.request.id}`);
      setPurpose("");
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="طلب كمية إضافية"
      size="lg"
    >
      {lines.length === 0 ? (
        <EmptyState
          title="لا توجد أغراض لعرضها"
        />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ul className="divide-y divide-sand-200 rounded-xl border border-sand-200">
            {lines.map((line, index) => (
              <li key={line.itemId} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{line.name}</p>
                  <p className="text-xs text-ink-400">
                    المتوفّر حاليًا: {formatNumber(line.available)} {line.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-ink-400" htmlFor={`extra-${line.itemId}`}>
                    الإضافي
                  </label>
                  <input
                    id={`extra-${line.itemId}`}
                    type="number"
                    min={0}
                    value={line.extra}
                    onChange={(event) => {
                      const next = Math.max(0, Number(event.target.value) || 0);
                      setLines((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, extra: next } : entry,
                        ),
                      );
                    }}
                    className="tabular w-20 rounded-lg border border-sand-300 px-2 py-1.5 text-center text-sm font-bold focus:border-ember-400 focus:outline-none"
                  />
                </div>
              </li>
            ))}
          </ul>

          <Field label="سبب الحاجة إلى كمية إضافية">
            <Textarea
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="مثال: ارتفع عدد المشاركين إلى ٣٥ شبلًا"
              rows={2}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" loading={submitting}>
              <IconSend className="size-4" />
              تقديم الطلب
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
