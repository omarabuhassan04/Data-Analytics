import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity";
import {
  conflict,
  notFound,
  parseId,
  readJson,
  requirePermission,
  withApi,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { itemUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (request: Request, context: Context) => {
  const user = await requirePermission("inventory:write");
  const id = parseId((await context.params).id, "معرّف الغرض");
  const body = itemUpdateSchema.parse(await readJson(request));

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw notFound("الغرض غير موجود");

  if (body.categoryId && body.categoryId !== item.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category) throw notFound("التصنيف المحدّد غير موجود");
  }

  const nextName = body.name ?? item.name;
  const nextCategoryId = body.categoryId ?? item.categoryId;
  if (nextName !== item.name || nextCategoryId !== item.categoryId) {
    const duplicate = await prisma.item.findFirst({
      where: { name: nextName, categoryId: nextCategoryId, id: { not: id } },
    });
    if (duplicate) throw conflict("يوجد غرض بهذا الاسم في التصنيف نفسه");
  }

  const updated = await prisma.item.update({
    where: { id },
    data: {
      name: body.name,
      unit: body.unit,
      quantity: body.quantity,
      threshold: body.threshold,
      notes: body.notes,
      photoUrl: body.photoUrl,
      categoryId: body.categoryId,
      isActive: body.isActive,
    },
    include: { category: { select: { id: true, name: true, icon: true } } },
  });

  const quantityChanged =
    body.quantity !== undefined && body.quantity !== item.quantity;

  await logActivity(prisma, {
    actorId: user.id,
    actorName: user.fullName,
    action: quantityChanged ? "ITEM_ADJUST" : "ITEM_UPDATE",
    entity: "Item",
    entityId: id,
    summary: quantityChanged
      ? `عدّل كمية «${updated.name}» من ${item.quantity} إلى ${updated.quantity} ${updated.unit}` +
        (body.adjustmentReason ? ` — السبب: ${body.adjustmentReason}` : "")
      : `عدّل بيانات الغرض «${updated.name}»`,
  });

  return NextResponse.json({ item: updated });
});

export const DELETE = withApi(async (_request: Request, context: Context) => {
  const user = await requirePermission("inventory:write");
  const id = parseId((await context.params).id, "معرّف الغرض");

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw notFound("الغرض غير موجود");

  // لا يجوز حذف غرض مرتبط بطلب ما زال مفتوحًا — الكمية محجوزة فعليًا
  const openLines = await prisma.requestLine.count({
    where: { itemId: id, request: { status: { in: ["PENDING", "UNDER_REVIEW"] } } },
  });
  if (openLines > 0) {
    throw conflict(
      "لا يمكن حذف هذا الغرض لأنه مرتبط بطلبات ما زالت مفتوحة. عالِج تلك الطلبات أولًا.",
    );
  }

  const historyLines = await prisma.requestLine.count({ where: { itemId: id } });

  if (historyLines > 0) {
    // أرشفة بدل الحذف حتى لا يفقد سجل الطلبات السابقة ارتباطه
    const archived = await prisma.item.update({
      where: { id },
      data: { isActive: false },
    });
    await logActivity(prisma, {
      actorId: user.id,
      actorName: user.fullName,
      action: "ITEM_DELETE",
      entity: "Item",
      entityId: id,
      summary: `أرشف الغرض «${archived.name}» (مرتبط بطلبات سابقة فلم يُحذف نهائيًا)`,
    });
    return NextResponse.json({ archived: true, item: archived });
  }

  await prisma.item.delete({ where: { id } });

  await logActivity(prisma, {
    actorId: user.id,
    actorName: user.fullName,
    action: "ITEM_DELETE",
    entity: "Item",
    entityId: id,
    summary: `حذف الغرض «${item.name}» نهائيًا`,
  });

  return NextResponse.json({ archived: false });
});
