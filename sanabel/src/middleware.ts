import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/auth-edge";

/**
 * الحاجز الأول: يمنع الوصول إلى أي صفحة بلا جلسة صالحة.
 *
 * هذا تحسين لتجربة الاستخدام وليس حدّ الأمان — كل إجراء على الخادم يتحقّق من
 * الصلاحية مستقلاً في requirePermission، لأن التحقّق هنا يعرف الرمز فقط ولا
 * يستطيع الوصول إلى قاعدة البيانات ليعرف إن كان الحساب ما يزال فعّالاً.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // كل المسارات عدا ملفات Next الداخلية والأصول الثابتة
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
