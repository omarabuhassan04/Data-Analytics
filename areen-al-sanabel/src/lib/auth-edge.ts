/**
 * منطق الجلسة الصالح للعمل في بيئة Edge (middleware).
 * لا يستورد هذا الملف Prisma ولا bcrypt — فقط توقيع/تحقق JWT عبر jose،
 * لأن Edge Runtime لا يدعم وحدات Node الأصلية.
 */

// تُستورد المسارات الفرعية تحديدًا بدل الحزمة كاملة: استيراد "jose" يسحب معه
// وحدات فكّ تشفير JWE التي تستخدم CompressionStream غير المدعومة في Edge Runtime.
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

import { isRole, type Role } from "@/lib/domain";

export const SESSION_COOKIE = "areen_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 ساعة

export type SessionPayload = {
  userId: number;
  username: string;
  role: Role;
};

/**
 * القيمة الافتراضية في ملف التطوير. من يعرفها يستطيع تزوير جلسة أي مستخدم،
 * لذا يرفض التطبيق الإقلاع بها في بيئة الإنتاج.
 */
const DEV_PLACEHOLDER_SECRET =
  "areen-al-sanabel-dev-secret-change-me-in-production-0192837465";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error(
      "AUTH_SECRET غير مضبوط أو قصير جدًا. أضِف قيمة عشوائية طويلة في ملف .env",
    );
  }
  if (process.env.NODE_ENV === "production" && secret === DEV_PLACEHOLDER_SECRET) {
    throw new Error(
      "AUTH_SECRET ما زال قيمة التطوير الافتراضية المعروفة. " +
        "وَلِّد قيمة عشوائية جديدة قبل النشر: " +
        'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    const username = payload.username;
    const role = payload.role;
    if (!Number.isInteger(userId) || typeof username !== "string" || !isRole(role)) {
      return null;
    }
    return { userId, username, role };
  } catch {
    return null;
  }
}
