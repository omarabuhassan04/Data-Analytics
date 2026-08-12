import { cn } from "@/lib/cn";
import { GROUP_NAME } from "@/lib/domain";

/**
 * مسار ملف الشعار — الموضع الوحيد الذي يُعدَّل عند استبدال الشعار.
 *
 * الملف الحالي public/logo.svg رسم متجهي مطابق للتصميم الرسمي.
 * لاستخدام ملف الشعار الأصلي بدلًا منه:
 *   ١) ضع الملف في مجلد public/ (مثال: public/logo.png)
 *   ٢) غيّر القيمة أدناه إلى "/logo.png"
 * لا حاجة لأي تعديل آخر — يُستخدم هذا الثابت في الشريط العلوي وصفحة الدخول
 * وأيقونة المتصفح.
 */
export const LOGO_SRC = "/logo.svg";

export function Logo({
  size = 40,
  className,
  decorative = true,
}: {
  size?: number;
  className?: string;
  /** اجعلها false عندما يكون الشعار هو العنصر المعرِّف الوحيد على الصفحة */
  decorative?: boolean;
}) {
  return (
    // الشعار ملف محلي (SVG أو صورة) — <img> أنسب هنا من next/image
    // لأن ملفات SVG لا تمرّ بمُحسّن الصور أصلًا.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt={decorative ? "" : `شعار ${GROUP_NAME}`}
      aria-hidden={decorative || undefined}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
