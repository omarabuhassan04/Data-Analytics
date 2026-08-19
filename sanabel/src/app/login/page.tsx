import type { Metadata } from "next";

import { LoginForm } from "@/app/login/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "تسجيل الدخول" };

/**
 * شاشة الدخول.
 *
 * لوحان: يمينُها لوح أخضر عميق يحمل الهوية وحدها، ويسارها النموذج على ورق
 * هادئ. الفصل بينهما هو ما يجعل الشاشة تبدو مدخلاً لمنتج له علامة، بدل
 * بطاقة عائمة في وسط صفحة فارغة.
 *
 * على الهاتف ينهار اللوحان إلى شريط هوية فوق النموذج.
 */
export default function LoginPage() {
  return (
    <main className="relative z-10 min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* لوح الهوية */}
      <section className="relative overflow-hidden bg-rail px-6 py-10 lg:flex lg:flex-col lg:justify-between lg:border-e lg:border-rail-line lg:px-14 lg:py-14">
        {/* كنتور خافت داخل اللوح */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Cg fill='none' stroke='%23c9e3d2' stroke-width='1.2'%3E%3Cpath d='M-20 44C40 8 96 76 160 44s120 26 180-8'/%3E%3Cpath d='M-20 92C44 58 100 122 160 92s118 24 180-10'/%3E%3Cpath d='M-20 140C48 108 104 168 160 140s116 22 180-12'/%3E%3Cpath d='M-20 188C52 158 108 214 160 188s114 20 180-14'/%3E%3Cpath d='M-20 236C56 208 112 260 160 236s112 18 180-16'/%3E%3Cpath d='M-20 284C60 258 116 306 160 284s110 16 180-18'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "320px 320px",
          }}
        />

        <div className="relative">
          <p className="text-[11px] font-bold tracking-[0.16em] text-brass-300">
            مجموعة السنابل الكشفية
          </p>
          <h1 className="display mt-4 text-[30px] leading-[1.25] text-rail-fg lg:text-[40px]">
            نظام اللوازم
            <span className="mt-1 block text-brass-300">والعهد والمشتريات</span>
          </h1>
          <div className="mt-6 h-px w-16 bg-brass-500/70" aria-hidden />
          <p className="mt-6 max-w-sm text-sm leading-[1.9] text-rail-muted">
            مخزون المقر، وعهد الفرق، وطلبات الشراء — في سجلّ واحد يعرف من أخذ،
            ومتى، وما الذي عاد.
          </p>
        </div>

        {/* أعمدة القيم — تظهر على الشاشات الواسعة وحدها */}
        <dl className="relative mt-12 hidden gap-8 lg:grid lg:grid-cols-3">
          {[
            ["أمانة", "كل حركة مسجّلة باسم صاحبها"],
            ["دقّة", "الرصيد يساوي دفتره دائماً"],
            ["وضوح", "لكل فرقة نطاقها ولا تتعدّاه"],
          ].map(([term, detail]) => (
            <div key={term}>
              <dt className="display text-[13px] text-brass-300">{term}</dt>
              <dd className="mt-1.5 text-[12px] leading-relaxed text-rail-muted">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* لوح النموذج */}
      <section className="flex items-center justify-center px-5 py-12 lg:px-10">
        <div className="w-full max-w-[22rem]">
          <div className="mb-7">
            <p className="eyebrow">بوابة الدخول</p>
            <h2 className="display mt-1.5 text-[22px] text-ink-900">
              تسجيل الدخول
            </h2>
          </div>

          <div className="surface rule-brass relative p-6">
            <LoginForm />
          </div>

          <div className="mt-7 flex items-center justify-between gap-4">
            <p className="text-[11px] leading-relaxed text-ink-400">
              الحسابات يُنشئها قائد اللوازم.
              <br />
              لا يوجد تسجيل ذاتي.
            </p>
            <ThemeToggle />
          </div>
        </div>
      </section>
    </main>
  );
}
