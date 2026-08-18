"use client";

import { useActionState } from "react";

import { login } from "@/actions/auth";
import { FormError, SubmitButton, fieldError } from "@/components/form";
import { Field, Input } from "@/components/ui";

export function LoginForm() {
  const [state, formAction] = useActionState(login, null);

  return (
    <form action={formAction} noValidate>
      <FormError state={state} />

      <div className="space-y-4">
        <Field
          label="اسم المستخدم"
          required
          error={fieldError(state, "username")}
        >
          <Input
            name="username"
            autoComplete="username"
            dir="ltr"
            className="text-left"
            required
            // بلا autoFocus: نقل التركيز دون طلب المستخدم يربك قارئ الشاشة
            // ويقفز بالتمرير على الهاتف
          />
        </Field>

        <Field
          label="كلمة المرور"
          required
          error={fieldError(state, "password")}
        >
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            dir="ltr"
            className="text-left"
            required
          />
        </Field>
      </div>

      <SubmitButton className="mt-6 w-full" size="lg" pendingLabel="جارٍ الدخول…">
        تسجيل الدخول
      </SubmitButton>
    </form>
  );
}
