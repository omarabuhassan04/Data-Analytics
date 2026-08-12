import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // التوجيه إلى /session/end وليس /login مباشرةً: الكوكي قد يكون سليم التوقيع
  // لحساب لم يعد موجودًا أو مُعطّل، وحذفه هناك يمنع حلقة إعادة التوجيه.
  if (!user) redirect("/session/end");

  return (
    <Providers user={user}>
      <AppShell user={user}>{children}</AppShell>
    </Providers>
  );
}
