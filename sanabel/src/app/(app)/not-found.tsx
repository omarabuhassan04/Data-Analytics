import { Card, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <p className="text-3xl font-bold text-forest-700">٤٠٤</p>
      <h1 className="mt-2 text-lg font-bold text-ink-900">السجل غير موجود</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        الصفحة التي طلبتها غير موجودة، أو أنها تخصّ فرقة أخرى ولا تملك صلاحية
        الاطّلاع عليها.
      </p>
      <LinkButton href="/" className="mt-5">
        الصفحة الرئيسية
      </LinkButton>
    </Card>
  );
}
