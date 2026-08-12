import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity";
import { conflict, readJson, requirePermission, withApi } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { categoryCreateSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  await requirePermission("inventory:read");

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      itemCount: category._count.items,
    })),
  });
});

export const POST = withApi(async (request: Request) => {
  const user = await requirePermission("inventory:write");
  const body = categoryCreateSchema.parse(await readJson(request));

  const existing = await prisma.category.findUnique({ where: { name: body.name } });
  if (existing) throw conflict("يوجد تصنيف بهذا الاسم بالفعل");

  const maxOrder = await prisma.category.aggregate({ _max: { sortOrder: true } });

  const category = await prisma.category.create({
    data: {
      name: body.name,
      icon: body.icon,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  await logActivity(prisma, {
    actorId: user.id,
    actorName: user.fullName,
    action: "CATEGORY_CREATE",
    entity: "Category",
    entityId: category.id,
    summary: `أضاف تصنيفًا جديدًا: ${category.name}`,
  });

  return NextResponse.json({ category }, { status: 201 });
});
