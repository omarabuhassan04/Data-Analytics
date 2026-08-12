#!/usr/bin/env node
/**
 * نشر التطبيق على Netlify.
 *
 *   npx netlify-cli login       ← يفعلها المالك مرّة واحدة (متصفّح)
 *   npm run deploy:netlify      ← ثم هذا الأمر ينفّذ كل شيء
 *
 * سبب وجود هذا البديل: شبكة المجموعة تحجب نطاق vercel.app على مستوى TLS،
 * بينما نطاق netlify.app متاح. التطبيق نفسه لم يتغيّر.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.production.local");
const SITE = process.env.NETLIFY_SITE_NAME ?? "areen-al-sanabel";

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

const netlify = (args, options = {}) =>
  spawnSync("npx", ["--yes", "netlify-cli@latest", ...args], {
    cwd: root,
    shell: true,
    encoding: "utf8",
    ...options,
  });

/* ------------------------------------------------- التحقّق من تسجيل الدخول */

const status = netlify(["status"]);
if (/Not logged in/i.test(`${status.stdout}${status.stderr}`)) {
  console.error("\n✖ لم يسجَّل الدخول إلى Netlify بعد.\n  شغّل:  npx netlify-cli login\n");
  process.exit(1);
}
console.log("✔ Netlify: مسجَّل الدخول");

/* ------------------------------------------------------------ ربط الموقع */

console.log("↻ تهيئة الموقع…");
let link = netlify(["link", "--name", SITE], { stdio: "inherit" });
if (link.status !== 0) {
  console.log("↻ الموقع غير موجود — إنشاؤه…");
  const created = netlify(["sites:create", "--name", SITE, "--disable-linking"], {
    stdio: "inherit",
  });
  if (created.status !== 0) {
    console.error("✖ تعذّر إنشاء الموقع (قد يكون الاسم محجوزًا — جرّب NETLIFY_SITE_NAME)");
    process.exit(1);
  }
  link = netlify(["link", "--name", SITE], { stdio: "inherit" });
  if (link.status !== 0) {
    console.error("✖ تعذّر ربط الموقع");
    process.exit(1);
  }
}

/* -------------------------------------------------------- متغيّرات البيئة */

for (const key of ["DATABASE_URL", "AUTH_SECRET"]) {
  const set = netlify(["env:set", key, vars[key], "--context", "production"]);
  if (set.status !== 0) {
    console.error(`✖ تعذّر ضبط ${key}`);
    console.error((set.stderr ?? "").slice(0, 400));
    process.exit(1);
  }
  console.log(`✔ ضُبط ${key} (${vars[key].length} محرفًا، القيمة لم تُطبع)`);
}

/* ----------------------------------------------------------------- النشر */

console.log("↻ النشر إلى الإنتاج… (قد يستغرق بضع دقائق)");
const deploy = netlify(["deploy", "--build", "--prod"], { encoding: "utf8" });
process.stdout.write(deploy.stdout ?? "");
process.stdout.write(deploy.stderr ?? "");

if (deploy.status !== 0) {
  console.error("✖ فشل النشر");
  process.exit(1);
}

const url = `${deploy.stdout ?? ""}${deploy.stderr ?? ""}`
  .split(/\s+/)
  .filter((s) => /^https:\/\/[^\s]*netlify\.app/.test(s))
  .pop();

console.log(`\n✔ تم النشر\n\n  الرابط:  ${url ?? "راجع المخرجات أعلاه"}\n`);
