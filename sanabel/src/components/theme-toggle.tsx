"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "sanabel-theme";

const LABEL: Record<Theme, string> = {
  light: "الوضع النهاري",
  dark: "الوضع الليلي",
  system: "حسب النظام",
};

/**
 * مبدّل المظهر.
 *
 * ثلاث حالات لا اثنتان: «حسب النظام» حالة قائمة بذاتها، فمن ضبط جهازه على
 * التبديل التلقائي عند الغروب يجب أن يتبعه التطبيق بدل تثبيته على اختيار قديم.
 *
 * الاختيار يُكتب على `<html>` مباشرة وفي التخزين المحلي؛ والسكربت في
 * layout.tsx يقرأه قبل أول رسم فلا تومض الصفحة بيضاء ثم تسودّ.
 */
export function ThemeToggle({
  className,
  variant = "plain",
}: {
  className?: string;
  /** "rail" لخلفية الشريط الداكن، "plain" للأسطح العادية */
  variant?: "plain" | "rail";
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    setTheme(stored === "light" || stored === "dark" ? stored : "system");
    setReady(true);
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem(STORAGE_KEY);
    } else {
      root.setAttribute("data-theme", next);
      localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const options: Theme[] = ["light", "dark", "system"];

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-[0.625rem] p-0.5",
        variant === "rail"
          ? "bg-black/25 ring-1 ring-white/8 ring-inset"
          : "border border-line bg-surface-2",
        className,
      )}
      role="group"
      aria-label="مظهر الواجهة"
    >
      {options.map((option) => {
        const active = ready && theme === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => apply(option)}
            title={LABEL[option]}
            aria-label={LABEL[option]}
            aria-pressed={active}
            className={cn(
              "flex h-7 flex-1 items-center justify-center rounded-lg transition-colors",
              variant === "rail"
                ? active
                  ? "bg-white/12 text-brass-300"
                  : "text-rail-muted hover:text-rail-fg"
                : active
                  ? "bg-surface text-forest-700 shadow-xs"
                  : "text-ink-400 hover:text-ink-700",
            )}
          >
            <ThemeIcon variant={option} />
          </button>
        );
      })}
    </div>
  );
}

function ThemeIcon({ variant }: { variant: Theme }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "size-4",
    "aria-hidden": true,
  };

  if (variant === "light") {
    // شمس
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
      </svg>
    );
  }

  if (variant === "dark") {
    // هلال
    return (
      <svg {...common}>
        <path d="M20 13.5A8 8 0 0 1 10.5 4a8 8 0 1 0 9.5 9.5z" />
      </svg>
    );
  }

  // شاشة — يتبع النظام
  return (
    <svg {...common}>
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <path d="M9 20h6M12 17v3" />
    </svg>
  );
}
