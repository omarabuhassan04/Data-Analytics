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
import { applyMovement } from "@/lib/stock";
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

  const quantityChanged =
    body.quantity !== undefined && body.quantity !== item.quantity;

  /*
    تعديل الجرد يمرّ من الدفتر لا من عمود الكمية مباشرةً.
    نحوّل «الكمية الجديدة» التي أرسلتها الواجهة إلى فرقٍ موقَّع، فيبقى شرط
    المطابقة (مجموع الدفتر = الرصيد) صحيحًا بعد التعديل اليدوي أيضًا.
  */
  const updated = await prisma.$transaction(async (tx) => {
    await tx.item.update({
      where: { id },
      data: {
        name: body.name,
        unit: body.unit,
        threshold: body.threshold,
        notes: body.notes,
        photoUrl: body.photoUrl,
        categoryId: body.categoryId,
        isActive: body.isActive,
      },
    });

    if (quantityChanged && body.quantity !== undefined) {
      const delta = body.quantity - item.quantity;
      await applyMovement(tx, {
        itemId: id,
        reason: "ADJUST",
        units: Math.abs(delta),
        availableDelta: delta,
        actor: { id: user.id, fullName: user.fullName },
        note: body.adjustmentReason ?? "تعديل جرد يدوي",
      });
    }

    const fresh = await tx.item.findUniqueOrThrow({
      where: { id },
      include: { category: { select: { id: true, name: true, icon: true } } },
    });

    await logActivity(tx, {
      actorId: user.id,
      actorName: user.fullName,
      action: quantityChanged ? "ITEM_ADJUST" : "ITEM_UPDATE",
      entity: "Item",
      entityId: id,
      summary: quantityChanged
        ? `عدّل كمية «${fresh.name}» من ${item.quantity} إلى ${fresh.quantity} ${fresh.unit}` +
          (body.adjustmentReason ? ` — السبب: ${body.adjustmentReason}` : "")
        : `عدّل بيانات الغرض «${fresh.name}»`,
    });

    return fresh;
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

  // وحدات في يد الفرق أو محتجزة بالفحص ما زالت في عهدة النظام
  if (item.quarantine > 0) {
    throw conflict(
      `«${item.name}» له ${item.quarantine} ${item.unit} محتجزة في فحص الجودة. ابتّ في الفحص أولًا.`,
    );
  }

  const outstanding = await prisma.requestLine.aggregate({
    where: { itemId: id },
    _sum: {
      deducted: true,
      released: true,
      returned: true,
      quarantined: true,
      writtenOff: true,
    },
  });
  const stillOut =
    (outstanding._sum.deducted ?? 0) -
    (outstanding._sum.released ?? 0) -
    (outstanding._sum.returned ?? 0) -
    (outstanding._sum.quarantined ?? 0) -
    (outstanding._sum.writtenOff ?? 0);
  if (stillOut > 0) {
    throw conflict(
      `«${item.name}» له ${stillOut} ${item.unit} ما زالت في عهدة الفرق ولم ترجع بعد.`,
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
