import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity";
import {
  ApiError,
  notFound,
  parseId,
  readJson,
  requirePermission,
  withApi,
} from "@/lib/api";
import { canNoteOnRequestType, REQUEST_TYPE_LABELS, type RequestType } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { noteCreateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi(async (request: Request, context: Context) => {
  const user = await requirePermission("requests:note");
  const id = parseId((await context.params).id, "رقم الطلب");
  const body = noteCreateSchema.parse(await readJson(request));

  const target = await prisma.request.findUnique({
    where: { id },
    select: { id: true, type: true },
  });
  if (!target) throw notFound("الطلب غير موجود");

  // قائد الكشافين يعلّق على طلبات العهدة فقط، بينما قائد اللوازم على كل الأنواع
  if (!canNoteOnRequestType(user.role, target.type as RequestType)) {
    throw new ApiError(
      403,
      `لا تملك صلاحية إضافة ملاحظة على «${REQUEST_TYPE_LABELS[target.type as RequestType]}»`,
    );
  }

  const note = await prisma.requestNote.create({
    data: { requestId: id, authorId: user.id, body: body.body },
    include: { author: { select: { id: true, fullName: true, role: true } } },
  });

  await logActivity(prisma, {
    actorId: user.id,
    actorName: user.fullName,
    action: "REQUEST_NOTE",
    entity: "Request",
    entityId: id,
    summary: `أضاف ملاحظة على الطلب #${id}`,
  });

  return NextResponse.json({ note }, { status: 201 });
});
