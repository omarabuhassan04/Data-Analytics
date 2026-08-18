import "server-only";

import type { CurrentUser } from "@/lib/auth";
import { seesAllTeams } from "@/lib/domain";
import { ForbiddenError } from "@/lib/errors";

/**
 * قيد الفرقة المطبَّق على كل استعلام يقرأ طلبات أو عهداً.
 *
 * قائد الفرقة يرى فرقته وحدها. هذا القيد يُبنى هنا لا في الصفحات، حتى لا
 * تنسى صفحة جديدة تطبيقه فتتسرّب بيانات فرقة إلى أخرى.
 */
export function teamFilter(user: CurrentUser): { teamId?: number } {
  if (seesAllTeams(user.role)) return {};
  if (!user.teamId) {
    // قائد فرقة بلا فرقة: قيد مستحيل التحقّق خير من قيد فارغ يكشف كل شيء
    throw new ForbiddenError("حسابك غير مرتبط بفرقة.");
  }
  return { teamId: user.teamId };
}

/** يتحقّق أن السجل يخصّ فرقة المستخدم، أو أن دوره يرى كل الفرق */
export function assertTeamAccess(user: CurrentUser, teamId: number): void {
  if (seesAllTeams(user.role)) return;
  if (user.teamId !== teamId) {
    throw new ForbiddenError("هذا السجل يخصّ فرقة أخرى.");
  }
}
