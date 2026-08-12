#!/usr/bin/env node
/**
 * تجهيز المشروع للنشر العام.
 *
 *   npm run deploy:prep      يحوّل قاعدة البيانات إلى PostgreSQL ويولّد AUTH_SECRET
 *   npm run deploy:prep -- --revert   يعيد الإعداد إلى SQLite للتطوير المحلي
 *
 * ملاحظة أمنية مقصودة: لا يطبع هذا السكربت المفتاح السرّي على الشاشة إطلاقًا.
 * يكتبه في .env.production.local (مستثنى من Git) لتنسخه بنفسك إلى مزوّد الاستضافة.
 */

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "prisma", "schema.prisma");
const envPath = join(root, ".env.production.local");

const revert = process.argv.includes("--revert");
const from = revert ? "postgresql" : "sqlite";
const to = revert ? "sqlite" : "postgresql";

/* ------------------------------------------------- تبديل مزوّد قاعدة البيانات */

const schema = readFileSync(schemaPath, "utf8");
const pattern = new RegExp(`provider\\s*=\\s*"${from}"`);

if (pattern.test(schema)) {
  writeFileSync(schemaPath, schema.replace(pattern, `provider = "${to}"`), "utf8");
  console.log(`✔ مزوّد قاعدة البيانات: ${from} ← ${to}`);
} else if (new RegExp(`provider\\s*=\\s*"${to}"`).test(schema)) {
  console.log(`• مزوّد قاعدة البيانات مضبوط على ${to} أصلًا`);
} else {
  console.error("✖ تعذّر العثور على سطر provider في prisma/schema.prisma");
  process.exit(1);
}

if (revert) {
  console.log("\nتمّت العودة إلى إعداد التطوير المحلي.");
  console.log("شغّل:  npx prisma generate\n");
  process.exit(0);
}

/* ------------------------------------------------------- توليد المفتاح السرّي */

if (existsSync(envPath)) {
  console.log("• .env.production.local موجود مسبقًا — لم يُمسّ");
} else {
  const secret = randomBytes(48).toString("hex");
  writeFileSync(
    envPath,
    [
      "# أسرار الإنتاج — هذا الملف مستثنى من Git، لا تشاركه ولا ترفعه",
      "",
      "# سلسلة اتصال PostgreSQL من مزوّد الاستضافة",
      'DATABASE_URL="ضع-هنا-سلسلة-اتصال-postgres"',
      "",
      "# مفتاح توقيع الجلسات — وُلّد عشوائيًا للتوّ، خاصّ بهذا النشر",
      `AUTH_SECRET="${secret}"`,
      "",
      "# كلمة مرور قوية تُستخدم عند زرع الحسابات الأولى (غيّرها بعد أول دخول)",
      'SEED_DEFAULT_PASSWORD="ضع-هنا-كلمة-مرور-قوية"',
      "",
    ].join("\n"),
    "utf8",
  );
  console.log("✔ وُلّد AUTH_SECRET جديد وكُتب في .env.production.local");
}

console.log(`
الخطوات المتبقّية قبل النشر:

  1) افتح .env.production.local وضع فيه:
       DATABASE_URL           سلسلة اتصال PostgreSQL
       SEED_DEFAULT_PASSWORD  كلمة مرور قوية للحسابات الأولى

  2) انسخ المتغيّرات الثلاثة إلى إعدادات البيئة عند مزوّد الاستضافة.

  3) هيّئ قاعدة البيانات (db push وليس migrate deploy —
     ملفات الهجرة الحالية بصياغة SQLite ولا يقبلها Postgres):
       npx prisma db push
       npx prisma db seed

  4) بعد أول دخول: غيّر كلمات مرور جميع الحسابات من صفحة /manage/users

تنبيه: كلمة المرور الافتراضية Areen@2026 مذكورة في التوثيق ولا تصلح لنشر عام.
`);
