"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  createPurchaseRequest,
  updatePurchaseRequest,
} from "@/actions/purchase";
import { FormError, SubmitButton, fieldError } from "@/components/form";
import { useToast } from "@/components/toast";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { UNITS } from "@/lib/domain";

type Category = { id: number; name: string };

type Existing = {
  id: number;
  itemName: string;
  unit: string;
  quantity: number;
  categoryId: number | null;
  details: string | null;
  wasRejected: boolean;
};

export function PurchaseForm({
  categories,
  mode,
  existing,
  onDone,
}: {
  categories: Category[];
  mode: "create" | "edit";
  existing?: Existing;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [state, formAction] = useActionState(
    mode === "create" ? createPurchaseRequest : updatePurchaseRequest,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;

    const data = state.data;

    if (mode === "create") {
      notify(`تم تقديم طلب الشراء ${data.code}. بانتظار قرار قائد اللوازم.`);
      router.push(`/purchase/${data.id}`);
      return;
    }

    notify(
      data.resubmitted
        ? "أُعيد تقديم الطلب بعد التعديل — عاد قيد الانتظار."
        : "حُفظت التعديلات.",
    );
    onDone?.();
    router.refresh();
  }, [state, mode, notify, router, onDone]);

  return (
    <form action={formAction} noValidate>
      {existing ? <input type="hidden" name="id" value={existing.id} /> : null}

      <FormError state={state} />

      <div className="space-y-4">
        <Field
          label="اسم الصنف المطلوب"
          required
          error={fieldError(state, "itemName")}
          hint="اكتب اسماً واضحاً — سيُستخدم عند التوريد"
        >
          <Input
            name="itemName"
            defaultValue={existing?.itemName}
            maxLength={120}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الكمية" required error={fieldError(state, "quantity")}>
            <Input
              type="number"
              name="quantity"
              min={1}
              max={100000}
              inputMode="numeric"
              defaultValue={existing?.quantity ?? 1}
              required
            />
          </Field>

          <Field label="وحدة القياس" required error={fieldError(state, "unit")}>
            <Select name="unit" defaultValue={existing?.unit ?? "قطعة"}>
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="التصنيف المقترح"
          hint="يساعد قائد اللوازم على تصنيف الصنف عند التوريد"
          error={fieldError(state, "categoryId")}
        >
          <Select
            name="categoryId"
            defaultValue={existing?.categoryId ? String(existing.categoryId) : ""}
          >
            <option value="">بلا تصنيف محدّد</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="التفاصيل والمبرّر"
          hint="المواصفات المطلوبة وسبب الحاجة"
          error={fieldError(state, "details")}
        >
          <Textarea
            name="details"
            rows={4}
            maxLength={1000}
            defaultValue={existing?.details ?? ""}
            placeholder="مثال: خيام مقاومة للماء لمخيّم الشتاء، المتوفّر لدينا لا يكفي…"
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {onDone ? (
          <Button type="button" variant="outline" onClick={onDone}>
            إلغاء
          </Button>
        ) : null}
        <SubmitButton pendingLabel="جارٍ الحفظ…">
          {mode === "create"
            ? "تقديم طلب الشراء"
            : existing?.wasRejected
              ? "حفظ وإعادة التقديم"
              : "حفظ التعديلات"}
        </SubmitButton>
      </div>
    </form>
  );
}
