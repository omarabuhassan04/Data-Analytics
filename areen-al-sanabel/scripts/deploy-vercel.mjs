#!/usr/bin/env node
/**
 * نشر التطبيق على Vercel.
 *
 *   npx vercel login          ← يفعلها المالك مرّة واحدة (متصفّح)
 *   npm run deploy:vercel     ← ثم هذا الأمر ينفّذ كل شيء
 *
 * يربط المشروع، ويضبط متغيّرات البيئة من .env.production.local،
 * ثم ينشر إلى الإنتاج ويطبع الرابط. لا يطبع أي سرّ.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.production.local");
const PROJECT = process.env.VERCEL_PROJECT_NAME ?? "areen-al-sanabel";

if (!existsSync(envPath)) {
  console.error("✖ .env.production.local غير موجود — شغّل npm run deploy:prep أولًا");
  process.exit(1);
}

const vars = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

for (const key of ["DATABASE_URL", "AUTH_SECRET"]) {
  if (!vars[key]) {
    console.error(`✖ ${key} مفقود في .env.production.local`);
    process.exit(1);
  }
}

const vercel = (args, options = {}) =>
  spawnSync("npx", ["--yes", "vercel@latest", ...args], {
    cwd: root,
    shell: true,
    encoding: "utf8",
    env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" },
    ...options,
  });

/* ------------------------------------------------- التحقّق من تسجيل الدخول */

const who = vercel(["whoami"]);
if (who.status !== 0) {
  console.error("\n✖ لم يسجَّل الدخول إلى Vercel بعد.\n  شغّل:  npx vercel login\n");
  process.exit(1);
}
console.log(`✔ Vercel: ${who.stdout.trim().split("\n").pop()}`);

/* ------------------------------------------------------------ ربط المشروع */

console.log("↻ ربط المشروع…");
const link = vercel(["link", "--yes", "--project", PROJECT], { stdio: "inherit" });
if (link.status !== 0) {
  console.error("✖ فشل ربط المشروع");
  process.exit(1);
}

/* -------------------------------------------------------- متغيّرات البيئة */

for (const key of ["DATABASE_URL", "AUTH_SECRET"]) {
  // إزالة القيمة القديمة إن وُجدت حتى لا تتراكم النسخ
  vercel(["env", "rm", key, "production", "--yes"], { encoding: "utf8" });
  const add = vercel(["env", "add", key, "production"], { input: `${vars[key]}\n` });
  if (add.status !== 0) {
    console.error(`✖ تعذّر ضبط ${key}`);
    console.error(add.stderr?.slice(0, 400));
    process.exit(1);
  }
  console.log(`✔ ضُبط ${key} (${vars[key].length} محرفًا، القيمة لم تُطبع)`);
}

/* ----------------------------------------------------------------- النشر */

console.log("↻ النشر إلى الإنتاج… (قد يستغرق دقيقتين)");
const deploy = vercel(["deploy", "--prod", "--yes"], { encoding: "utf8" });
process.stdout.write(deploy.stderr ?? "");

if (deploy.status !== 0) {
  console.error("✖ فشل النشر");
  process.exit(1);
}

const url = (deploy.stdout ?? "").trim().split(/\s+/).filter((s) => s.startsWith("https://")).pop();
console.log(`\n✔ تم النشر\n\n  الرابط:  ${url ?? deploy.stdout.trim()}\n`);
console.log("الخطوة الأخيرة: تأكّد أن حماية النشر (Deployment Protection) مطفأة");
console.log("في إعدادات المشروع، وإلا سيطلب Vercel تسجيل دخول قبل عرض الموقع.\n");
