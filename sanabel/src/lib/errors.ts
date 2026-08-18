/**
 * أخطاء التطبيق. كل خطأ يحمل رسالة عربية جاهزة للعرض، فلا تصل رسالة تقنية
 * إنجليزية إلى المستخدم النهائي أبداً.
 */

/**
 * كل مسارات التطبيق ديناميكية (تعتمد على جلسة المستخدم)، فتُبنى مع كل طلب
 * ولا توجد نسخة مخزّنة تحتاج إبطالاً. إبطال التخطيط كاملاً بعد كل عملية كان
 * يجبر الشجرة كلها على إعادة التصيير في استجابة الإجراء بلا فائدة.
 * تحديث ما يراه المستخدم يتم عبر router.refresh() في المكوّن الذي نفّذ العملية.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; field?: string };

export class AppError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** المستخدم غير مسجّل الدخول */
export class UnauthenticatedError extends AppError {
  constructor() {
    super("انتهت الجلسة. يرجى تسجيل الدخول من جديد.");
    this.name = "UnauthenticatedError";
  }
}

/** المستخدم مسجّل لكن لا يملك الصلاحية */
export class ForbiddenError extends AppError {
  constructor(message = "لا تملك صلاحية تنفيذ هذا الإجراء.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "السجل المطلوب غير موجود.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** حالة السجل لا تسمح بهذا الانتقال */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * يغلّف إجراءً على الخادم فيحوّل أي خطأ إلى نتيجة منظّمة.
 *
 * الأخطاء المعروفة تُعاد برسالتها العربية؛ وأي خطأ غير متوقّع يُسجَّل في
 * سجلّ الخادم ويُعاد للمستخدم برسالة عامة، حتى لا تتسرّب تفاصيل داخلية.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: error.message, field: error.field };
    }
    // إعادة توجيه Next.js تُرمى كخطأ ويجب أن تمرّ كما هي
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw error;
    }
    console.error("[action] خطأ غير متوقّع:", error);
    return {
      ok: false,
      error: "حدث خطأ غير متوقّع. يرجى المحاولة مرة أخرى.",
    };
  }
}
