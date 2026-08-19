"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logout } from "@/actions/auth";
import {
  BoxIcon,
  CartIcon,
  ClipboardIcon,
  CompassIcon,
  HistoryIcon,
  LedgerIcon,
  LogoutIcon,
  MenuIcon,
  ReturnIcon,
  TruckIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";
import { num } from "@/lib/format";

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: number;
};

const ICONS = {
  compass: CompassIcon,
  box: BoxIcon,
  clipboard: ClipboardIcon,
  cart: CartIcon,
  truck: TruckIcon,
  return: ReturnIcon,
  ledger: LedgerIcon,
  history: HistoryIcon,
  users: UsersIcon,
};

/**
 * هيكل التطبيق.
 *
 * الشريط الجانبي أخضر عميق في الوضعين — هو ثابت الهوية، والمحتوى إلى جانبه
 * يتنفّس على ورق فاتح أو داكن حسب المظهر. هذا ما يجعل الصفحة تبدو منتجاً له
 * علامة، لا لوحة تحكّم عامّة بألوان افتراضية.
 */
export function AppShell({
  items,
  user,
  children,
}: {
  items: NavItem[];
  user: { fullName: string; roleLabel: string; teamName: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // إغلاق درج التنقّل عند الانتقال، وإلا بقي مفتوحاً فوق الصفحة الجديدة
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="relative z-10 min-h-dvh lg:flex">
      {/* شريط علوي — الهاتف */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-rail px-4 py-3 lg:hidden">
        <Link href="/" className="min-w-0">
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-rail-muted transition-colors hover:bg-white/8 hover:text-rail-fg"
          aria-label="فتح القائمة"
          aria-expanded={open}
        >
          <MenuIcon />
        </button>
      </header>

      {/* درج الهاتف */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] lg:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="enter absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-rail shadow-pop">
            <div className="flex items-center justify-between border-b border-rail-line px-5 py-4">
              <Wordmark />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق القائمة"
                className="rounded-lg p-1.5 text-rail-muted hover:bg-white/8 hover:text-rail-fg"
              >
                <XIcon />
              </button>
            </div>
            <NavList
              items={items}
              pathname={pathname}
              className="flex-1 overflow-y-auto px-3 py-4"
            />
            <UserPanel user={user} />
          </div>
        </div>
      ) : null}

      {/* الشريط الجانبي — سطح المكتب */}
      <aside className="sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col border-e border-rail-line bg-rail lg:flex">
        <Link href="/" className="block border-b border-rail-line px-6 py-5">
          <Wordmark />
        </Link>
        <NavList
          items={items}
          pathname={pathname}
          className="flex-1 overflow-y-auto px-3 py-4"
        />
        <UserPanel user={user} />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-7 sm:px-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

/** العلامة النصّية — سطران، والثاني نحاسي خافت */
function Wordmark() {
  return (
    <span className="block min-w-0">
      <span className="display block truncate text-[15px] leading-tight text-rail-fg">
        نظام اللوازم
      </span>
      <span className="mt-0.5 block truncate text-[11px] tracking-[0.08em] text-brass-300">
        مجموعة السنابل الكشفية
      </span>
    </span>
  );
}

function NavList({
  items,
  pathname,
  className,
}: {
  items: NavItem[];
  pathname: string;
  className?: string;
}) {
  return (
    <nav className={className} aria-label="التنقّل الرئيسي">
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          // "/" يطابق الجذر وحده؛ غيره يطابق نفسه وما تحته
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[0.625rem] py-2.5 pr-4 pl-3",
                  "text-[13.5px] font-semibold transition-colors duration-150",
                  active
                    ? "bg-white/10 text-rail-fg"
                    : "text-rail-muted hover:bg-white/6 hover:text-rail-fg",
                )}
              >
                {/* المؤشّر النحاسي: يظهر للعنصر النشط وحده */}
                <span
                  className={cn(
                    "absolute inset-y-1.5 right-0 w-[3px] rounded-full transition-opacity",
                    active ? "bg-brass-500 opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <Icon
                  className={cn(
                    "size-[18px] shrink-0 transition-colors",
                    active ? "text-brass-300" : "text-rail-muted group-hover:text-rail-fg",
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? (
                  <span className="figures rounded-full bg-brass-500 px-1.5 py-0.5 text-[11px] font-bold text-[#1a1204]">
                    {num(item.badge)}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UserPanel({
  user,
}: {
  user: { fullName: string; roleLabel: string; teamName: string | null };
}) {
  return (
    <div className="border-t border-rail-line bg-rail-2 p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            "bg-brass-500/15 text-sm font-bold text-brass-300 ring-1 ring-brass-500/30 ring-inset",
          )}
        >
          {user.fullName.replace(/^ق\./, "").trim().charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-rail-fg">
            {user.fullName}
          </p>
          <p className="truncate text-[11px] text-rail-muted">
            {user.teamName ?? user.roleLabel}
          </p>
        </div>
      </div>

      <div className="mt-2 px-2">
        <ThemeToggle variant="rail" />
      </div>

      <form action={logout} className="mt-1.5">
        <button
          type="submit"
          className={cn(
            "flex w-full items-center gap-3 rounded-[0.625rem] px-3 py-2.5",
            "text-[13px] font-semibold text-rail-muted transition-colors",
            "hover:bg-danger-500/15 hover:text-danger-500",
          )}
        >
          <LogoutIcon className="size-[18px]" />
          تسجيل الخروج
        </button>
      </form>
    </div>
  );
}
