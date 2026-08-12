import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireUser, withApi } from "@/lib/api";
import { can, stockLevel } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

/**
 * ملخّص لوحة التحكم، مُشكَّل حسب دور المستخدم.
 * لا تُعاد أي بيانات خارج نطاق صلاحيات المستخدم.
 */
export const GET = withApi(async () => {
  const user = await requireUser();

  const seesAll = can(user.role, "requests:read:all");
  const canDecide = can(user.role, "requests:decide");
  const seesInventory = can(user.role, "inventory:read");
  const seesActivity = can(user.role, "activity:read");

  // نطاق الطلبات: الجميع لمن يملك الصلاحية، وإلا طلبات المستخدم وحده
  const scope: Prisma.RequestWhereInput = seesAll ? {} : { requesterId: user.id };

  const [grouped, recentRequests, items, activity] = await Promise.all([
    prisma.request.groupBy({
      by: ["status"],
      where: scope,
      _count: { _all: true },
    }),
    prisma.request.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        requester: { select: { id: true, fullName: true } },
        _count: { select: { lines: true, notes: true } },
      },
    }),
    seesInventory
      ? prisma.item.findMany({
          where: { isActive: true },
          select: { id: true, name: true, unit: true, quantity: true, threshold: true },
        })
      : Promise.resolve([]),
    seesActivity
      ? prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
      : Promise.resolve([]),
  ]);

  const statusCounts: Record<string, number> = {
    PENDING: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  };
  for (const row of grouped) statusCounts[row.status] = row._count._all;

  const openCount = statusCounts.PENDING + statusCounts.UNDER_REVIEW;

  const lowStock = items
    .map((item) => ({ ...item, level: stockLevel(item.quantity, item.threshold) }))
    .filter((item) => item.level !== "OK")
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 12);

  return NextResponse.json({
    scope: seesAll ? "all" : "own",
    statusCounts,
    openCount,
    // شارة الإشعار داخل التطبيق لقائد اللوازم
    actionableCount: canDecide ? openCount : 0,
    inventory: seesInventory
      ? {
          totalItems: items.length,
          outOfStock: items.filter((item) => item.quantity <= 0).length,
          lowStock: lowStock.filter((item) => item.level === "LOW").length,
          alerts: lowStock,
        }
      : null,
    recentRequests,
    recentActivity: activity,
  });
});
