"use client";

import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  BrassCompass,
  Carabiner,
  MeritBadge,
  meritLabel,
  RopeKnot,
  WoggleCrest,
  EngravedCampMap,
  type MeritKind,
} from "@/components/scout-ornaments";
import { apiPost, errorMessage } from "@/lib/client";

/** ترتيب شارات الجدارة الثلاث — زخرفة بحتة، لا تحمل أي بيانات حساب */
const MERIT_KINDS: MeritKind[] = ["knots", "camping", "orienteering"];

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
  shortcuts: { kind: MeritKind; username: string; caption: string }[];
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
  const [showPassword, setShowPassword] = useState(false);
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

  function applyDemoAccount(demoUsername: string) {
    if (!demo) return;
    setUsername(demoUsername);
    setPassword(demo.password);
    setError(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.75, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
      className="stage-3d relative"
    >
      {/* خطّافان معدنيان يعلّقان اللوح */}
      <Carabiner size={30} className="absolute -top-9 start-8 z-30 rotate-[-8deg]" />
      <Carabiner size={30} className="absolute -top-9 end-8 z-30 rotate-[7deg]" />

      <div className="card-tilt relative">
        {/* إطار الحبل */}
        <div className="rope-ring relative rounded-[30px] p-[11px]">
          {/* عقد الحبل على الزوايا */}
          <RopeKnot size={42} className="absolute -top-3 -start-3 z-20 rotate-[-18deg]" />
          <RopeKnot size={42} className="absolute -top-3 -end-3 z-20 rotate-[16deg]" />
          <RopeKnot size={38} className="absolute -bottom-3 -start-3 z-20 rotate-[200deg]" />
          <RopeKnot size={38} className="absolute -bottom-3 -end-3 z-20 rotate-[160deg]" />

          {/* لوح الخشب */}
          <div className="wood-panel tex-wood relative overflow-hidden rounded-[22px]">
            {/* خريطة المخيّم المحفورة في الخشب */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay">
              <EngravedCampMap />
            </div>

            {/* شريط العنوان المطرّز */}
            <div className="tex-fabric relative z-10 flex items-center gap-3 border-b border-black/50 bg-[linear-gradient(172deg,#5a3a22,#3d2615)] px-5 py-3.5">
              <span
                className="absolute inset-x-3 top-1.5 border-t border-dashed border-[#e0c489]/45"
                aria-hidden
              />
              <span
                className="absolute inset-x-3 bottom-1.5 border-b border-dashed border-[#e0c489]/45"
                aria-hidden
              />
              <BrassCompass size={40} glow />
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-extrabold tracking-tight text-[#f7e6c4]">
                  دخول المغامرة الكشفية
                </h2>
                <p className="text-[11px] font-semibold text-[#c8a97c]">
                  عرين السنابل · مقرّ المجموعة
                </p>
              </div>
            </div>

            <div className="relative z-10 px-5 py-5 sm:px-6">
              {/* شارات الجدارة */}
              <div className="mb-5 flex items-start justify-center gap-3">
                {demo
                  ? demo.shortcuts.map((badge) => (
                      <button
                        key={badge.kind}
                        type="button"
                        onClick={() => applyDemoAccount(badge.username)}
                        aria-label={`تعبئة حساب تجريبي: ${badge.caption} (${meritLabel(badge.kind)})`}
                        className="group flex w-[5.5rem] flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
                      >
                        <MeritBadge
                          kind={badge.kind}
                          size={52}
                          className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] transition-transform group-hover:scale-105"
                        />
                        <span className="text-center text-[11px] font-bold leading-tight text-[#e8c883]">
                          {badge.caption}
                        </span>
                      </button>
                    ))
                  : MERIT_KINDS.map((kind) => (
                      <div
                        key={kind}
                        className="flex w-[5.5rem] flex-col items-center gap-1.5 px-1 py-2"
                      >
                        <MeritBadge
                          kind={kind}
                          size={52}
                          className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                        />
                        <span className="text-center text-[11px] font-bold leading-tight text-[#c8a97c]">
                          {meritLabel(kind)}
                        </span>
                      </div>
                    ))}
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="member-id"
                    className="mb-1.5 flex items-center gap-1 text-sm font-bold text-[#f3e3c8]"
                  >
                    معرّف العضو
                    <span className="text-[#e2725b]">*</span>
                  </label>
                  <div className="leather-pouch tex-leather">
                    <input
                      id="member-id"
                      className="pouch-input text-start"
                      name="username"
                      autoComplete="username"
                      dir="ltr"
                      placeholder="مثال: ashbal"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                      /*
                        بلا autoFocus عن قصد: التركيز التلقائي يُفعّل
                        ‎:focus-within‎ فور التحميل فتستقيم البطاقة ولا يُرى
                        منظور ثلاثة الأرباع إطلاقًا. كما أن نقل التركيز
                        دون طلب المستخدم يربك قارئات الشاشة.
                      */
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="access-key"
                    className="mb-1.5 flex items-center gap-1 text-sm font-bold text-[#f3e3c8]"
                  >
                    مفتاح الدخول
                    <span className="text-[#e2725b]">*</span>
                  </label>
                  <div className="leather-pouch tex-leather relative">
                    <input
                      id="access-key"
                      className="pouch-input pe-11 text-start"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      dir="ltr"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "إخفاء مفتاح الدخول" : "إظهار مفتاح الدخول"}
                      className="absolute inset-y-0 end-0 z-[3] grid w-11 place-items-center text-[#c8a97c] transition-colors hover:text-[#ffb347]"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-xl border border-[#7a2b23] bg-[#2a100c] px-3.5 py-2.5 text-sm font-semibold text-[#f5b3a6]"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#e2725b]" />
                    {error}
                  </motion.p>
                )}

                {/* زرّ الانطلاق — عقدة منديل نحاسية على سير جلدي */}
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileTap={{ scale: 0.98 }}
                  className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[#8a5f1d] bg-[linear-gradient(178deg,#5c3a1c,#3a2412_60%,#2a1a0c)] px-5 py-3.5 text-base font-extrabold text-[#ffd98a] shadow-[0_10px_28px_-10px_rgba(255,143,31,0.75),inset_0_1px_0_rgba(255,214,150,0.25)] transition-shadow hover:shadow-[0_14px_36px_-10px_rgba(255,170,60,0.95),inset_0_1px_0_rgba(255,224,170,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ textShadow: "0 1px 0 rgba(0,0,0,0.8), 0 0 18px rgba(255,180,70,0.45)" }}
                >
                  {/* وهج داخلي متحرّك */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 -bottom-8 h-16 opacity-70"
                    style={{
                      background:
                        "radial-gradient(closest-side, rgba(255,160,50,0.55), transparent 75%)",
                    }}
                  />
                  {submitting ? (
                    <Loader2 className="size-6 animate-spin" aria-hidden />
                  ) : (
                    <WoggleCrest size={30} className="drop-shadow-[0_0_10px_rgba(255,176,64,0.7)]" />
                  )}
                  <span className="relative">ابدأ رحلتك</span>
                </motion.button>
              </form>

              {demo && (
                <details className="mt-5 rounded-xl border border-[#4a3a26] bg-black/30 p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[#f3e3c8]">
                    <ShieldCheck className="size-4 text-[#8fd8ae]" />
                    كل الحسابات التجريبية (بيئة التطوير فقط)
                  </summary>

                  <p className="mt-2 text-xs text-[#c8a97c]">
                    مفتاح الدخول للجميع:{" "}
                    <span dir="ltr" className="font-bold text-[#e8c883]">
                      {demo.password}
                    </span>
                  </p>

                  <ul className="mt-2 space-y-1">
                    {demo.accounts.map((account) => (
                      <li key={account.username}>
                        <button
                          type="button"
                          onClick={() => applyDemoAccount(account.username)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-xs transition-colors hover:bg-[#e8c883]/10"
                        >
                          <span className="font-semibold text-[#c8a97c]">{account.label}</span>
                          <span dir="ltr" className="font-mono text-[11px] text-[#a68a68]">
                            {account.username}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
