import type { Metadata } from "next";

import { LoginForm } from "@/app/login/login-form";
import { Logo } from "@/components/icons";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="text-forest-700">
            <Logo className="size-16" />
          </span>
          <h1 className="mt-3 text-xl font-bold text-ink-900">
            مجموعة السنابل الكشفية
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            نظام إدارة اللوازم والعهد والمشتريات
          </p>
        </div>

        <div className="surface p-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          الحسابات يُنشئها قائد اللوازم. لا يوجد تسجيل ذاتي.
        </p>
      </div>
    </main>
  );
}
