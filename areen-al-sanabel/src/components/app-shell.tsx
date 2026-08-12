"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  ClipboardList,
  Compass,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PackageSearch,
  ScrollText,
  ShoppingBasket,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";

import { useCart } from "@/components/cart";
import { ForestBackdrop } from "@/components/kinetic/forest-backdrop";
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
  badge?: "cart" | "actionable";
  /**
   * يُخفي الرابط من القوائم فقط.
   * الصفحة ومسارات الـ API والصلاحيات تبقى كما هي، والوصول ممكن
   * بكتابة العنوان مباشرةً. لا علاقة لهذا الحقل بالبيانات إطلاقًا.
   */
  hiddenFromNav?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "لوحة التحكم", icon: <LayoutDashboard className="size-[18px]" />, permission: "inventory:read" },
  { href: "/inventory", label: "المخزون", icon: <PackageSearch className="size-[18px]" />, permission: "inventory:read" },
  { href: "/cart", label: "سلة العهدة", icon: <ShoppingBasket className="size-[18px]" />, permission: "requests:create", badge: "cart" },
  { href: "/purchase", label: "طلب شراء", icon: <ShoppingCart className="size-[18px]" />, permission: "requests:create" },
  { href: "/my-requests", label: "طلباتي", icon: <ClipboardList className="size-[18px]" />, permission: "requests:read:own" },
  { href: "/requests", label: "جميع الطلبات", icon: <ListChecks className="size-[18px]" />, permission: "requests:read:all", badge: "actionable" },
  { href: "/manage/items", label: "إدارة المخزون", icon: <Boxes className="size-[18px]" />, permission: "inventory:write" },
  // مخفيّ من القوائم بطلب المالك. الحسابات نفسها وبياناتها لم تُمسّ:
  // الصفحة تعمل على /manage/users ومسارات /api/users كما هي، والصلاحيات
  // ما زالت مفروضة على الخادم. لإظهاره ثانيةً: احذف السطر التالي فقط.
  {
    href: "/manage/users",
    label: "الحسابات",
    icon: <Users className="size-[18px]" />,
    permission: "users:manage",
    hiddenFromNav: true,
  },
  { href: "/activity", label: "سجل النشاط", icon: <ScrollText className="size-[18px]" />, permission: "activity:read" },
];

export type ShellUser = {
  id: number;
  fullName: string;
  username: string;
  role: Role;
  teamName: string | null;
};

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { data: summary } = useSWR<{ actionableCount: number }>(
    can(user.role, "requests:decide") ? "/api/dashboard" : null,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );

  useEffect(() => setDrawerOpen(false), [pathname]);

  // الإخفاء بصري فقط — لا يغيّر الصلاحيات ولا يمنع الوصول المباشر بالعنوان
  const items = NAV_ITEMS.filter(
    (item) => can(user.role, item.permission) && !item.hiddenFromNav,
  );

  function badgeCount(item: NavItem): number {
    if (item.badge === "cart") return cart.count;
    if (item.badge === "actionable") return summary?.actionableCount ?? 0;
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
    <nav className="flex flex-col gap-1.5">
      {items.map((item, index) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const count = badgeCount(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{ "--delay": `${index * 0.35}s` } as React.CSSProperties}
            className={cn(
              "trail-btn led-edge group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition-colors",
              active
                ? "bg-[#0e2a28]/90 text-[#b6ffe9] shadow-[0_0_22px_-6px_rgba(86,224,200,0.7)]"
                : "bg-[rgba(10,16,20,0.6)] text-[#a8c2bd] hover:text-[#dff3ee]",
            )}
          >
            <span className={cn("relative", active ? "text-[#7fe6d0]" : "text-[#6f8a86]")}>
              {item.icon}
            </span>
            <span className="relative flex-1">{item.label}</span>
            {count > 0 && (
              <span className="tabular relative grid min-w-6 place-items-center rounded-full bg-[#ffb347] px-1.5 py-0.5 text-xs font-bold text-[#2a1408]">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="kinetic relative min-h-dvh">
      {/* مشهد الغابة الحيّ خلف كل صفحات التطبيق */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <ForestBackdrop className="absolute inset-0" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[#c99a3f]/35 bg-[rgba(6,12,16,0.82)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="فتح القائمة"
            className="grid size-10 place-items-center rounded-xl text-[#a8c2bd] transition-colors hover:bg-white/10 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={40} className="size-10" />
            <span className="hidden leading-tight sm:block">
              <span className="block text-[15px] font-extrabold text-[#f0f8f6]">
                {GROUP_NAME}
              </span>
              <span className="block text-xs font-medium text-[#8fa8a3]">
                نظام إدارة عتاد المقر
              </span>
            </span>
          </Link>

          <div className="flex-1" />

          {can(user.role, "requests:create") && (
            <Link
              href="/cart"
              className="relative grid size-10 place-items-center rounded-xl text-[#a8c2bd] transition-colors hover:bg-white/10"
              aria-label={`سلة العهدة (${cart.count})`}
            >
              <ShoppingBasket className="size-5" />
              <AnimatePresence>
                {cart.count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="tabular absolute -top-0.5 -start-0.5 grid min-w-5 place-items-center rounded-full bg-ember-400 px-1 text-[11px] font-bold text-[#2a1408]"
                  >
                    {cart.count}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          <div className="flex items-center gap-2.5 rounded-xl border border-[#c99a3f]/35 bg-[rgba(10,16,20,0.7)] py-1.5 ps-2 pe-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1c8f7c] text-sm font-bold text-[#04120f]">
              {user.fullName.trim().charAt(0)}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block max-w-40 truncate text-[13px] font-bold text-[#f0f8f6]">
                {user.fullName}
              </span>
              <span className="block text-[11px] font-medium text-[#8fa8a3]">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
            className="grid size-10 place-items-center rounded-xl text-[#8fa8a3] transition-colors hover:bg-[#3a1512] hover:text-[#ff9a8f] disabled:opacity-50"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            {navList}
            <div className="holo-panel led-edge mt-6 rounded-2xl border border-transparent p-4">
              <Compass className="size-5 text-[#7fe6d0]" />
              <p className="mt-2 text-sm font-bold text-[#dff3ee]">
                {user.teamName ?? ROLE_LABELS[user.role]}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#8fa8a3]">
                كن مستعدًّا — تفقّد عتادك قبل كل رحلة.
              </p>
            </div>
          </div>
        </aside>

        <AnimatePresence>
          {drawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="absolute inset-0 bg-black/65"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="absolute inset-y-0 end-0 w-72 max-w-[85vw] overflow-y-auto bg-[#060c10] p-4 shadow-2xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Logo size={32} className="size-8" />
                    <span className="text-sm font-extrabold text-[#f0f8f6]">
                      {GROUP_NAME}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="إغلاق القائمة"
                    className="grid size-9 place-items-center rounded-lg text-[#8fa8a3] hover:bg-white/10"
                  >
                    <X className="size-5" />
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
