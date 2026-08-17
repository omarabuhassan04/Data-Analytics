import { RequestsList } from "@/components/requests-list";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "طلباتي" };

export default function MyRequestsPage() {
  return (
    <div>
      <PageHeader
        title="طلباتي"
      />
      <RequestsList scope="mine" />
    </div>
  );
}
