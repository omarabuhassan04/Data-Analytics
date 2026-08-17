#!/usr/bin/env node
/**
 * ينفّذ `prisma migrate deploy` أثناء البناء — لكن فقط إذا كان DATABASE_URL
 * سلسلة اتصال Postgres حقيقية.
 *
 * سبب الشرط: البناء يجب أن ينجح قبل توفّر قاعدة البيانات، حتى يمكن نشر
 * الواجهة ومعاينتها أولًا وربط القاعدة لاحقًا. بدون هذا الشرط يفشل البناء
 * كلّه عند غياب المتغيّر.
 *
 * لا يبتلع الأخطاء: إذا كان المتغيّر مضبوطًا بسلسلة صحيحة وفشلت الهجرة،
 * يفشل البناء كما يجب — نشر شيفرة تتوقّع جداول غير موجودة أسوأ من ألّا تُنشر.
 */

import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const configured = /^postgres(ql)?:\/\//.test(url);

if (!configured) {
  console.warn(
    "\n⚠ DATABASE_URL غير مضبوط بسلسلة Postgres صالحة — تُخطّى الهجرات.\n" +
      "  سيُبنى التطبيق وتعمل الواجهة، لكن كل ما يمسّ قاعدة البيانات\n" +
      "  (تسجيل الدخول، المخزون، الطلبات) سيفشل حتى تُضبط القيمة ويُعاد النشر.\n",
  );
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
