import { NextResponse } from "next/server";

import { logActivity } from "@/lib/activity";
import { withApi } from "@/lib/api";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = withApi(async () => {
  const user = await getCurrentUser();

  if (user) {
    await logActivity(prisma, {
      actorId: user.id,
      actorName: user.fullName,
      action: "LOGOUT",
      entity: "Auth",
      entityId: user.id,
      summary: "سجّل الخروج من النظام",
    });
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
