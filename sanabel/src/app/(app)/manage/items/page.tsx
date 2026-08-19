import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { ClearFilters, FilterSelect, SearchBox } from "@/components/filters";
import { BoxIcon } from "@/components/icons";
import {
  AdjustButton,
  ArchiveButton,
  EditItemButton,
  NewCategoryButton,
  NewItemButton,
} from "@/components/item-manager";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requirePage } from "@/lib/guard";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "إدارة الأصناف" };

export default async function ManageItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; state?: string }>;
}) {
  await requirePage("inventory:manage");
  const sp = await searchParams;

  const where: Prisma.ItemWhereInput = {};
  if (sp.q) where.name = { contains: sp.q, mode: "insensitive" };
  if (sp.category) where.categoryId = Number(sp.category);
  where.isActive = sp.state === "archived" ? false : true;

  const [categories, items] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="الإدارة"
        title="إدارة الأصناف"
        description="إضافة الأصناف وتعديلها وتسجيل الجرد. كل تغيّر في رصيد يمرّ عبر دفتر الحركة."
        action={
          <div className="flex gap-2">
            <NewCategoryButton />
            <NewItemButton categories={categories} />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="ابحث عن صنف…" />
        <FilterSelect
          paramName="category"
          label="التصنيف"
          allLabel="كل التصنيفات"
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
        />
        <FilterSelect
          paramName="state"
          label="الحالة"
          allLabel="الفعّالة"
          options={[{ value: "archived", label: "المؤرشفة" }]}
        />
        <ClearFilters keys={["q", "category", "state"]} />
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon={<BoxIcon />}
            title="لا توجد أصناف"
            description="أضف صنفاً جديداً أو غيّر المرشّحات."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الصنف</Th>
                <Th>التصنيف</Th>
                <Th className="text-center">المتاح</Th>
                <Th className="text-center">الحد</Th>
                <Th className="text-center">تالف</Th>
                <Th className="text-center">مفقود</Th>
                <Th className="text-left">إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const managed = {
                  id: item.id,
                  name: item.name,
                  unit: item.unit,
                  categoryId: item.categoryId,
                  quantity: item.quantity,
                  threshold: item.threshold,
                  notes: item.notes,
                  isActive: item.isActive,
                };
                const low = item.threshold > 0 && item.quantity <= item.threshold;

                return (
                  <tr key={item.id} className="hover:bg-surface-2">
                    <Td>
                      <span className="font-semibold text-ink-900">{item.name}</span>
                      <span className="mr-1 text-xs text-ink-400">({item.unit})</span>
                      {item.notes ? (
                        <p className="mt-0.5 max-w-64 truncate text-xs text-ink-400">
                          {item.notes}
                        </p>
                      ) : null}
                    </Td>
                    <Td className="text-xs text-ink-400">{item.category.name}</Td>
                    <Td className="text-center">
                      <Badge tone={item.quantity === 0 ? "bad" : low ? "warn" : "ok"}>
                        {num(item.quantity)}
                      </Badge>
                    </Td>
                    <Td className="text-center tabular-nums text-ink-400">
                      {item.threshold > 0 ? num(item.threshold) : "—"}
                    </Td>
                    <Td className="text-center tabular-nums text-ink-400">
                      {item.damagedQty > 0 ? num(item.damagedQty) : "—"}
                    </Td>
                    <Td className="text-center tabular-nums text-ink-400">
                      {item.lostQty > 0 ? num(item.lostQty) : "—"}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-0.5">
                        <AdjustButton item={managed} />
                        <EditItemButton item={managed} categories={categories} />
                        <ArchiveButton item={managed} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
