import { PrismaClient } from "@prisma/client";

/**
 * سلسلة الاتصال كما يحقنها المزوّد لا تكفي لقاعدة بلا خادم خلف مجمّع اتصالات،
 * فتُضاف إليها معاملتان قبل إنشاء العميل:
 *
 * - `pgbouncer=true` يوقف العبارات المحضّرة المسمّاة. مجمّع Neon يعمل بنمط
 *   المعاملة، فقد يصل استعلامان متتاليان من نفس العميل إلى اتصالين مختلفين،
 *   وعندها لا يجد الثاني العبارة التي حضّرها الأول.
 *
 * - `connect_timeout=15` يوسّع مهلة الاتصال. القاعدة على الخطة المجانية تُعلَّق
 *   عند الخمول، وأول طلب بعد فترة هدوء يوقظها؛ المهلة الافتراضية (٥ ثوانٍ)
 *   تنقضي أحياناً قبل أن تستيقظ فيظهر الخطأ «تعذّر الوصول إلى الخادم».
 */
function connectionUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (!url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }
    return url.toString();
  } catch {
    // سلسلة غير قابلة للتحليل: تُترك كما هي ليُبلّغ Prisma عن الخطأ الحقيقي
    return raw;
  }
}

// إعادة استخدام العميل عبر عمليات إعادة التحميل الساخن في التطوير، وإلا فُتحت
// اتصالات جديدة مع كل تعديل حتى ينفد سقف الاتصالات.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: connectionUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
