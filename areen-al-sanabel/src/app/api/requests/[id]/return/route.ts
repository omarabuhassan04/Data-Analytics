import { NextResponse } from "next/server";

import { parseId, readJson, requirePermission, withApi } from "@/lib/api";
import { receiveReturn } from "@/lib/return-service";
import { returnCreateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

/** استلام عتاد عهدة رجع من فرقة — لقائد اللوازم فقط */
export const POST = withApi(async (request: Request, context: Context) => {
  const user = await requirePermission("inventory:returns");
  const id = parseId((await context.params).id, "رقم الطلب");
  const body = returnCreateSchema.parse(await readJson(request));

  const result = await receiveReturn(user, id, body);
  return NextResponse.json(result);
});
