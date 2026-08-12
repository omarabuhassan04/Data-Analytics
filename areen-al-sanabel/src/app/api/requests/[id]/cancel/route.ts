import { NextResponse } from "next/server";

import { parseId, requirePermission, withApi } from "@/lib/api";
import { cancelRequest } from "@/lib/request-service";

type Context = { params: Promise<{ id: string }> };

/** إلغاء الطلب من قِبل صاحبه ما دام مفتوحًا — تُعاد الكميات المحجوزة تلقائيًا */
export const POST = withApi(async (_request: Request, context: Context) => {
  const user = await requirePermission("requests:cancel:own");
  const id = parseId((await context.params).id, "رقم الطلب");

  const updated = await cancelRequest(user, id);
  return NextResponse.json({ request: updated });
});
