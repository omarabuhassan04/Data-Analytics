import "server-only";

import type { Prisma } from "@prisma/client";

import { conflict } from "@/lib/api";
import type { MovementReason } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type MovementActor = { id: number | null; fullName: string };

export type MovementInput = {
  itemId: number;
  reason: MovementReason;
  /** عدد الوحدات التي يخصّها الحدث — موجب دائمًا */
  units: number;
  /** أثر الحدث على الكمية المتاحة */
  availableDelta?: number;
  /** أثر الحدث على كمية فحص الجودة */
  quarantineDelta?: number;
  actor: MovementActor;
  requestId?: number | null;
  requestLineId?: number | null;
  note?: string | null;
};

export type MovementResult = {
  availableAfter: number;
  quarantineAfter: number;
};

/**
 * البوابة الوحيدة لتغيير كمية أي غرض.
 *
 * لا يوجد في التطبيق أي `item.update` يمسّ quantity أو quarantine خارج هذه
 * الدالة — وهذا ما يجعل شرط المطابقة صحيحًا بالبناء:
 *   SUM(availableDelta) = Item.quantity   و   SUM(quarantineDelta) = Item.quarantine
 *
 * التحديث مشروط وذرّي: `updateMany` مع شرط عدم السلبية ينجح فقط إذا كان
 * الرصيد ما زال كافيًا وقت التنفيذ، فلا يحتاج إلى مستوى عزل معيّن ولا
 * ينكسر أمام طلبين متزامنين على الغرض نفسه.
 */
export async function applyMovement(
  tx: Tx,
  input: MovementInput,
): Promise<MovementResult> {
  const availableDelta = input.availableDelta ?? 0;
  const quarantineDelta = input.quarantineDelta ?? 0;

  if (!Number.isInteger(input.units) || input.units <= 0) {
    throw new Error(`units غير صالح في حركة المخزون: ${input.units}`);
  }
  if (!Number.isInteger(availableDelta) || !Number.isInteger(quarantineDelta)) {
    throw new Error("فروق حركة المخزون يجب أن تكون أعدادًا صحيحة");
  }

  /*
    شطب المفقود لا يمسّ أي رصيد: الوحدة خرجت وقت الحجز ولن ترجع. الحركة
    قيد مسؤولية لا قيد كمية، فلا يُنفَّذ لها تحديث أصلًا — تمرير `data`
    فارغة إلى updateMany بلا معنى وسلوكها غير مضمون.
  */
  const touchesStock = availableDelta !== 0 || quarantineDelta !== 0;

  if (touchesStock) {
    // شرط عدم السلبية — يُطبَّق على الجهة المنقوصة فقط
    const guard: Prisma.ItemWhereInput = { id: input.itemId };
    if (availableDelta < 0) guard.quantity = { gte: -availableDelta };
    if (quarantineDelta < 0) guard.quarantine = { gte: -quarantineDelta };

    const applied = await tx.item.updateMany({
      where: guard,
      data: {
        ...(availableDelta !== 0 ? { quantity: { increment: availableDelta } } : {}),
        ...(quarantineDelta !== 0 ? { quarantine: { increment: quarantineDelta } } : {}),
      },
    });

    if (applied.count !== 1) {
      const fresh = await tx.item.findUnique({
        where: { id: input.itemId },
        select: { name: true, unit: true, quantity: true, quarantine: true },
      });
      if (!fresh) throw conflict("الغرض غير موجود");
      throw conflict(
        `تعذّر تنفيذ الحركة على «${fresh.name}» — الرصيد الحالي ` +
          `${fresh.quantity} متاح و${fresh.quarantine} في الفحص لا يسمح بذلك.`,
      );
    }
  }

  const after = await tx.item.findUnique({
    where: { id: input.itemId },
    select: { quantity: true, quarantine: true },
  });
  if (!after) throw conflict("الغرض غير موجود");

  await tx.stockMovement.create({
    data: {
      itemId: input.itemId,
      reason: input.reason,
      units: input.units,
      availableDelta,
      quarantineDelta,
      availableAfter: after.quantity,
      quarantineAfter: after.quarantine,
      requestId: input.requestId ?? null,
      requestLineId: input.requestLineId ?? null,
      actorId: input.actor.id,
      actorName: input.actor.fullName,
      note: input.note ?? null,
    },
  });

  return { availableAfter: after.quantity, quarantineAfter: after.quarantine };
}

