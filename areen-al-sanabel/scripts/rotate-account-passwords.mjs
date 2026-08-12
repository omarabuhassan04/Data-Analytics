#!/usr/bin/env node
/**
 * يمنح كل حساب كلمة مرور قوية فريدة.
 *
 *   node scripts/prod.mjs run "node scripts/rotate-account-passwords.mjs"
 *
 * الكلمات تُكتب في ملف محلي مستثنى من Git ولا تُطبع على الشاشة إطلاقًا —
 * لأن أي شيء يُطبع في سجلّ المحادثة يُعتبر مكشوفًا.
 */

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "ACCOUNT-CREDENTIALS.local.txt");

/** كلمة مرور قوية سهلة النسخ: بلا محارف ملتبسة */
function strongPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `${out.slice(0, 6)}-${out.slice(6, 12)}-${out.slice(12, 18)}`;
}

const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  orderBy: { id: "asc" },
  select: { id: true, username: true, fullName: true, role: true },
});

if (users.length === 0) {
  console.error("✖ لا توجد حسابات في قاعدة البيانات");
  process.exit(1);
}

const rows = [];
for (const user of users) {
  const password = strongPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  rows.push({ ...user, password });
}

await prisma.$disconnect();

const width = Math.max(...rows.map((r) => r.username.length));
const body = rows
  .map((r) => `${r.username.padEnd(width)}  ${r.password}   ${r.fullName}`)
  .join("\n");

writeFileSync(
  outPath,
  [
    "بيانات دخول عرين السنابل",
    `أُنشئت: ${new Date().toISOString()}`,
    "",
    "هذا الملف مستثنى من Git. سلّم كل كلمة مرور لصاحبها عبر قناة خاصة،",
    "ثم احذف هذا الملف. يمكن تغيير أي كلمة مرور لاحقًا من صفحة /manage/users.",
    "",
    body,
    "",
  ].join("\n"),
  "utf8",
);

console.log(`✔ رُوّجت كلمات المرور لـ ${rows.length} حسابات`);
console.log(`  الملف: ${outPath}`);
console.log("  (الكلمات لم تُطبع هنا عمدًا)");
