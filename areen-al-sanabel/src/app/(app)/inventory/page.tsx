"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Minus,
  Plus,
  PackageSearch,
  Search,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

import { useCart } from "@/components/cart";
import { useSessionUser } from "@/components/session";
import { StockBadge } from "@/components/status";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
} from "@/components/ui";
import { errorMessage } from "@/lib/client";
import { cn } from "@/lib/cn";
import { can, STOCK_LEVEL_LABELS } from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import type { CategoryDto, ItemDto } from "@/lib/types";

export default function InventoryPage() {
  const user = useSessionUser();
  const canRequest = can(user.role, "requests:create");

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [level, setLevel] = useState<"all" | "OUT" | "LOW" | "OK">("all");

  const { data: categoriesData } = useSWR<{ categories: CategoryDto[] }>("/api/categories");
  const {
    data: itemsData,
    error,
    isLoading,
  } = useSWR<{ items: ItemDto[] }>("/api/items", { refreshInterval: 20_000 });

  const items = useMemo(() => {
    const all = itemsData?.items ?? [];
    const term = search.trim();
    return all.filter((item) => {
      if (term && !item.name.includes(term) && !item.category.name.includes(term)) return false;
      if (categoryId !== "all" && item.category.id !== categoryId) return false;
      if (level !== "all" && item.level !== level) return false;
      return true;
    });
  }, [itemsData, search, categoryId, level]);

  const categories = categoriesData?.categories ?? [];

  return (
    <div>
      <PageHeader
        title="مخزون المقر"
        description="تصفّح العتاد المتوفّر وأضِف ما تحتاجه إلى سلة العهدة"
        action={
          canRequest ? (
            <Link href="/cart">
              <Button variant="secondary" size="sm">
                <ShoppingBasket className="size-4" />
                سلة العهدة
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* أدوات التصفية */}
      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4.5 text-ink-300" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الغرض أو التصنيف…"
              className="ps-10"
              aria-label="البحث في المخزون"
            />
          </div>
          <Select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value === "all" ? "all" : Number(event.target.value))
            }
            aria-label="تصفية حسب التصنيف"
          >
            <option value="all">كل التصنيفات</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.itemCount})
              </option>
            ))}
          </Select>
          <Select
            value={level}
            onChange={(event) => setLevel(event.target.value as typeof level)}
            aria-label="تصفية حسب حالة المخزون"
          >
            <option value="all">كل الحالات</option>
            <option value="OK">{STOCK_LEVEL_LABELS.OK}</option>
            <option value="LOW">{STOCK_LEVEL_LABELS.LOW}</option>
            <option value="OUT">{STOCK_LEVEL_LABELS.OUT}</option>
          </Select>
        </div>

        {itemsData && (
          <p className="mt-3 text-xs font-medium text-ink-400">
            عرض {formatNumber(items.length)} من {formatNumber(itemsData.items.length)} غرضًا
          </p>
        )}
      </Card>

      {error && <ErrorBlock message={errorMessage(error)} />}
      {isLoading && !itemsData && <LoadingBlock label="جارٍ تحميل المخزون…" />}

      {itemsData && items.length === 0 && (
        <Card>
          <EmptyState
            icon={<PackageSearch className="size-6" />}
            title="لا توجد نتائج مطابقة"
            description="جرّب تعديل كلمة البحث أو إزالة عوامل التصفية."
          />
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} canRequest={canRequest} />
        ))}
      </div>
    </div>
  );
}

function ItemCard({ item, canRequest }: { item: ItemDto; canRequest: boolean }) {
  const cart = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const inCart = cart.lines.find((line) => line.itemId === item.id);
  const outOfStock = item.quantity <= 0;
  const max = Math.max(item.quantity, 1);

  function addToCart() {
    if (outOfStock) return;
    cart.add(
      { itemId: item.id, name: item.name, unit: item.unit, available: item.quantity },
      quantity,
    );
    toast.success(`أُضيف «${item.name}» إلى سلة العهدة`);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
    setQuantity(1);
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className={cn(
          "flex h-full flex-col p-4 transition-shadow hover:shadow-md",
          outOfStock && "bg-sand-50",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-bold text-ink-900">{item.name}</h3>
            <p className="mt-0.5 text-xs font-medium text-ink-400">{item.category.name}</p>
          </div>
          <StockBadge quantity={item.quantity} threshold={item.threshold} />
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span
            className={cn(
              "tabular text-2xl font-extrabold",
              outOfStock ? "text-crimson-600" : "text-forest-600",
            )}
          >
            {formatNumber(item.quantity)}
          </span>
          <span className="text-sm font-semibold text-ink-400">{item.unit} متاحة</span>
        </div>

        {item.notes && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-400">{item.notes}</p>
        )}

        {inCart && (
          <p className="mt-2 text-xs font-bold text-ember-600">
            في السلة: {formatNumber(inCart.quantity)} {item.unit}
          </p>
        )}

        <div className="flex-1" />

        {canRequest && (
          <div className="mt-4">
            {outOfStock ? (
              <Link href={`/purchase?item=${item.id}`}>
                <Button variant="secondary" size="sm" className="w-full">
                  <ShoppingCart className="size-4" />
                  طلب شراء
                </Button>
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl border border-sand-300 bg-sand-50">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      aria-label="إنقاص الكمية"
                      className="grid size-9 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-sand-100 disabled:opacity-40"
                      disabled={quantity <= 1}
                    >
                      <Minus className="size-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={max}
                      value={quantity}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setQuantity(Number.isFinite(next) ? Math.min(Math.max(next, 1), max) : 1);
                      }}
                      aria-label={`الكمية المطلوبة من ${item.name}`}
                      className="tabular w-12 border-x border-sand-300 bg-transparent py-1.5 text-center text-sm font-bold text-ink-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.min(max, value + 1))}
                      aria-label="زيادة الكمية"
                      className="grid size-9 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-sand-100 disabled:opacity-40"
                      disabled={quantity >= max}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  <Button size="sm" onClick={addToCart} className="flex-1">
                    <AnimatePresence mode="wait" initial={false}>
                      {justAdded ? (
                        <motion.span
                          key="added"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5"
                        >
                          <Check className="size-4" />
                          أُضيف
                        </motion.span>
                      ) : (
                        <motion.span
                          key="add"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="inline-flex items-center gap-1.5"
                        >
                          <ShoppingBasket className="size-4" />
                          إضافة
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>

                <Link
                  href={`/cart?extra=${item.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-400 transition-colors hover:text-ember-600"
                >
                  <Sparkles className="size-3.5" />
                  أحتاج كمية أكبر من المتوفّر
                </Link>
              </>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
