import { NextResponse } from "next/server";

import { ApiError, notFound, parseId, requireUser, withApi } from "@/lib/api";
import { can } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export const GET = withApi(async (_request: Request, context: Context) => {
  const user = await requireUser();
  const id = parseId((await context.params).id, "رقم الطلب");

  const found = await prisma.request.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, fullName: true, username: true, teamName: true } },
      decidedBy: { select: { id: true, fullName: true } },
      lines: { include: { item: { select: { id: true, quantity: true, unit: true } } } },
      notes: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, fullName: true, role: true } } },
      },
    },
  });

  if (!found) throw notFound("الطلب غير موجود");

  const seesAll = can(user.role, "requests:read:all");
  const isOwner = found.requesterId === user.id;
  if (!seesAll && !isOwner) {
    throw new ApiError(403, "لا تملك الصلاحية لعرض هذا الطلب");
  }

  return NextResponse.json({ request: found });
});
