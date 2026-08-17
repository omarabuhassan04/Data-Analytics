/** أشكال البيانات المُعادة من الـ API، كما تستهلكها الواجهة */

import type { StockLevel } from "@/lib/domain";

export type CategoryDto = {
  id: number;
  name: string;
  icon: string;
  itemCount: number;
};

export type ItemDto = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  /** محتجز في فحص الجودة — غير قابل للصرف */
  quarantine: number;
  threshold: number;
  notes: string | null;
  photoUrl: string | null;
  isActive: boolean;
  category: { id: number; name: string; icon: string };
  level: StockLevel;
};

export type RequestLineDto = {
  id: number;
  itemId: number | null;
  itemName: string;
  unit: string;
  quantity: number;
  /** عدّادات دفتر السطر — انظر lineOutstanding في lib/domain */
  deducted: number;
  released: number;
  returned: number;
  quarantined: number;
  writtenOff: number;
  note: string | null;
  item?: { id: number; quantity: number; unit: string } | null;
};

export type StockMovementDto = {
  id: number;
  itemId: number;
  reason: string;
  units: number;
  availableDelta: number;
  quarantineDelta: number;
  availableAfter: number;
  quarantineAfter: number;
  requestId: number | null;
  requestLineId: number | null;
  actorName: string;
  note: string | null;
  createdAt: string;
  item?: { id: number; name: string; unit: string };
};

export type QcLineDto = {
  id: number;
  itemId: number | null;
  itemName: string;
  unit: string;
  quarantined: number;
  request: { id: number; teamName: string; decidedAt: string | null; purpose: string | null };
  item: { id: number; name: string; quantity: number; quarantine: number } | null;
};

export type QcQueueDto = {
  lines: QcLineDto[];
  lineCount: number;
  totalUnits: number;
};

export type ReconciliationRowDto = {
  itemId: number;
  name: string;
  unit: string;
  storedAvailable: number;
  storedQuarantine: number;
  ledgerAvailable: number;
  ledgerQuarantine: number;
  availableDrift: number;
  quarantineDrift: number;
  outstanding: number;
  movementCount: number;
};

export type ReconciliationDto = {
  checkedAt: string;
  itemCount: number;
  balanced: boolean;
  driftCount: number;
  totals: {
    storedAvailable: number;
    ledgerAvailable: number;
    storedQuarantine: number;
    ledgerQuarantine: number;
    outstanding: number;
  };
  drifted: ReconciliationRowDto[];
};

export type RequestNoteDto = {
  id: number;
  body: string;
  createdAt: string;
  author: { id: number; fullName: string; role: string };
};

export type RequestDto = {
  id: number;
  type: string;
  status: string;
  teamName: string;
  purpose: string | null;
  neededOn: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  requester: { id: number; fullName: string; username: string; teamName: string | null };
  decidedBy: { id: number; fullName: string } | null;
  lines: RequestLineDto[];
  notes?: RequestNoteDto[];
  _count?: { notes: number; lines?: number };
};

export type UserDto = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  teamName: string | null;
  isActive: boolean;
  createdAt: string;
  requestCount?: number;
};

export type ActivityDto = {
  id: number;
  actorName: string;
  action: string;
  entity: string;
  entityId: number | null;
  summary: string;
  createdAt: string;
};

export type DashboardDto = {
  scope: "all" | "own";
  statusCounts: Record<string, number>;
  openCount: number;
  actionableCount: number;
  inventory: {
    totalItems: number;
    outOfStock: number;
    lowStock: number;
    quarantineUnits: number;
    alerts: {
      id: number;
      name: string;
      unit: string;
      quantity: number;
      threshold: number;
      level: StockLevel;
    }[];
  } | null;
  /** العهدة التي لم ترجع بعد */
  custody: {
    outstandingUnits: number;
    requestCount: number;
    quarantineUnits: number;
    oldest: string | null;
  };
  recentRequests: (RequestDto & { _count: { lines: number; notes: number } })[];
  recentActivity: ActivityDto[];
};
