"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { createSupplyRequest } from "@/actions/supply";
import { FormError, SubmitButton } from "@/components/form";
import {
  BoxIcon,
  CartIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@/components/icons";
import { useToast } from "@/components/toast";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { num } from "@/lib/format";

type CatalogItem = {
  id: number;
  name: string;
  unit: string;
  available: number;
};

type Category = { id: number; name: string; items: CatalogItem[] };

export function SupplyBuilder({ catalog }: { catalog: Category[] }) {
  const router = useRouter();
  const { notify } = useToast();

  const [state, formAction] = useActionState(createSupplyRequest, null);
  const [cart, setCart] = useState<Map<number, number>>(new Map());
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");

  const allItems = useMemo(
    () => catalog.flatMap((category) => category.items),
    [catalog],
  );
  const itemById = useMemo(
    () => new Map(allItems.map((item) => [item.id, item])),
    [allItems],
  );

  const visible = useMemo(() => {
    const term = query.trim();
    return catalog
      .filter((category) => !categoryId || String(category.id) === categoryId)
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) => !term || item.name.includes(term),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [catalog, categoryId, query]);

  useEffect(() => {
    if (state?.ok) {
      notify(`تم تقديم الطلب ${state.data.code} وصُرفت الأصناف.`);
      router.push(`/supply/${state.data.id}`);
    }
  }, [state, notify, router]);

  const setQuantity = (item: CatalogItem, quantity: number) => {
    setCart((current) => {
      const next = new Map(current);
      // القصّ عند المتاح يمنع تقديم طلب يعرف المتصفّح مسبقاً أنه سيُرفض
      const clamped = Math.max(0, Math.min(quantity, item.available));
      if (clamped === 0) next.delete(item.id);
      else next.set(item.id, clamped);
      return next;
    });
  };

  const lines = [...cart.entries()].map(([id, quantity]) => ({
    item: itemById.get(id)!,
    quantity,
  }));

  const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(
          lines.map((line) => ({ itemId: line.item.id, quantity: line.quantity })),
        )}
      />

      {/* اختيار الأصناف */}
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-400">
              <SearchIcon className="size-4" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن صنف…"
              aria-label="ابحث عن صنف"
              className="h-10 w-full rounded-lg border border-line-strong bg-surface pr-10 pl-3 text-sm placeholder:text-ink-400 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
            />
          </div>
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label="التصنيف"
            className="w-auto min-w-40"
          >
            <option value="">كل التصنيفات</option>
            {catalog.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        {visible.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BoxIcon />}
              title="لا توجد أصناف مطابقة"
              description="جرّب كلمة بحث أخرى أو تصنيفاً مختلفاً."
            />
          </Card>
        ) : (
          visible.map((category) => (
            <Card key={category.id}>
              <CardHeader
                title={category.name}
                description={`${num(category.items.length)} صنفاً`}
              />
              <ul className="divide-y divide-line">
                {category.items.map((item) => {
                  const quantity = cart.get(item.id) ?? 0;
                  const depleted = item.available === 0;

                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "flex flex-wrap items-center gap-3 px-5 py-3",
                        quantity > 0 && "bg-forest-50/50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          المتاح: {num(item.available)} {item.unit}
                        </p>
                      </div>

                      {depleted ? (
                        <Badge tone="bad">نفد — قدّم طلب شراء</Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <StepButton
                            label={`إنقاص ${item.name}`}
                            onClick={() => setQuantity(item, quantity - 1)}
                            disabled={quantity === 0}
                          >
                            <MinusIcon className="size-4" />
                          </StepButton>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={item.available}
                            value={quantity}
                            aria-label={`الكمية المطلوبة من ${item.name}`}
                            onChange={(event) =>
                              setQuantity(item, Number(event.target.value) || 0)
                            }
                            className="h-9 w-16 rounded-lg border border-line-strong bg-surface text-center text-sm tabular-nums focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                          />
                          <StepButton
                            label={`زيادة ${item.name}`}
                            onClick={() => setQuantity(item, quantity + 1)}
                            disabled={quantity >= item.available}
                          >
                            <PlusIcon className="size-4" />
                          </StepButton>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))
        )}
      </div>

      {/* ملخّص الطلب */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader
            title="ملخّص الطلب"
            description={
              totalUnits > 0
                ? `${num(lines.length)} أصناف · ${num(totalUnits)} وحدة`
                : "لم تختر أصنافاً بعد"
            }
          />

          <div className="px-5 py-4">
            <FormError state={state} />

            {lines.length === 0 ? (
              <EmptyState
                icon={<CartIcon />}
                title="السلّة فارغة"
                description="اختر الأصناف وكمياتها من القائمة."
              />
            ) : (
              <ul className="mb-4 space-y-2">
                {lines.map(({ item, quantity }) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-ink-400">
                        {num(quantity)} {item.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuantity(item, 0)}
                      aria-label={`إزالة ${item.name}`}
                      className="rounded p-1 text-ink-400 hover:bg-danger-50 hover:text-danger-500"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-3">
              <Field label="الغرض من الطلب" hint="مثال: مخيّم الربيع — الأحد">
                <Textarea
                  name="purpose"
                  rows={2}
                  maxLength={300}
                  placeholder="اذكر المناسبة أو النشاط…"
                />
              </Field>

              <Field label="تاريخ الحاجة">
                <Input type="date" name="neededOn" dir="ltr" className="text-left" />
              </Field>
            </div>

            <Alert tone="info" className="mt-4 text-xs">
              بمجرّد الإرسال يُخصم المطلوب من مخزون المقر ويُسجَّل عهدة على فرقتك.
            </Alert>

            <SubmitButton
              className="mt-4 w-full"
              size="lg"
              disabled={lines.length === 0}
              pendingLabel="جارٍ الصرف…"
            >
              <CartIcon className="size-4" />
              تقديم الطلب وصرف الأصناف
            </SubmitButton>
          </div>
        </Card>
      </aside>
    </form>
  );
}

function StepButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-700 transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:hover:bg-surface"
    >
      {children}
    </button>
  );
}
