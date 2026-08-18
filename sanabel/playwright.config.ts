import { defineConfig } from "@playwright/test";

/**
 * الاختبارات تعمل على خادم الإنتاج المبني، لا على خادم التطوير — فما يُختبر
 * هو ما يُنشر فعلاً.
 *
 * عامل واحد بلا توازٍ: الاختبارات تشترك في قاعدة بيانات واحدة وتتحقّق من
 * أرصدة المخزون، وتشغيلها معاً كان سيجعل كل اختبار يرى خصومات غيره.
 */
export default defineConfig({
  testDir: "./e2e",
  // تصفير البيانات قبل التشغيل حتى تكون النتيجة نفسها في كل مرّة
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3005",
    locale: "ar",
    actionTimeout: 15_000,
    trace: "off",
  },
});
