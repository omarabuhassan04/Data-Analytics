/**
 * التنسيق العربي.
 *
 * الأرقام تُعرض بالأرقام العربية الشرقية (١٢٣) لأن الواجهة عربية بالكامل،
 * والتاريخ بالتقويم الميلادي بأسماء الشهور العربية — وهو المستخدم عملياً في
 * العمل الكشفي بالأردن.
 */

const numberFormat = new Intl.NumberFormat("ar-EG");

const dateFormat = new Intl.DateTimeFormat("ar-EG", {
  year: "numeric",
  month: "long",
  day: "numeric",
  numberingSystem: "arab",
  calendar: "gregory",
});

const dateTimeFormat = new Intl.DateTimeFormat("ar-EG", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  numberingSystem: "arab",
  calendar: "gregory",
});

const shortDateFormat = new Intl.DateTimeFormat("ar-EG", {
  month: "short",
  day: "numeric",
  numberingSystem: "arab",
  calendar: "gregory",
});

export function num(value: number): string {
  return numberFormat.format(value);
}

export function formatDate(value: Date | string): string {
  return dateFormat.format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormat.format(new Date(value));
}

export function formatShortDate(value: Date | string): string {
  return shortDateFormat.format(new Date(value));
}

/** «قبل ٣ ساعات» — للسجلات الحديثة حيث الفارق أهم من التاريخ المطلق */
export function relativeTime(value: Date | string): string {
  const then = new Date(value).getTime();
  const diffSeconds = Math.round((Date.now() - then) / 1000);

  if (diffSeconds < 60) return "قبل لحظات";

  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
    [604800, "week"],
  ];

  const rtf = new Intl.RelativeTimeFormat("ar-EG", { numeric: "auto" });

  for (let i = units.length - 1; i >= 0; i--) {
    const [seconds, unit] = units[i];
    if (diffSeconds >= seconds) {
      return rtf.format(-Math.floor(diffSeconds / seconds), unit);
    }
  }
  return formatShortDate(value);
}

/** صيغة الجمع العربية للوحدات: قطعة / قطعتان / ٥ قطع */
export function withUnit(quantity: number, unit: string): string {
  return `${num(quantity)} ${unit}`;
}

/** تحويل قيمة حقل نصّي إلى عدد صحيح موجب، أو null إن كانت غير صالحة */
export function toPositiveInt(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const text = String(value).trim();
  if (text === "") return null;
  // قبول الأرقام العربية الشرقية كما تُكتب على لوحات المفاتيح العربية
  const normalized = text.replace(/[٠-٩]/g, (d) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(d)),
  );
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
