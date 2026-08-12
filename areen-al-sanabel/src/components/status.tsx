import {
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Eye,
  PackageMinus,
  PackageX,
  ShoppingCart,
  Sparkles,
  Tent,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  ROLE_LABELS,
  STOCK_LEVEL_LABELS,
  stockLevel,
  type RequestStatus,
  type RequestType,
  type Role,
} from "@/lib/domain";

type Tone = "neutral" | "amber" | "green" | "red" | "blue" | "gold";

const STATUS_STYLE: Record<RequestStatus, { tone: Tone; icon: ReactNode }> = {
  PENDING: { tone: "amber", icon: <CircleDashed className="size-3.5" /> },
  UNDER_REVIEW: { tone: "blue", icon: <Eye className="size-3.5" /> },
  APPROVED: { tone: "green", icon: <CheckCircle2 className="size-3.5" /> },
  REJECTED: { tone: "red", icon: <XCircle className="size-3.5" /> },
  CANCELLED: { tone: "neutral", icon: <CircleSlash className="size-3.5" /> },
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
  EQUIPMENT: { tone: "green", icon: <Tent className="size-3.5" /> },
  ADDITIONAL: { tone: "gold", icon: <Sparkles className="size-3.5" /> },
  PURCHASE: { tone: "amber", icon: <ShoppingCart className="size-3.5" /> },
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
  if (level === "OUT") {
    return (
      <Badge tone="red">
        <PackageX className="size-3.5" />
        {STOCK_LEVEL_LABELS.OUT}
      </Badge>
    );
  }
  if (level === "LOW") {
    return (
      <Badge tone="amber">
        <PackageMinus className="size-3.5" />
        {STOCK_LEVEL_LABELS.LOW}
      </Badge>
    );
  }
  return <Badge tone="green">{STOCK_LEVEL_LABELS.OK}</Badge>;
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
