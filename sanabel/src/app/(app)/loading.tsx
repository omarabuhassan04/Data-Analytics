/**
 * حالة التحميل بين المسارات.
 *
 * هياكل بأبعاد المحتوى القادم تقريباً، فلا تقفز الصفحة عند وصول البيانات.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy aria-label="جارٍ التحميل">
      <div className="mb-6">
        <div className="h-4 w-28 rounded bg-line" />
        <div className="mt-2 h-7 w-64 rounded bg-line" />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface h-28" />
        ))}
      </div>

      <div className="surface h-80" />
    </div>
  );
}
