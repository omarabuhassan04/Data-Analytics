"use server";

import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth";
import { outstanding } from "@/lib/domain";
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

const countsSchema = z.object({
  supplyLineId: z.number().int().positive(),
  good: z.number().int().min(0, "لا يمكن أن تكون الكمية سالبة."),
  damaged: z.number().int().min(0, "لا يمكن أن تكون الكمية سالبة."),
  lost: z.number().int().min(0, "لا يمكن أن تكون الكمية سالبة."),
});

function parseLines(formData: FormData) {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    throw new AppError("تعذّرت قراءة أسطر الإرجاع. أعد المحاولة.");
  }
  const parsed = z.array(countsSchema).min(1).safeParse(raw);
  if (!parsed.success) {
    throw new AppError("بيانات الإرجاع غير صالحة.");
  }
  return parsed.data;
}

/**
 * تقديم إرجاع من الفرقة.
 *
 * لا يمسّ المخزون إطلاقاً — ما تصرّح به الفرقة دعوى لا رصيد. المخزون يتحرّك
 * عند اعتماد قائد اللوازم وحده، وبالكميات التي يعاينها هو.
 */
export async function submitReturn(
  _prev: ActionResult<{ code: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ code: string }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("returns:submit");
    const requestId = Number(formData.get("supplyRequestId"));
    if (!Number.isInteger(requestId)) throw new AppError("طلب غير صالح.");

    const lines = parseLines(formData);
    const note = formData.get("note")?.toString().trim() || null;

    return prisma.$transaction(async (tx) => {
      const request = await tx.supplyRequest.findUnique({
        where: { id: requestId },
        include: { lines: true, team: true },
      });

      if (!request) throw new NotFoundError("الطلب غير موجود.");
      if (request.teamId !== user.teamId) {
        throw new ForbiddenError("لا يمكنك الإرجاع على طلب فرقة أخرى.");
      }
      if (request.status === "COMPLETED") {
        throw new ConflictError("هذا الطلب مكتمل ولا توجد عهدة قائمة عليه.");
      }
      if (request.status === "AWAITING_VERIFICATION") {
        throw new ConflictError(
          "يوجد إرجاع سابق بانتظار تحقّق قائد اللوازم. انتظر اعتماده قبل تقديم إرجاع جديد.",
        );
      }

      const byId = new Map(request.lines.map((line) => [line.id, line]));
      let declared = 0;

      for (const entry of lines) {
        const line = byId.get(entry.supplyLineId);
        if (!line) throw new NotFoundError("أحد أسطر الطلب غير موجود.");

        const sum = entry.good + entry.damaged + entry.lost;
        declared += sum;

        const remaining = outstanding(line);
        if (sum > remaining) {
          throw new ConflictError(
            `«${line.itemName}»: أدخلت ${sum} بينما المتبقّي في العهدة ${remaining} فقط.`,
          );
        }
      }

      if (declared === 0) {
        throw new AppError("أدخل كمية واحدة على الأقل لإرجاعها.");
      }

      const created = await tx.returnBatch.create({
        data: {
          code: `tmp-${crypto.randomUUID()}`,
          supplyRequestId: request.id,
          submittedById: user.id,
          status: "AWAITING_VERIFICATION",
          note,
          lines: {
            create: lines
              .filter((l) => l.good + l.damaged + l.lost > 0)
              .map((l) => ({
                supplyLineId: l.supplyLineId,
                claimedGood: l.good,
                claimedDamaged: l.damaged,
                claimedLost: l.lost,
              })),
          },
        },
      });

      const batch = await tx.returnBatch.update({
        where: { id: created.id },
        data: { code: formatCode("RETURN", created.id, created.submittedAt) },
      });

      await tx.supplyRequest.update({
        where: { id: request.id },
        data: { status: "AWAITING_VERIFICATION" },
      });

      await logActivity(tx, {
        actor: user,
        action: "RETURN_SUBMIT",
        entity: "ReturnBatch",
        entityId: batch.id,
        summary: `تقديم إرجاع ${batch.code} على الطلب ${request.code} — ${declared} وحدة بانتظار التحقق`,
        details: { code: batch.code, requestCode: request.code, declared },
      });

      return { code: batch.code };
    });
  });

  return result;
}

/**
 * اعتماد الإرجاع من قائد اللوازم — اللحظة الوحيدة التي يعود فيها شيء للمخزون.
 *
 * الصالح وحده يعود إلى الرصيد المتاح. التالف والمفقود يُسجَّلان في عدّادات
 * منفصلة ولا يُضافان إلى المتاح: كلاهما خرج من الرصيد عند الصرف ولن يعود.
 */
