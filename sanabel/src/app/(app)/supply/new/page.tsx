import type { Metadata } from "next";

import { SupplyBuilder } from "@/app/(app)/supply/new/supply-builder";
import { PageHeader } from "@/components/ui";
import { requirePage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "طلب لوازم" };

export default async function NewSupplyPage() {
  await requirePage("supply:create");

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const catalog = categories
    .filter((category) => category.items.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        available: item.quantity,
      })),
    }));

  return (
    <>
      <PageHeader
        eyebrow="طلب جديد"
        title="طلب لوازم"
        description="اختر من المتاح في المقر. الطلب يُعتمد آلياً ويُصرف فوراً، وتصبح الأصناف عهدة على فرقتك حتى إرجاعها."
      />
      <SupplyBuilder catalog={catalog} />
    </>
  );
}
