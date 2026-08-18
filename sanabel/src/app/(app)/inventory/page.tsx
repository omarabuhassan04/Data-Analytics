import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { ClearFilters, FilterSelect, SearchBox } from "@/components/filters";
import { BoxIcon } from "@/components/icons";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { requirePage } from "@/lib/guard";
import { can } from "@/lib/domain";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "المخزون" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; filter?: string }>;
}) {
  const user = await requirePage("inventory:read");
  const { q, category, filter } = await searchParams;

  const where: Prisma.ItemWhereInput = { isActive: true };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (category) where.categoryId = Number(category);

  const [categories, items] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    }),
  ]);

  // «تحت الحد» يُصفّى بعد الجلب لأنه مقارنة بين عمودين، وحجم الجدول صغير
  const visible =
    filter === "low"
      ? items.filter((item) => item.threshold > 0 && item.quantity <= item.threshold)
      : filter === "out"
        ? items.filter((item) => item.quantity === 0)
        : items;

  const totalUnits = visible.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <PageHeader
        title="مخزون المقر"
        description={`${num(visible.length)} صنفاً · ${num(totalUnits)} وحدة متاحة للصرف`}
        action={
          can(user.role, "supply:create") ? (
            <LinkButton href="/supply/new">طلب لوازم</LinkButton>
          ) : can(user.role, "inventory:manage") ? (
            <LinkButton href="/manage/items">إدارة الأصناف</LinkButton>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="ابحث عن صنف…" />
        <FilterSelect
          paramName="category"
          label="التصنيف"
          allLabel="كل التصنيفات"
          options={categories.map((c) => ({
            value: String(c.id),
            label: c.name,
          }))}
        />
        <FilterSelect
          paramName="filter"
          label="الحالة"
          allLabel="كل الحالات"
          options={[
            { value: "low", label: "تحت حد التنبيه" },
            { value: "out", label: "نفد المخزون" },
          ]}
        />
        <ClearFilters keys={["q", "category", "filter"]} />
      </div>

      <Card>
        {visible.length === 0 ? (
          <EmptyState
            icon={<BoxIcon />}
            title="لا توجد أصناف مطابقة"
            description="جرّب تغيير كلمة البحث أو إزالة المرشّحات."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>الصنف</Th>
                <Th>التصنيف</Th>
                <Th className="text-center">المتاح</Th>
                <Th className="text-center">حد التنبيه</Th>
                {can(user.role, "inventory:manage") ? (
                  <>
                    <Th className="text-center">تالف</Th>
                    <Th className="text-center">مفقود</Th>
                  </>
                ) : null}
                <Th>ملاحظات</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const low = item.threshold > 0 && item.quantity <= item.threshold;
                return (
                  <tr key={item.id} className="hover:bg-surface-2">
                    <Td className="font-semibold text-ink-900">{item.name}</Td>
                    <Td className="text-xs text-ink-400">{item.category.name}</Td>
                    <Td className="text-center">
                      <Badge
                        tone={item.quantity === 0 ? "bad" : low ? "warn" : "ok"}
                      >
                        {num(item.quantity)} {item.unit}
                      </Badge>
                    </Td>
                    <Td className="text-center tabular-nums text-ink-400">
                      {item.threshold > 0 ? num(item.threshold) : "—"}
                    </Td>
                    {can(user.role, "inventory:manage") ? (
                      <>
                        <Td className="text-center tabular-nums text-ink-400">
                          {item.damagedQty > 0 ? num(item.damagedQty) : "—"}
                        </Td>
                        <Td className="text-center tabular-nums text-ink-400">
                          {item.lostQty > 0 ? num(item.lostQty) : "—"}
                        </Td>
                      </>
                    ) : null}
                    <Td className="max-w-64 text-xs text-ink-400">
                      {item.notes ?? "—"}
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
