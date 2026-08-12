import { Suspense } from "react";

import { CartPage } from "@/components/cart-page";
import { LoadingBlock } from "@/components/ui";

export const metadata = { title: "سلة العهدة" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <CartPage />
    </Suspense>
  );
}
