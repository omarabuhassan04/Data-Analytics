import { RequestsList } from "@/components/requests-list";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "طلباتي" };

export default function MyRequestsPage() {
  return (
    <div>
      <PageHeader
        title="طلباتي"
        description="متابعة حالة طلبات العهدة والكميات الإضافية والشراء التي قدّمتها"
      />
      <RequestsList scope="mine" />
    </div>
  );
}
