import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { can, seesAllTeams, type Permission } from "@/lib/domain";

/**
 * حراس مستوى الصفحة.
 *
 * الفرق عن حراس الإجراءات: الإجراء يرمي خطأً فيُعاد للنموذج كرسالة، أما
 * الصفحة فليس لها نموذج تعرض فيه الخطأ — فتُحوَّل إلى صفحة «لا صلاحية»
 * الواضحة بدل شاشة خطأ عامة لا تفسّر السبب.
 *
 * الحماية نفسها لا تعتمد على هذا: كل إجراء يعيد التحقّق على الخادم.
 */
export async function requirePageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePage(
  ...permissions: Permission[]
): Promise<CurrentUser> {
  const user = await requirePageUser();
  if (!permissions.some((permission) => can(user.role, permission))) {
    redirect("/no-access");
  }
  return user;
}

/** السجل يخصّ فرقة أخرى: يُعامل كغير موجود بدل الإفصاح عن وجوده */
export async function requireTeamPage(
  user: CurrentUser,
  teamId: number,
): Promise<void> {
  if (seesAllTeams(user.role)) return;
  if (user.teamId !== teamId) redirect("/no-access");
}
