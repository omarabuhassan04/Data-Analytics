import "server-only";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";

import {
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
  signSession,
  verifySession,
} from "@/lib/auth-edge";
import {
  can,
  isRole,
  type Permission,
  type Role,
  ROLE_LABEL,
} from "@/lib/domain";
import { ForbiddenError, UnauthenticatedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  roleLabel: string;
  teamId: number | null;
  teamName: string | null;
};

const BCRYPT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * المستخدم الحالي، أو null.
 *
 * يُعاد تحميل الحساب من قاعدة البيانات مع كل طلب بدل الاكتفاء بمحتوى الرمز،
 * فتعطيل حساب أو تغيير دوره يسري فوراً بدل انتظار انتهاء صلاحية الجلسة.
 * `cache` يمنع تكرار الاستعلام داخل نفس الطلب.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { team: true },
  });

  if (!user || !user.isActive || !isRole(user.role)) return null;

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    roleLabel: ROLE_LABEL[user.role],
    teamId: user.teamId,
    teamName: user.team?.name ?? null,
  };
});

/** المستخدم الحالي أو خطأ — نقطة الدخول لكل إجراء يحتاج تسجيل دخول */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

/**
 * الحارس الوحيد للصلاحيات.
 *
 * كل إجراء على الخادم يبدأ بهذا النداء. إخفاء الأزرار في الواجهة تحسين
 * لتجربة الاستخدام فقط، وليس حدّاً أمنياً.
 */
export async function requirePermission(
  permission: Permission,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw new ForbiddenError();
  return user;
}

/** أيّ من الصلاحيات يكفي */
export async function requireAny(
  ...permissions: Permission[]
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!permissions.some((p) => can(user.role, p))) throw new ForbiddenError();
  return user;
}

export async function startSession(user: {
  id: number;
  username: string;
  role: string;
  teamId: number | null;
}): Promise<void> {
  const token = await signSession({
    uid: user.id,
    username: user.username,
    role: user.role,
    teamId: user.teamId,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
