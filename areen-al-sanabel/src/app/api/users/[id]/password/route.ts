import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity";
import { notFound, parseId, readJson, requirePermission, withApi } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { passwordResetSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

/** إعادة تعيين كلمة مرور حساب — لقائد اللوازم فقط */
export const POST = withApi(async (request: Request, context: Context) => {
  const actor = await requirePermission("users:manage");
  const id = parseId((await context.params).id, "معرّف المستخدم");
  const body = passwordResetSchema.parse(await readJson(request));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound("المستخدم غير موجود");

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(body.password) },
  });

  await logActivity(prisma, {
    actorId: actor.id,
    actorName: actor.fullName,
    action: "USER_PASSWORD",
    entity: "User",
    entityId: id,
    summary: `أعاد تعيين كلمة مرور حساب «${target.fullName}»`,
  });

  return NextResponse.json({ ok: true });
});
