"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

import { IconClose } from "@/components/icons";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ الأزرار */

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // حبر داكن على نحاس فاتح — تباين عالٍ بلا وهج
  primary: "bg-ember-400 text-sand-50 hover:bg-ember-300",
  secondary:
    "bg-sand-100 text-ink-800 border border-sand-300 hover:bg-sand-200 hover:border-sand-400",
  danger: "bg-crimson-200 text-crimson-700 hover:border-crimson-500",
  success: "bg-forest-200 text-forest-700 hover:border-forest-500",
  ghost: "bg-transparent text-ink-600 hover:bg-sand-100",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-[15px] gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
};

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-70",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ البطاقات */

export function Card({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-sand-200 bg-sand-100", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-sand-200 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand-100 text-forest-600">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-base font-bold text-ink-900 sm:text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------- الشارات */

type BadgeTone = "neutral" | "amber" | "green" | "red" | "blue" | "gold";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-sand-100 text-ink-600 border-sand-200",
  amber: "bg-ember-50 text-ember-700 border-ember-200",
  green: "bg-forest-50 text-forest-700 border-forest-200",
  red: "bg-crimson-50 text-crimson-700 border-crimson-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  gold: "bg-amber-50 text-amber-800 border-amber-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- الحقول */

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-ink-600">
        {label}
        {required && <span className="text-crimson-600">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-crimson-600">{error}</span>}
    </label>
  );
}

const CONTROL_CLASS =
  "w-full rounded-xl border border-sand-300 bg-sand-50 px-3.5 py-2.5 text-[15px] text-ink-900 " +
  "placeholder:text-ink-300 transition-colors focus:border-ember-400 focus:outline-none " +
  "focus:shadow-[0_0_0_3px_rgba(255,179,71,0.18)] " +
  "disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-ink-400";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(CONTROL_CLASS, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL_CLASS, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL_CLASS, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

/* ------------------------------------------------------------- حالات الصفحة */

/** مؤشّر انتظار — قوس بوصلة يدور */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-5 animate-spin text-ember-400", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingBlock({ label = "جارٍ التحميل…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-400">
      <Spinner />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-sand-100 text-sand-400">
          {icon}
        </span>
      )}
      <p className="text-base font-bold text-ink-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-crimson-200 bg-crimson-50 p-4 text-sm font-medium text-crimson-700">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------- النافذة */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  // إغلاق النافذة بمفتاح Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-sand-200 bg-sand-100 p-5 shadow-2xl sm:rounded-3xl",
              size === "lg" ? "sm:max-w-3xl" : "sm:max-w-lg",
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink-900">{title}</h2>
                {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-sand-200 hover:text-ink-800"
              >
                <IconClose className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------------------------------------- ترويسة صفحة */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  /** يُستخدم فقط حين يحمل معلومة لا يقولها العنوان — لا شرحًا للعنوان */
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900 sm:text-2xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------- المقاييس */

type StatTone = "neutral" | "warm" | "good" | "bad";

const STAT_TONES: Record<StatTone, string> = {
  neutral: "text-ink-900",
  warm: "text-ember-300",
  good: "text-forest-600",
  bad: "text-crimson-600",
};

/**
 * رقم واحد مع تسميته.
 * الرقم هو البطل: حجمه أكبر بمرتبتين من تسميته، ومحارفه متساوية العرض
 * حتى تبقى الأرقام في صفٍّ واحد قابلة للمقارنة بالنظر.
 */
export function Stat({
  label,
  value,
  suffix,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className="rounded-xl border border-sand-200 bg-sand-100 p-4">
      <div className="flex items-center gap-2 text-ink-400">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className={cn("tabular mt-2 text-2xl font-extrabold", STAT_TONES[tone])}>
        {value}
        {suffix && <span className="ms-1 text-sm font-bold text-ink-400">{suffix}</span>}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

const METER_TONES: Record<StatTone, string> = {
  neutral: "bg-ink-400",
  warm: "bg-ember-400",
  good: "bg-forest-500",
  bad: "bg-crimson-500",
};

/** شريط نسبة مسطّح — بلا وهج ولا جسيمات، النسبة وحدها هي المعلومة */
export function Meter({
  label,
  value,
  max,
  suffix,
  tone = "neutral",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  tone?: StatTone;
}) {
  const safeMax = Math.max(max, 1);
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink-600">{label}</span>
        <span className="tabular text-sm font-bold text-ink-900">
          {value}
          {suffix && <span className="ms-1 text-xs font-medium text-ink-400">{suffix}</span>}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-sand-300"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", METER_TONES[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
