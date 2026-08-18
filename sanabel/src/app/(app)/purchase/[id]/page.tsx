import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  CancelPanel,
  DecisionPanel,
  EditPanel,
  FulfillPanel,
} from "@/components/purchase-actions";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  LinkButton,
} from "@/components/ui";
import { requirePage, requireTeamPage } from "@/lib/guard";
import {
  PURCHASE_STATUS_LABEL,
  PURCHASE_STATUS_TONE,
  can,
  type PurchaseStatus,
} from "@/lib/domain";
import { formatDateTime, num } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "تفاصيل طلب الشراء" };

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePage(
    "purchase:create",
    "purchase:read:all",
    "purchase:read:decided",
  );
  const { id } = await params;

  const requestId = Number(id);
  if (!Number.isInteger(requestId)) notFound();

  const request = await prisma.purchaseRequest.findUnique({
    where: { id: requestId },
    include: {
      team: true,
      requester: true,
      decidedBy: true,
      category: true,
    },
  });

  if (!request) notFound();
  await requireTeamPage(user, request.teamId);

  const status = request.status as PurchaseStatus;

  // الأدوار الرقابية لا ترى الطلب قبل البتّ فيه — نخفيه كأنه غير موجود
  if (
    can(user.role, "purchase:read:decided") &&
    !["APPROVED", "FULFILLED"].includes(status)
  ) {
    notFound();
  }

  const isOwner =
    user.role === "TEAM_LEADER" && user.teamId === request.teamId;
  const canDecide = can(user.role, "purchase:decide") && status === "PENDING";
  const canFulfill = can(user.role, "purchase:fulfill") && status === "APPROVED";
  const canEdit = isOwner && (status === "PENDING" || status === "REJECTED");

  const [categories, items] = await Promise.all([
    canEdit || canFulfill
      ? prisma.category.findMany({
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        })
      : [],
    canFulfill
      ? prisma.item.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: { category: true },
        })
      : [],
  ]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              طلب الشراء {request.code}
            </h1>
            <Badge tone={PURCHASE_STATUS_TONE[status]}>
              {PURCHASE_STATUS_LABEL[status]}
            </Badge>
            {request.revision > 0 ? (
              <Badge tone="muted">مراجعة {num(request.revision)}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {request.team.name} · قدّمه {request.requester.fullName} ·{" "}
            {formatDateTime(request.createdAt)}
          </p>
        </div>
        <LinkButton href="/purchase" variant="outline">
          عودة للقائمة
        </LinkButton>
      </div>

      {status === "REJECTED" && request.decisionNote ? (
        <Alert tone="bad" title="سبب الرفض" className="mb-5">
          {request.decisionNote}
          {isOwner ? (
            <span className="mt-1 block font-semibold">
              عالج السبب ثم عدّل الطلب وأعِد تقديمه.
            </span>
          ) : null}
        </Alert>
      ) : null}

      {status === "APPROVED" ? (
        <Alert tone="ok" title="تمت الموافقة" className="mb-5">
          {request.decisionNote ??
            "بانتظار الشراء والتوريد. المخزون لم يتغيّر بعد."}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader title="تفاصيل الطلب" />
          <dl className="divide-y divide-line text-sm">
            <Row label="الصنف المطلوب" value={request.itemName} />
            <Row
              label="الكمية"
              value={`${num(request.quantity)} ${request.unit}`}
            />
            <Row label="التصنيف المقترح" value={request.category?.name ?? "—"} />
            <Row label="الفرقة" value={request.team.name} />
            <Row label="مقدّم الطلب" value={request.requester.fullName} />
            <Row label="تاريخ التقديم" value={formatDateTime(request.createdAt)} />
            {request.decidedAt ? (
              <Row
                label="تاريخ القرار"
                value={`${formatDateTime(request.decidedAt)} — ${
                  request.decidedBy?.fullName ?? "—"
                }`}
              />
            ) : null}
            {request.fulfilledAt ? (
              <Row
                label="تاريخ التوريد"
                value={formatDateTime(request.fulfilledAt)}
              />
            ) : null}
          </dl>

          <div className="border-t border-line px-5 py-4">
            <h3 className="mb-1.5 text-sm font-bold text-ink-900">
              التفاصيل والمبرّر
            </h3>
            <p className="text-sm whitespace-pre-wrap text-ink-700">
              {request.details ?? "لم تُذكر تفاصيل."}
            </p>
          </div>
        </Card>

        <aside className="space-y-5">
          {canDecide || canFulfill || canEdit ? (
            <Card>
              <CardHeader title="الإجراءات المتاحة" />
              <div className="space-y-2 px-5 py-4">
                {canDecide ? (
                  <DecisionPanel
                    id={request.id}
                    code={request.code}
                    itemName={request.itemName}
                  />
                ) : null}

                {canFulfill ? (
                  <FulfillPanel
                    id={request.id}
                    code={request.code}
                    itemName={request.itemName}
                    quantity={request.quantity}
                    unit={request.unit}
                    suggestedCategoryId={request.categoryId}
                    categories={categories}
                    items={items.map((item) => ({
                      id: item.id,
                      name: item.name,
                      unit: item.unit,
                      categoryName: item.category.name,
                    }))}
                  />
                ) : null}

                {canEdit ? (
                  <>
                    <EditPanel
                      categories={categories}
                      existing={{
                        id: request.id,
                        itemName: request.itemName,
                        unit: request.unit,
                        quantity: request.quantity,
                        categoryId: request.categoryId,
                        details: request.details,
                        wasRejected: status === "REJECTED",
                      }}
                    />
                    <CancelPanel id={request.id} code={request.code} />
                  </>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="مسار الطلب" />
            <ol className="space-y-3 px-5 py-4 text-xs text-ink-500">
              <Step done label="قُدّم الطلب من الفرقة" />
              <Step
                done={status !== "PENDING"}
                label={
                  status === "REJECTED"
                    ? "رُفض — بانتظار تعديل الفرقة"
                    : "قرار قائد اللوازم"
                }
              />
              <Step
                done={status === "FULFILLED"}
                label="التوريد وإضافة الكمية للمخزون"
              />
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-5 py-2.5">
      <dt className="w-32 shrink-0 text-ink-400">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function Step({ done, label }: { done?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={
          done
            ? "size-2.5 shrink-0 rounded-full bg-forest-500"
            : "size-2.5 shrink-0 rounded-full border-2 border-line-strong"
        }
      />
      <span className={done ? "font-semibold text-ink-700" : undefined}>
        {label}
      </span>
    </li>
  );
}
