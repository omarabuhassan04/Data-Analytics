import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requirePermission, withApi } from "@/lib/api";
import { MOVEMENT_REASONS } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

const MAX_TAKE = 200;

/** دفتر حركة المخزون — أثر كل وحدة دخلت أو خرجت */
export const GET = withApi(async (request: Request) => {
  await requirePermission("inventory:read");

  const url = new URL(request.url);
  const itemId = Number(url.searchParams.get("itemId"));
  const requestId = Number(url.searchParams.get("requestId"));
  const reason = url.searchParams.get("reason");
  const requested = Number(url.searchParams.get("take"));
  const take = Number.isInteger(requested) && requested > 0
    ? Math.min(requested, MAX_TAKE)
    : 60;

  const where: Prisma.StockMovementWhereInput = {};
  if (Number.isInteger(itemId) && itemId > 0) where.itemId = itemId;
  if (Number.isInteger(requestId) && requestId > 0) where.requestId = requestId;
  if (reason && (MOVEMENT_REASONS as readonly string[]).includes(reason)) {
    where.reason = reason;
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { id: "desc" },
    take,
    include: { item: { select: { id: true, name: true, unit: true } } },
  });

  return NextResponse.json({ movements });
});
