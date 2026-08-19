import type { Metadata } from "next";

import { LoginForm } from "@/app/login/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            مجموعة السنابل الكشفية
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            نظام إدارة اللوازم والعهد والمشتريات
          </p>
        </div>

        <div className="surface p-6">
          <LoginForm />
        </div>

        <div className="mt-6 flex justify-center">
          <ThemeToggle />
        </div>

        <p className="mt-5 text-center text-xs text-ink-400">
          الحسابات يُنشئها قائد اللوازم. لا يوجد تسجيل ذاتي.
        </p>
      </div>
    </main>
  );
}
