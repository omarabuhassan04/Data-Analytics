"use client";

import { createContext, useContext, type ReactNode } from "react";

import { can, type Permission, type Role } from "@/lib/domain";

export type SessionUser = {
  id: number;
  fullName: string;
  username: string;
  role: Role;
  teamName: string | null;
};

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSessionUser(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error("useSessionUser يجب أن يُستخدم داخل SessionProvider");
  return user;
}

/**
 * فحص الصلاحية في الواجهة — لإخفاء ما لا يستطيع المستخدم استخدامه.
 * هذا للراحة فقط؛ الفرض الحقيقي يتم على الخادم في كل مسار API.
 */
export function usePermission(permission: Permission): boolean {
  const user = useSessionUser();
  return can(user.role, permission);
}
