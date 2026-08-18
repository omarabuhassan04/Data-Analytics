"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { SearchIcon, SpinnerIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Select } from "@/components/ui";

/**
 * المرشّحات تعيش في عنوان الصفحة لا في حالة المكوّن.
 *
 * أثرها العملي: الرابط يمكن حفظه ومشاركته، وزر الرجوع في المتصفّح يعمل،
 * والتصفية تجري على الخادم فلا تُحمَّل السجلات كلها إلى المتصفّح لتصفيتها.
 */
function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  return { params, pending, setParam };
}

export function SearchBox({
  placeholder = "بحث…",
  paramName = "q",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const { params, pending, setParam } = useFilterNav();
  const initial = params.get(paramName) ?? "";
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  // مزامنة الحقل عند تغيّر العنوان من خارج المكوّن (زر الرجوع مثلاً)
  useEffect(() => setValue(initial), [initial]);

  // تأخير قصير قبل التنقّل: الكتابة السريعة لا تُطلق طلباً لكل حرف
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (value !== initial) setParam(paramName, value.trim() || null);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-400">
        {pending ? <SpinnerIcon /> : <SearchIcon className="size-4" />}
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-10 w-full rounded-lg border border-line-strong bg-surface pr-10 pl-3 text-sm",
          "placeholder:text-ink-400 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="مسح البحث"
          className="absolute inset-y-0 left-2 flex items-center text-ink-400 hover:text-ink-700"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({
  paramName,
  label,
  options,
  allLabel = "الكل",
}: {
  paramName: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  allLabel?: string;
}) {
  const { params, setParam } = useFilterNav();
  const current = params.get(paramName) ?? "";

  return (
    <Select
      aria-label={label}
      value={current}
      onChange={(e) => setParam(paramName, e.target.value || null)}
      className="w-auto min-w-36"
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function ClearFilters({ keys }: { keys: string[] }) {
  const { params, setParam } = useFilterNav();
  const active = keys.filter((key) => params.get(key));
  if (active.length === 0) return null;

  return (
    <button
      type="button"
      onClick={() => active.forEach((key) => setParam(key, null))}
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-500 hover:bg-surface-2 hover:text-ink-900"
    >
      <XIcon className="size-4" />
      إزالة المرشّحات
    </button>
  );
}
