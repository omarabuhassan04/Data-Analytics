/**
 * منطق الجلسة الصالح للتشغيل على حافة الشبكة (middleware).
 *
 * لا يستورد Prisma ولا bcrypt — كلاهما لا يعمل في بيئة Edge. التحقّق هنا
 * يقتصر على صحّة توقيع الرمز؛ أما التحقّق من أن الحساب ما يزال فعّالاً فيجري
 * على الخادم في auth.ts مع كل طلب.
 */

// مسارات فرعية دقيقة بدل حزمة jose كاملة: الاستيراد العام يجرّ معه مسار فكّ
// تشفير JWE الذي يستخدم CompressionStream، وهي غير مدعومة في بيئة Edge —
// فيحذّر البناء من واجهة لا نستعملها أصلاً.
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE = "sanabel_session";
export const SESSION_TTL_HOURS = 12;

export type SessionPayload = {
  uid: number;
  username: string;
  role: string;
  teamId: number | null;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET غير مضبوط أو أقصر من 32 محرفاً — التطبيق لا يعمل بدونه.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(secretKey());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.uid !== "number" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      uid: payload.uid,
      username: payload.username,
      role: payload.role,
      teamId: typeof payload.teamId === "number" ? payload.teamId : null,
    };
  } catch {
    // رمز منتهٍ أو موقّع بمفتاح آخر — يُعامل كعدم وجود جلسة
    return null;
  }
}
