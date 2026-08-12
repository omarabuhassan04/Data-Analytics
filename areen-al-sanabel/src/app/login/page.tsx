import { CampfireScene } from "@/components/campfire-scene";
import { IgniteInvite } from "@/components/ignite-invite";
import { IgnitionProvider } from "@/components/ignition";
import { LoginForm, type DemoAccess } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { GROUP_NAME } from "@/lib/domain";

export const metadata = { title: "تسجيل الدخول" };

/**
 * لوحة الحسابات التجريبية — مخفيّة افتراضيًا في كل البيئات.
 *
 * كانت تعرض أسماء الحسابات السبعة وكلمة المرور المشتركة على صفحة الدخول،
 * وهو ما لا يصلح مع رابط عام. لإعادة تفعيلها محليًا فقط:
 *   SHOW_DEMO_ACCOUNTS=true في ملف .env
 *
 * البيانات تُبنى هنا (مكوّن خادم) لا في نموذج الدخول (مكوّن عميل):
 * ما يُكتب في مكوّن العميل يُشحن إلى المتصفّح ويظهر في مصدر الصفحة حتى لو
 * لم يُعرض. بهذا الشكل لا يغادر الخادمَ شيءٌ ما لم تُفعَّل اللوحة صراحةً.
 *
 * لا علاقة لهذا كلّه بالحسابات نفسها: كلّها باقية وفعّالة في قاعدة البيانات.
 */
function demoAccess(): DemoAccess | undefined {
  if (process.env.SHOW_DEMO_ACCOUNTS !== "true") return undefined;

  return {
    password: process.env.SEED_DEFAULT_PASSWORD ?? "",
    accounts: [
      { username: "supplies", label: "قائد اللوازم — صلاحيات كاملة" },
      { username: "ashbal", label: "مسؤول فرقة الأشبال" },
      { username: "kashafa", label: "مسؤول فرقة الكشافة" },
      { username: "jawwala", label: "مسؤول فرقة الجوالة" },
      { username: "group.leader", label: "قائد المجموعة — اطّلاع فقط" },
      { username: "deputy", label: "مساعد قائد المجموعة — اطّلاع فقط" },
      { username: "scouts.leader", label: "قائد الكشافين — اطّلاع + ملاحظات" },
    ],
    shortcuts: [
      { kind: "knots", username: "ashbal", caption: "مسؤول فرقة" },
      { kind: "camping", username: "supplies", caption: "قائد اللوازم" },
      { kind: "orienteering", username: "group.leader", caption: "اطّلاع فقط" },
    ],
  };
}

/**
 * تُقرأ وجهة العودة (next) هنا على الخادم وتُمرَّر للنموذج كخاصية،
 * بدلًا من useSearchParams داخل حدّ Suspense. هذا يلغي فجوة البثّ
 * التي كانت تُخرج البطاقة مؤقتًا من شجرة المشهد أثناء التحميل.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <IgnitionProvider>
      <div className="night relative min-h-dvh overflow-hidden bg-[#05070c]">
        <CampfireScene />
        <IgniteInvite />

        <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-10 pb-[clamp(170px,27vh,320px)]">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="relative">
                {/* وهج دافئ خلف الشعار كأن ضوء النار يرتدّ عنه */}
                <div
                  className="absolute inset-0 -z-10 scale-[1.7] rounded-full blur-2xl"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgba(255,160,50,0.5), transparent 72%)",
                  }}
                />
                <Logo size={104} decorative={false} className="size-[104px]" />
              </div>

              <h1
                className="mt-4 text-[26px] font-extrabold tracking-tight text-[var(--parchment)]"
                style={{ textShadow: "0 2px 24px rgba(255,146,40,0.45)" }}
              >
                {GROUP_NAME}
              </h1>
            </div>

            <LoginForm nextPath={safeNext} demo={demoAccess()} />

            <p className="mt-6 text-center text-xs leading-relaxed text-[var(--parchment-dim)]">
              الحسابات يُنشئها قائد اللوازم — لا يوجد تسجيل ذاتي.
              <br />
              لطلب حساب أو استعادة مفتاح الدخول، راجع قائد اللوازم.
            </p>
          </div>
        </main>
      </div>
    </IgnitionProvider>
  );
}
