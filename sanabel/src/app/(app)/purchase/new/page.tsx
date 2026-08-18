import type { Metadata } from "next";

import { PurchaseForm } from "@/components/purchase-form";
import { Alert, Card, PageHeader } from "@/components/ui";
import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "طلب شراء جديد" };

export default async function NewPurchasePage() {
  await requirePage("purchase:create");

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="طلب شراء جديد"
        description="للأصناف غير المتوفّرة في المقر. الطلب يبقى قيد الانتظار حتى يبتّ فيه قائد اللوازم."
      />

      <Alert tone="info" className="mb-4">
        إن كان الصنف متاحاً في المقر فاستخدم <strong>طلب لوازم</strong> بدلاً من
        هذا — طلب اللوازم يُصرف فوراً بلا انتظار موافقة.
      </Alert>

      <Card className="max-w-2xl p-5">
        <PurchaseForm categories={categories} mode="create" />
      </Card>
    </>
  );
}
