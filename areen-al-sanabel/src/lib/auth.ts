import "server-only";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type SessionPayload,
} from "@/lib/auth-edge";
import { isRole, type Role } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export { createSessionToken, readSessionToken, SESSION_COOKIE };
export type { SessionPayload };

/** المستخدم الحالي كما هو مخزّن في قاعدة البيانات (وليس كما يدّعيه الكوكي) */
export type CurrentUser = {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  teamName: string | null;
};

/* ------------------------------------------------------------ كلمات المرور */

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/* ----------------------------------------------------------- كوكي الجلسة */

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * يقرأ الجلسة ثم يعيد تحميل المستخدم من قاعدة البيانات.
 * إعادة التحميل مقصودة: تغيير الدور أو تعطيل الحساب يسري فورًا
 * دون انتظار انتهاء صلاحية التوكن.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await readSessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      teamName: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive || !isRole(user.role)) return null;

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    teamName: user.teamName,
  };
}
