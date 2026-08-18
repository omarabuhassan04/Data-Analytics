import { redirect } from "next/navigation";

import { AppShell, type NavItem } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // عدّادات الشارات: ما ينتظر إجراءً من هذا المستخدم تحديداً
  const [pendingPurchases, awaitingReturns] = await Promise.all([
    can(user.role, "purchase:decide")
      ? prisma.purchaseRequest.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
    can(user.role, "returns:verify")
      ? prisma.returnBatch.count({ where: { status: "AWAITING_VERIFICATION" } })
      : Promise.resolve(0),
  ]);

  const items: NavItem[] = [{ href: "/", label: "الرئيسية", icon: "compass" }];

  if (can(user.role, "inventory:read")) {
    items.push({ href: "/inventory", label: "المخزون", icon: "box" });
  }

  if (can(user.role, "supply:create")) {
    items.push({ href: "/supply/new", label: "طلب لوازم", icon: "cart" });
  }

  if (can(user.role, "supply:read:own") || can(user.role, "supply:read:all")) {
    items.push({ href: "/supply", label: "طلبات اللوازم", icon: "clipboard" });
  }

  if (
    can(user.role, "purchase:create") ||
    can(user.role, "purchase:read:all") ||
    can(user.role, "purchase:read:decided")
  ) {
    items.push({
      href: "/purchase",
      label: "طلبات الشراء",
      icon: "truck",
      badge: pendingPurchases,
    });
  }

  if (can(user.role, "returns:submit") || can(user.role, "returns:verify")) {
    items.push({
      href: "/returns",
      label: "العهد والإرجاع",
      icon: "return",
      badge: awaitingReturns,
    });
  }

  if (can(user.role, "inventory:manage")) {
    items.push({ href: "/manage/items", label: "إدارة الأصناف", icon: "box" });
  }

  if (can(user.role, "activity:read:all")) {
    items.push({ href: "/ledger", label: "دفتر الحركة", icon: "ledger" });
  }

  items.push({ href: "/activity", label: "سجل العمليات", icon: "history" });

  if (can(user.role, "users:manage")) {
    items.push({ href: "/manage/users", label: "الحسابات", icon: "users" });
  }

  return (
    <ToastProvider>
      <AppShell items={items} user={user}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
