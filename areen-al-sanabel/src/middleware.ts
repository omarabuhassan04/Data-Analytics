import { NextResponse, type NextRequest } from "next/server";

import { readSessionToken, SESSION_COOKIE } from "@/lib/auth-edge";

/**
 * حارس المسارات على مستوى الحافة (Edge).
 * دوره منع الوصول غير المصرّح به إلى صفحات التطبيق وإعادة التوجيه إلى صفحة الدخول.
 * الفرض الحقيقي للصلاحيات يتم داخل مسارات API (راجع src/lib/api.ts) —
 * هذه الطبقة للراحة فقط ولا يُعتمد عليها أمنيًا.
 */

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await readSessionToken(token) : null;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // حفظ الوجهة المطلوبة للعودة إليها بعد الدخول
    if (pathname !== "/") url.searchParams.set("next", pathname);

    const response = NextResponse.redirect(url);
    // كوكي موجود لكنه فشل في التحقّق (منتهٍ أو تالف) — نحذفه حتى لا يُعاد إرساله
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (session && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * يُستثنى:
     *  - مسارات API (تفرض صلاحياتها بنفسها وتُعيد JSON لا إعادة توجيه)
     *  - ملفات Next الداخلية والأصول الثابتة
     */
    "/((?!api|_next/static|_next/image|favicon.ico|logo.svg|.*\\.png$|.*\\.svg$).*)",
  ],
};
