"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ الأزرار */

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // حبر داكن على جمرة ساطعة: تباين 8.1:1 بدل 2.7:1 للأبيض على البرتقالي
  primary:
    "bg-ember-400 text-[#2a1408] shadow-[0_8px_24px_-10px_rgba(255,143,31,0.75)] hover:bg-ember-300",
  secondary: "bg-sand-100 text-ink-800 border border-sand-300 hover:bg-sand-200 hover:border-sand-400",
  danger: "bg-crimson-200 text-crimson-700 hover:bg-[#8f342b]",
  success: "bg-forest-200 text-forest-700 hover:bg-[#246d5c]",
  ghost: "bg-transparent text-ink-600 hover:bg-sand-100",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
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
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
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
      className={cn(
        "rounded-2xl border border-sand-200 bg-sand-100/80 backdrop-blur-md",
        "shadow-[0_18px_45px_-22px_rgba(0,0,0,0.9)]",
        className,
      )}
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

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-ember-500", className)} aria-hidden />;
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
                className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-sand-100 hover:text-ink-800"
              >
                <X className="size-5" />
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
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[28px]">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
