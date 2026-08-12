import { NextResponse } from "next/server";

import { requirePermission, withApi } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = withApi(async (request: Request) => {
  await requirePermission("activity:read");

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isInteger(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 60;

  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ entries });
});
