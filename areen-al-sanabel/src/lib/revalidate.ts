"use client";

import { mutate } from "swr";

/**
 * إبطال كل ما يعتمد على أرصدة المخزون بعد أي حركة.
 *
 * المشكلة التي يحلّها: الإرجاع يغيّر رصيد الغرض والكمية المعلّقة وشارة
 * التنقّل ولوحة التحكم والدفتر والمطابقة معًا. لو حدّث كل مكوّن مفتاحه
 * وحده لبقيت بقية الشاشات تعرض أرقامًا قديمة حتى الطلب التالي — وهذا
 * بالضبط ما يجعل الأرقام تبدو غير متّسقة للمستخدم.
 *
 * تصفية المفاتيح بالبادئة تُبطل الصفحة المفتوحة وكل صفحة أخرى محمّلة في
 * الذاكرة، بأي معاملات استعلام كانت. SWR يعيد الجلب للمفاتيح المرئية فقط،
 * فالتكلفة محدودة بما يراه المستخدم فعلًا.
 */
const STOCK_PREFIXES = [
  "/api/dashboard",
  "/api/items",
  "/api/requests",
  "/api/inventory",
  "/api/activity",
] as const;

export function revalidateStock(): Promise<unknown> {
  return mutate(
    (key) =>
      typeof key === "string" && STOCK_PREFIXES.some((prefix) => key.startsWith(prefix)),
    undefined,
    { revalidate: true },
  );
}
