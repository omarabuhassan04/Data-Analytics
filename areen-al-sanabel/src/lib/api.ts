import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/domain";

/** خطأ يحمل رمز حالة HTTP ورسالة عربية جاهزة للعرض للمستخدم */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (msg: string) => new ApiError(400, msg);
export const notFound = (msg = "العنصر المطلوب غير موجود") => new ApiError(404, msg);
export const conflict = (msg: string) => new ApiError(409, msg);

/** يتطلّب جلسة صالحة */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "انتهت الجلسة، يُرجى تسجيل الدخول من جديد");
  return user;
}

/**
 * يتطلّب صلاحية محدّدة.
 * هذه هي نقطة الفرض الوحيدة المعتمدة — لا يُعتمد على إخفاء العناصر في الواجهة.
 */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    throw new ApiError(403, "لا تملك الصلاحية لتنفيذ هذا الإجراء");
  }
  return user;
}

function messageFromZod(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return "البيانات المُرسلة غير صالحة";
  const path = first.path.join(".");
  return path ? `${first.message} (${path})` : first.message;
}

/**
 * يغلّف معالج المسار ويحوّل الأخطاء إلى استجابات JSON عربية.
 * يمنع تسرّب تفاصيل الأخطاء الداخلية إلى العميل.
 */
export function withApi<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse | Response>,
) {
  return async (...args: Args): Promise<NextResponse | Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        return NextResponse.json({ error: messageFromZod(error) }, { status: 400 });
      }
      console.error("[api] خطأ غير متوقّع:", error);
      return NextResponse.json(
        { error: "حدث خطأ غير متوقّع، يُرجى المحاولة مرة أخرى" },
        { status: 500 },
      );
    }
  };
}

/** يقرأ جسم الطلب كـ JSON مع رسالة خطأ واضحة عند الفشل */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("تعذّرت قراءة بيانات الطلب");
  }
}

/** يحوّل معامل المسار إلى رقم صحيح موجب */
export function parseId(raw: string, label = "المعرّف"): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`${label} غير صالح`);
  return id;
}
