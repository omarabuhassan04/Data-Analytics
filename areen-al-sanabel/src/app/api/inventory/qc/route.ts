import { NextResponse } from "next/server";

import { requirePermission, withApi } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** طابور فحص الجودة — الأسطر التي ما زالت تحمل وحدات محتجزة */
export const GET = withApi(async () => {
  await requirePermission("inventory:read");

  const lines = await prisma.requestLine.findMany({
    where: { quarantined: { gt: 0 } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      itemId: true,
      itemName: true,
      unit: true,
      quarantined: true,
      request: {
        select: { id: true, teamName: true, decidedAt: true, purpose: true },
      },
      item: { select: { id: true, name: true, quantity: true, quarantine: true } },
    },
  });

  const totalUnits = lines.reduce((sum, line) => sum + line.quarantined, 0);

  return NextResponse.json({ lines, lineCount: lines.length, totalUnits });
});
