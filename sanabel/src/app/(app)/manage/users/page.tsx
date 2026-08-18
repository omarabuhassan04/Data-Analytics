import type { Metadata } from "next";

import {
  ActiveToggle,
  NewUserButton,
  PasswordButton,
} from "@/components/user-manager";
import {
  Badge,
  Card,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requirePage } from "@/lib/guard";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { formatDateTime, relativeTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "الحسابات" };

export default async function ManageUsersPage() {
  const actor = await requirePage("users:manage");

  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      include: { team: true },
      orderBy: [{ role: "asc" }, { username: "asc" }],
    }),
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="الحسابات"
        description="إنشاء الحسابات وتغيير كلمات المرور وتعطيل ما لم يعد مستخدماً."
        action={<NewUserButton teams={teams} />}
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>الاسم</Th>
              <Th>اسم المستخدم</Th>
              <Th>الدور</Th>
              <Th>الفرقة</Th>
              <Th>آخر دخول</Th>
              <Th>الحالة</Th>
              <Th className="text-left">إجراءات</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-2">
                <Td className="font-semibold text-ink-900">{user.fullName}</Td>
                <Td dir="ltr" className="text-left font-mono text-xs text-ink-500">
                  {user.username}
                </Td>
                <Td className="text-xs">{ROLE_LABEL[user.role as Role]}</Td>
                <Td className="text-xs text-ink-400">{user.team?.name ?? "—"}</Td>
                <Td className="text-xs text-ink-400">
                  {user.lastLoginAt ? (
                    <span title={formatDateTime(user.lastLoginAt)}>
                      {relativeTime(user.lastLoginAt)}
                    </span>
                  ) : (
                    "لم يدخل بعد"
                  )}
                </Td>
                <Td>
                  <Badge tone={user.isActive ? "ok" : "muted"}>
                    {user.isActive ? "فعّال" : "معطّل"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <PasswordButton id={user.id} fullName={user.fullName} />
                    <ActiveToggle
                      id={user.id}
                      fullName={user.fullName}
                      isActive={user.isActive}
                      isSelf={user.id === actor.id}
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
