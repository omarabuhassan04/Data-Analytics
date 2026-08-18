"use client";

import { useEffect } from "react";

import { Alert, Button, Card, LinkButton } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[صفحة] خطأ غير متوقّع:", error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg p-6 text-center">
      <h1 className="text-lg font-bold text-ink-900">تعذّر عرض هذه الصفحة</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        حدث خطأ أثناء تحميل البيانات. لم يتغيّر شيء في السجلات.
      </p>

      {error.digest ? (
        <Alert tone="muted" className="mt-4 text-xs">
          رمز الخطأ: <span dir="ltr">{error.digest}</span>
        </Alert>
      ) : null}

      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset}>إعادة المحاولة</Button>
        <LinkButton href="/" variant="outline">
          الصفحة الرئيسية
        </LinkButton>
      </div>
    </Card>
  );
}
