import { NextResponse } from "next/server";

import { parseId, readJson, requirePermission, withApi } from "@/lib/api";
import { resolveQuarantine } from "@/lib/return-service";
import { qcResolveSchema } from "@/lib/validation";

type Context = { params: Promise<{ lineId: string }> };

/** البتّ في وحدات محتجزة بفحص الجودة: إعادتها للمخزون أو شطبها */
export const POST = withApi(async (request: Request, context: Context) => {
  const user = await requirePermission("inventory:returns");
  const lineId = parseId((await context.params).lineId, "رقم السطر");
  const body = qcResolveSchema.parse(await readJson(request));

  const result = await resolveQuarantine(user, lineId, body);
  return NextResponse.json(result);
});
