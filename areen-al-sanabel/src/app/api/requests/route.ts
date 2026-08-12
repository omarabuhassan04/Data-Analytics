import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { ApiError, readJson, requireUser, withApi } from "@/lib/api";
import { can, REQUEST_STATUSES, REQUEST_TYPES } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { createRequest } from "@/lib/request-service";
import { requestCreateSchema } from "@/lib/validation";

const requestInclude = {
  requester: { select: { id: true, fullName: true, username: true, teamName: true } },
  decidedBy: { select: { id: true, fullName: true } },
  lines: true,
  _count: { select: { notes: true } },
} satisfies Prisma.RequestInclude;

export const GET = withApi(async (request: Request) => {
  const user = await requireUser();

  const seesAll = can(user.role, "requests:read:all");
  const seesOwn = can(user.role, "requests:read:own");
  if (!seesAll && !seesOwn) {
    throw new ApiError(403, "لا تملك الصلاحية لعرض الطلبات");
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const team = url.searchParams.get("team")?.trim();
  const scope = url.searchParams.get("scope"); // "mine" لتقييد النتائج يدويًا

  const where: Prisma.RequestWhereInput = {};

  // نطاق الرؤية يُحدَّد على الخادم — لا يستطيع العميل توسيعه
  if (!seesAll || scope === "mine") {
    where.requesterId = user.id;
  }

  if (type && (REQUEST_TYPES as readonly string[]).includes(type)) where.type = type;
  if (status && (REQUEST_STATUSES as readonly string[]).includes(status)) {
    where.status = status;
  }
  if (team && seesAll) where.teamName = team;

  const requests = await prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: requestInclude,
    take: 300,
  });

  return NextResponse.json({ requests });
});

export const POST = withApi(async (request: Request) => {
  const user = await requireUser();
  if (!can(user.role, "requests:create")) {
    throw new ApiError(403, "تقديم الطلبات متاح لمسؤولي الفرق فقط");
  }

  const body = requestCreateSchema.parse(await readJson(request));
  const created = await createRequest(user, body);

  const full = await prisma.request.findUnique({
    where: { id: created.id },
    include: requestInclude,
  });

  return NextResponse.json({ request: full }, { status: 201 });
});
