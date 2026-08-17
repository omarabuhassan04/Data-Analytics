import { NextResponse } from "next/server";

import { requirePermission, withApi } from "@/lib/api";
import { reconcileStock } from "@/lib/stock";

/**
 * مطابقة الأرصدة مع الدفتر.
 * تُعيد الفروق إن وُجدت بدل أن تصلحها — التصحيح التلقائي يخفي سببه.
 */
export const GET = withApi(async () => {
  await requirePermission("inventory:read");

  const report = await reconcileStock();
  return NextResponse.json(report);
});
