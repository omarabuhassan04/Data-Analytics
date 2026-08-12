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
  deducted: number;
  note: string | null;
  item?: { id: number; quantity: number; unit: string } | null;
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
    alerts: {
      id: number;
      name: string;
      unit: string;
      quantity: number;
      threshold: number;
      level: StockLevel;
    }[];
  } | null;
  recentRequests: (RequestDto & { _count: { lines: number; notes: number } })[];
  recentActivity: ActivityDto[];
};
