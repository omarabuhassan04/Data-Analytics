import { z } from "zod";

import {
  MAX_LINE_QUANTITY,
  MAX_REQUEST_LINES,
  QC_OUTCOMES,
  REQUEST_TYPES,
  ROLES,
} from "@/lib/domain";

const trimmed = (max: number, label: string) =>
  z
    .string({ error: `${label} مطلوب` })
    .trim()
    .min(1, `${label} مطلوب`)
    .max(max, `${label} طويل جدًا`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "النص طويل جدًا")
    .optional()
    .transform((value) => (value ? value : null));

const positiveInt = (label: string, max = MAX_LINE_QUANTITY) =>
  z
    .number({ error: `${label} مطلوب` })
    .int(`${label} يجب أن يكون رقمًا صحيحًا`)
    .min(1, `${label} يجب أن يكون أكبر من صفر`)
    .max(max, `${label} يتجاوز الحد المسموح`);

const nonNegativeInt = (label: string, max = 1_000_000) =>
  z
    .number({ error: `${label} مطلوب` })
    .int(`${label} يجب أن يكون رقمًا صحيحًا`)
    .min(0, `${label} لا يمكن أن يكون سالبًا`)
    .max(max, `${label} يتجاوز الحد المسموح`);

/* ------------------------------------------------------------------ الدخول */

export const loginSchema = z.object({
  username: trimmed(60, "اسم المستخدم").toLowerCase(),
  password: z.string({ error: "كلمة المرور مطلوبة" }).min(1, "كلمة المرور مطلوبة"),
});

/* ----------------------------------------------------------------- المخزون */

export const itemCreateSchema = z.object({
  name: trimmed(120, "اسم الغرض"),
  categoryId: positiveInt("التصنيف", 1_000_000),
  unit: trimmed(30, "وحدة القياس").default("قطعة"),
  quantity: nonNegativeInt("الكمية"),
  threshold: nonNegativeInt("الحد الأدنى"),
  notes: optionalText(500),
  photoUrl: optionalText(500),
});

export const itemUpdateSchema = itemCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
  /** سبب تعديل الكمية — يُسجَّل في سجل النشاط */
  adjustmentReason: optionalText(200),
});

export const categoryCreateSchema = z.object({
  name: trimmed(80, "اسم التصنيف"),
  icon: trimmed(40, "الأيقونة").default("package"),
});

/* ----------------------------------------------------------------- الطلبات */

const requestLineSchema = z.object({
  itemId: z.number().int().positive().nullish(),
  /** يُستخدم في طلبات الشراء لغرض غير موجود في المخزون */
  itemName: z.string().trim().max(120, "اسم الغرض طويل جدًا").optional(),
  quantity: positiveInt("الكمية"),
  note: optionalText(300),
});

export const requestCreateSchema = z.object({
  type: z.enum(REQUEST_TYPES, { error: "نوع الطلب غير صالح" }),
  purpose: optionalText(500),
  neededOn: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }),
  lines: z
    .array(requestLineSchema)
    .min(1, "أضِف غرضًا واحدًا على الأقل إلى الطلب")
    .max(MAX_REQUEST_LINES, `لا يمكن تجاوز ${MAX_REQUEST_LINES} سطرًا في الطلب الواحد`),
});

export const decisionSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED"], {
    error: "الحالة المطلوبة غير صالحة",
  }),
  note: optionalText(500),
});

export const noteCreateSchema = z.object({
  body: trimmed(1000, "نص الملاحظة"),
});

/* --------------------------------------------------------------- المرتجعات */

const returnLineSchema = z
  .object({
    lineId: positiveInt("رقم السطر", 1_000_000_000),
    /** رجع سليمًا ويدخل المخزون المتاح */
    good: nonNegativeInt("الكمية السليمة", MAX_LINE_QUANTITY).default(0),
    /** رجع ويحتاج فحص جودة قبل إتاحته */
    damaged: nonNegativeInt("الكمية للفحص", MAX_LINE_QUANTITY).default(0),
    /** لم يرجع — مفقود */
    lost: nonNegativeInt("الكمية المفقودة", MAX_LINE_QUANTITY).default(0),
    note: optionalText(300),
  })
  .refine((line) => line.good + line.damaged + line.lost <= MAX_LINE_QUANTITY, {
    message: "مجموع الكميات يتجاوز الحد المسموح",
  });

export const returnCreateSchema = z.object({
  lines: z
    .array(returnLineSchema)
    .min(1, "أضِف سطرًا واحدًا على الأقل")
    .max(MAX_REQUEST_LINES, `لا يمكن تجاوز ${MAX_REQUEST_LINES} سطرًا في الاستلام الواحد`),
});

export const qcResolveSchema = z.object({
  units: positiveInt("الكمية"),
  outcome: z.enum(QC_OUTCOMES, { error: "مآل الفحص غير صالح" }),
  note: optionalText(300),
});

/* --------------------------------------------------------------- المستخدمون */

const usernameSchema = z
  .string({ error: "اسم المستخدم مطلوب" })
  .trim()
  .toLowerCase()
  .min(3, "اسم المستخدم قصير جدًا (٣ أحرف على الأقل)")
  .max(40, "اسم المستخدم طويل جدًا")
  .regex(/^[a-z0-9._-]+$/, "اسم المستخدم يقبل الحروف اللاتينية والأرقام والنقطة والشرطة فقط");

const passwordSchema = z
  .string({ error: "كلمة المرور مطلوبة" })
  .min(8, "كلمة المرور يجب ألّا تقل عن ٨ محارف")
  .max(100, "كلمة المرور طويلة جدًا");

export const userCreateSchema = z
  .object({
    username: usernameSchema,
    fullName: trimmed(80, "الاسم الكامل"),
    password: passwordSchema,
    role: z.enum(ROLES, { error: "الدور غير صالح" }),
    teamName: optionalText(80),
  })
  .refine((data) => data.role !== "TEAM_LEADER" || !!data.teamName, {
    message: "اسم الفرقة مطلوب لمسؤول الفرقة",
    path: ["teamName"],
  });

export const userUpdateSchema = z.object({
  fullName: trimmed(80, "الاسم الكامل").optional(),
  role: z.enum(ROLES, { error: "الدور غير صالح" }).optional(),
  teamName: optionalText(80),
  isActive: z.boolean().optional(),
});

export const passwordResetSchema = z.object({
  password: passwordSchema,
});
