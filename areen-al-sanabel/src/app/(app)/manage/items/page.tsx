"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import useSWR from "swr";

import {
  IconCategoryAdd,
  IconDepot,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconWhistle,
} from "@/components/icons";
import { StockBadge } from "@/components/status";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { apiDelete, apiPatch, apiPost, errorMessage } from "@/lib/client";
import { formatNumber } from "@/lib/format";
import type { CategoryDto, ItemDto } from "@/lib/types";

type ItemForm = {
  name: string;
  categoryId: string;
  unit: string;
  quantity: string;
  threshold: string;
  notes: string;
  adjustmentReason: string;
};

const emptyForm: ItemForm = {
  name: "",
  categoryId: "",
  unit: "قطعة",
  quantity: "0",
  threshold: "0",
  notes: "",
  adjustmentReason: "",
};

export default function ManageItemsPage() {
  const toast = useToast();

  const { data: categoriesData, mutate: refreshCategories } = useSWR<{
    categories: CategoryDto[];
  }>("/api/categories");
  const {
    data: itemsData,
    error,
    isLoading,
    mutate: refreshItems,
  } = useSWR<{ items: ItemDto[] }>("/api/items?includeInactive=true");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editing, setEditing] = useState<ItemDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const categories = categoriesData?.categories ?? [];

  const items = useMemo(() => {
    const all = itemsData?.items ?? [];
    const term = search.trim();
    return all.filter((item) => {
      if (term && !item.name.includes(term)) return false;
      if (categoryFilter !== "all" && item.category.id !== Number(categoryFilter)) return false;
      return true;
    });
  }, [itemsData, search, categoryFilter]);

  function openCreate() {
    setForm({ ...emptyForm, categoryId: categories[0] ? String(categories[0].id) : "" });
    setCreating(true);
  }

  function openEdit(item: ItemDto) {
    setForm({
      name: item.name,
      categoryId: String(item.category.id),
      unit: item.unit,
      quantity: String(item.quantity),
      threshold: String(item.threshold),
      notes: item.notes ?? "",
      adjustmentReason: "",
    });
    setEditing(item);
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      unit: form.unit.trim() || "قطعة",
      quantity: Number(form.quantity),
      threshold: Number(form.threshold),
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editing) {
        await apiPatch(`/api/items/${editing.id}`, {
          ...payload,
          adjustmentReason: form.adjustmentReason.trim() || undefined,
        });
        toast.success(`حُدّث «${payload.name}»`);
      } else {
        await apiPost("/api/items", payload);
        toast.success(`أُضيف «${payload.name}» إلى المخزون`);
      }
      setEditing(null);
      setCreating(false);
      void refreshItems();
      void refreshCategories();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: ItemDto) {
    try {
      const result = await apiDelete<{ archived: boolean }>(`/api/items/${item.id}`);
      toast.success(
        result.archived
          ? `أُرشف «${item.name}» لارتباطه بطلبات سابقة`
          : `حُذف «${item.name}» نهائيًا`,
      );
      void refreshItems();
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  }

  const quantityChanged =
    editing !== null && Number(form.quantity) !== editing.quantity;

  return (
    <div>
      <PageHeader
        title="إدارة المخزون"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCategoryOpen(true)}>
              <IconCategoryAdd className="size-4" />
              تصنيف جديد
            </Button>
            <Button size="sm" onClick={openCreate} disabled={categories.length === 0}>
              <IconPlus className="size-4" />
              غرض جديد
            </Button>
          </div>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4.5 text-ink-300" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الغرض…"
              className="ps-10"
              aria-label="بحث"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="تصفية حسب التصنيف"
          >
            <option value="all">كل التصنيفات</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error && <ErrorBlock message={errorMessage(error)} />}
      {isLoading && !itemsData && <LoadingBlock />}

      {itemsData && items.length === 0 && (
        <Card>
          <EmptyState
            icon={<IconDepot className="size-6" />}
            title="لا توجد أغراض"
            action={<Button onClick={openCreate}>إضافة غرض</Button>}
          />
        </Card>
      )}

      {items.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50 text-xs text-ink-400">
                  <th className="px-4 py-3 text-start font-semibold">الغرض</th>
                  <th className="px-4 py-3 text-start font-semibold">التصنيف</th>
                  <th className="px-4 py-3 text-start font-semibold">المتاح</th>
                  <th className="px-4 py-3 text-start font-semibold">الحد الأدنى</th>
                  <th className="px-4 py-3 text-start font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-end font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {items.map((item) => (
                  <motion.tr
                    key={item.id}
                    layout
                    className={item.isActive ? "" : "bg-sand-50 opacity-60"}
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold text-ink-900">{item.name}</span>
                      {!item.isActive && (
                        <span className="ms-2 text-xs font-semibold text-ink-400">(مؤرشف)</span>
                      )}
                      {item.notes && (
                        <span className="mt-0.5 block max-w-xs truncate text-xs text-ink-400">
                          {item.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-500">{item.category.name}</td>
                    <td className="tabular px-4 py-3 font-bold text-ink-900">
                      {formatNumber(item.quantity)} {item.unit}
                    </td>
                    <td className="tabular px-4 py-3 text-ink-500">
                      {formatNumber(item.threshold)}
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge quantity={item.quantity} threshold={item.threshold} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          aria-label={`تعديل ${item.name}`}
                          className="grid size-9 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-sand-100 hover:text-ink-800"
                        >
                          <IconEdit className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          aria-label={`حذف ${item.name}`}
                          className="grid size-9 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-crimson-50 hover:text-crimson-600"
                        >
                          <IconTrash className="size-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* نافذة إضافة/تعديل غرض */}
      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `تعديل «${editing.name}»` : "إضافة غرض جديد"}
        size="lg"
      >
        <form onSubmit={saveItem} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم الغرض" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                placeholder="مثال: خيمة لأربعة أشخاص"
              />
            </Field>

            <Field label="التصنيف" required>
              <Select
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="وحدة القياس" required>
              <Input
                value={form.unit}
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
                required
                placeholder="قطعة، متر، علبة…"
              />
            </Field>

            <Field label="الكمية المتاحة" required>
              <Input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                required
                className="tabular"
              />
            </Field>

            <Field
              label="الحد الأدنى للتنبيه"
              hint="اتركه صفرًا لتعطيل التنبيه"
            >
              <Input
                type="number"
                min={0}
                value={form.threshold}
                onChange={(event) => setForm({ ...form, threshold: event.target.value })}
                className="tabular"
              />
            </Field>
          </div>

          <Field label="ملاحظات">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={2}
              placeholder="ملاحظات"
            />
          </Field>

          {quantityChanged && (
            <div className="rounded-xl border border-ember-200 bg-ember-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-ember-700">
                <IconWhistle className="size-4" />
                تعديل الكمية من {formatNumber(editing.quantity)} إلى{" "}
                {formatNumber(Number(form.quantity) || 0)}
              </p>
              <Field label="سبب التعديل">
                <Input
                  value={form.adjustmentReason}
                  onChange={(event) =>
                    setForm({ ...form, adjustmentReason: event.target.value })
                  }
                  placeholder="سبب التعديل"
                  className="mt-1 bg-sand-50"
                />
              </Field>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={saving}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <CategoryModal
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        onDone={() => {
          void refreshCategories();
          void refreshItems();
        }}
      />
    </div>
  );
}

function CategoryModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/categories", { name: name.trim() });
      toast.success(`أُضيف تصنيف «${name.trim()}»`);
      setName("");
      onClose();
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تصنيف جديد">
      <form onSubmit={submit} className="space-y-4">
        <Field label="اسم التصنيف" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="مثال: معدات تسلّق"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={saving}>
            إضافة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
