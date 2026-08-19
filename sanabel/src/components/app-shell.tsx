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
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-ink-900">نظام اللوازم</span>
          <span className="text-[11px] text-ink-400">مجموعة السنابل</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-ink-700 transition-colors hover:bg-surface-2"
          aria-label="فتح القائمة"
          aria-expanded={open}
        >
          <MenuIcon />
        </button>
      </header>

      {/* درج الهاتف */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="enter absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-bold text-ink-900">القائمة</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق القائمة"
                className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-2"
              >
                <XIcon />
              </button>
            </div>
            <NavList items={items} pathname={pathname} className="flex-1 overflow-y-auto p-3" />
            <UserPanel user={user} />
          </div>
        </div>
      ) : null}

      {/* الشريط الجانبي — سطح المكتب */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-l border-line bg-surface lg:flex">
        <Link
          href="/"
          className="block border-b border-line px-5 py-4"
        >
          <span className="block text-sm font-bold text-ink-900">نظام اللوازم</span>
          <span className="block text-xs text-ink-400">مجموعة السنابل الكشفية</span>
        </Link>
        <NavList items={items} pathname={pathname} className="flex-1 overflow-y-auto p-3" />
        <UserPanel user={user} />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
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
      <ul className="space-y-0.5">
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
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-forest-50 text-forest-700"
                    : "text-ink-500 hover:bg-surface-2 hover:text-ink-900",
                )}
              >
                <Icon className="size-4.5" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-brass-600 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
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
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-2.5 px-2 py-1.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest-100 text-sm font-bold text-forest-700">
          {user.fullName.replace(/^ق\./, "").trim().charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink-900">{user.fullName}</p>
          <p className="truncate text-xs text-ink-400">
            {user.teamName ?? user.roleLabel}
          </p>
        </div>
      </div>
      <div className="mt-2 px-2">
        <ThemeToggle />
      </div>

      <form action={logout} className="mt-1">
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-500 transition-colors hover:bg-danger-50 hover:text-danger-500"
        >
          <LogoutIcon className="size-4.5" />
          تسجيل الخروج
        </button>
      </form>
    </div>
  );
}
