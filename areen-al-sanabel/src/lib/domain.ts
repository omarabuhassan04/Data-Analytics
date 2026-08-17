/**
 * نموذج المجال والصلاحيات — عرين السنابل
 *
 * هذا الملف هو المصدر الوحيد للحقيقة بخصوص الأدوار والصلاحيات.
 * تُفرض الصلاحيات على الخادم في كل مسار API — الواجهة الأمامية ليست حدًّا أمنيًا.
 */

/* ----------------------------------------------------------------- الأدوار */

export const ROLES = [
  "SUPPLIES_LEADER",
  "TEAM_LEADER",
  "GROUP_LEADER",
  "DEPUTY_GROUP_LEADER",
  "SCOUTS_LEADER",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPPLIES_LEADER: "قائد اللوازم",
  TEAM_LEADER: "مسؤول فرقة",
  GROUP_LEADER: "قائد المجموعة",
  DEPUTY_GROUP_LEADER: "مساعد قائد المجموعة",
  SCOUTS_LEADER: "قائد الكشافين",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/* --------------------------------------------------------------- الصلاحيات */

export const PERMISSIONS = [
  /** عرض المخزون */
  "inventory:read",
  /** إضافة/تعديل/حذف الأغراض والتصنيفات وتعديل الكميات */
  "inventory:write",
  /** تقديم طلب (عهدة / كمية إضافية / شراء) */
  "requests:create",
  /** عرض طلباته هو فقط */
  "requests:read:own",
  /** عرض طلبات جميع الفرق */
  "requests:read:all",
  /** القبول أو الرفض */
  "requests:decide",
  /** إلغاء طلبه ما دام قيد الانتظار */
  "requests:cancel:own",
  /** استلام المرتجعات والبتّ في فحص الجودة */
  "inventory:returns",
  /** إضافة ملاحظة على طلب */
  "requests:note",
  /** إنشاء وإدارة حسابات المستخدمين */
  "users:manage",
  /** الاطلاع على سجل النشاط */
  "activity:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * مصفوفة الأدوار والصلاحيات.
 * كل ما لا يُذكر هنا صراحةً فهو ممنوع.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // المالك/المسؤول الكامل
  SUPPLIES_LEADER: [
    "inventory:read",
    "inventory:write",
    "inventory:returns",
    "requests:read:all",
    "requests:decide",
    "requests:note",
    "users:manage",
    "activity:read",
  ],

  // مسؤول الفرقة — يطلب ويرى طلباته فقط
  TEAM_LEADER: [
    "inventory:read",
    "requests:create",
    "requests:read:own",
    "requests:cancel:own",
  ],

  // قائد المجموعة — اطّلاع كامل فقط
  GROUP_LEADER: ["inventory:read", "requests:read:all", "activity:read"],

  // مساعد قائد المجموعة — اطّلاع كامل فقط
  DEPUTY_GROUP_LEADER: ["inventory:read", "requests:read:all", "activity:read"],

  // قائد الكشافين — اطّلاع كامل + ملاحظات على طلبات العهدة
  SCOUTS_LEADER: [
    "inventory:read",
    "requests:read:all",
    "requests:note",
    "activity:read",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * قائد الكشافين يملك صلاحية الملاحظات على طلبات العهدة فقط،
 * بينما قائد اللوازم يستطيع التعليق على أي نوع طلب.
 */
export function canNoteOnRequestType(role: Role, type: RequestType): boolean {
  if (!can(role, "requests:note")) return false;
  if (role === "SCOUTS_LEADER") return type === "EQUIPMENT";
  return true;
}

/* ------------------------------------------------------------ أنواع الطلبات */

export const REQUEST_TYPES = ["EQUIPMENT", "ADDITIONAL", "PURCHASE"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  EQUIPMENT: "طلب عهدة",
  ADDITIONAL: "طلب كمية إضافية",
  PURCHASE: "طلب شراء",
};

/* ------------------------------------------------------------- حالات الطلب */

export const REQUEST_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "قيد الانتظار",
  UNDER_REVIEW: "قيد المراجعة",
  APPROVED: "مقبول",
  REJECTED: "مرفوض",
  CANCELLED: "ملغى",
};

/** الحالات التي ما زال الطلب فيها "مفتوحًا" ويحجز كمية من المخزون */
export const OPEN_STATUSES: readonly RequestStatus[] = ["PENDING", "UNDER_REVIEW"];

export function isOpenStatus(status: string): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}

/**
 * انتقالات الحالة المسموح بها.
 * القرار (قبول/رفض) متاح فقط ما دام الطلب مفتوحًا،
 * والإلغاء متاح لصاحب الطلب ما دام قيد الانتظار أو المراجعة.
 */
export const ALLOWED_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/* --------------------------------------------------------- المرتجعات والجودة */

/** حالة الوحدة الراجعة كما يسجّلها قائد اللوازم عند الاستلام */
export const RETURN_CONDITIONS = ["GOOD", "DAMAGED", "LOST"] as const;
export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

export const RETURN_CONDITION_LABELS: Record<ReturnCondition, string> = {
  GOOD: "سليم",
  DAMAGED: "يحتاج فحصًا",
  LOST: "مفقود",
};

/** مآل الوحدة بعد فحص الجودة */
export const QC_OUTCOMES = ["RELEASE", "WRITE_OFF"] as const;
export type QcOutcome = (typeof QC_OUTCOMES)[number];

export const QC_OUTCOME_LABELS: Record<QcOutcome, string> = {
  RELEASE: "صالح — يعود للمخزون",
  WRITE_OFF: "تالف — يُشطب",
};

/* ------------------------------------------------------ دفتر حركة المخزون */

export const MOVEMENT_REASONS = [
  "OPENING",
  "RECEIVE",
  "ADJUST",
  "RESERVE",
  "RELEASE",
  "RETURN",
  "QC_HOLD",
  "QC_RELEASE",
  "QC_WRITE_OFF",
  "WRITE_OFF",
] as const;

export type MovementReason = (typeof MOVEMENT_REASONS)[number];

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  OPENING: "رصيد افتتاحي",
  RECEIVE: "توريد",
  ADJUST: "تعديل جرد",
  RESERVE: "حجز لطلب",
  RELEASE: "فكّ حجز",
  RETURN: "إرجاع للمخزون",
  QC_HOLD: "احتجاز للفحص",
  QC_RELEASE: "إنهاء فحص — صالح",
  QC_WRITE_OFF: "إنهاء فحص — شطب",
  WRITE_OFF: "شطب مفقود",
};

