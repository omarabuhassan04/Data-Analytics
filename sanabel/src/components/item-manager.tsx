"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  adjustStock,
  createCategory,
  createItem,
  toggleItemArchive,
  updateItem,
} from "@/actions/inventory";
import { FormError, SubmitButton, fieldError } from "@/components/form";
import { EditIcon, LedgerIcon, PlusIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { ActionResult } from "@/lib/errors";
import { UNITS } from "@/lib/domain";
import { num } from "@/lib/format";

type Category = { id: number; name: string };

export type ManagedItem = {
  id: number;
  name: string;
  unit: string;
  categoryId: number;
  quantity: number;
  threshold: number;
  notes: string | null;
  isActive: boolean;
};

/* ------------------------------------------------------------ إضافة صنف */

export function NewItemButton({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createItem, null);

  useEffect(() => {
    if (state?.ok) {
      notify("أُضيف الصنف إلى المخزون.");
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        صنف جديد
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة صنف جديد"
        description="الرصيد الافتتاحي يُسجَّل كحركة في الدفتر، لا ككتابة صامتة."
      >
        <form action={formAction} noValidate>
          <FormError state={state} />
          <ItemFields categories={categories} state={state} showOpening />
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton pendingLabel="جارٍ الإضافة…">إضافة الصنف</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------ تعديل صنف */

export function EditItemButton({
  item,
  categories,
}: {
  item: ManagedItem;
  categories: Category[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateItem, null);

  useEffect(() => {
    if (state?.ok) {
      notify("حُفظت بيانات الصنف.");
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`تعديل ${item.name}`}
        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-2 hover:text-ink-900"
      >
        <EditIcon className="size-4" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`تعديل «${item.name}»`}
        description="تعديل البيانات لا يمسّ الكمية — استخدم «الجرد» لتغيير الرصيد."
      >
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={item.id} />
          <FormError state={state} />
          <ItemFields categories={categories} state={state} item={item} />
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton pendingLabel="جارٍ الحفظ…">حفظ التعديلات</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ItemFields({
  categories,
  state,
  item,
  showOpening,
}: {
  categories: Category[];
  state: ActionResult<unknown> | null;
  item?: ManagedItem;
  showOpening?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Field label="اسم الصنف" required error={fieldError(state, "name")}>
        <Input name="name" defaultValue={item?.name} maxLength={120} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="التصنيف" required error={fieldError(state, "categoryId")}>
          <Select
            name="categoryId"
            defaultValue={item ? String(item.categoryId) : ""}
            required
          >
            <option value="">اختر تصنيفاً…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="وحدة القياس" required error={fieldError(state, "unit")}>
          <Select name="unit" defaultValue={item?.unit ?? "قطعة"}>
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {showOpening ? (
          <Field
            label="الرصيد الافتتاحي"
            error={fieldError(state, "quantity")}
            hint="الكمية الموجودة الآن في المقر"
          >
            <Input
              type="number"
              name="quantity"
              min={0}
              defaultValue={0}
              inputMode="numeric"
            />
          </Field>
        ) : null}

        <Field
          label="حد التنبيه"
          error={fieldError(state, "threshold")}
          hint="يُنبَّه عند بلوغ هذا الرصيد"
        >
          <Input
            type="number"
            name="threshold"
            min={0}
            defaultValue={item?.threshold ?? 0}
            inputMode="numeric"
          />
        </Field>
      </div>

      <Field label="ملاحظات" error={fieldError(state, "notes")}>
        <Textarea name="notes" rows={2} maxLength={500} defaultValue={item?.notes ?? ""} />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ الجرد */

export function AdjustButton({ item }: { item: ManagedItem }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState(item.quantity);
  const [state, formAction] = useActionState(adjustStock, null);

  useEffect(() => {
    if (state?.ok) {
      const delta = state.data.delta;
      notify(
        `عُدّل الرصيد ${delta > 0 ? "بالزيادة" : "بالنقصان"} ${num(Math.abs(delta))}.`,
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router]);

  const delta = counted - item.quantity;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`جرد ${item.name}`}
        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-2 hover:text-ink-900"
      >
        <LedgerIcon className="size-4" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`جرد «${item.name}»`}
        description="أدخل الكمية الفعلية بعد العدّ، والنظام يحسب الفارق ويسجّله."
        size="sm"
      >
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={item.id} />
          <FormError state={state} />

          <div className="mb-4 rounded-lg bg-surface-2 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-500">الرصيد المسجّل</span>
              <span className="font-bold tabular-nums text-ink-900">
                {num(item.quantity)} {item.unit}
              </span>
            </div>
            {delta !== 0 ? (
              <div className="mt-1.5 flex justify-between border-t border-line pt-1.5">
                <span className="text-ink-500">الفارق</span>
                <span
                  className={
                    delta > 0
                      ? "font-bold tabular-nums text-ok-500"
                      : "font-bold tabular-nums text-danger-500"
                  }
                >
                  {delta > 0 ? "+" : "−"}
                  {num(Math.abs(delta))}
                </span>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <Field
              label="الكمية الفعلية بعد العدّ"
              required
              error={fieldError(state, "counted")}
            >
              <Input
                type="number"
                name="counted"
                min={0}
                inputMode="numeric"
                value={counted}
                onChange={(event) => setCounted(Number(event.target.value) || 0)}
                required
              />
            </Field>

            <Field
              label="سبب التعديل"
              required
              error={fieldError(state, "note")}
              hint="يُحفظ في دفتر الحركة — رصيد يتغيّر بلا سبب لا يُراجَع لاحقاً"
            >
              <Textarea
                name="note"
                rows={2}
                maxLength={300}
                required
                placeholder="مثال: جرد سنوي — وُجدت قطعتان إضافيتان في المستودع"
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton disabled={delta === 0} pendingLabel="جارٍ التسجيل…">
              تسجيل الجرد
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------- الأرشفة */

export function ArchiveButton({ item }: { item: ManagedItem }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(toggleItemArchive, null);

  useEffect(() => {
    if (state?.ok) {
      notify(state.data.isActive ? "استُعيد الصنف." : "أُرشف الصنف.");
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router]);

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {item.isActive ? "أرشفة" : "استعادة"}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={item.isActive ? `أرشفة «${item.name}»` : `استعادة «${item.name}»`}
        description={
          item.isActive
            ? "لن يظهر الصنف في طلبات اللوازم الجديدة. لا يُحذف، والسجلات القديمة تبقى كما هي."
            : "سيعود الصنف متاحاً للطلب من جديد."
        }
        size="sm"
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={item.id} />
          <FormError state={state} />
          {item.isActive && item.quantity > 0 ? (
            <Alert tone="warn" className="mb-4 text-xs">
              الرصيد الحالي {num(item.quantity)} {item.unit} — سيبقى مسجّلاً لكنه
              يخرج من متناول الفرق.
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              تراجع
            </Button>
            <SubmitButton
              variant={item.isActive ? "danger" : "primary"}
              pendingLabel="جارٍ التنفيذ…"
            >
              تأكيد
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------ تصنيف جديد */

export function NewCategoryButton() {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createCategory, null);

  useEffect(() => {
    if (state?.ok) {
      notify("أُضيف التصنيف.");
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        تصنيف
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة تصنيف"
        size="sm"
      >
        <form action={formAction} noValidate>
          <FormError state={state} />
          <Field label="اسم التصنيف" required error={fieldError(state, "name")}>
            <Input name="name" maxLength={60} required placeholder="مثال: أدوات الملاحة" />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton pendingLabel="جارٍ الإضافة…">إضافة</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
