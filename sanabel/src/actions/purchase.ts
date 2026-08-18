"use server";

import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth";
import { PURCHASE_TRANSITIONS, type PurchaseStatus } from "@/lib/domain";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  runAction,
  type ActionResult,
} from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { applyMovement, formatCode } from "@/lib/stock";

/**
 * نتيجة موحّدة لإنشاء الطلب وتعديله.
 *
 * الشكل واحد في الحالتين حتى يتمكّن نموذج واحد في الواجهة من التعامل مع
 * الإجراءين دون تفريع في الأنواع.
 */
export type PurchaseFormResult = {
  id: number;
  code: string;
  resubmitted: boolean;
};

const purchaseSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(2, "اسم الصنف مطلوب (حرفان على الأقل).")
    .max(120, "اسم الصنف طويل جداً."),
  unit: z.string().trim().min(1, "وحدة القياس مطلوبة.").max(20),
  quantity: z
    .number()
    .int("الكمية يجب أن تكون عدداً صحيحاً.")
    .min(1, "الكمية يجب أن تكون ١ على الأقل.")
    .max(100000, "الكمية كبيرة بشكل غير معقول."),
  categoryId: z.number().int().positive().nullable(),
  details: z.string().trim().max(1000, "التفاصيل طويلة جداً.").nullable(),
});

function readForm(formData: FormData) {
  const rawCategory = formData.get("categoryId")?.toString();
  const parsed = purchaseSchema.safeParse({
    itemName: formData.get("itemName")?.toString() ?? "",
    unit: formData.get("unit")?.toString() ?? "قطعة",
    quantity: Number(formData.get("quantity")),
    categoryId: rawCategory ? Number(rawCategory) : null,
    details: formData.get("details")?.toString().trim() || null,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new AppError(issue.message, String(issue.path[0]));
  }
  return parsed.data;
}

function assertTransition(from: PurchaseStatus, to: PurchaseStatus) {
  if (!PURCHASE_TRANSITIONS[from].includes(to)) {
    throw new ConflictError(
      "حالة الطلب تغيّرت منذ فتح الصفحة. حدّث الصفحة وأعد المحاولة.",
    );
  }
}

/** إنشاء طلب شراء — يبدأ «قيد الانتظار» ولا يمسّ المخزون */
export async function createPurchaseRequest(
  _prev: ActionResult<PurchaseFormResult> | null,
  formData: FormData,
): Promise<ActionResult<PurchaseFormResult>> {
  const result = await runAction(async () => {
    const user = await requirePermission("purchase:create");
    if (!user.teamId) {
      throw new AppError("حسابك غير مرتبط بفرقة، فلا يمكنه تقديم طلبات.");
    }

    const data = readForm(formData);

    return prisma.$transaction(async (tx) => {
      const created = await tx.purchaseRequest.create({
        data: {
          code: `tmp-${crypto.randomUUID()}`,
          teamId: user.teamId!,
          requesterId: user.id,
          itemName: data.itemName,
          unit: data.unit,
          quantity: data.quantity,
          categoryId: data.categoryId,
          details: data.details,
          status: "PENDING",
        },
      });

      const request = await tx.purchaseRequest.update({
        where: { id: created.id },
        data: { code: formatCode("PURCHASE", created.id, created.createdAt) },
      });

      await logActivity(tx, {
        actor: user,
        action: "PURCHASE_SUBMIT",
        entity: "PurchaseRequest",
        entityId: request.id,
        summary: `طلب شراء ${request.code} — ${data.itemName} (${data.quantity} ${data.unit})`,
        details: { code: request.code, item: data.itemName, quantity: data.quantity },
      });

      return { id: request.id, code: request.code, resubmitted: false };
    });
  });

  return result;
}

/**
 * تعديل طلب شراء من صاحبه.
 *
 * الرفض ليس نهاية الطريق: الفرقة تعالج سبب الرفض وتعيد التقديم، فيعود الطلب
 * «قيد الانتظار» ويرتفع رقم المراجعة — وتبقى ملاحظة الرفض السابقة في السجل.
 */
export async function updatePurchaseRequest(
  _prev: ActionResult<PurchaseFormResult> | null,
  formData: FormData,
): Promise<ActionResult<PurchaseFormResult>> {
  const result = await runAction(async () => {
    const user = await requirePermission("purchase:create");
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) throw new AppError("طلب غير صالح.");

    const data = readForm(formData);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("طلب الشراء غير موجود.");

      if (existing.teamId !== user.teamId) {
        throw new ForbiddenError("لا يمكنك تعديل طلب فرقة أخرى.");
      }

      const status = existing.status as PurchaseStatus;
      if (status !== "PENDING" && status !== "REJECTED") {
        throw new ConflictError(
          "لا يمكن تعديل هذا الطلب بعد الموافقة عليه أو توريده.",
        );
      }

      const resubmitted = status === "REJECTED";
      if (resubmitted) assertTransition("REJECTED", "PENDING");

      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: {
          itemName: data.itemName,
          unit: data.unit,
          quantity: data.quantity,
          categoryId: data.categoryId,
          details: data.details,
          ...(resubmitted
            ? {
                status: "PENDING",
                revision: { increment: 1 },
                decidedById: null,
                decidedAt: null,
                decisionNote: null,
              }
            : {}),
        },
      });

      await logActivity(tx, {
        actor: user,
        action: resubmitted ? "PURCHASE_RESUBMIT" : "PURCHASE_SUBMIT",
        entity: "PurchaseRequest",
        entityId: id,
        summary: resubmitted
          ? `إعادة تقديم طلب الشراء ${updated.code} بعد التعديل (مراجعة ${updated.revision})`
          : `تعديل طلب الشراء ${updated.code} قبل البتّ فيه`,
        details: { code: updated.code, item: data.itemName, quantity: data.quantity },
      });

      return { id, code: updated.code, resubmitted };
    });
  });

  return result;
}

