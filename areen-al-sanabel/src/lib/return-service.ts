import "server-only";

import type { z } from "zod";

import { logActivity } from "@/lib/activity";
import { badRequest, conflict, notFound } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { lineOutstanding } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { applyMovement, type MovementActor } from "@/lib/stock";
import type { qcResolveSchema, returnCreateSchema } from "@/lib/validation";

type ReturnInput = z.infer<typeof returnCreateSchema>;
type QcInput = z.infer<typeof qcResolveSchema>;

const LEDGER_SELECT = {
  id: true,
  requestId: true,
  itemId: true,
  itemName: true,
  unit: true,
  quantity: true,
  deducted: true,
  released: true,
  returned: true,
  quarantined: true,
  writtenOff: true,
} as const;

function actorOf(user: CurrentUser): MovementActor {
  return { id: user.id, fullName: user.fullName };
}

/* -------------------------------------------------------- استلام المرتجعات */

/**
 * يستلم عتاد عهدة رجع من فرقة، سطرًا سطرًا.
 *
 * الوحدة الراجعة تسلك أحد ثلاثة مسارات، ولكل منها أثر مختلف على المخزون:
 *   GOOD    → المخزون المتاح مباشرةً        (available +n)
 *   DAMAGED → حجر فحص الجودة                (quarantine +n) — ليست متاحة للصرف
 *   LOST    → شطب                            (لا أثر على الرصيد: الوحدة خرجت ولم تعد)
 *
 * كل هذا في معاملة واحدة: إمّا يُقيَّد الاستلام كاملًا في الدفتر وعلى
 * الأسطر والأرصدة، أو لا يُقيَّد منه شيء.
 */
export async function receiveReturn(
  user: CurrentUser,
  requestId: number,
  input: ReturnInput,
) {
  const actor = actorOf(user);

  return prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, type: true, teamName: true },
    });
    if (!request) throw notFound("الطلب غير موجود");

    /*
      الإرجاع لا يصحّ إلا بعد التسليم. قبل ذلك لا شيء في يد الفرقة أصلًا،
      وفكّ الحجز مساره الرفض أو الإلغاء لا الإرجاع.
    */
    if (request.status !== "APPROVED") {
      throw conflict("الإرجاع متاح للطلبات المقبولة فقط — لم يُسلَّم هذا الطلب بعد");
    }
    if (request.type !== "EQUIPMENT") {
      throw conflict("الإرجاع يخصّ طلبات العهدة فقط");
    }

    const lines = await tx.requestLine.findMany({
      where: { requestId },
      select: LEDGER_SELECT,
    });
    const byId = new Map(lines.map((line) => [line.id, line]));

    // منع تكرار السطر نفسه في الطلب الواحد — وإلا تجاوز المجموع المعلّق
    const seen = new Set<number>();
    for (const entry of input.lines) {
      if (seen.has(entry.lineId)) {
        throw badRequest("لا يمكن إدراج السطر نفسه مرتين في استلام واحد");
      }
      seen.add(entry.lineId);
    }

    let goodTotal = 0;
    let damagedTotal = 0;
    let lostTotal = 0;

    for (const entry of input.lines) {
      const good = entry.good ?? 0;
      const damaged = entry.damaged ?? 0;
      const lost = entry.lost ?? 0;
      const total = good + damaged + lost;
      if (total === 0) continue;

      const line = byId.get(entry.lineId);
      if (!line) throw notFound(`السطر رقم ${entry.lineId} لا ينتمي إلى هذا الطلب`);
      if (!line.itemId) {
        throw badRequest(`«${line.itemName}» غير مُدرج في المخزون فلا يُستلم إرجاعه`);
      }

      /*
        الحدّ الأعلى هو الكمية المعلّقة المحسوبة من الدفتر، لا الكمية
        المطلوبة. هذا ما يمنع إرجاع أكثر مما خرج ولو أُرسل الطلب مرتين.
      */
      const pending = lineOutstanding(line);
      if (pending <= 0) {
        throw conflict(`«${line.itemName}» سُوّي بالكامل — لا يوجد ما يُرجَع`);
      }
      if (total > pending) {
        throw conflict(
          `الكمية الراجعة من «${line.itemName}» (${total} ${line.unit}) ` +
            `تتجاوز المعلّق في العهدة (${pending} ${line.unit})`,
        );
      }

      const note = entry.note?.trim() || null;
      const context = `إرجاع طلب #${requestId} — ${request.teamName}`;

      if (good > 0) {
        await applyMovement(tx, {
          itemId: line.itemId,
          reason: "RETURN",
          units: good,
          availableDelta: good,
          actor,
          requestId,
          requestLineId: line.id,
          note: note ? `${context} — ${note}` : context,
        });
      }

      if (damaged > 0) {
        await applyMovement(tx, {
          itemId: line.itemId,
          reason: "QC_HOLD",
          units: damaged,
          quarantineDelta: damaged,
          actor,
          requestId,
          requestLineId: line.id,
          note: note ? `${context} — للفحص: ${note}` : `${context} — للفحص`,
        });
      }

      if (lost > 0) {
        // الوحدة المفقودة لا ترجع إلى أي رصيد: الحركة قيد مسؤولية لا قيد كمية.
        await applyMovement(tx, {
          itemId: line.itemId,
          reason: "WRITE_OFF",
          units: lost,
          actor,
          requestId,
          requestLineId: line.id,
          note: note ? `${context} — مفقود: ${note}` : `${context} — مفقود`,
        });
      }

      await tx.requestLine.update({
        where: { id: line.id },
        data: {
          ...(good > 0 ? { returned: { increment: good } } : {}),
          ...(damaged > 0 ? { quarantined: { increment: damaged } } : {}),
          ...(lost > 0 ? { writtenOff: { increment: lost } } : {}),
        },
      });

      goodTotal += good;
      damagedTotal += damaged;
      lostTotal += lost;
    }

    if (goodTotal + damagedTotal + lostTotal === 0) {
      throw badRequest("أدخل كمية راجعة واحدة على الأقل");
    }

    const parts = [
      goodTotal > 0 ? `${goodTotal} سليمة` : null,
      damagedTotal > 0 ? `${damagedTotal} للفحص` : null,
      lostTotal > 0 ? `${lostTotal} مفقودة` : null,
    ].filter(Boolean);

    await logActivity(tx, {
      actorId: user.id,
      actorName: user.fullName,
      action: "RETURN_RECEIVE",
      entity: "Request",
      entityId: requestId,
      summary: `استلم إرجاع الطلب #${requestId} من ${request.teamName}: ${parts.join(" · ")}`,
    });

    // الكمية المعلّقة بعد الاستلام — تُحسب من الحالة المحدَّثة لا من الذاكرة
    const after = await tx.requestLine.findMany({
      where: { requestId },
      select: LEDGER_SELECT,
    });
    const stillOut = after.reduce((sum, line) => sum + lineOutstanding(line), 0);

    return {
      requestId,
      received: { good: goodTotal, damaged: damagedTotal, lost: lostTotal },
      outstanding: stillOut,
      settled: stillOut <= 0,
    };
  });
}

