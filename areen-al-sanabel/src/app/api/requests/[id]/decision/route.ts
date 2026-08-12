import { NextResponse } from "next/server";

import { parseId, readJson, requirePermission, withApi } from "@/lib/api";
import { decideRequest } from "@/lib/request-service";
import { decisionSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

/** قبول أو رفض أو تحويل الطلب إلى «قيد المراجعة» — لقائد اللوازم فقط */
export const POST = withApi(async (request: Request, context: Context) => {
  const user = await requirePermission("requests:decide");
  const id = parseId((await context.params).id, "رقم الطلب");
  const body = decisionSchema.parse(await readJson(request));

  const updated = await decideRequest(user, id, body);
  return NextResponse.json({ request: updated });
});
