"use server";

import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth";
import { AppError, ConflictError, NotFoundError, runAction, type ActionResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { applyMovement, formatCode } from "@/lib/stock";

const lineSchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().int().min(1, "الكمية يجب أن تكون ١ على الأقل."),
});

const supplySchema = z.object({
  purpose: z.string().trim().max(300, "الغرض طويل جداً.").optional(),
  neededOn: z.string().trim().optional(),
  lines: z.array(lineSchema).min(1, "أضف صنفاً واحداً على الأقل إلى الطلب."),
});

/**
 * طلب لوازم: يُعتمد آلياً ويُخصم من المخزون في نفس المعاملة.
 *
 * لا توجد خطوة موافقة يدوية هنا — هذا ما يفصل طلب اللوازم عن طلب الشراء.
 * الخصم الفوري يبقي «المتاح» الذي تراه بقيّة الفرق صادقاً.
 */
export async function createSupplyRequest(
  _prev: ActionResult<{ id: number; code: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number; code: string }>> {
  const result = await runAction(async () => {
    const user = await requirePermission("supply:create");

    if (!user.teamId) {
      throw new AppError("حسابك غير مرتبط بفرقة، فلا يمكنه تقديم طلبات.");
    }

    let rawLines: unknown;
    try {
      rawLines = JSON.parse(String(formData.get("lines") ?? "[]"));
    } catch {
      throw new AppError("تعذّرت قراءة أصناف الطلب. أعد المحاولة.");
    }

    const parsed = supplySchema.safeParse({
      purpose: formData.get("purpose")?.toString() || undefined,
      neededOn: formData.get("neededOn")?.toString() || undefined,
      lines: rawLines,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      // أخطاء الأسطر لا يقابلها حقل واحد في النموذج، فتُعرض كتنبيه عام
      const path = String(issue.path[0] ?? "");
      const field = path === "purpose" || path === "neededOn" ? path : undefined;
      throw new AppError(issue.message, field);
    }

    const { purpose, neededOn, lines } = parsed.data;

    // دمج التكرار: صنف مضاف مرّتين يصبح سطراً واحداً بمجموع الكميتين
    const merged = new Map<number, number>();
    for (const line of lines) {
      merged.set(line.itemId, (merged.get(line.itemId) ?? 0) + line.quantity);
    }

    return prisma.$transaction(async (tx) => {
      const items = await tx.item.findMany({
        where: { id: { in: [...merged.keys()] } },
      });

      if (items.length !== merged.size) {
        throw new NotFoundError("أحد الأصناف المطلوبة لم يعد موجوداً.");
      }

      const archived = items.find((item) => !item.isActive);
      if (archived) {
        throw new ConflictError(`الصنف «${archived.name}» مؤرشف ولا يمكن صرفه.`);
      }

      const created = await tx.supplyRequest.create({
        data: {
          // رقم مؤقّت فريد يُستبدل فوراً برقم مشتقّ من المعرّف
          code: `tmp-${crypto.randomUUID()}`,
          teamId: user.teamId!,
          requesterId: user.id,
          purpose: purpose || null,
          neededOn: neededOn ? new Date(neededOn) : null,
          status: "ISSUED",
        },
      });

      const request = await tx.supplyRequest.update({
        where: { id: created.id },
        data: { code: formatCode("SUPPLY", created.id, created.createdAt) },
      });

      for (const item of items) {
        const quantity = merged.get(item.id)!;

        const line = await tx.supplyLine.create({
          data: {
            requestId: request.id,
            itemId: item.id,
            itemName: item.name,
            unit: item.unit,
            quantity,
          },
        });

        // يرمي ConflictError برسالة عربية إن لم يكفِ الرصيد لحظة الكتابة
        await applyMovement(tx, {
          itemId: item.id,
          reason: "ISSUE",
          delta: -quantity,
          actor: user,
          teamName: user.teamName,
          refType: "SupplyRequest",
          refId: request.id,
          note: `صرف ضمن الطلب ${request.code}`,
        });

        void line;
      }

      await logActivity(tx, {
        actor: user,
        action: "SUPPLY_SUBMIT",
        entity: "SupplyRequest",
        entityId: request.id,
        summary: `طلب لوازم ${request.code} — ${items.length} أصناف، اعتُمد آلياً وصُرف`,
        details: {
          code: request.code,
          items: items.map((item) => ({
            name: item.name,
            quantity: merged.get(item.id),
            unit: item.unit,
          })),
        },
      });

      return { id: request.id, code: request.code };
    });
  });

  return result;
}