/** موافقة أو رفض — قائد اللوازم وحده. لا أثر على المخزون في الحالتين. */
export async function decidePurchaseRequest(
  _prev: ActionResult<{ status: PurchaseStatus }> | null,
  formData: FormData,
): Promise<ActionResult<{ status: PurchaseStatus }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("purchase:decide");
    const id = Number(formData.get("id"));
    const decision = formData.get("decision")?.toString();
    const note = formData.get("note")?.toString().trim() || null;

    if (!Number.isInteger(id)) throw new AppError("طلب غير صالح.");
    if (decision !== "APPROVE" && decision !== "REJECT") {
      throw new AppError("قرار غير معروف.");
    }
    if (decision === "REJECT" && !note) {
      throw new AppError("سبب الرفض مطلوب حتى تتمكّن الفرقة من التعديل.", "note");
    }

    const target: PurchaseStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({
        where: { id },
        include: { team: true },
      });
      if (!existing) throw new NotFoundError("طلب الشراء غير موجود.");

      assertTransition(existing.status as PurchaseStatus, target);

      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: {
          status: target,
          decidedById: user.id,
          decidedAt: new Date(),
          decisionNote: note,
        },
      });

      await logActivity(tx, {
        actor: user,
        action: decision === "APPROVE" ? "PURCHASE_APPROVE" : "PURCHASE_REJECT",
        entity: "PurchaseRequest",
        entityId: id,
        summary:
          decision === "APPROVE"
            ? `الموافقة على طلب الشراء ${updated.code} من ${existing.team.name}`
            : `رفض طلب الشراء ${updated.code} من ${existing.team.name} — ${note}`,
        details: { code: updated.code, team: existing.team.name, note },
      });

      return { status: target };
    });
  });

  return result;
}

