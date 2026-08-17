import "server-only";

import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { logActivity } from "@/lib/activity";
import { ApiError, badRequest, conflict, notFound } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import {
  canTransition,
  isOpenStatus,
  lineOutstanding,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type RequestStatus,
  type RequestType,
} from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { applyMovement, type MovementActor } from "@/lib/stock";
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

/** الأعمدة اللازمة لحساب الكمية المعلّقة لسطر */
const LEDGER_SELECT = {
  id: true,
  itemId: true,
  itemName: true,
  unit: true,
  deducted: true,
  released: true,
  returned: true,
  quarantined: true,
  writtenOff: true,
} as const;

function actorOf(user: CurrentUser): MovementActor {
  return { id: user.id, fullName: user.fullName };
}

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
 * يفكّ حجز ما لم يُسلَّم بعد ويعيده إلى المخزون المتاح.
 * يُستدعى عند رفض الطلب أو إلغائه — أي قبل أن يخرج العتاد من المقر.
 *
 * يعتمد على الكمية المعلّقة لا على `deducted` الخام، فلو رجع شيء من هذا
 * السطر سابقًا لأي سبب لا يُعاد إلى المخزون مرتين.
 */
async function releaseReservations(
  tx: Tx,
  requestId: number,
  actor: MovementActor,
  note: string,
): Promise<number> {
  const lines = await tx.requestLine.findMany({
    where: { requestId, itemId: { not: null } },
    select: LEDGER_SELECT,
  });

  let releasedTotal = 0;

  for (const line of lines) {
    if (!line.itemId) continue;
    const pending = lineOutstanding(line);
    if (pending <= 0) continue;

    await applyMovement(tx, {
      itemId: line.itemId,
      reason: "RELEASE",
      units: pending,
      availableDelta: pending,
      actor,
      requestId,
      requestLineId: line.id,
      note,
    });

    await tx.requestLine.update({
      where: { id: line.id },
      data: { released: { increment: pending } },
    });

    releasedTotal += pending;
  }

  return releasedTotal;
}

/* ---------------------------------------------------------- إنشاء الطلبات */

export async function createRequest(user: CurrentUser, input: CreateInput) {
  const type = input.type as RequestType;
  const lines = mergeLines(input.lines);
  const teamName = user.teamName?.trim() || user.fullName;
  const actor = actorOf(user);

  return prisma.$transaction(async (tx) => {
    /*
      الترتيب مقصود: نتحقّق ثم نُنشئ الطلب ثم نخصم.
      الخصم بعد الإنشاء هو ما يسمح لكل قيد في دفتر الحركة أن يشير إلى رقم
      الطلب والسطر، فيصبح أثر كل وحدة قابلًا للتتبّع من الطرفين.
    */
    const prepared: (NormalizedLine & { unit: string; reserve: number })[] = [];

    for (const line of lines) {
      // ---------- طلب عهدة: يجب أن يكون الغرض موجودًا ومتاحًا بالكمية المطلوبة
      if (type === "EQUIPMENT") {
        if (!line.itemId) throw badRequest("طلب العهدة يقبل أغراضًا من المخزون فقط");
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item || !item.isActive) throw notFound("أحد الأغراض المطلوبة لم يعد متاحًا");

        if (item.quantity < line.quantity) {
          throw conflict(
            `الكمية المتاحة من «${item.name}» غير كافية — المتوفّر الآن ${item.quantity} ${item.unit}. ` +
              "يمكنك تقديم «طلب كمية إضافية» بدلًا من ذلك.",
          );
        }

        prepared.push({
          ...line,
          itemName: item.name,
          unit: item.unit,
          reserve: line.quantity,
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

        prepared.push({ ...line, itemName: item.name, unit: item.unit, reserve: 0 });
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
        prepared.push({ ...line, itemName: item.name, unit: item.unit, reserve: 0 });
        continue;
      }

      if (!line.itemName) throw badRequest("اكتب اسم الغرض المطلوب شراؤه");
      prepared.push({ ...line, unit: "قطعة", reserve: 0 });
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
            deducted: 0,
            note: line.note,
          })),
        },
      },
      include: { lines: true },
    });

    /*
      الحجز: خصم ذرّي مشروط داخل applyMovement — ينجح فقط إذا كان الرصيد ما
      زال كافيًا، فلا ينكسر أمام طلبين متزامنين على الغرض نفسه.

      الربط بالغرض لا بترتيب الأسطر: mergeLines يضمن ألّا يتكرّر الغرض في
      الطلب، وكل سطر عهدة له itemId، فالمفتاح فريد ولا يعتمد على ترتيب ما
      يعيده Prisma.
    */
    const reserveByItem = new Map<number, number>();
    for (const plan of prepared) {
      if (plan.itemId !== null && plan.reserve > 0) {
        reserveByItem.set(plan.itemId, plan.reserve);
      }
    }

    for (const line of created.lines) {
      if (line.itemId === null) continue;
      const reserve = reserveByItem.get(line.itemId);
      if (!reserve) continue;

      await applyMovement(tx, {
        itemId: line.itemId,
        reason: "RESERVE",
        units: reserve,
        availableDelta: -reserve,
        actor,
        requestId: created.id,
        requestLineId: line.id,
        note: `حجز لطلب #${created.id} — ${teamName}`,
      });

      await tx.requestLine.update({
        where: { id: line.id },
        data: { deducted: reserve },
      });
    }

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

    // findUniqueOrThrow لا findUnique: الطلب أُنشئ في هذه المعاملة نفسها،
    // فالنتيجة غير قابلة للعدم ولا داعي لأن يحملها النوع كاحتمال.
    return tx.request.findUniqueOrThrow({
      where: { id: created.id },
      include: { lines: true },
    });
  });
}