/* ------------------------------------------------------------ فحص الجودة */

/**
 * يبتّ في وحدات محتجزة بالفحص: إعادتها للمخزون المتاح أو شطبها.
 *
 * الوحدة المحتجزة موجودة فعليًا في المقر، فالإفراج عنها ينقلها بين رصيدين
 * (quarantine → available) في حركة واحدة، والشطب يخرجها من الحجر نهائيًا.
 */
export async function resolveQuarantine(
  user: CurrentUser,
  lineId: number,
  input: QcInput,
) {
  const actor = actorOf(user);

  return prisma.$transaction(async (tx) => {
    const line = await tx.requestLine.findUnique({
      where: { id: lineId },
      select: LEDGER_SELECT,
    });
    if (!line) throw notFound("السطر غير موجود");
    if (!line.itemId) throw badRequest("هذا السطر غير مرتبط بغرض في المخزون");

    if (input.units > line.quarantined) {
      throw conflict(
        `المحتجز من «${line.itemName}» ${line.quarantined} ${line.unit} فقط — ` +
          `لا يمكن البتّ في ${input.units}`,
      );
    }

    const note = input.note?.trim() || null;
    const context = `فحص جودة — طلب #${line.requestId}`;

    if (input.outcome === "RELEASE") {
      await applyMovement(tx, {
        itemId: line.itemId,
        reason: "QC_RELEASE",
        units: input.units,
        availableDelta: input.units,
        quarantineDelta: -input.units,
        actor,
        requestId: line.requestId,
        requestLineId: line.id,
        note: note ? `${context} — صالح: ${note}` : `${context} — صالح`,
      });

      /*
        الوحدة تنتقل من «محتجزة» إلى «راجعة»: كلاهما مطروح من الكمية
        المعلّقة، فالمعادلة لا تتأثّر — وهذا هو المقصود، الإفراج ليس
        إرجاعًا جديدًا بل تصنيفًا نهائيًا لإرجاع سُجِّل سابقًا.
      */
      await tx.requestLine.update({
        where: { id: line.id },
        data: {
          quarantined: { decrement: input.units },
          returned: { increment: input.units },
        },
      });
    } else {
      await applyMovement(tx, {
        itemId: line.itemId,
        reason: "QC_WRITE_OFF",
        units: input.units,
        quarantineDelta: -input.units,
        actor,
        requestId: line.requestId,
        requestLineId: line.id,
        note: note ? `${context} — شطب: ${note}` : `${context} — شطب`,
      });

      await tx.requestLine.update({
        where: { id: line.id },
        data: {
          quarantined: { decrement: input.units },
          writtenOff: { increment: input.units },
        },
      });
    }

    await logActivity(tx, {
      actorId: user.id,
      actorName: user.fullName,
      action: input.outcome === "RELEASE" ? "QC_RELEASE" : "QC_WRITE_OFF",
      entity: "Item",
      entityId: line.itemId,
      summary:
        input.outcome === "RELEASE"
          ? `أنهى فحص ${input.units} ${line.unit} من «${line.itemName}» وأعادها للمخزون`
          : `شطب ${input.units} ${line.unit} من «${line.itemName}» بعد الفحص`,
    });

    return { lineId, outcome: input.outcome, units: input.units };
  });
}
