#!/usr/bin/env node
/**
 * أداة صغيرة للتعامل مع أسرار الإنتاج في .env.production.local
 * دون طباعتها على الشاشة أو تمريرها في سطر الأوامر مرارًا.
 *
 *   node scripts/prod.mjs set KEY VALUE       يضبط متغيّرًا
 *   node scripts/prod.mjs run <cmd> [args]    ينفّذ أمرًا بمتغيّرات الإنتاج
 *   node scripts/prod.mjs check               يعرض المفاتيح الموجودة (بلا قيم)
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.production.local");

function read() {
  if (!existsSync(envPath)) return {};
  const vars = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    vars[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return vars;
}

function write(vars) {
  const body = Object.entries(vars)
    .map(([key, value]) => `${key}="${value}"`)
    .join("\n");
  writeFileSync(envPath, `# أسرار الإنتاج — مستثنى من Git، لا تشاركه\n\n${body}\n`, "utf8");
}

const [command, ...rest] = process.argv.slice(2);

if (command === "set") {
  const [key, ...valueParts] = rest;
  const vars = read();
  vars[key] = valueParts.join(" ");
  write(vars);
  console.log(`✔ ${key} set (${vars[key].length} chars, value not printed)`);
} else if (command === "check") {
  const vars = read();
  for (const [key, value] of Object.entries(vars)) {
    console.log(`  ${key.padEnd(22)} ${value ? `set (${value.length} chars)` : "EMPTY"}`);
  }
} else if (command === "run") {
  const vars = read();
  const missing = ["DATABASE_URL", "AUTH_SECRET"].filter((k) => !vars[k]);
  if (missing.length) {
    console.error(`✖ متغيّرات ناقصة: ${missing.join(", ")}`);
    process.exit(1);
  }
  const result = spawnSync(rest[0], rest.slice(1), {
    stdio: "inherit",
    shell: true,
    cwd: root,
    env: { ...process.env, ...vars },
  });
  process.exit(result.status ?? 1);
} else {
  console.error("usage: prod.mjs set|run|check");
  process.exit(1);
}
