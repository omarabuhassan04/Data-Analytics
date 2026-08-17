"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

import { IconForward, IconLantern, IconReturn } from "@/components/icons";
import { useSessionUser } from "@/components/session";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorBlock,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  Stat,
} from "@/components/ui";
import { apiPost, errorMessage } from "@/lib/client";
import { can, lineOutstanding, QC_OUTCOME_LABELS, type QcOutcome } from "@/lib/domain";
import { formatNumber, formatRelative } from "@/lib/format";
import { revalidateStock } from "@/lib/revalidate";
import type { QcQueueDto, RequestDto } from "@/lib/types";

export default function ReturnsPage() {
  const user = useSessionUser();

  const requests = useSWR<{ requests: RequestDto[] }>(
    "/api/requests?status=APPROVED&type=EQUIPMENT",
  );
  const qc = useSWR<QcQueueDto>("/api/inventory/qc");

  const canResolve = can(user.role, "inventory:returns");

  // العهدة المفتوحة: طلبات مقبولة ما زال فيها وحدات لم ترجع
  const openCustody = (requests.data?.requests ?? [])
    .map((request) => ({
      request,
      outstanding: request.lines.reduce((sum, line) => sum + lineOutstanding(line), 0),
    }))
    .filter((row) => row.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const outstandingUnits = openCustody.reduce((sum, row) => sum + row.outstanding, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="المرتجعات" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat
          icon={<IconReturn className="size-4" />}
          label="عهدة لم ترجع"
          value={formatNumber(outstandingUnits)}
          suffix="وحدة"
          tone={outstandingUnits > 0 ? "warm" : "good"}
        />
        <Stat
          icon={<IconReturn className="size-4" />}
          label="طلبات مفتوحة"
          value={formatNumber(openCustody.length)}
        />
        <Stat
          icon={<IconLantern className="size-4" />}
          label="محتجز بالفحص"
          value={formatNumber(qc.data?.totalUnits ?? 0)}
          suffix="وحدة"
          tone={(qc.data?.totalUnits ?? 0) > 0 ? "warm" : "neutral"}
        />
      </div>

      {/* ---------------------------------------------------- العهدة المفتوحة */}
      <Card className="overflow-hidden">
        <CardHeader title="عهدة في يد الفرق" icon={<IconReturn className="size-5" />} />

        {requests.error && (
          <div className="p-4">
            <ErrorBlock message={errorMessage(requests.error)} />
          </div>
        )}
        {requests.isLoading && !requests.data && <LoadingBlock />}

        {requests.data && openCustody.length === 0 && (
          <EmptyState icon={<IconReturn className="size-6" />} title="لا عهدة معلّقة" />
        )}

        {openCustody.length > 0 && (
          <ul className="divide-y divide-sand-200">
            {openCustody.map(({ request, outstanding }) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-sand-200 sm:px-5"
                >
                  <span className="tabular grid size-9 shrink-0 place-items-center rounded-lg bg-sand-200 text-sm font-bold text-ink-600">
                    {request.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink-800">
                      {request.teamName}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-400">
                      {request.purpose || `${request.lines.length} صنف`}
                      {request.decidedAt && ` · سُلّم ${formatRelative(request.decidedAt)}`}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-bold text-ember-300">
                    {formatNumber(outstanding)} وحدة
                  </span>
                  <IconForward className="size-4 shrink-0 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ------------------------------------------------------ فحص الجودة */}
      <Card className="overflow-hidden">
        <CardHeader title="فحص الجودة" icon={<IconLantern className="size-5" />} />

        {qc.error && (
          <div className="p-4">
            <ErrorBlock message={errorMessage(qc.error)} />
          </div>
        )}
        {qc.isLoading && !qc.data && <LoadingBlock />}

        {qc.data && qc.data.lines.length === 0 && (
          <EmptyState icon={<IconLantern className="size-6" />} title="لا وحدات محتجزة" />
        )}

        {qc.data && qc.data.lines.length > 0 && (
          <ul className="divide-y divide-sand-200">
            {qc.data.lines.map((line) => (
              <QcRow
                key={line.id}
                line={line}
                canResolve={canResolve}
                onDone={() => {
                  void qc.mutate();
                  void requests.mutate();
                }}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------ سطر الفحص */

function QcRow({
  line,
  canResolve,
  onDone,
}: {
  line: QcQueueDto["lines"][number];
  canResolve: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const [units, setUnits] = useState(String(line.quarantined));
  const [outcome, setOutcome] = useState<QcOutcome>("RELEASE");
  const [busy, setBusy] = useState(false);

  const parsed = Number(units);
  const valid = Number.isInteger(parsed) && parsed > 0 && parsed <= line.quarantined;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      await apiPost(`/api/inventory/qc/${line.id}`, { units: parsed, outcome });
      toast.success(
        outcome === "RELEASE"
          ? `أُعيدت ${formatNumber(parsed)} ${line.unit} إلى المخزون`
          : `شُطبت ${formatNumber(parsed)} ${line.unit}`,
      );
      await revalidateStock();
      onDone();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-end gap-3 px-4 py-3.5 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink-900">{line.itemName}</p>
        <p className="mt-0.5 text-xs text-ink-400">
          <Link href={`/requests/${line.request.id}`} className="hover:underline">
            طلب {line.request.id}
          </Link>{" "}
          · {line.request.teamName} ·{" "}
          <span className="tabular font-bold text-sky-700">
            {formatNumber(line.quarantined)} {line.unit}
          </span>
        </p>
      </div>

      {canResolve && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            max={line.quarantined}
            dir="ltr"
            aria-label={`الكمية من ${line.itemName}`}
            value={units}
            onChange={(event) => setUnits(event.target.value)}
            className="h-9 w-20 px-2 py-1 text-center"
          />
          <Select
            aria-label={`مآل الفحص لـ ${line.itemName}`}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as QcOutcome)}
            className="h-9 w-48 py-1"
          >
            <option value="RELEASE">{QC_OUTCOME_LABELS.RELEASE}</option>
            <option value="WRITE_OFF">{QC_OUTCOME_LABELS.WRITE_OFF}</option>
          </Select>
          <Button size="sm" onClick={submit} loading={busy} disabled={!valid}>
            تأكيد
          </Button>
        </div>
      )}
    </li>
  );
}