/* ---------------------------------------------------- حساب الكمية المعلّقة */

/**
 * أعمدة السطر التي تدخل في معادلة الرصيد.
 * نوع مفتوح حتى يعمل مع سجل Prisma ومع الـ DTO في الواجهة على حدّ سواء.
 */
export type LineLedger = {
  deducted: number;
  released: number;
  returned: number;
  quarantined: number;
  writtenOff: number;
};

/**
 * الكمية التي ما زالت في يد الفرقة ولم تُسوَّ بعد.
 *
 * هذه هي المعادلة الوحيدة المعتمدة في النظام — الخادم والواجهة يستدعيانها
 * كلاهما، فلا يمكن أن يختلف رقمٌ معروض عن رقمٍ محسوب.
 */
export function lineOutstanding(line: LineLedger): number {
  return (
    line.deducted - line.released - line.returned - line.quarantined - line.writtenOff
  );
}

/** إجمالي ما سُوِّي من السطر (رجع أو احتُجز أو شُطب) */
export function lineSettled(line: LineLedger): number {
  return line.returned + line.quarantined + line.writtenOff;
}

/** هل انتهت تسوية السطر بالكامل؟ */
export function isLineSettled(line: LineLedger): boolean {
  return lineOutstanding(line) <= 0;
}

/** حالة تسوية السطر لعرضها في الواجهة */
export type SettlementState = "NONE" | "PARTIAL" | "FULL";

export function settlementState(line: LineLedger): SettlementState {
  if (lineOutstanding(line) <= 0) return "FULL";
  return lineSettled(line) > 0 ? "PARTIAL" : "NONE";
}

export const SETTLEMENT_LABELS: Record<SettlementState, string> = {
  NONE: "لم يرجع",
  PARTIAL: "رجع جزئيًا",
  FULL: "مكتمل",
};

/* ----------------------------------------------------------------- المخزون */

export type StockLevel = "OUT" | "LOW" | "OK";

export function stockLevel(quantity: number, threshold: number): StockLevel {
  if (quantity <= 0) return "OUT";
  if (threshold > 0 && quantity <= threshold) return "LOW";
  return "OK";
}

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  OUT: "نفد المخزون",
  LOW: "كمية منخفضة",
  OK: "متوفّر",
};

/* -------------------------------------------------------- ثوابت عامة للتطبيق */

export const GROUP_NAME = "عرين السنابل";
export const GROUP_TAGLINE = "نظام إدارة عتاد المقر والمشتريات";

/** الحد الأقصى لعدد الأسطر في الطلب الواحد — حماية من الطلبات العبثية */
export const MAX_REQUEST_LINES = 60;
/** الحد الأقصى للكمية في السطر الواحد */
export const MAX_LINE_QUANTITY = 10_000;
