import type { ReactNode } from "react";

import {
  IconApproved,
  IconCairn,
  IconCancelled,
  IconLantern,
  IconLens,
  IconProcure,
  IconRejected,
  IconRestock,
  IconReturn,
  IconTent,
} from "@/components/icons";
import { Badge } from "@/components/ui";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  ROLE_LABELS,
  SETTLEMENT_LABELS,
  STOCK_LEVEL_LABELS,
  settlementState,
  stockLevel,
  type LineLedger,
  type RequestStatus,
  type RequestType,
  type Role,
} from "@/lib/domain";

type Tone = "neutral" | "amber" | "green" | "red" | "blue" | "gold";

const ICON = "size-3.5";

const STATUS_STYLE: Record<RequestStatus, { tone: Tone; icon: ReactNode }> = {
  PENDING: { tone: "amber", icon: <IconCairn className={ICON} /> },
  UNDER_REVIEW: { tone: "blue", icon: <IconLens className={ICON} /> },
  APPROVED: { tone: "green", icon: <IconApproved className={ICON} /> },
  REJECTED: { tone: "red", icon: <IconRejected className={ICON} /> },
  CANCELLED: { tone: "neutral", icon: <IconCancelled className={ICON} /> },
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status in STATUS_STYLE ? status : "PENDING") as RequestStatus;
  const style = STATUS_STYLE[key];
  return (
    <Badge tone={style.tone}>
      {style.icon}
      {REQUEST_STATUS_LABELS[key]}
    </Badge>
  );
}

const TYPE_STYLE: Record<RequestType, { tone: Tone; icon: ReactNode }> = {
  EQUIPMENT: { tone: "green", icon: <IconTent className={ICON} /> },
  ADDITIONAL: { tone: "gold", icon: <IconRestock className={ICON} /> },
  PURCHASE: { tone: "amber", icon: <IconProcure className={ICON} /> },
};

export function TypeBadge({ type }: { type: string }) {
  const key = (type in TYPE_STYLE ? type : "EQUIPMENT") as RequestType;
  const style = TYPE_STYLE[key];
  return (
    <Badge tone={style.tone}>
      {style.icon}
      {REQUEST_TYPE_LABELS[key]}
    </Badge>
  );
}

export function StockBadge({
  quantity,
  threshold,
}: {
  quantity: number;
  threshold: number;
}) {
  const level = stockLevel(quantity, threshold);
  if (level === "OUT") return <Badge tone="red">{STOCK_LEVEL_LABELS.OUT}</Badge>;
  if (level === "LOW") return <Badge tone="amber">{STOCK_LEVEL_LABELS.LOW}</Badge>;
  return <Badge tone="green">{STOCK_LEVEL_LABELS.OK}</Badge>;
}

/** حالة تسوية سطر عهدة — رجع كليًا أم جزئيًا أم لم يرجع */
export function SettlementBadge({ line }: { line: LineLedger }) {
  const state = settlementState(line);
  if (state === "FULL") {
    return (
      <Badge tone="green">
        <IconApproved className={ICON} />
        {SETTLEMENT_LABELS.FULL}
      </Badge>
    );
  }
  if (state === "PARTIAL") {
    return (
      <Badge tone="amber">
        <IconReturn className={ICON} />
        {SETTLEMENT_LABELS.PARTIAL}
      </Badge>
    );
  }
  return (
    <Badge tone="neutral">
      <IconCairn className={ICON} />
      {SETTLEMENT_LABELS.NONE}
    </Badge>
  );
}

/** وحدات محتجزة بفحص الجودة */
export function QuarantineBadge({ units, unit }: { units: number; unit: string }) {
  if (units <= 0) return null;
  return (
    <Badge tone="blue">
      <IconLantern className={ICON} />
      {units} {unit} بالفحص
    </Badge>
  );
}

const ROLE_TONE: Record<Role, Tone> = {
  SUPPLIES_LEADER: "amber",
  TEAM_LEADER: "green",
  GROUP_LEADER: "blue",
  DEPUTY_GROUP_LEADER: "blue",
  SCOUTS_LEADER: "gold",
};

export function RoleBadge({ role }: { role: string }) {
  const key = (role in ROLE_LABELS ? role : "TEAM_LEADER") as Role;
  return <Badge tone={ROLE_TONE[key]}>{ROLE_LABELS[key]}</Badge>;
}
