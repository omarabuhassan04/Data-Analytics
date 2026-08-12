import "server-only";

import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { logActivity } from "@/lib/activity";
import { ApiError, badRequest, conflict, notFound } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import {
  canTransition,
  isOpenStatus,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type RequestStatus,
  type RequestType,
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import type { decisionSchema, requestCreateSchema } from "@/lib/validation";

type Tx = Prisma.TransactionClient;
type CreateInput = z.infer<typeof requestCreateSchema>;
type DecisionInput = z.infer<typeof decisionSchema>;

type NormalizedLine = {
  itemId: number | null;
  itemName: string;
  quantity: number;
  note: string | null;
};

/**
 * يدمج الأسطر المكرّرة لنفس الغرض في سطر واحد.
 * يمنع خصم الكمية مرتين ويجعل رسائل الخطأ أوضح.
 */
function mergeLines(lines: CreateInput["lines"]): NormalizedLine[] {
  const merged = new Map<string, NormalizedLine>();

  for (const line of lines) {
    const itemId = line.itemId ?? null;
    const itemName = (line.itemName ?? "").trim();
    const key = itemId ? `id:${itemId}` : `name:${itemName.toLowerCase()}`;

    const existing = merged.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      // نحتفظ بأول ملاحظة، ونضمّ الملاحظات الإضافية إليها
      if (line.note && line.note !== existing.note) {
        existing.note = existing.note ? `${existing.note} — ${line.note}` : line.note;
      }
    } else {
      merged.set(key, { itemId, itemName, quantity: line.quantity, note: line.note ?? null });
    }
  }

  return [...merged.values()];
}

/**
 * يُعيد الكميات المخصومة إلى المخزون ويصفّر حقل `deducted`.
 * يُستدعى عند رفض الطلب أو إلغائه.
 */
async function restoreStock(tx: Tx, requestId: number): Promise<void> {
  const lines = await tx.requestLine.findMany({
    where: { requestId, deducted: { gt: 0 }, itemId: { not: null } },
    select: { id: true, itemId: true, deducted: true },
  });

  for (const line of lines) {
    if (!line.itemId) continue;
    await tx.item.update({
      where: { id: line.itemId },
      data: { quantity: { increment: line.deducted } },
    });
    await tx.requestLine.update({ where: { id: line.id }, data: { deducted: 0 } });
  }
}

/* ---------------------------------------------------------- إنشاء الطلبات */

export async function createRequest(user: CurrentUser, input: CreateInput) {
  const type = input.type as RequestType;
  const lines = mergeLines(input.lines);
  const teamName = user.teamName?.trim() || user.fullName;

  return prisma.$transaction(async (tx) => {
    const prepared: (NormalizedLine & { unit: string; deducted: number })[] = [];

    for (const line of lines) {
      // ---------- طلب عهدة: يجب أن يكون الغرض موجودًا ومتاحًا بالكمية المطلوبة
      if (type === "EQUIPMENT") {
        if (!line.itemId) throw badRequest("طلب العهدة يقبل أغراضًا من المخزون فقط");
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item || !item.isActive) throw notFound("أحد الأغراض المطلوبة لم يعد متاحًا");

        // خصم ذرّي مشروط: ينجح فقط إذا كانت الكمية ما زالت كافية.
        // هذا النمط آمن أمام الطلبات المتزامنة ولا يعتمد على مستوى عزل معيّن.
        const updated = await tx.item.updateMany({
          where: { id: item.id, quantity: { gte: line.quantity } },
          data: { quantity: { decrement: line.quantity } },
        });

        if (updated.count !== 1) {
          const fresh = await tx.item.findUnique({
            where: { id: item.id },
            select: { quantity: true, unit: true },
          });
          throw conflict(
            `الكمية المتاحة من «${item.name}» غير كافية — المتوفّر الآن ${fresh?.quantity ?? 0} ${item.unit}. ` +
              "يمكنك تقديم «طلب كمية إضافية» بدلًا من ذلك.",
          );
        }

        prepared.push({
          ...line,
          itemName: item.name,
          unit: item.unit,
          deducted: line.quantity,
        });
        continue;
      }

      // ---------- طلب كمية إضافية: الغرض موجود لكن المتوفّر لا يكفي
      if (type === "ADDITIONAL") {
        if (!line.itemId) {
          throw badRequest("طلب الكمية الإضافية يقبل أغراضًا موجودة في المخزون فقط");
        }
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item || !item.isActive) throw notFound("أحد الأغراض المطلوبة لم يعد متاحًا");
        if (item.quantity <= 0) {
          throw badRequest(
            `«${item.name}» نفدت كميته بالكامل — يُقدَّم بصفته «طلب شراء» وليس طلب كمية إضافية.`,
          );
        }

        prepared.push({ ...line, itemName: item.name, unit: item.unit, deducted: 0 });
        continue;
      }

      // ---------- طلب شراء: غرض نفد بالكامل أو غير مُدرج في المخزون
      if (line.itemId) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item) throw notFound("أحد الأغراض المطلوبة غير موجود");
        if (item.quantity > 0) {
          throw badRequest(
            `«${item.name}» ما زال متوفّرًا في المخزون (${item.quantity} ${item.unit}) — ` +
              "استخدم «طلب عهدة» أو «طلب كمية إضافية».",
          );
        }
        prepared.push({ ...line, itemName: item.name, unit: item.unit, deducted: 0 });
        continue;
      }

      if (!line.itemName) throw badRequest("اكتب اسم الغرض المطلوب شراؤه");
      prepared.push({ ...line, unit: "قطعة", deducted: 0 });
    }

    const created = await tx.request.create({
      data: {
        type,
        status: "PENDING",
        requesterId: user.id,
        teamName,
        purpose: input.purpose,
        neededOn: input.neededOn,
        lines: {
          create: prepared.map((line) => ({
            itemId: line.itemId,
            itemName: line.itemName,
            unit: line.unit,
            quantity: line.quantity,
            deducted: line.deducted,
            note: line.note,
          })),
        },
      },
      include: { lines: true },
    });

    await logActivity(tx, {
      actorId: user.id,
      actorName: user.fullName,
      action: "REQUEST_SUBMIT",
      entity: "Request",
      entityId: created.id,
      summary:
        `قدّم ${REQUEST_TYPE_LABELS[type]} رقم #${created.id} ` +
        `باسم ${teamName} (${prepared.length} صنف)`,
    });

    return created;
  });
}