/* ------------------------------------------------------------- المطابقة */

export type ItemReconciliation = {
  itemId: number;
  name: string;
  unit: string;
  /** الرصيد المخزَّن في صف الغرض */
  storedAvailable: number;
  storedQuarantine: number;
  /** الرصيد المحسوب من مجموع الدفتر */
  ledgerAvailable: number;
  ledgerQuarantine: number;
  availableDrift: number;
  quarantineDrift: number;
  /** الكمية المعلّقة في يد الفرق حسب أسطر الطلبات */
  outstanding: number;
  movementCount: number;
};

export type ReconciliationReport = {
  checkedAt: string;
  itemCount: number;
  balanced: boolean;
  driftCount: number;
  totals: {
    storedAvailable: number;
    ledgerAvailable: number;
    storedQuarantine: number;
    ledgerQuarantine: number;
    outstanding: number;
  };
  /** الأغراض التي لا يطابق رصيدها دفترها — فارغة إذا كان الحساب سليمًا */
  drifted: ItemReconciliation[];
};

/**
 * يثبت أن كل رصيد معروض مُشتَقّ من الدفتر ولا يخالفه.
 *
 * الحساب كله بأعداد صحيحة (وحدات) فلا يوجد خطأ تقريب ممكن أصلًا؛
 * أي فرق يعني حركةً كُتبت خارج applyMovement أو تعديلًا مباشرًا على
 * قاعدة البيانات، وكلاهما يجب أن يظهر لقائد اللوازم لا أن يُبتلع.
 */
export async function reconcileStock(): Promise<ReconciliationReport> {
  const [items, movementSums, lineSums] = await Promise.all([
    prisma.item.findMany({
      select: { id: true, name: true, unit: true, quantity: true, quarantine: true },
      orderBy: { id: "asc" },
    }),
    prisma.stockMovement.groupBy({
      by: ["itemId"],
      _sum: { availableDelta: true, quarantineDelta: true },
      _count: { _all: true },
    }),
    prisma.requestLine.groupBy({
      by: ["itemId"],
      _sum: {
        deducted: true,
        released: true,
        returned: true,
        quarantined: true,
        writtenOff: true,
      },
    }),
  ]);

  const movementByItem = new Map(movementSums.map((row) => [row.itemId, row]));

  // itemId فارغ في أسطر الشراء الحرّة — لا تخصّ المطابقة لأنها بلا غرض مخزون
  const lineByItem = new Map<number, (typeof lineSums)[number]>();
  for (const row of lineSums) {
    if (row.itemId !== null) lineByItem.set(row.itemId, row);
  }

  const rows: ItemReconciliation[] = items.map((item) => {
    const movements = movementByItem.get(item.id);
    const lines = lineByItem.get(item.id);

    const ledgerAvailable = movements?._sum.availableDelta ?? 0;
    const ledgerQuarantine = movements?._sum.quarantineDelta ?? 0;

    const outstanding =
      (lines?._sum.deducted ?? 0) -
      (lines?._sum.released ?? 0) -
      (lines?._sum.returned ?? 0) -
      (lines?._sum.quarantined ?? 0) -
      (lines?._sum.writtenOff ?? 0);

    return {
      itemId: item.id,
      name: item.name,
      unit: item.unit,
      storedAvailable: item.quantity,
      storedQuarantine: item.quarantine,
      ledgerAvailable,
      ledgerQuarantine,
      availableDrift: item.quantity - ledgerAvailable,
      quarantineDrift: item.quarantine - ledgerQuarantine,
      outstanding,
      movementCount: movements?._count._all ?? 0,
    };
  });

  const drifted = rows.filter(
    (row) => row.availableDrift !== 0 || row.quarantineDrift !== 0,
  );

  const sum = (pick: (row: ItemReconciliation) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);

  return {
    checkedAt: new Date().toISOString(),
    itemCount: rows.length,
    balanced: drifted.length === 0,
    driftCount: drifted.length,
    totals: {
      storedAvailable: sum((row) => row.storedAvailable),
      ledgerAvailable: sum((row) => row.ledgerAvailable),
      storedQuarantine: sum((row) => row.storedQuarantine),
      ledgerQuarantine: sum((row) => row.ledgerQuarantine),
      outstanding: sum((row) => row.outstanding),
    },
    drifted,
  };
}
