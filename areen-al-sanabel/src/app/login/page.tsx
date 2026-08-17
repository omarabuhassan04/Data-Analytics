import { LoginForm, type DemoAccess } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { GROUP_NAME, GROUP_TAGLINE } from "@/lib/domain";

export const metadata = { title: "تسجيل الدخول" };

/**
 * لوحة الحسابات التجريبية — مخفيّة افتراضيًا في كل البيئات.
 *
 * لإعادة تفعيلها محليًا فقط: SHOW_DEMO_ACCOUNTS=true في ملف .env
 *
 * البيانات تُبنى هنا (مكوّن خادم) لا في نموذج الدخول (مكوّن عميل):
 * ما يُكتب في مكوّن العميل يُشحن إلى المتصفّح ويظهر في مصدر الصفحة حتى لو
 * لم يُعرض. بهذا الشكل لا يغادر الخادمَ شيءٌ ما لم تُفعَّل اللوحة صراحةً.
 */
function demoAccess(): DemoAccess | undefined {
  if (process.env.SHOW_DEMO_ACCOUNTS !== "true") return undefined;

  return {
    password: process.env.SEED_DEFAULT_PASSWORD ?? "",
    accounts: [
      { username: "supplies", label: "قائد اللوازم" },
      { username: "ashbal", label: "مسؤول فرقة الأشبال" },
      { username: "kashafa", label: "مسؤول فرقة الكشافة" },
      { username: "jawwala", label: "مسؤول فرقة الجوالة" },
      { username: "group.leader", label: "قائد المجموعة" },
      { username: "deputy", label: "مساعد قائد المجموعة" },
      { username: "scouts.leader", label: "قائد الكشافين" },
    ],
  };
}

/**
 * تُقرأ وجهة العودة (next) على الخادم وتُمرَّر للنموذج كخاصية بدلًا من
 * useSearchParams داخل حدّ Suspense.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="field-grid relative min-h-dvh">
      <div className="field-horizon absolute inset-0" aria-hidden />

      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center text-center">
            <Logo size={72} decorative={false} className="size-[72px]" />
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-ink-900">
              {GROUP_NAME}
            </h1>
            <p className="mt-1 text-sm text-ink-400">{GROUP_TAGLINE}</p>
          </div>

          <LoginForm nextPath={safeNext} demo={demoAccess()} />
        </div>
      </main>
    </div>
  );
}