/* ----------------------------------------------------------- قرار الطلب */

export async function decideRequest(
  user: CurrentUser,
  requestId: number,
  input: DecisionInput,
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound("الطلب غير موجود");

    const from = request.status as RequestStatus;
    const to = input.status as RequestStatus;

    if (!isOpenStatus(from)) {
      throw conflict(
        `تم البتّ في هذا الطلب مسبقًا (${REQUEST_STATUS_LABELS[from]}) ولا يمكن تعديله.`,
      );
    }
    if (!canTransition(from, to)) {
      throw conflict("لا يمكن نقل الطلب إلى هذه الحالة");
    }

    // الرفض يعيد الكميات المحجوزة إلى المخزون فورًا
    if (to === "REJECTED") {
      await restoreStock(tx, requestId);
    }

    const isFinal = to === "APPROVED" || to === "REJECTED";

    const updated = await tx.request.update({
      where: { id: requestId },
      data: {
        status: to,
        decisionNote: input.note ?? request.decisionNote,
        decidedById: isFinal ? user.id : request.decidedById,
        decidedAt: isFinal ? new Date() : request.decidedAt,
      },
      include: { lines: true },
    });

    const action =
      to === "APPROVED"
        ? "REQUEST_APPROVE"
        : to === "REJECTED"
          ? "REQUEST_REJECT"
          : "REQUEST_REVIEW";

    await logActivity(tx, {
      actorId: user.id,
      actorName: user.fullName,
      action,
      entity: "Request",
      entityId: requestId,
      summary:
        `غيّر حالة الطلب #${requestId} إلى «${REQUEST_STATUS_LABELS[to]}»` +
        (to === "REJECTED" ? " وأُعيدت الكميات المحجوزة إلى المخزون" : ""),
    });

    return updated;
  });
}

/* ---------------------------------------------------------- إلغاء الطلب */

export async function cancelRequest(user: CurrentUser, requestId: number) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound("الطلب غير موجود");

    if (request.requesterId !== user.id) {
      throw new ApiError(403, "لا يمكنك إلغاء طلب فرقة أخرى");
    }
    if (!isOpenStatus(request.status)) {
      throw conflict("لا يمكن إلغاء طلب تم البتّ فيه أو إلغاؤه مسبقًا");
    }

    await restoreStock(tx, requestId);

    const updated = await tx.request.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
      include: { lines: true },
    });

    await logActivity(tx, {
      actorId: user.id,
      actorName: user.fullName,
      action: "REQUEST_CANCEL",
      entity: "Request",
      entityId: requestId,
      summary: `ألغى طلبه رقم #${requestId} وأُعيدت الكميات المحجوزة إلى المخزون`,
    });

    return updated;
  });
}
