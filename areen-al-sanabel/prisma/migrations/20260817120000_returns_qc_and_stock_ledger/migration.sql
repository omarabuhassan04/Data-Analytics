-- تتبّع المرتجعات وفحص الجودة + دفتر حركة المخزون
-- Returned-order tracking, QC quarantine, and the stock movement ledger.

-- ---------------------------------------------------------------- الأغراض
-- كمية محتجزة في فحص الجودة: موجودة في المقر لكنها غير قابلة للصرف.
ALTER TABLE "Item" ADD COLUMN "quarantine" INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------ أسطر الطلب
-- عدّادات تراكمية. الكمية المعلّقة تُحسب بالطرح ولا تُخزَّن.
ALTER TABLE "RequestLine" ADD COLUMN "released"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RequestLine" ADD COLUMN "returned"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RequestLine" ADD COLUMN "quarantined" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RequestLine" ADD COLUMN "writtenOff"  INTEGER NOT NULL DEFAULT 0;

-- الإصدار السابق كان يصفّر "deducted" عند الرفض/الإلغاء، فيضيع أثر ما خرج
-- ورجع. نستعيد الحقيقة المحاسبية: كل سطر عهدة خُصمت كميته وقت التقديم،
-- وما رُفض أو أُلغي يُسجَّل بصفته «فكّ حجز» بدل تصفير الخصم.
UPDATE "RequestLine" AS rl
SET "deducted" = rl."quantity",
    "released" = rl."quantity"
FROM "Request" AS r
WHERE r."id" = rl."requestId"
  AND r."type" = 'EQUIPMENT'
  AND rl."itemId" IS NOT NULL
  AND rl."deducted" = 0
  AND r."status" IN ('REJECTED', 'CANCELLED');

-- ------------------------------------------------------- دفتر حركة المخزون
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "availableDelta" INTEGER NOT NULL DEFAULT 0,
    "quarantineDelta" INTEGER NOT NULL DEFAULT 0,
    "availableAfter" INTEGER NOT NULL,
    "quarantineAfter" INTEGER NOT NULL,
    "requestId" INTEGER,
    "requestLineId" INTEGER,
    "actorId" INTEGER,
    "actorName" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_itemId_createdAt_idx" ON "StockMovement"("itemId", "createdAt");
CREATE INDEX "StockMovement_requestId_idx" ON "StockMovement"("requestId");
CREATE INDEX "StockMovement_requestLineId_idx" ON "StockMovement"("requestLineId");
CREATE INDEX "StockMovement_reason_idx" ON "StockMovement"("reason");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_requestLineId_fkey"
    FOREIGN KEY ("requestLineId") REFERENCES "RequestLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- --------------------------------------------------------- رصيد الافتتاح
-- المطابقة تشترط أن مجموع الدفتر يساوي الرصيد المخزَّن. الأغراض الموجودة
-- قبل الدفتر تحتاج قيد افتتاح بقيمة رصيدها الحالي، وإلا ظهرت كلها كفروق.
INSERT INTO "StockMovement" (
    "itemId", "reason", "units", "availableDelta", "quarantineDelta",
    "availableAfter", "quarantineAfter", "actorName", "note", "createdAt"
)
SELECT
    i."id",
    'OPENING',
    i."quantity",
    i."quantity",
    0,
    i."quantity",
    0,
    'النظام',
    'رصيد افتتاحي عند تشغيل دفتر الحركة',
    i."createdAt"
FROM "Item" AS i;