export async function verifyReturn(
  _prev: ActionResult<{ completed: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ completed: boolean }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("returns:verify");
    const batchId = Number(formData.get("batchId"));
    if (!Number.isInteger(batchId)) throw new AppError("دفعة إرجاع غير صالحة.");

    const lines = parseLines(formData);
    const verifyNote = formData.get("verifyNote")?.toString().trim() || null;

    return prisma.$transaction(async (tx) => {
      const batch = await tx.returnBatch.findUnique({
        where: { id: batchId },
        include: {
          lines: { include: { supplyLine: true } },
          supplyRequest: { include: { team: true, lines: true } },
        },
      });

      if (!batch) throw new NotFoundError("دفعة الإرجاع غير موجودة.");
      if (batch.status === "VERIFIED") {
        throw new ConflictError("تم اعتماد هذه الدفعة من قبل.");
      }

      const request = batch.supplyRequest;
      const byLineId = new Map(batch.lines.map((l) => [l.supplyLineId, l]));

      let totalGood = 0;
      let totalDamaged = 0;
      let totalLost = 0;

      for (const entry of lines) {
        const returnLine = byLineId.get(entry.supplyLineId);
        if (!returnLine) {
          throw new NotFoundError("أحد أسطر الإرجاع لا ينتمي لهذه الدفعة.");
        }

        const supplyLine = returnLine.supplyLine;
        const sum = entry.good + entry.damaged + entry.lost;
        const remaining = outstanding(supplyLine);

        if (sum > remaining) {
          throw new ConflictError(
            `«${supplyLine.itemName}»: اعتمدت ${sum} بينما المتبقّي في العهدة ${remaining} فقط.`,
          );
        }

        if (sum === 0) {
          await tx.returnLine.update({
            where: { id: returnLine.id },
            data: { verifiedGood: 0, verifiedDamaged: 0, verifiedLost: 0 },
          });
          continue;
        }

        // الصالح فقط يعود إلى الرصيد المتاح
        if (entry.good > 0) {
          await applyMovement(tx, {
            itemId: supplyLine.itemId,
            reason: "RETURN_GOOD",
            delta: entry.good,
            actor: user,
            teamName: request.team.name,
            refType: "ReturnBatch",
            refId: batch.id,
            note: `إرجاع صالح معتمد ضمن ${batch.code}`,
          });
        }

        // التالف يُسجَّل خارج المتاح — لا يزيد الرصيد القابل للصرف
        if (entry.damaged > 0) {
          await applyMovement(tx, {
            itemId: supplyLine.itemId,
            reason: "RETURN_DAMAGED",
            delta: 0,
            damagedDelta: entry.damaged,
            actor: user,
            teamName: request.team.name,
            refType: "ReturnBatch",
            refId: batch.id,
            note: `تالف معتمد ضمن ${batch.code}`,
          });
        }

        // المفقود كذلك: خرج عند الصرف ولن يعود، والسطر هنا لإثبات المسؤولية
        if (entry.lost > 0) {
          await applyMovement(tx, {
            itemId: supplyLine.itemId,
            reason: "RETURN_LOST",
            delta: 0,
            lostDelta: entry.lost,
            actor: user,
            teamName: request.team.name,
            refType: "ReturnBatch",
            refId: batch.id,
            note: `مفقود معتمد ضمن ${batch.code}`,
          });
        }

        await tx.supplyLine.update({
          where: { id: supplyLine.id },
          data: {
            returnedGood: { increment: entry.good },
            returnedDamaged: { increment: entry.damaged },
            returnedLost: { increment: entry.lost },
          },
        });

        await tx.returnLine.update({
          where: { id: returnLine.id },
          data: {
            verifiedGood: entry.good,
            verifiedDamaged: entry.damaged,
            verifiedLost: entry.lost,
          },
        });

        totalGood += entry.good;
        totalDamaged += entry.damaged;
        totalLost += entry.lost;
      }

      await tx.returnBatch.update({
        where: { id: batch.id },
        data: {
          status: "VERIFIED",
          verifiedById: user.id,
          verifiedAt: new Date(),
          verifyNote,
        },
      });

      // أُعيدت قراءة الأسطر بعد التحديث: العهدة قد تُغلق أو يبقى منها بقيّة
      const freshLines = await tx.supplyLine.findMany({
        where: { requestId: request.id },
      });
      const stillOut = freshLines.reduce((sum, l) => sum + outstanding(l), 0);
      const completed = stillOut === 0;

      await tx.supplyRequest.update({
        where: { id: request.id },
        data: {
          status: completed ? "COMPLETED" : "ISSUED",
          completedAt: completed ? new Date() : null,
        },
      });

      await logActivity(tx, {
        actor: user,
        action: "RETURN_VERIFY",
        entity: "ReturnBatch",
        entityId: batch.id,
        summary:
          `اعتماد الإرجاع ${batch.code} على الطلب ${request.code} — ` +
          `${totalGood} صالح، ${totalDamaged} تالف، ${totalLost} مفقود` +
          (completed ? " — أُغلقت العهدة" : ` — بقي ${stillOut} في العهدة`),
        details: {
          code: batch.code,
          requestCode: request.code,
          team: request.team.name,
          good: totalGood,
          damaged: totalDamaged,
          lost: totalLost,
          remaining: stillOut,
        },
      });

      return { completed };
    });
  });

  return result;
}
