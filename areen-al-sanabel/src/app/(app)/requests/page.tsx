import { RequestsList } from "@/components/requests-list";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "جميع الطلبات" };

export default async function AllRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <PageHeader
        title="جميع الطلبات"
      />
      <RequestsList scope="all" initialStatus={params.status} />
    </div>
  );
}
