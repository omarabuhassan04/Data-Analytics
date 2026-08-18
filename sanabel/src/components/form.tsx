"use client";

import { useFormStatus } from "react-dom";

import { SpinnerIcon } from "@/components/icons";
import { Alert, Button, type ButtonVariant } from "@/components/ui";
import type { ActionResult } from "@/lib/errors";

/**
 * زر الإرسال — يعطّل نفسه أثناء التنفيذ ويعرض مؤشّر انتظار.
 *
 * التعطيل ليس تجميلاً: بدونه يُنشئ نقر مزدوج على «إرسال الطلب» طلبين وخصمين
 * من المخزون.
 */
export function SubmitButton({
  children,
  pendingLabel = "جارٍ التنفيذ…",
  variant = "primary",
  size = "md",
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <SpinnerIcon />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * خطأ الإجراء العام.
 *
 * الأخطاء المرتبطة بحقل بعينه تُعرض تحت الحقل نفسه عبر `fieldError`، فلا
 * تُكرَّر هنا — تكرار الرسالة مرّتين على الشاشة يجعل المستخدم يبحث عن خطأين.
 */
export function FormError({ state }: { state: ActionResult<unknown> | null }) {
  if (!state || state.ok || state.field) return null;
  return (
    <Alert tone="bad" className="mb-4">
      {state.error}
    </Alert>
  );
}

/** حقل الخطأ المرتبط باسم حقل بعينه */
export function fieldError(
  state: ActionResult<unknown> | null,
  field: string,
): string | undefined {
  if (!state || state.ok) return undefined;
  return state.field === field ? state.error : undefined;
}
