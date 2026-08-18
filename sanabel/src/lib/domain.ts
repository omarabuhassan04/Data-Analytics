/**
 * المرجع الوحيد للأدوار والصلاحيات والحالات ونصوصها العربية.
 *
 * كل تحقّق من صلاحية في النظام يعود إلى `can()` هنا، وكل تسمية تظهر للمستخدم
 * تأتي من هذا الملف — حتى لا تتباعد الواجهة عن الخادم.
 */

/* ------------------------------------------------------------------ الأدوار */

export const ROLES = [
  "SUPPLY_LEADER",
  "GROUP_LEADER",
  "ASSISTANT_GROUP_LEADER",
  "SCOUT_LEADER",
  "TEAM_LEADER",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  SUPPLY_LEADER: "قائد اللوازم",
  GROUP_LEADER: "قائد المجموعة",
  ASSISTANT_GROUP_LEADER: "مساعد قائد المجموعة",
  SCOUT_LEADER: "قائد الكشافين",
  TEAM_LEADER: "قائد فرقة",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ الصلاحيات */

export const PERMISSIONS = [
  "inventory:read",
  "inventory:manage",
  "supply:create",
  "supply:read:own",
  "supply:read:all",
  "purchase:create",
  "purchase:read:own",
  "purchase:read:all",
  /** الاطّلاع على طلبات الشراء بعد البتّ فيها فقط — للمتابعة الإدارية */
  "purchase:read:decided",
  "purchase:decide",
  "purchase:fulfill",
  "returns:submit",
  "returns:verify",
  "users:manage",
  "activity:read:own",
  "activity:read:all",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * مصفوفة الصلاحيات. الأدوار الرقابية (قائد المجموعة ومساعده وقائد الكشافين)
 * تطّلع ولا تعدّل، ولا ترى طلبات الشراء قبل البتّ فيها.
 */
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPPLY_LEADER: [
    "inventory:read",
    "inventory:manage",
    "supply:read:all",
    "purchase:read:all",
    "purchase:decide",
    "purchase:fulfill",
    "returns:verify",
    "users:manage",
    "activity:read:all",
  ],
  GROUP_LEADER: [
    "inventory:read",
    "supply:read:all",
    "purchase:read:decided",
    "activity:read:all",
  ],
  ASSISTANT_GROUP_LEADER: [
    "inventory:read",
    "supply:read:all",
    "purchase:read:decided",
    "activity:read:all",
  ],
  SCOUT_LEADER: [
    "inventory:read",
    "supply:read:all",
    "purchase:read:decided",
    "activity:read:all",
  ],
  TEAM_LEADER: [
    "inventory:read",
    "supply:create",
    "supply:read:own",
    "purchase:create",
    "purchase:read:own",
    "returns:submit",
    "activity:read:own",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** هل يرى هذا الدور بيانات كل الفرق أم فرقته وحدها؟ */
export function seesAllTeams(role: Role): boolean {
  return role !== "TEAM_LEADER";
}

/* ------------------------------------------------------------------ الحالات */

export const SUPPLY_STATUSES = [
  "ISSUED",
  "AWAITING_VERIFICATION",
  "COMPLETED",
] as const;
export type SupplyStatus = (typeof SUPPLY_STATUSES)[number];

export const SUPPLY_STATUS_LABEL: Record<SupplyStatus, string> = {
  ISSUED: "تم الصرف — عهدة قائمة",
  AWAITING_VERIFICATION: "بانتظار التحقق",
  COMPLETED: "مكتمل",
};

export const SUPPLY_STATUS_TONE: Record<SupplyStatus, Tone> = {
  ISSUED: "info",
  AWAITING_VERIFICATION: "warn",
  COMPLETED: "ok",
};

export const PURCHASE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "FULFILLED",
  "CANCELLED",
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  PENDING: "قيد الانتظار",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
  FULFILLED: "تم التوريد",
  CANCELLED: "ملغى",
};

export const PURCHASE_STATUS_TONE: Record<PurchaseStatus, Tone> = {
  PENDING: "warn",
  APPROVED: "ok",
  REJECTED: "bad",
  FULFILLED: "ok",
  CANCELLED: "muted",
};

/** الانتقالات المسموحة لطلب الشراء — أي انتقال خارجها يُرفض بـ 409 منطقياً */
export const PURCHASE_TRANSITIONS: Record<PurchaseStatus, readonly PurchaseStatus[]> = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["FULFILLED"],
  // الرفض ليس نهاية الطريق: الفرقة تعدّل وتعيد التقديم فيعود «قيد الانتظار»
  REJECTED: ["PENDING", "CANCELLED"],
  FULFILLED: [],
  CANCELLED: [],
};

export const RETURN_STATUSES = ["AWAITING_VERIFICATION", "VERIFIED"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  AWAITING_VERIFICATION: "بانتظار التحقق",
  VERIFIED: "تم التحقق",
};

export const RETURN_STATUS_TONE: Record<ReturnStatus, Tone> = {
  AWAITING_VERIFICATION: "warn",
  VERIFIED: "ok",
};

export type Tone = "ok" | "warn" | "bad" | "info" | "muted";

/* ------------------------------------------------------------------ المخزون */

export const STOCK_REASONS = [
  "OPENING",
  "ADJUST",
  "ISSUE",
  "RETURN_GOOD",
  "RETURN_DAMAGED",
  "RETURN_LOST",
  "PURCHASE_RECEIVE",
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

export const STOCK_REASON_LABEL: Record<StockReason, string> = {
  OPENING: "رصيد افتتاحي",
  ADJUST: "تعديل جرد",
  ISSUE: "صرف عهدة",
  RETURN_GOOD: "إرجاع صالح",
  RETURN_DAMAGED: "تسجيل تالف",
  RETURN_LOST: "تسجيل مفقود",
  PURCHASE_RECEIVE: "توريد مشتريات",
};

/* ------------------------------------------------------------------ معادلة العهدة */

export type CustodyCounters = {
  quantity: number;
  returnedGood: number;
  returnedDamaged: number;
  returnedLost: number;
};

/**
 * الكمية التي ما تزال في يد الفرقة.
 *
 * معادلة واحدة يستوردها الخادم والمتصفّح معاً، فلا يمكن لرقم معروض أن يخالف
 * الرقم الذي يفرضه الخادم عند التحقّق من الإرجاع.
 */
export function outstanding(line: CustodyCounters): number {
  return (
    line.quantity - line.returnedGood - line.returnedDamaged - line.returnedLost
  );
}

export function totalOutstanding(lines: CustodyCounters[]): number {
  return lines.reduce((sum, line) => sum + outstanding(line), 0);
}

/* ------------------------------------------------------------------ سجل العمليات */

export const ACTION_LABEL: Record<string, string> = {
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  SUPPLY_SUBMIT: "طلب لوازم",
  RETURN_SUBMIT: "تقديم إرجاع",
  RETURN_VERIFY: "اعتماد إرجاع",
  PURCHASE_SUBMIT: "طلب شراء",
  PURCHASE_RESUBMIT: "إعادة تقديم طلب شراء",
  PURCHASE_APPROVE: "الموافقة على شراء",
  PURCHASE_REJECT: "رفض طلب شراء",
  PURCHASE_FULFILL: "توريد مشتريات",
  PURCHASE_CANCEL: "إلغاء طلب شراء",
  ITEM_CREATE: "إضافة صنف",
  ITEM_UPDATE: "تعديل صنف",
  ITEM_ARCHIVE: "أرشفة صنف",
  ITEM_RESTORE: "استعادة صنف",
  STOCK_ADJUST: "تعديل جرد",
  CATEGORY_CREATE: "إضافة تصنيف",
  CATEGORY_UPDATE: "تعديل تصنيف",
  USER_CREATE: "إنشاء حساب",
  USER_UPDATE: "تعديل حساب",
  USER_PASSWORD: "تغيير كلمة مرور",
};

export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/* ------------------------------------------------------------------ وحدات القياس */

export const UNITS = [
  "قطعة",
  "طقم",
  "زوج",
  "متر",
  "علبة",
  "كيس",
  "لفة",
  "صندوق",
] as const;
