import { execSync } from "node:child_process";

/**
 * تصفير قاعدة البيانات قبل كل تشغيل.
 *
 * الاختبارات تتحقّق من أرصدة مطلقة (صُرف ١٠، عاد ٨، فالمتاح كذا)، فلو بدأت من
 * حالة متروكة من تشغيل سابق لفشلت لأسباب لا علاقة لها بصحّة التطبيق. التصفير
 * هنا يجعل `npm test` قابلاً للإعادة بالنتيجة نفسها في كل مرّة.
 */
export default function globalSetup() {
  if (process.env.E2E_SKIP_SEED === "true") return;

  execSync("npx prisma db seed", {
    stdio: "inherit",
    env: {
      ...process.env,
      // البذور تنسحب إن وجدت حسابات؛ الاختبارات تحتاج تصفيراً فعلياً
      SEED_FORCE: "true",
      SEED_PASSWORD: process.env.SEED_PASSWORD ?? "Sanabel@2026",
    },
  });
}
