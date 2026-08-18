"use server";

import { z } from "zod";

import { logActivity } from "@/lib/activity";
import { hashPassword, requirePermission } from "@/lib/auth";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/domain";
import {
  AppError,
  ConflictError,
  NotFoundError,
  runAction,
  type ActionResult,
} from "@/lib/errors";
import { prisma } from "@/lib/prisma";

/**
 * سياسة كلمة المرور: ثمانية محارف على الأقل مع حرف ورقم.
 * قاعدة واحدة تُطبَّق على الإنشاء وعلى إعادة التعيين معاً.
 */
const passwordSchema = z
  .string()
  .min(8, "كلمة المرور يجب ألّا تقل عن ٨ محارف.")
  .max(72, "كلمة المرور طويلة جداً.")
  .refine((v) => /[A-Za-z؀-ۿ]/.test(v) && /\d/.test(v), {
    message: "كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل.",
  });

const userSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "اسم المستخدم يجب ألّا يقل عن ٣ محارف.")
    .max(40)
    .regex(/^[a-z0-9._-]+$/, "اسم المستخدم بحروف لاتينية وأرقام فقط."),
  fullName: z.string().trim().min(2, "الاسم مطلوب.").max(80),
  role: z.enum(ROLES),
  teamId: z.number().int().positive().nullable(),
});

export async function createUser(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  const result = await runAction(async () => {
    const actor = await requirePermission("users:manage");

    const rawTeam = formData.get("teamId")?.toString();
    const parsed = userSchema.safeParse({
      username: formData.get("username")?.toString() ?? "",
      fullName: formData.get("fullName")?.toString() ?? "",
      role: formData.get("role")?.toString() ?? "",
      teamId: rawTeam ? Number(rawTeam) : null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError(issue.message, String(issue.path[0]));
    }

    const password = passwordSchema.safeParse(formData.get("password")?.toString() ?? "");
    if (!password.success) {
      throw new AppError(password.error.issues[0].message, "password");
    }

    const data = parsed.data;

    // قائد الفرقة بلا فرقة لا يستطيع تقديم أي طلب — نمنع الحالة عند الإنشاء
    if (data.role === "TEAM_LEADER" && !data.teamId) {
      throw new AppError("اختر الفرقة التي يقودها هذا الحساب.", "teamId");
    }
    if (data.role !== "TEAM_LEADER" && data.teamId) {
      throw new AppError("الأدوار القيادية لا تُربط بفرقة بعينها.", "teamId");
    }

    return prisma.$transaction(async (tx) => {
      const exists = await tx.user.findUnique({ where: { username: data.username } });
      if (exists) throw new ConflictError("اسم المستخدم محجوز، اختر غيره.");

      const user = await tx.user.create({
        data: { ...data, passwordHash: await hashPassword(password.data) },
      });

      await logActivity(tx, {
        actor,
        action: "USER_CREATE",
        entity: "User",
        entityId: user.id,
        summary: `إنشاء حساب «${user.fullName}» بدور ${ROLE_LABEL[data.role as Role]}`,
      });

      return { id: user.id };
    });
  });

  return result;
}

export async function setUserPassword(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const result = await runAction(async () => {
    const actor = await requirePermission("users:manage");
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) throw new AppError("حساب غير صالح.");

    const password = passwordSchema.safeParse(formData.get("password")?.toString() ?? "");
    if (!password.success) {
      throw new AppError(password.error.issues[0].message, "password");
    }

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundError("الحساب غير موجود.");

      await tx.user.update({
        where: { id },
        data: { passwordHash: await hashPassword(password.data) },
      });

      await logActivity(tx, {
        actor,
        action: "USER_PASSWORD",
        entity: "User",
        entityId: id,
        summary: `تغيير كلمة مرور الحساب «${user.fullName}»`,
      });

      return null;
    });
  });

  return result;
}

export async function toggleUserActive(
  _prev: ActionResult<{ isActive: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ isActive: boolean }>> {
  const result = await runAction(async () => {
    const actor = await requirePermission("users:manage");
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) throw new AppError("حساب غير صالح.");

    if (id === actor.id) {
      throw new ConflictError("لا يمكنك تعطيل حسابك أنت.");
    }

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundError("الحساب غير موجود.");

      // آخر قائد لوازم فعّال لو عُطّل لأصبح النظام بلا من يديره
      if (user.isActive && user.role === "SUPPLY_LEADER") {
        const others = await tx.user.count({
          where: { role: "SUPPLY_LEADER", isActive: true, id: { not: id } },
        });
        if (others === 0) {
          throw new ConflictError(
            "لا يمكن تعطيل آخر حساب لقائد اللوازم — النظام سيبقى بلا مدير.",
          );
        }
      }

      const next = !user.isActive;
      await tx.user.update({ where: { id }, data: { isActive: next } });

      await logActivity(tx, {
        actor,
        action: "USER_UPDATE",
        entity: "User",
        entityId: id,
        summary: `${next ? "تفعيل" : "تعطيل"} الحساب «${user.fullName}»`,
      });

      return { isActive: next };
    });
  });

  return result;
}
