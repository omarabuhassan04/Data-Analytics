"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  endSession,
  getCurrentUser,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { ROLE_LABEL, isRole } from "@/lib/domain";
import { logRaw } from "@/lib/activity";
import { AppError, runAction, type ActionResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "اسم المستخدم مطلوب.")
    .max(60, "اسم المستخدم طويل جداً."),
  password: z.string().min(1, "كلمة المرور مطلوبة."),
});

export async function login(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const result = await runAction(async () => {
    const parsed = loginSchema.safeParse({
      username: formData.get("username"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError(issue.message, String(issue.path[0]));
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: { team: true },
    });

    // رسالة واحدة لكل حالات الفشل حتى لا تكشف أيّ أسماء المستخدمين موجود
    const rejection = new AppError("اسم المستخدم أو كلمة المرور غير صحيحة.");

    if (!user || !user.isActive) {
      // مقارنة وهمية تُبقي زمن الاستجابة متقارباً بين الحساب الموجود والمفقود
      await verifyPassword(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
      throw rejection;
    }

    if (!(await verifyPassword(password, user.passwordHash))) throw rejection;
    if (!isRole(user.role)) throw rejection;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await logRaw(tx, {
        actorId: user.id,
        actorName: user.fullName,
        actorRole: ROLE_LABEL[user.role as keyof typeof ROLE_LABEL],
        teamName: user.team?.name ?? null,
        action: "LOGIN",
        entity: "Auth",
        entityId: user.id,
        summary: `تسجيل دخول ${user.fullName}`,
      });
    });

    await startSession({
      id: user.id,
      username: user.username,
      role: user.role,
      teamId: user.teamId,
    });

    return null;
  });

  if (result.ok) redirect("/");
  return result;
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    await prisma.$transaction((tx) =>
      logRaw(tx, {
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.roleLabel,
        teamName: user.teamName,
        action: "LOGOUT",
        entity: "Auth",
        entityId: user.id,
        summary: `تسجيل خروج ${user.fullName}`,
      }),
    );
  }

  await endSession();
  redirect("/login");
}
