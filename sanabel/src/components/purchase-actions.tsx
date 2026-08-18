"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  cancelPurchaseRequest,
  decidePurchaseRequest,
  fulfillPurchaseRequest,
} from "@/actions/purchase";
import { FormError, SubmitButton, fieldError } from "@/components/form";
import { CheckIcon, EditIcon, TruckIcon, XIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PurchaseForm } from "@/components/purchase-form";
import { useToast } from "@/components/toast";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";

type Category = { id: number; name: string };
type Item = { id: number; name: string; unit: string; categoryName: string };

/* ------------------------------------------------------- قرار قائد اللوازم */

export function DecisionPanel({
  id,
  code,
  itemName,
}: {
  id: number;
  code: string;
  itemName: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [mode, setMode] = useState<"APPROVE" | "REJECT" | null>(null);
  const [state, formAction] = useActionState(decidePurchaseRequest, null);

  useEffect(() => {
    if (state?.ok) {
      notify(
        state.data.status === "APPROVED"
          ? `تمت الموافقة على الطلب ${code}.`
          : `رُفض الطلب ${code} — يمكن للفرقة تعديله وإعادة تقديمه.`,
      );
      setMode(null);
      router.refresh();
    }
  }, [state, notify, router, code]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setMode("APPROVE")} className="flex-1">
          <CheckIcon className="size-4" />
          موافقة
        </Button>
        <Button variant="danger" onClick={() => setMode("REJECT")} className="flex-1">
          <XIcon className="size-4" />
          رفض
        </Button>
      </div>

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === "APPROVE" ? `الموافقة على ${code}` : `رفض ${code}`}
        description={
          mode === "APPROVE"
            ? `«${itemName}» — الموافقة قرار إداري ولا تضيف شيئاً للمخزون حتى تسجيل التوريد.`
            : `«${itemName}» — اذكر السبب حتى تتمكّن الفرقة من التعديل وإعادة التقديم.`
        }
        size="sm"
      >
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value={mode ?? ""} />

          <FormError state={state} />

          <Field
            label={mode === "APPROVE" ? "ملاحظة الموافقة" : "سبب الرفض"}
            required={mode === "REJECT"}
            error={fieldError(state, "note")}
            hint={mode === "APPROVE" ? "اختياري" : undefined}
          >
            <Textarea
              name="note"
              rows={3}
              maxLength={500}
              required={mode === "REJECT"}
              placeholder={
                mode === "APPROVE"
                  ? "مثال: يُشترى من مورّد المعسكرات…"
                  : "مثال: الكمية أكبر من الحاجة، أعِد التقديم بعدد ٤…"
              }
            />
          </Field>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMode(null)}>
              إلغاء
            </Button>
            <SubmitButton
              variant={mode === "REJECT" ? "danger" : "primary"}
              pendingLabel="جارٍ الحفظ…"
            >
              {mode === "APPROVE" ? "تأكيد الموافقة" : "تأكيد الرفض"}
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ التوريد */

export function FulfillPanel({
  id,
  code,
  itemName,
  quantity,
  unit,
  items,
  categories,
  suggestedCategoryId,
}: {
  id: number;
  code: string;
  itemName: string;
  quantity: number;
  unit: string;
  items: Item[];
  categories: Category[];
  suggestedCategoryId: number | null;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>("");
  const [state, formAction] = useActionState(fulfillPurchaseRequest, null);

  useEffect(() => {
    if (state?.ok) {
      notify(`تم توريد «${itemName}» وأُضيفت الكمية إلى المخزون.`);
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router, itemName]);

  return (
    <>
      <Button variant="brass" onClick={() => setOpen(true)} className="w-full">
        <TruckIcon className="size-4" />
        تسجيل التوريد
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`توريد الطلب ${code}`}
        description="سجّل ما وصل فعلاً. هذه هي اللحظة التي يزيد فيها المخزون."
      >
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />

          <FormError state={state} />

          <div className="space-y-4">
            <Field
              label="الكمية المستلمة"
              required
              error={fieldError(state, "receivedQuantity")}
              hint={`المطلوب في الطلب: ${quantity} ${unit}`}
            >
              <Input
                type="number"
                name="receivedQuantity"
                min={1}
                inputMode="numeric"
                defaultValue={quantity}
                required
              />
            </Field>

            <Field
              label="يُضاف إلى"
              hint="اختر صنفاً قائماً، أو اتركه ليُنشأ صنف جديد بالاسم المطلوب"
            >
              <Select
                name="itemId"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              >
                <option value="">صنف جديد باسم «{itemName}»</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.categoryName}
                  </option>
                ))}
              </Select>
            </Field>

            {target === "" ? (
              <Field
                label="تصنيف الصنف الجديد"
                required
                error={fieldError(state, "newCategoryId")}
              >
                <Select
                  name="newCategoryId"
                  defaultValue={suggestedCategoryId ? String(suggestedCategoryId) : ""}
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
            ) : null}
          </div>

          <Alert tone="info" className="mt-4 text-xs">
            ستُسجَّل حركة «توريد مشتريات» في دفتر الحركة، ويصبح الطلب «تم التوريد».
          </Alert>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton variant="brass" pendingLabel="جارٍ التوريد…">
              تأكيد التوريد
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* -------------------------------------------------- تعديل الفرقة وإلغاؤها */

export function EditPanel({
  categories,
  existing,
}: {
  categories: Category[];
  existing: {
    id: number;
    itemName: string;
    unit: string;
    quantity: number;
    categoryId: number | null;
    details: string | null;
    wasRejected: boolean;
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <EditIcon className="size-4" />
        {existing.wasRejected ? "تعديل وإعادة التقديم" : "تعديل الطلب"}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={existing.wasRejected ? "تعديل وإعادة التقديم" : "تعديل الطلب"}
        description={
          existing.wasRejected
            ? "عالج سبب الرفض ثم أعِد التقديم — يعود الطلب قيد الانتظار."
            : "يمكن التعديل ما دام الطلب لم يُبتّ فيه."
        }
      >
        <PurchaseForm
          categories={categories}
          mode="edit"
          existing={existing}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

export function CancelPanel({ id, code }: { id: number; code: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(cancelPurchaseRequest, null);

  useEffect(() => {
    if (state?.ok) {
      notify(`أُلغي الطلب ${code}.`);
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router, code]);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="w-full">
        إلغاء الطلب
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`إلغاء الطلب ${code}`}
        description="لا يمكن التراجع عن الإلغاء. يمكنك تقديم طلب جديد لاحقاً."
        size="sm"
      >
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <FormError state={state} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              تراجع
            </Button>
            <SubmitButton variant="danger" pendingLabel="جارٍ الإلغاء…">
              تأكيد الإلغاء
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
