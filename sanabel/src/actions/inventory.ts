"use server";

import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth";
import {
  AppError,
  ConflictError,
  NotFoundError,
  runAction,
  type ActionResult,
} from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { applyMovement } from "@/lib/stock";

const itemSchema = z.object({
  name: z.string().trim().min(2, "اسم الصنف مطلوب (حرفان على الأقل).").max(120),
  unit: z.string().trim().min(1, "وحدة القياس مطلوبة.").max(20),
  categoryId: z.number().int().positive("اختر تصنيفاً."),
  threshold: z.number().int().min(0, "حد التنبيه لا يمكن أن يكون سالباً.").max(100000),
  notes: z.string().trim().max(500).nullable(),
});

function readItemForm(formData: FormData) {
  const parsed = itemSchema.safeParse({
    name: formData.get("name")?.toString() ?? "",
    unit: formData.get("unit")?.toString() ?? "قطعة",
    categoryId: Number(formData.get("categoryId")),
    threshold: Number(formData.get("threshold") ?? 0),
    notes: formData.get("notes")?.toString().trim() || null,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError(issue.message, String(issue.path[0]));
  }
  return parsed.data;
}

/** إضافة صنف — الرصيد الافتتاحي يدخل الدفتر كحركة، لا ككتابة مباشرة */
export async function createItem(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("inventory:manage");
    const data = readItemForm(formData);

    const opening = Number(formData.get("quantity") ?? 0);
    if (!Number.isInteger(opening) || opening < 0) {
      throw new AppError("الرصيد الافتتاحي يجب أن يكون عدداً صحيحاً غير سالب.", "quantity");
    }

    return prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) throw new NotFoundError("التصنيف المختار غير موجود.");

      const duplicate = await tx.item.findFirst({
        where: { name: data.name, categoryId: data.categoryId },
      });
      if (duplicate) {
        throw new ConflictError(
          `الصنف «${data.name}» موجود بالفعل ضمن تصنيف «${category.name}».`,
        );
      }

      const item = await tx.item.create({
        data: { ...data, quantity: 0 },
      });

      if (opening > 0) {
        await applyMovement(tx, {
          itemId: item.id,
          reason: "OPENING",
          delta: opening,
          actor: user,
          refType: "Item",
          refId: item.id,
          note: "رصيد افتتاحي عند إضافة الصنف",
        });
      }

      await logActivity(tx, {
        actor: user,
        action: "ITEM_CREATE",
        entity: "Item",
        entityId: item.id,
        summary: `إضافة صنف «${item.name}» إلى تصنيف «${category.name}» برصيد ${opening} ${item.unit}`,
        details: { name: item.name, opening },
      });

      return { id: item.id };
    });
  });

  return result;
}

