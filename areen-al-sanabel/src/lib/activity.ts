import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** أي عميل Prisma — العميل الأساسي أو عميل داخل معاملة (transaction) */
type Db = Prisma.TransactionClient | typeof prisma;

export type ActivityAction =
  | "LOGIN"
  | "LOGOUT"
  | "ITEM_CREATE"
  | "ITEM_UPDATE"
  | "ITEM_DELETE"
  | "ITEM_ADJUST"
  | "CATEGORY_CREATE"
  | "REQUEST_SUBMIT"
  | "REQUEST_APPROVE"
  | "REQUEST_REJECT"
  | "REQUEST_REVIEW"
  | "REQUEST_CANCEL"
  | "REQUEST_NOTE"
  | "RETURN_RECEIVE"
  | "QC_RELEASE"
  | "QC_WRITE_OFF"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_PASSWORD";

export type ActivityEntity = "Auth" | "Item" | "Category" | "Request" | "User";

/**
 * يسجّل حدثًا في سجل التدقيق.
 * يُمرَّر عميل المعاملة عند التسجيل ضمن عملية ذرّية حتى لا يُكتب السجل
 * إلا إذا نجحت العملية كاملة.
 */
export async function logActivity(
  db: Db,
  entry: {
    actorId: number | null;
    actorName: string;
    action: ActivityAction;
    entity: ActivityEntity;
    entityId?: number | null;
    summary: string;
  },
): Promise<void> {
  await db.activityLog.create({
    data: {
      actorId: entry.actorId,
      actorName: entry.actorName,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
    },
  });
}
