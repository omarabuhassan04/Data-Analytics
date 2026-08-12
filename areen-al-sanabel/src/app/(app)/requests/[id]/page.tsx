import { RequestDetail } from "@/components/request-detail";

export const metadata = { title: "تفاصيل الطلب" };

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RequestDetail requestId={id} />;
}
