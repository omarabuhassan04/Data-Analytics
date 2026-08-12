import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity";
import { conflict, readJson, requirePermission, withApi } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { userCreateSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  await requirePermission("users:manage");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      teamName: true,
      isActive: true,
      createdAt: true,
      _count: { select: { requests: true } },
    },
  });

  return NextResponse.json({
    users: users.map((user) => ({ ...user, requestCount: user._count.requests })),
  });
});

export const POST = withApi(async (request: Request) => {
  const actor = await requirePermission("users:manage");
  const body = userCreateSchema.parse(await readJson(request));

  const existing = await prisma.user.findUnique({ where: { username: body.username } });
  if (existing) throw conflict("اسم المستخدم محجوز بالفعل");

  const created = await prisma.user.create({
    data: {
      username: body.username,
      fullName: body.fullName,
      role: body.role,
      // اسم الفرقة لمسؤولي الفرق فقط
      teamName: body.role === "TEAM_LEADER" ? body.teamName : null,
      passwordHash: await hashPassword(body.password),
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      teamName: true,
      isActive: true,
      createdAt: true,
    },
  });

  await logActivity(prisma, {
    actorId: actor.id,
    actorName: actor.fullName,
    action: "USER_CREATE",
    entity: "User",
    entityId: created.id,
    summary: `أنشأ حساب «${created.fullName}» بدور ${ROLE_LABELS[created.role as Role]}`,
  });

  return NextResponse.json({ user: created }, { status: 201 });
});