/* ----------------------------------------------------------- قرار الطلب */

export async function decideRequest(
  user: CurrentUser,
  requestId: number,
  input: DecisionInput,
) {
  const actor = actorOf(user);

  return prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound("الطلب غير موجود");

    const from = request.status as RequestStatus;
    const to = input.status as RequestStatus;

    /*
      الإلغاء ليس قرارًا: له مساره الخاص وشرط ملكيته الخاص (cancelRequest).
      نمنعه هنا صراحةً حتى لا يفتح انتقالٌ مسموح في ALLOWED_TRANSITIONS بابًا
      يتخطّى فكّ الحجز لو وُسِّعت مخطوطة التحقّق يومًا.
    */
    if (to === "CANCELLED") {
      throw badRequest("الإلغاء يتم من مسار إلغاء الطلب لا من مسار القرار");
    }

    if (!isOpenStatus(from)) {
      throw conflict(
        `تم البتّ في هذا الطلب مسبقًا (${REQUEST_STATUS_LABELS[from]}) ولا يمكن تعديله.`,
      );
    }
    if (!canTransition(from, to)) {
      throw conflict("لا يمكن نقل الطلب إلى هذه الحالة");
    }

    // الرفض يفكّ الحجز ويعيد الكميات إلى المخزون فورًا
    let released = 0;
    if (to === "REJECTED") {
      released = await releaseReservations(
        tx,
        requestId,
        actor,
        `فكّ حجز برفض الطلب #${requestId}`,
      );
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

    // بعد القبول تتحوّل الكميات من «محجوزة» إلى «عهدة في يد الفرقة»
    const custody = updated.lines.reduce(
      (sum, line) => sum + lineOutstanding(line),
      0,
    );

    await logActivity(tx, {
      actorId: user.id,
      actorName: user.fullName,
      action,
      entity: "Request",
      entityId: requestId,
      summary:
        `غيّر حالة الطلب #${requestId} إلى «${REQUEST_STATUS_LABELS[to]}»` +
        (to === "REJECTED" && released > 0 ? ` وأعاد ${released} وحدة إلى المخزون` : "") +
        (to === "APPROVED" && custody > 0 ? ` — ${custody} وحدة في عهدة ${updated.teamName}` : ""),
    });

    return updated;
  });
}

/* ---------------------------------------------------------- إلغاء الطلب */

export async function cancelRequest(user: CurrentUser, requestId: number) {
  const actor = actorOf(user);

  return prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound("الطلب غير موجود");

    if (request.requesterId !== user.id) {
      throw new ApiError(403, "لا يمكنك إلغاء طلب فرقة أخرى");
    }
    if (!isOpenStatus(request.status)) {
      throw conflict("لا يمكن إلغاء طلب تم البتّ فيه أو إلغاؤه مسبقًا");
    }

    const released = await releaseReservations(
      tx,
      requestId,
      actor,
      `فكّ حجز بإلغاء الطلب #${requestId}`,
    );

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
      summary:
        `ألغى طلبه رقم #${requestId}` +
        (released > 0 ? ` وأُعيدت ${released} وحدة إلى المخزون` : ""),
    });

    return updated;
  });
}
