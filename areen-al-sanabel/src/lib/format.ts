/**
 * تنسيق عربي موحّد.
 *
 * ملاحظة مقصودة: تُعرض الأرقام بالمحارف اللاتينية (0-9) وليس بالأرقام الهندية،
 * لأن النظام يُستخدم لمسح الكميات بسرعة تحت ضغط الوقت، والخلط بين
 * نظامَي الترقيم يبطئ القراءة. أسماء الشهور والأيام تبقى بالعربية.
 */

const LOCALE = "ar-JO-u-nu-latn";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

/** «قبل ٣ ساعات» / «خلال يومين» */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const diff = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }
  return "الآن";
}

/** يُدخِل قيمة تاريخ صالحة لحقل <input type="date"> */
export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