/**
 * توريد مشتريات موافق عليها إلى المخزون.
 *
 * هذه هي القاعدة الواضحة لأثر الشراء على المخزون: الموافقة قرار إداري لا
 * يضيف شيئاً، والإضافة تقع عند وصول البضاعة فعلاً وتسجيلها.
 */
export async function fulfillPurchaseRequest(
  _prev: ActionResult<{ itemId: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ itemId: number }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("purchase:fulfill");

    const id = Number(formData.get("id"));
    const receivedQty = Number(formData.get("receivedQuantity"));
    const targetItemId = formData.get("itemId")?.toString();
    const newCategoryId = formData.get("newCategoryId")?.toString();

    if (!Number.isInteger(id)) throw new AppError("طلب غير صالح.");
    if (!Number.isInteger(receivedQty) || receivedQty < 1) {
      throw new AppError("الكمية المستلمة يجب أن تكون ١ على الأقل.", "receivedQuantity");
    }

    return prisma.$transaction(async (tx) => {
      const request = await tx.purchaseRequest.findUnique({
        where: { id },
        include: { team: true },
      });
      if (!request) throw new NotFoundError("طلب الشراء غير موجود.");

      assertTransition(request.status as PurchaseStatus, "FULFILLED");

      let itemId: number;

      if (targetItemId) {
        // التوريد على صنف قائم
        const item = await tx.item.findUnique({ where: { id: Number(targetItemId) } });
        if (!item) throw new NotFoundError("الصنف المختار غير موجود.");
        itemId = item.id;
      } else {
        // صنف جديد لم يكن في المخزون أصلاً — وهو السبب المعتاد لطلب الشراء
        const categoryId = newCategoryId
          ? Number(newCategoryId)
          : (request.categoryId ?? null);
        if (!categoryId) {
          throw new AppError("اختر تصنيفاً للصنف الجديد.", "newCategoryId");
        }

        const duplicate = await tx.item.findFirst({
          where: { name: request.itemName, categoryId },
        });
        if (duplicate) {
          itemId = duplicate.id;
        } else {
          const created = await tx.item.create({
            data: {
              name: request.itemName,
              unit: request.unit,
              categoryId,
              quantity: 0,
              threshold: 0,
              notes: `أُضيف عبر توريد طلب الشراء ${request.code}`,
            },
          });
          itemId = created.id;
        }
      }

      await applyMovement(tx, {
        itemId,
        reason: "PURCHASE_RECEIVE",
        delta: receivedQty,
        actor: user,
        teamName: request.team.name,
        refType: "PurchaseRequest",
        refId: request.id,
        note: `توريد طلب الشراء ${request.code}`,
      });

      await tx.purchaseRequest.update({
        where: { id },
        data: { status: "FULFILLED", fulfilledAt: new Date() },
      });

      await logActivity(tx, {
        actor: user,
        action: "PURCHASE_FULFILL",
        entity: "PurchaseRequest",
        entityId: id,
        summary: `توريد ${receivedQty} ${request.unit} من «${request.itemName}» ضمن الطلب ${request.code}`,
        details: { code: request.code, received: receivedQty, itemId },
      });

      return { itemId };
    });
  });

  return result;
}

/** إلغاء الطلب من صاحبه ما دام لم يُبتّ فيه بالموافقة */
export async function cancelPurchaseRequest(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const result = await runAction(async () => {
    const user = await requirePermission("purchase:create");
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) throw new AppError("طلب غير صالح.");

    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseRequest.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("طلب الشراء غير موجود.");
      if (existing.teamId !== user.teamId) {
        throw new ForbiddenError("لا يمكنك إلغاء طلب فرقة أخرى.");
      }

      assertTransition(existing.status as PurchaseStatus, "CANCELLED");

      await tx.purchaseRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await logActivity(tx, {
        actor: user,
        action: "PURCHASE_CANCEL",
        entity: "PurchaseRequest",
        entityId: id,
        summary: `إلغاء طلب الشراء ${existing.code}`,
      });

      return null;
    });
  });

  return result;
}
