import { PrismaClient } from "@prisma/client";

// إعادة استخدام العميل عبر عمليات إعادة التحميل الساخن في التطوير، وإلا فُتحت
// اتصالات جديدة مع كل تعديل حتى ينفد سقف الاتصالات.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
