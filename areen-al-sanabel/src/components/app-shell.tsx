"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";

import { useCart } from "@/components/cart";
import {
  IconClose,
  IconCompass,
  IconDepot,
  IconExit,
  IconFootlocker,
  IconKnapsack,
  IconLogbook,
  IconManifest,
  IconMenu,
  IconProcure,
  IconReconcile,
  IconReturn,
  IconSignpost,
  IconTroop,
} from "@/components/icons";
import { Logo } from "@/components/logo";
import { useToast } from "@/components/toast";
import { apiPost, errorMessage, fetcher } from "@/lib/client";
import { cn } from "@/lib/cn";
import { can, GROUP_NAME, ROLE_LABELS, type Permission, type Role } from "@/lib/domain";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  permission: Permission;
  badge?: "cart" | "actionable" | "custody";
  /**
   * يُخفي الرابط من القوائم فقط.
   * الصفحة ومسارات الـ API والصلاحيات تبقى كما هي، والوصول ممكن
   * بكتابة العنوان مباشرةً. لا علاقة لهذا الحقل بالبيانات إطلاقًا.
   */
  hiddenFromNav?: boolean;
};

const ICON = "size-[18px]";

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "لوحة التحكم", icon: <IconCompass className={ICON} />, permission: "inventory:read" },
  { href: "/inventory", label: "المخزون", icon: <IconFootlocker className={ICON} />, permission: "inventory:read" },
  { href: "/cart", label: "سلة العهدة", icon: <IconKnapsack className={ICON} />, permission: "requests:create", badge: "cart" },
  { href: "/purchase", label: "طلب شراء", icon: <IconProcure className={ICON} />, permission: "requests:create" },
  { href: "/my-requests", label: "طلباتي", icon: <IconManifest className={ICON} />, permission: "requests:read:own" },
  { href: "/requests", label: "الطلبات", icon: <IconSignpost className={ICON} />, permission: "requests:read:all", badge: "actionable" },
  { href: "/returns", label: "المرتجعات", icon: <IconReturn className={ICON} />, permission: "inventory:read", badge: "custody" },
  { href: "/ledger", label: "دفتر الحركة", icon: <IconReconcile className={ICON} />, permission: "inventory:read" },
  { href: "/manage/items", label: "إدارة المخزون", icon: <IconDepot className={ICON} />, permission: "inventory:write" },
  // مخفيّ من القوائم بطلب المالك. الحسابات نفسها وبياناتها لم تُمسّ:
  // الصفحة تعمل على /manage/users ومسارات /api/users كما هي، والصلاحيات
  // ما زالت مفروضة على الخادم. لإظهاره ثانيةً: احذف السطر التالي فقط.
  {
    href: "/manage/users",
    label: "الحسابات",
    icon: <IconTroop className={ICON} />,
    permission: "users:manage",
    hiddenFromNav: true,
  },
  { href: "/activity", label: "سجل النشاط", icon: <IconLogbook className={ICON} />, permission: "activity:read" },
];

export type ShellUser = {
  id: number;
  fullName: string;
  username: string;
  role: Role;
  teamName: string | null;
};

type ShellSummary = {
  actionableCount: number;
  custody?: { outstandingUnits: number };
};

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  /*
    ملخّص مشترك للشارات. المفتاح هو المسار نفسه المستخدم في لوحة التحكم،
    فيتشارك الاثنان ذاكرة SWR الواحدة: أي إرجاع أو قرار يُبطل هذا المفتاح
    فتتحدّث الشارة والصفحة معًا بلا طلب إضافي.
  */
  const { data: summary } = useSWR<ShellSummary>("/api/dashboard", fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  });

  useEffect(() => setDrawerOpen(false), [pathname]);

  // الإخفاء بصري فقط — لا يغيّر الصلاحيات ولا يمنع الوصول المباشر بالعنوان
  const items = NAV_ITEMS.filter(
    (item) => can(user.role, item.permission) && !item.hiddenFromNav,
  );

  function badgeCount(item: NavItem): number {
    if (item.badge === "cart") return cart.count;
    if (item.badge === "actionable") {
      return can(user.role, "requests:decide") ? summary?.actionableCount ?? 0 : 0;
    }
    if (item.badge === "custody") return summary?.custody?.outstandingUnits ?? 0;
    return 0;
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await apiPost("/api/auth/logout");
      cart.clear();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setSigningOut(false);
    }
  }

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const count = badgeCount(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors",
              active
                ? "bg-sand-200 text-ink-900"
                : "text-ink-500 hover:bg-sand-100 hover:text-ink-800",
            )}
          >
            {/* شاهدة المسار — تُعلّم الصفحة الحالية بلا لون خلفية صارخ */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-2 -start-px w-0.5 rounded-full transition-colors",
                active ? "bg-ember-400" : "bg-transparent",
              )}
            />
            <span className={active ? "text-ember-400" : "text-ink-400"}>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {count > 0 && (
              <span className="tabular grid min-w-5 place-items-center rounded-full bg-sand-300 px-1.5 py-0.5 text-[11px] font-bold text-ink-800">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="field-grid relative min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-sand-200 bg-[var(--surface-veil)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="فتح القائمة"
            className="grid size-10 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-sand-100 hover:text-ink-800 lg:hidden"
          >
            <IconMenu className="size-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={34} className="size-[34px]" />
            <span className="hidden text-[15px] font-extrabold text-ink-900 sm:block">
              {GROUP_NAME}
            </span>
          </Link>

          <div className="flex-1" />

          {can(user.role, "requests:create") && (
            <Link
              href="/cart"
              className="relative grid size-10 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-sand-100 hover:text-ink-800"
              aria-label={`سلة العهدة (${cart.count})`}
            >
              <IconKnapsack className="size-5" />
              <AnimatePresence>
                {cart.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="tabular absolute -top-0.5 -start-0.5 grid min-w-5 place-items-center rounded-full bg-ember-400 px-1 text-[11px] font-bold text-sand-50"
                  >
                    {cart.count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          <div className="flex items-center gap-2.5 rounded-lg border border-sand-200 py-1.5 ps-2 pe-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sand-300 text-sm font-bold text-ink-900">
              {user.fullName.trim().charAt(0)}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block max-w-40 truncate text-[13px] font-bold text-ink-900">
                {user.fullName}
              </span>
              <span className="block text-[11px] font-medium text-ink-400">
                {user.teamName ?? ROLE_LABELS[user.role]}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
            className="grid size-10 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-crimson-50 hover:text-crimson-600 disabled:opacity-50"
          >
            <IconExit className="size-5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24">{navList}</div>
        </aside>

        <AnimatePresence>
          {drawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="absolute inset-0 bg-black/70"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="absolute inset-y-0 end-0 w-72 max-w-[85vw] overflow-y-auto border-s border-sand-200 bg-sand-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Logo size={28} className="size-7" />
                    <span className="text-sm font-extrabold text-ink-900">{GROUP_NAME}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="إغلاق القائمة"
                    className="grid size-9 place-items-center rounded-lg text-ink-400 hover:bg-sand-100"
                  >
                    <IconClose className="size-5" />
                  </button>
                </div>
                {navList}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 pb-12">{children}</main>
      </div>
    </div>
  );
}
