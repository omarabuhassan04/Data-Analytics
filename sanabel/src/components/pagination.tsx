import Link from "next/link";

import { cn } from "@/lib/cn";
import { num } from "@/lib/format";

/**
 * ترقيم بروابط حقيقية (لا أزرار) — يعمل قبل تحميل JavaScript ويُفتح في
 * تبويب جديد، وهو ما يتوقّعه المستخدم من تنقّل بين صفحات.
 */
export function Pagination({
  page,
  pageCount,
  total,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) {
    return (
      <p className="border-t border-line px-5 py-3 text-xs text-ink-400">
        {num(total)} سجلاً
      </p>
    );
  }

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const linkClass = (disabled: boolean) =>
    cn(
      "rounded-lg border border-line-strong px-3 py-1.5 text-sm font-semibold transition-colors",
      disabled
        ? "pointer-events-none opacity-40"
        : "text-ink-700 hover:bg-surface-2",
    );

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3"
      aria-label="ترقيم الصفحات"
    >
      <p className="text-xs text-ink-400">
        صفحة {num(page)} من {num(pageCount)} · {num(total)} سجلاً
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={href(page - 1)}
          className={linkClass(page <= 1)}
          aria-disabled={page <= 1}
        >
          السابق
        </Link>
        <Link
          href={href(page + 1)}
          className={linkClass(page >= pageCount)}
          aria-disabled={page >= pageCount}
        >
          التالي
        </Link>
      </div>
    </nav>
  );
}
