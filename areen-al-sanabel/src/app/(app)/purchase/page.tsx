import { Suspense } from "react";

import { PurchasePage } from "@/components/purchase-page";
import { LoadingBlock } from "@/components/ui";

export const metadata = { title: "طلب شراء" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <PurchasePage />
    </Suspense>
  );
}
