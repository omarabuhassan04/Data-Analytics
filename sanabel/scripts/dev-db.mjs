// خادم PostgreSQL محلي للتطوير والاختبار.
//
// نسخة PostgreSQL حقيقية (ثنائيات رسمية) تُدار من داخل المشروع، لا محاكاة —
// فتتصرّف تماماً كقاعدة الإنتاج: مجمّع اتصالات، معاملات متزامنة، وعبارات
// محضّرة. البيانات في .pgdata/ (مستثناة من Git).
//
// التشغيل:  npm run dev:db
// الإيقاف:  Ctrl+C  (إيقاف نظيف يحفظ البيانات)

import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = "./.pgdata";
const PORT = Number(process.env.DEV_DB_PORT ?? 5432);

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
  // بدون هذا يرث العنقود ترميز نظام التشغيل (WIN1252 على ويندوز العربي)،
  // فيرفض تخزين أي نص عربي — والواجهة كلها عربية.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (!existsSync(DATA_DIR)) {
  console.log("[dev-db] تهيئة عنقود جديد…");
  await pg.initialise();
}

await pg.start();
console.log(`[dev-db] PostgreSQL يستمع على 127.0.0.1:${PORT}`);

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  console.log("\n[dev-db] إيقاف…");
  try {
    await pg.stop();
  } catch {
    // الخادم قد يكون توقّف أصلاً
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
