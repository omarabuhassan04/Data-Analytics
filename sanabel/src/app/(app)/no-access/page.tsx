import type { Metadata } from "next";

import { Card, LinkButton } from "@/components/ui";
import { requirePageUser } from "@/lib/guard";

export const metadata: Metadata = { title: "لا تملك صلاحية" };

export default async function NoAccessPage() {
  const user = await requirePageUser();

  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-lg font-bold text-ink-900">
        لا تملك صلاحية الوصول إلى هذه الصفحة
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        حسابك مسجّل بدور «{user.roleLabel}»
        {user.teamName ? ` في ${user.teamName}` : ""}، وهذه الصفحة خارج نطاق هذا
        الدور. إن كنت تحتاجها فراجع قائد اللوازم.
      </p>
      <LinkButton href="/" className="mt-6">
        العودة إلى الرئيسية
      </LinkButton>
    </Card>
  );
}
