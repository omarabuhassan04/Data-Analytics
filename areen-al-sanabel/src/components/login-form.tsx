"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconWhistle } from "@/components/icons";
import { Button, Field, Input } from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/client";

/**
 * بيانات العرض التجريبي.
 *
 * تصل من الخادم ولا تُكتب في هذا الملف إطلاقًا: هذا مكوّن عميل، وأي ثابت
 * مكتوب فيه يُشحن إلى المتصفّح ويظهر في مصدر الصفحة حتى لو لم يُعرض على
 * الشاشة. حين تكون القيمة undefined لا يُرسل شيء أصلًا.
 */
export type DemoAccess = {
  password: string;
  accounts: { username: string; label: string }[];
};

export function LoginForm({
  nextPath = "/",
  demo,
}: {
  /** وجهة العودة بعد الدخول — تُتحقَّق من صحّتها على الخادم */
  nextPath?: string;
  /** يُمرَّر فقط حين تُفعَّل لوحة الحسابات التجريبية صراحةً */
  demo?: DemoAccess;
}) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/auth/login", { username, password });
      router.replace(nextPath);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <div className="rise rounded-2xl border border-sand-200 bg-sand-100 p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="اسم المستخدم" required>
          <Input
            name="username"
            autoComplete="username"
            dir="ltr"
            className="text-start"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </Field>

        <Field label="كلمة المرور" required>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            className="text-start"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-3.5 py-2.5 text-sm font-semibold text-crimson-700">
            <IconWhistle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          دخول
        </Button>
      </form>

      {demo && (
        <details className="mt-5 rounded-xl border border-sand-200 bg-sand-50 p-3">
          <summary className="cursor-pointer list-none text-sm font-bold text-ink-600">
            حسابات تجريبية
          </summary>
          <p className="mt-2 text-xs text-ink-400">
            كلمة المرور:{" "}
            <span dir="ltr" className="font-bold text-ink-800">
              {demo.password}
            </span>
          </p>
          <ul className="mt-2 space-y-1">
            {demo.accounts.map((account) => (
              <li key={account.username}>
                <button
                  type="button"
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(demo.password);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-xs transition-colors hover:bg-sand-200"
                >
                  <span className="font-semibold text-ink-500">{account.label}</span>
                  <span dir="ltr" className="font-mono text-[11px] text-ink-300">
                    {account.username}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
