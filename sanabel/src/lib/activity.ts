import "server-only";

import type { Prisma } from "@prisma/client";

import type { CurrentUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/domain";

/**
 * كتابة سطر في سجل العمليات.
 *
 * يقبل `tx` ليُكتب داخل نفس المعاملة التي أحدثت التغيير — فإما أن يُحفظ
 * التغيير وسجلّه معاً، أو لا يُحفظ أيّهما. هذا ما يجعل السجل جديراً بالثقة.
 */
export async function logActivity(
  tx: Prisma.TransactionClient,
  input: {
    actor: CurrentUser;
    action: string;
    entity: string;
    entityId?: number | null;
    summary: string;
    details?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.activityLog.create({
    data: {
      actorId: input.actor.id,
      actorName: input.actor.fullName,
      actorRole: ROLE_LABEL[input.actor.role],
      teamName: input.actor.teamName,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      summary: input.summary,
      details: input.details,
    },
  });
}

/** سجلّ لا يرتبط بمستخدم محمّل بالكامل (تسجيل الدخول مثلاً) */
export async function logRaw(
  tx: Prisma.TransactionClient,
  input: {
    actorId: number | null;
    actorName: string;
    actorRole: string;
    teamName?: string | null;
    action: string;
    entity: string;
    entityId?: number | null;
    summary: string;
  },
): Promise<void> {
  await tx.activityLog.create({
    data: {
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      teamName: input.teamName ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      summary: input.summary,
    },
  });
}
