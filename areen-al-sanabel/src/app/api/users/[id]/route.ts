import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity";
import {
  badRequest,
  conflict,
  notFound,
  parseId,
  readJson,
  requirePermission,
  withApi,
} from "@/lib/api";
import { ROLE_LABELS, type Role } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

/**
 * يمنع فقدان الوصول الإداري: لا يجوز أن يبقى النظام بلا قائد لوازم فعّال.
 */
async function assertNotLastAdmin(userId: number, becoming: { role?: Role; isActive?: boolean }) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "SUPPLIES_LEADER") return;

  const stillAdmin = (becoming.role ?? target.role) === "SUPPLIES_LEADER";
  const stillActive = becoming.isActive ?? target.isActive;
  if (stillAdmin && stillActive) return;

  const otherAdmins = await prisma.user.count({
    where: { role: "SUPPLIES_LEADER", isActive: true, id: { not: userId } },
  });
  if (otherAdmins === 0) {
    throw conflict(
      "لا يمكن تنفيذ هذا الإجراء: يجب أن يبقى في النظام قائد لوازم فعّال واحد على الأقل.",
    );
  }
}

export const PATCH = withApi(async (request: Request, context: Context) => {
  const actor = await requirePermission("users:manage");
  const id = parseId((await context.params).id, "معرّف المستخدم");
  const body = userUpdateSchema.parse(await readJson(request));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound("المستخدم غير موجود");

  if (id === actor.id && body.isActive === false) {
    throw badRequest("لا يمكنك تعطيل حسابك الشخصي");
  }
  if (id === actor.id && body.role && body.role !== actor.role) {
    throw badRequest("لا يمكنك تغيير دور حسابك الشخصي");
  }

  await assertNotLastAdmin(id, { role: body.role, isActive: body.isActive });

  const nextRole = (body.role ?? target.role) as Role;
  if (nextRole === "TEAM_LEADER" && !(body.teamName ?? target.teamName)) {
    throw badRequest("اسم الفرقة مطلوب لمسؤول الفرقة");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      fullName: body.fullName,
      role: body.role,
      teamName: nextRole === "TEAM_LEADER" ? (body.teamName ?? target.teamName) : null,
      isActive: body.isActive,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      teamName: true,
      isActive: true,
    },
  });

  const changes: string[] = [];
  if (body.fullName && body.fullName !== target.fullName) changes.push("الاسم");
  if (body.role && body.role !== target.role) {
    changes.push(`الدور إلى ${ROLE_LABELS[body.role]}`);
  }
  if (body.isActive !== undefined && body.isActive !== target.isActive) {
    changes.push(body.isActive ? "تفعيل الحساب" : "تعطيل الحساب");
  }

  await logActivity(prisma, {
    actorId: actor.id,
    actorName: actor.fullName,
    action: "USER_UPDATE",
    entity: "User",
    entityId: id,
    summary: `عدّل حساب «${updated.fullName}»${changes.length ? ` — ${changes.join("، ")}` : ""}`,
  });

  return NextResponse.json({ user: updated });
});
