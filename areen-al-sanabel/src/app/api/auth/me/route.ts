import { NextResponse } from "next/server";

import { withApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_PERMISSIONS } from "@/lib/domain";

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({
    user,
    permissions: ROLE_PERMISSIONS[user.role],
  });
});
