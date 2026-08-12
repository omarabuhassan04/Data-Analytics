import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity";
import { ApiError, readJson, withApi } from "@/lib/api";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { isRole } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

/**
 * مُحدِّد بسيط لمحاولات الدخول الفاشلة (في الذاكرة، لكل خادم).
 * يكفي لتطبيق داخلي بعدد حسابات محدود؛ في نشر متعدّد النسخ
 * يُنصح باستبداله بمخزن مشترك مثل Redis.
 */
const attempts = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function checkThrottle(key: string) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 0, firstAt: now });
    return;
  }
  if (record.count >= MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "تم تجاوز عدد محاولات الدخول المسموح بها. يُرجى المحاولة بعد قليل.",
    );
  }
}

function recordFailure(key: string) {
  const record = attempts.get(key) ?? { count: 0, firstAt: Date.now() };
  record.count += 1;
  attempts.set(key, record);
}

export const POST = withApi(async (request: Request) => {
  const body = loginSchema.parse(await readJson(request));
  const throttleKey = body.username;

  checkThrottle(throttleKey);

  const user = await prisma.user.findUnique({ where: { username: body.username } });

  // رسالة موحّدة في كل حالات الفشل حتى لا يُستدلّ على وجود الحساب من عدمه
  const invalid = new ApiError(401, "اسم المستخدم أو كلمة المرور غير صحيحة");

  if (!user || !isRole(user.role)) {
    recordFailure(throttleKey);
    throw invalid;
  }

  const passwordOk = await verifyPassword(body.password, user.passwordHash);
  if (!passwordOk) {
    recordFailure(throttleKey);
    throw invalid;
  }

  if (!user.isActive) {
    throw new ApiError(403, "هذا الحساب معطّل حاليًا. يُرجى مراجعة قائد اللوازم.");
  }

  attempts.delete(throttleKey);

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });
  await setSessionCookie(token);

  await logActivity(prisma, {
    actorId: user.id,
    actorName: user.fullName,
    action: "LOGIN",
    entity: "Auth",
    entityId: user.id,
    summary: "سجّل الدخول إلى النظام",
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      teamName: user.teamName,
    },
  });
});
