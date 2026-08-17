import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireUser, withApi } from "@/lib/api";
import { can, lineOutstanding, stockLevel } from "@/lib/domain";
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

  const [grouped, recentRequests, items, activity, custodyLines] = await Promise.all([
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
          select: {
            id: true,
            name: true,
            unit: true,
            quantity: true,
            quarantine: true,
            threshold: true,
          },
        })
      : Promise.resolve([]),
    seesActivity
      ? prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
      : Promise.resolve([]),
    /*
      العهدة المعلّقة: أسطر طلبات مقبولة لم تُسوَّ بعد.
      النطاق نفسه المطبَّق على الطلبات — الفرقة ترى عهدتها وحدها.
    */
    prisma.requestLine.findMany({
      where: { request: { ...scope, status: "APPROVED" } },
      select: {
        id: true,
        itemName: true,
        unit: true,
        deducted: true,
        released: true,
        returned: true,
        quarantined: true,
        writtenOff: true,
        request: { select: { id: true, teamName: true, decidedAt: true } },
      },
    }),
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

  /*
    العهدة المعلّقة — نفس معادلة lineOutstanding المستخدمة على الخادم وفي
    الواجهة، فلا يمكن أن يختلف رقم لوحة التحكم عن رقم صفحة الطلب.
  */
  const openCustody = custodyLines
    .map((line) => ({ line, pending: lineOutstanding(line) }))
    .filter((row) => row.pending > 0);

  const outstandingUnits = openCustody.reduce((sum, row) => sum + row.pending, 0);
  const custodyRequestIds = new Set(openCustody.map((row) => row.line.request.id));

  const quarantineUnits = items.reduce((sum, item) => sum + item.quarantine, 0);

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
          quarantineUnits,
          alerts: lowStock,
        }
      : null,
    custody: {
      outstandingUnits,
      requestCount: custodyRequestIds.size,
      quarantineUnits,
      oldest: openCustody
        .map((row) => row.line.request.decidedAt)
        .filter((date): date is Date => date !== null)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
    },
    recentRequests,
    recentActivity: activity,
  });
});
