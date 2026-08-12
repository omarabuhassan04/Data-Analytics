import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { logActivity } from "@/lib/activity";
import { conflict, notFound, readJson, requirePermission, withApi } from "@/lib/api";
import { stockLevel } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { itemCreateSchema } from "@/lib/validation";

export const GET = withApi(async (request: Request) => {
  await requirePermission("inventory:read");

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const categoryId = Number(url.searchParams.get("categoryId"));
  const level = url.searchParams.get("level"); // OUT | LOW | OK
  const includeInactive = url.searchParams.get("includeInactive") === "true";

  const where: Prisma.ItemWhereInput = {};
  if (!includeInactive) where.isActive = true;
  if (search) where.name = { contains: search };
  if (Number.isInteger(categoryId) && categoryId > 0) where.categoryId = categoryId;

  const items = await prisma.item.findMany({
    where,
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    include: { category: { select: { id: true, name: true, icon: true } } },
  });

  const shaped = items.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    threshold: item.threshold,
    notes: item.notes,
    photoUrl: item.photoUrl,
    isActive: item.isActive,
    category: item.category,
    level: stockLevel(item.quantity, item.threshold),
  }));

  // تصفية مستوى المخزون تتم بعد الحساب لأنها مشتقّة وليست عمودًا في القاعدة
  const filtered = level ? shaped.filter((item) => item.level === level) : shaped;

  return NextResponse.json({ items: filtered });
});

export const POST = withApi(async (request: Request) => {
  const user = await requirePermission("inventory:write");
  const body = itemCreateSchema.parse(await readJson(request));

  const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!category) throw notFound("التصنيف المحدّد غير موجود");

  const duplicate = await prisma.item.findFirst({
    where: { name: body.name, categoryId: body.categoryId },
  });
  if (duplicate) throw conflict("يوجد غرض بهذا الاسم في التصنيف نفسه");

  const item = await prisma.item.create({
    data: {
      name: body.name,
      unit: body.unit,
      quantity: body.quantity,
      threshold: body.threshold,
      notes: body.notes,
      photoUrl: body.photoUrl,
      categoryId: body.categoryId,
    },
    include: { category: { select: { id: true, name: true, icon: true } } },
  });

  await logActivity(prisma, {
    actorId: user.id,
    actorName: user.fullName,
    action: "ITEM_CREATE",
    entity: "Item",
    entityId: item.id,
    summary: `أضاف «${item.name}» إلى تصنيف ${category.name} بكمية ${item.quantity} ${item.unit}`,
  });

  return NextResponse.json({ item }, { status: 201 });
});