/** تعديل بيانات الصنف — لا يمسّ الكمية إطلاقاً، لها إجراء الجرد المستقل */
export async function updateItem(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const result = await runAction(async () => {
    const user = await requirePermission("inventory:manage");
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) throw new AppError("صنف غير صالح.");

    const data = readItemForm(formData);

    return prisma.$transaction(async (tx) => {
      const before = await tx.item.findUnique({ where: { id } });
      if (!before) throw new NotFoundError("الصنف غير موجود.");

      const duplicate = await tx.item.findFirst({
        where: { name: data.name, categoryId: data.categoryId, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictError(`يوجد صنف آخر بالاسم «${data.name}» في نفس التصنيف.`);
      }

      await tx.item.update({ where: { id }, data });

      await logActivity(tx, {
        actor: user,
        action: "ITEM_UPDATE",
        entity: "Item",
        entityId: id,
        summary: `تعديل بيانات الصنف «${before.name}»`,
        details: {
          before: { name: before.name, unit: before.unit, threshold: before.threshold },
          after: { name: data.name, unit: data.unit, threshold: data.threshold },
        },
      });

      return null;
    });
  });

  return result;
}

/**
 * تعديل جرد: تُدخل الكمية الفعلية بعد العدّ، والنظام يحسب الفارق ويسجّله.
 * السبب إلزامي — تغيّر رصيد بلا تفسير هو بالضبط ما يجعل الدفتر عديم الفائدة.
 */
export async function adjustStock(
  _prev: ActionResult<{ delta: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ delta: number }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("inventory:manage");

    const id = Number(formData.get("id"));
    const counted = Number(formData.get("counted"));
    const note = formData.get("note")?.toString().trim();

    if (!Number.isInteger(id)) throw new AppError("صنف غير صالح.");
    if (!Number.isInteger(counted) || counted < 0) {
      throw new AppError("الكمية الفعلية يجب أن تكون عدداً صحيحاً غير سالب.", "counted");
    }
    if (!note) {
      throw new AppError("اذكر سبب التعديل — يُحفظ في دفتر الحركة.", "note");
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id } });
      if (!item) throw new NotFoundError("الصنف غير موجود.");

      const delta = counted - item.quantity;
      if (delta === 0) {
        throw new AppError("الكمية المدخلة تطابق الرصيد الحالي — لا يوجد ما يُعدَّل.");
      }

      await applyMovement(tx, {
        itemId: id,
        reason: "ADJUST",
        delta,
        actor: user,
        refType: "Item",
        refId: id,
        note,
      });

      await logActivity(tx, {
        actor: user,
        action: "STOCK_ADJUST",
        entity: "Item",
        entityId: id,
        summary:
          `تعديل جرد «${item.name}»: من ${item.quantity} إلى ${counted} ` +
          `(${delta > 0 ? "+" : ""}${delta}) — ${note}`,
        details: { before: item.quantity, after: counted, delta, note },
      });

      return { delta };
    });
  });

  return result;
}

/** أرشفة/استعادة صنف — لا حذف، حتى لا تنقطع مراجع الطلبات القديمة */
export async function toggleItemArchive(
  _prev: ActionResult<{ isActive: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ isActive: boolean }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("inventory:manage");
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) throw new AppError("صنف غير صالح.");

    return prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id } });
      if (!item) throw new NotFoundError("الصنف غير موجود.");

      const next = !item.isActive;

      if (!next) {
        const outstandingLines = await tx.supplyLine.findMany({
          where: {
            itemId: id,
            request: { status: { in: ["ISSUED", "AWAITING_VERIFICATION"] } },
          },
        });
        const stillOut = outstandingLines.reduce(
          (sum, l) => sum + (l.quantity - l.returnedGood - l.returnedDamaged - l.returnedLost),
          0,
        );
        if (stillOut > 0) {
          throw new ConflictError(
            `لا يمكن أرشفة «${item.name}» وهناك ${stillOut} منه ما تزال في عهدة الفرق.`,
          );
        }
      }

      await tx.item.update({ where: { id }, data: { isActive: next } });

      await logActivity(tx, {
        actor: user,
        action: next ? "ITEM_RESTORE" : "ITEM_ARCHIVE",
        entity: "Item",
        entityId: id,
        summary: `${next ? "استعادة" : "أرشفة"} الصنف «${item.name}»`,
      });

      return { isActive: next };
    });
  });

  return result;
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "اسم التصنيف مطلوب.").max(60),
});

export async function createCategory(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("inventory:manage");

    const parsed = categorySchema.safeParse({
      name: formData.get("name")?.toString() ?? "",
    });
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0].message, "name");
    }

    return prisma.$transaction(async (tx) => {
      const exists = await tx.category.findUnique({
        where: { name: parsed.data.name },
      });
      if (exists) throw new ConflictError("يوجد تصنيف بهذا الاسم بالفعل.");

      const count = await tx.category.count();
      const category = await tx.category.create({
        data: { name: parsed.data.name, sortOrder: count + 1 },
      });

      await logActivity(tx, {
        actor: user,
        action: "CATEGORY_CREATE",
        entity: "Category",
        entityId: category.id,
        summary: `إضافة تصنيف «${category.name}»`,
      });

      return { id: category.id };
    });
  });

  return result;
}
