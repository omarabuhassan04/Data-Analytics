import "server-only";

import type { Prisma } from "@prisma/client";

import type { CurrentUser } from "@/lib/auth";
import type { StockReason } from "@/lib/domain";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";

/**
 * البدائية الوحيدة التي تغيّر أرصدة المخزون.
 *
 * لا يوجد في التطبيق أي `item.update` يمسّ quantity أو damagedQty أو lostQty
 * خارج هذا الملف. الفائدة أن كل تغيّر في رصيد — بلا استثناء — يترك أثراً في
 * دفتر الحركة، فيصبح سؤال «لماذا نقص هذا الرقم؟» قابلاً للإجابة دائماً.
 */
export async function applyMovement(
  tx: Prisma.TransactionClient,
  input: {
    itemId: number;
    reason: StockReason;
    /** الأثر على الكمية المتاحة: سالب خصم، موجب إضافة، صفر لا يمسّها */
    delta: number;
    damagedDelta?: number;
    lostDelta?: number;
    actor: Pick<CurrentUser, "id" | "fullName">;
    teamName?: string | null;
    refType?: string | null;
    refId?: number | null;
    note?: string | null;
  },
): Promise<number> {
  const { itemId, delta } = input;
  const damagedDelta = input.damagedDelta ?? 0;
  const lostDelta = input.lostDelta ?? 0;

  if (delta === 0 && damagedDelta === 0 && lostDelta === 0) {
    throw new AppError("حركة مخزون بلا أثر — لا شيء لتسجيله.");
  }

  if (delta < 0) {
    // الحارس الذري: الخصم ينجح فقط ما دام الرصيد كافياً لحظة الكتابة.
    // القراءة ثم الكتابة كانت ستسمح لطلبين متزامنين بصرف نفس القطعة مرّتين.
    const updated = await tx.item.updateMany({
      where: { id: itemId, quantity: { gte: -delta } },
      data: {
        quantity: { increment: delta },
        damagedQty: { increment: damagedDelta },
        lostQty: { increment: lostDelta },
      },
    });
    if (updated.count !== 1) {
      const item = await tx.item.findUnique({
        where: { id: itemId },
        select: { name: true, quantity: true, unit: true },
      });
      if (!item) throw new NotFoundError("الصنف المطلوب غير موجود.");
      throw new ConflictError(
        `الكمية المتاحة من «${item.name}» غير كافية. المتاح الآن ${item.quantity} ${item.unit}.`,
      );
    }
  } else {
    const exists = await tx.item.findUnique({
      where: { id: itemId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError("الصنف المطلوب غير موجود.");

    await tx.item.update({
      where: { id: itemId },
      data: {
        quantity: { increment: delta },
        damagedQty: { increment: damagedDelta },
        lostQty: { increment: lostDelta },
      },
    });
  }

  const after = await tx.item.findUniqueOrThrow({
    where: { id: itemId },
    select: { quantity: true },
  });

  await tx.stockMovement.create({
    data: {
      itemId,
      reason: input.reason,
      delta,
      damagedDelta,
      lostDelta,
      balanceAfter: after.quantity,
      actorId: input.actor.id,
      actorName: input.actor.fullName,
      teamName: input.teamName ?? null,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      note: input.note ?? null,
    },
  });

  return after.quantity;
}

/**
 * إثبات المطابقة: مجموع حركات كل صنف يجب أن يساوي رصيده المخزّن.
 *
 * يُبلّغ عن الانحراف ولا يصحّحه؛ التصحيح التلقائي يخفي العلّة التي سبّبته.
 */
export async function reconcile(tx: Prisma.TransactionClient) {
  const items = await tx.item.findMany({
    select: { id: true, name: true, quantity: true, damagedQty: true, lostQty: true },
    orderBy: { name: "asc" },
  });

  const sums = await tx.stockMovement.groupBy({
    by: ["itemId"],
    _sum: { delta: true, damagedDelta: true, lostDelta: true },
  });

  const byItem = new Map(sums.map((s) => [s.itemId, s._sum]));

  return items.map((item) => {
    const s = byItem.get(item.id);
    const computed = s?.delta ?? 0;
    const computedDamaged = s?.damagedDelta ?? 0;
    const computedLost = s?.lostDelta ?? 0;
    return {
      id: item.id,
      name: item.name,
      stored: item.quantity,
      computed,
      storedDamaged: item.damagedQty,
      computedDamaged,
      storedLost: item.lostQty,
      computedLost,
      drift:
        item.quantity !== computed ||
        item.damagedQty !== computedDamaged ||
        item.lostQty !== computedLost,
    };
  });
}

/**
 * الرقم المرجعي المعروض: ص-٢٠٢٦-٠٠٠١.
 *
 * يُشتقّ من معرّف السجل نفسه لا من عدد السجلات. العدّ كان يعطي طلبين متزامنين
 * الرقم ذاته، فيحجز أحدهما المفتاح الفريد ويبقى الآخر معلّقاً على القفل حتى
 * يُنهي الأول معاملته. المعرّف فريد بحكم تسلسل قاعدة البيانات، فلا سباق أصلاً.
 */
export function formatCode(
  kind: "SUPPLY" | "PURCHASE" | "RETURN",
  id: number,
  createdAt: Date = new Date(),
): string {
  const prefix = { SUPPLY: "ص", PURCHASE: "ش", RETURN: "ر" }[kind];
  return `${prefix}-${createdAt.getFullYear()}-${String(id).padStart(4, "0")}`;
}
