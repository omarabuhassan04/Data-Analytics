"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

/* ------------------------------------------- شريط تقدّم بالألياف الضوئية */

export type FiberTone = "cool" | "warm" | "hot";

/**
 * شريط تقدّم مضيء تجري داخله جسيمات دقيقة تُظهر اتجاه التدفّق.
 * القيمة تُعرض رقمًا أيضًا — التوهّج وحده لا يكفي لقراءة دقيقة.
 */
export function FiberProgress({
  label,
  value,
  max,
  tone = "cool",
  suffix,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  tone?: FiberTone;
  suffix?: string;
  hint?: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-[#dff3ee]">{label}</span>
        <span className="tabular text-sm font-extrabold text-[#7fe6d0]">
          {formatNumber(value)}
          {suffix ? ` ${suffix}` : ""}
          <span className="ms-1 text-xs font-semibold text-[#7d9a95]">
            / {formatNumber(max)}
          </span>
        </span>
      </div>

      <div
        className="fiber-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn("fiber-fill", tone === "warm" && "warm", tone === "hot" && "hot")}
          style={{ width: `${percent}%` }}
        />
      </div>

      {hint && <p className="mt-1 text-xs text-[#8fa8a3]">{hint}</p>}
    </div>
  );
}

/* --------------------------------------------------- بطاقة زجاجية مضيئة */

export function HoloPanel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("holo-panel led-edge rounded-2xl", className)} {...props}>
      {children}
    </div>
  );
}

/* ---------------------------------------------- شارة إحصائية شفّافة مضاءة */

export function EdgeStat({
  icon,
  value,
  label,
  tone = "cool",
  delay = 0,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  tone?: FiberTone;
  delay?: number;
}) {
  const ink =
    tone === "hot" ? "text-[#ff9a8f]" : tone === "warm" ? "text-[#ffc978]" : "text-[#7fe6d0]";
  const glow =
    tone === "hot"
      ? "rgba(226,59,46,0.35)"
      : tone === "warm"
        ? "rgba(255,179,71,0.35)"
        : "rgba(86,224,200,0.32)";

  return (
    <div
      className="holo-panel led-edge relative overflow-hidden rounded-2xl p-4"
      style={{ "--delay": `${delay}s` } as React.CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -end-8 size-28 rounded-full"
        style={{ background: `radial-gradient(closest-side, ${glow}, transparent 72%)` }}
      />
      <span className={cn("relative", ink)}>{icon}</span>
      <p className={cn("tabular relative mt-3 text-3xl font-extrabold", ink)}>
        {formatNumber(value)}
      </p>
      <p className="relative mt-0.5 text-sm font-semibold text-[#a8c2bd]">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------- مشبك معدني */

export function Clasp({
  size = 26,
  period = 9,
  delay = 0,
  className,
}: {
  size?: number;
  period?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("clasp", className)}
      style={{ "--period": `${period}s`, "--delay": `${delay}s` } as React.CSSProperties}
      aria-hidden
    >
      <defs>
        <linearGradient id="claspSteel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eef2f6" />
          <stop offset="35%" stopColor="#9aa5b1" />
          <stop offset="65%" stopColor="#5d6874" />
          <stop offset="100%" stopColor="#aab4bf" />
        </linearGradient>
      </defs>
      <rect x="4" y="9" width="24" height="14" rx="5" fill="url(#claspSteel)" />
      <rect x="8" y="12.5" width="16" height="7" rx="3" fill="#2a323b" />
      <circle cx="11" cy="16" r="1.6" fill="#c9d3dc" />
      <circle cx="21" cy="16" r="1.6" fill="#c9d3dc" />
      <path d="M6,11 C10,9.5 22,9.5 26,11" stroke="rgba(255,255,255,0.55)" strokeWidth="1" fill="none" />
    </svg>
  );
}

/* ------------------------------------------------ إطار الحبل المجدول */

/** إطار من حبل مجدول تحت شدّ خفيف، بمشابك معدنية على الزوايا */
export function RopeFrame({
  children,
  className,
  padding = 10,
}: {
  children: ReactNode;
  className?: string;
  padding?: number;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="rope-frame rounded-[26px]" style={{ padding }}>
        <div className="overflow-hidden rounded-[18px]">{children}</div>
      </div>

      <Clasp className="absolute -top-2 start-8 z-20" period={11} delay={0} />
      <Clasp className="absolute -top-2 end-8 z-20" period={9} delay={2.5} />
      <Clasp className="absolute -bottom-2 start-12 z-20" period={13} delay={5} />
      <Clasp className="absolute -bottom-2 end-12 z-20" period={10} delay={7.5} />
    </div>
  );
}
