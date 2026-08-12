#!/usr/bin/env node
/**
 * يعرض الحسابات الموجودة في قاعدة البيانات — بلا كلمات مرور.
 *
 *   node scripts/list-accounts.mjs
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EXPECTED = [
  "supplies",
  "ashbal",
  "kashafa",
  "jawwala",
  "group.leader",
  "deputy",
  "scouts.leader",
];

const users = await prisma.user.findMany({ orderBy: { id: "asc" } });

console.log(`\nالحسابات في قاعدة البيانات: ${users.length}\n`);
console.log("اسم الدخول".padEnd(18) + "الدور".padEnd(24) + "فعّال   الفرقة");
console.log("-".repeat(78));
for (const user of users) {
  console.log(
    user.username.padEnd(18) +
      user.role.padEnd(24) +
      (user.isActive ? " نعم  " : "  لا  ") +
      (user.teamName ?? "—"),
  );
}

const missing = EXPECTED.filter((name) => !users.some((u) => u.username === name));
console.log(`\nمفقود من القائمة المتوقّعة: ${missing.length ? missing.join(", ") : "لا شيء"}`);

let legacy = 0;
for (const user of users) {
  if (await bcrypt.compare("Areen@2026", user.passwordHash)) legacy++;
}
console.log(`حسابات ما زالت تقبل كلمة المرور القديمة: ${legacy} من ${users.length}\n`);

await prisma.$disconnect();
