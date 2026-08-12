import { redirect } from "next/navigation";

import { ConceptShowcase } from "@/components/concept/showcase";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "معاينة تصميم لوحة القيادة" };

/**
 * صفحة معاينة تصميم — تحقيق حرفي للمفهوم البصري ببيانات تجريبية.
 * محميّة بتسجيل الدخول مثل بقية الصفحات، ومفصولة تمامًا عن بيانات النظام
 * حتى لا تختلط أرقام العرض بأرقام المخزون الحقيقية.
 */
export default async function ConceptPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/session/end");

  return <ConceptShowcase />;
}
