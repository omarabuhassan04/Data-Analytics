import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { AlertIcon, InfoIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/domain";

/* ------------------------------------------------------------------ الأزرار */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-55";

const buttonVariants = {
  primary:
    "bg-forest-700 text-white hover:bg-forest-600 active:bg-forest-900 shadow-sm",
  brass: "bg-brass-600 text-white hover:bg-brass-500 active:bg-brass-700 shadow-sm",
  outline:
    "border border-line-strong bg-surface text-ink-700 hover:bg-surface-2 hover:text-ink-900",
  ghost: "text-ink-500 hover:bg-forest-50 hover:text-forest-700",
  danger: "bg-danger-500 text-white hover:bg-danger-700 shadow-sm",
} as const;

const buttonSizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4",
  lg: "h-11 px-5 text-[15px]",
  icon: "size-9",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: keyof typeof buttonSizes = "md",
  className?: string,
) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
}) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ------------------------------------------------------------------ البطاقات */

export function Card({
  className,
  ...props
}: ComponentProps<"section">) {
  return <section className={cn("surface", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-[26px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ الشارات */

const toneStyles: Record<Tone, string> = {
  ok: "bg-ok-50 text-ok-500 ring-ok-500/20",
  warn: "bg-warn-50 text-warn-500 ring-warn-500/20",
  bad: "bg-danger-50 text-danger-500 ring-danger-500/20",
  info: "bg-forest-50 text-forest-700 ring-forest-500/20",
  muted: "bg-surface-2 text-ink-500 ring-line-strong",
};

export function Badge({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ التنبيهات */

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = tone === "bad" || tone === "warn" ? AlertIcon : InfoIcon;
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset",
        toneStyles[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4.5" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ الحقول */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-ink-700">
        {label}
        {required ? (
          <span className="text-danger-500" aria-hidden>
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-danger-500">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-400">{hint}</span>
      ) : null}
    </label>
  );
}

const controlClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink-900 " +
  "placeholder:text-ink-400 transition-colors focus:border-forest-500 focus:outline-none " +
  "focus:ring-2 focus:ring-forest-500/20 disabled:bg-surface-2 disabled:text-ink-400";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "min-h-20", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(controlClass, "h-10 cursor-pointer appearance-none bg-left bg-no-repeat pl-8", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236b7364' stroke-width='1.8' stroke-linecap='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")",
        backgroundPosition: "left 0.6rem center",
      }}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ الجداول */

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full min-w-[36rem] text-right text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line bg-surface-2 px-4 py-2.5 text-xs font-bold text-ink-500 whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn("border-b border-line px-4 py-3 align-middle text-ink-700", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ الحالات الفارغة */

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
      {icon ? (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-forest-50 text-forest-500">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-bold text-ink-700">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ بطاقة رقم */

export function StatCard({
  label,
  value,
  hint,
  tone = "muted",
  icon,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink-500">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              toneStyles[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ink-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-400">{hint}</p> : null}
    </>
  );

  const className = cn(
    "surface block p-4 transition-shadow",
    href && "hover:shadow-pop",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
