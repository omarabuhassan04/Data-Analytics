import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * فحص صحّة الخدمة — مسار عام بلا مصادقة.
 *
 * لا يُعيد أي بيانات عن المخزون أو الحسابات، فقط ما إذا كان التطبيق يعمل
 * وقاعدة البيانات متّصلة. مفيد لمراقبة النشر ولاكتشاف انقطاع القاعدة مبكرًا.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    // استعلام تافه يثبت أن الاتصال قائم دون كشف أي محتوى
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: "connected",
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    });
  } catch {
    // لا نُسرّب تفاصيل الخطأ (قد تحوي سلسلة الاتصال)
    return NextResponse.json(
      { ok: false, database: "unreachable", latencyMs: Date.now() - startedAt },
      { status: 503 },
    );
  }
}
