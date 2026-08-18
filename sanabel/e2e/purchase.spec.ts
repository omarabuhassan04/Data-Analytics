import { expect, test } from "@playwright/test";

import { ACCOUNTS, login, logout, readAvailable } from "./helpers";

async function createPurchase(
  page: import("@playwright/test").Page,
  itemName: string,
  quantity: number,
  details: string,
) {
  await page.goto("/purchase/new");
  await page.getByLabel("اسم الصنف المطلوب").fill(itemName);
  await page.getByLabel("الكمية", { exact: false }).first().fill(String(quantity));
  await page.getByLabel("التفاصيل والمبرّر").fill(details);
  await page.getByRole("button", { name: "تقديم طلب الشراء" }).click();
  await expect(page).toHaveURL(/\/purchase\/\d+$/);
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  return { code: heading.replace("طلب الشراء", "").trim(), url: page.url() };
}

test.describe("مسار طلب الشراء", () => {
  test("مسار كامل: تقديم ← رفض ← تعديل ← إعادة تقديم ← موافقة ← توريد", async ({
    page,
  }) => {
    // اسم فريد لكل تشغيل: الصنف يُنشأ عند التوريد، فلا يتراكم بين التشغيلات
    const ITEM = `حبل تسلّق ${Date.now()}`;

    // 1) الفرقة تقدّم طلب شراء — يبدأ قيد الانتظار ولا يمسّ المخزون
    await login(page, ACCOUNTS.ashbal);
    const { code, url } = await createPurchase(page, ITEM, 6, "حبال أطول للتسلّق");
    await expect(page.getByText("قيد الانتظار")).toBeVisible();

    // 2) قائد اللوازم يرفض مع ذكر السبب
    await logout(page);
    await login(page, ACCOUNTS.supply);
    await page.goto(url);
    await page.getByRole("button", { name: "رفض", exact: true }).click();
    await page.getByLabel("سبب الرفض").fill("الكمية أكبر من الحاجة، أعِد التقديم بعدد ٢");
    await page.getByRole("button", { name: "تأكيد الرفض" }).click();
    await expect(page.getByRole("button", { name: "رفض", exact: true })).toBeHidden();
    await expect(page.getByText("الكمية أكبر من الحاجة")).toBeVisible();

    // 3) الفرقة تعدّل وتعيد التقديم
    await logout(page);
    await login(page, ACCOUNTS.ashbal);
    await page.goto(url);
    await expect(page.getByText("عالج السبب ثم عدّل الطلب وأعِد تقديمه.")).toBeVisible();
    await page.getByRole("button", { name: "تعديل وإعادة التقديم" }).click();
    await page.getByLabel("الكمية", { exact: false }).first().fill("2");
    await page.getByRole("button", { name: "حفظ وإعادة التقديم" }).click();

    await expect(page.getByText("قيد الانتظار")).toBeVisible();
    await expect(page.getByText("مراجعة ١")).toBeVisible();

    // 4) قائد اللوازم يوافق
    await logout(page);
    await login(page, ACCOUNTS.supply);
    await page.goto(url);
    await page.getByRole("button", { name: "موافقة", exact: true }).click();
    await page.getByRole("button", { name: "تأكيد الموافقة" }).click();
    // زر التوريد لا يظهر إلا بعد اعتماد الطلب فعلاً
    await expect(page.getByRole("button", { name: "تسجيل التوريد" })).toBeVisible();

    // 5) الآن يظهر للأدوار الرقابية
    await logout(page);
    await login(page, ACCOUNTS.group);
    await page.goto("/purchase");
    await expect(page.getByText(code)).toBeVisible();

    // 6) التوريد يضيف الكمية إلى المخزون — وهنا فقط يتغيّر الرصيد
    await logout(page);
    await login(page, ACCOUNTS.supply);
    await page.goto(url);
    await page.getByRole("button", { name: "تسجيل التوريد" }).click();
    await page.getByLabel("الكمية المستلمة").fill("2");
    await page.getByLabel("تصنيف الصنف الجديد").selectOption({ label: "الحبال والعقد" });
    await page.getByRole("button", { name: "تأكيد التوريد" }).click();
    // اختفاء الزر يعني أن العملية اكتملت وأُعيد تصيير الصفحة بالحالة الجديدة
    await expect(page.getByRole("button", { name: "تسجيل التوريد" })).toBeHidden();

    expect(await readAvailable(page, ITEM)).toBe(2);
  });

  test("الرفض بلا سبب مرفوض — الفرقة تحتاج ما تعالجه", async ({ page }) => {
    await login(page, ACCOUNTS.kashaf);
    const { url } = await createPurchase(page, "صافرة قيادة", 5, "للتدريب");

    await logout(page);
    await login(page, ACCOUNTS.supply);
    await page.goto(url);
    await page.getByRole("button", { name: "رفض", exact: true }).click();
    await page.getByRole("button", { name: "تأكيد الرفض" }).click();
    await expect(page.getByText("سبب الرفض مطلوب حتى تتمكّن الفرقة من التعديل.")).toBeVisible();
  });

  test("الأدوار الرقابية لا ترى الطلب قبل البتّ فيه", async ({ page }) => {
    await login(page, ACCOUNTS.motaqadem);
    const { code, url } = await createPurchase(page, "بوصلة ملاحة", 8, "للتوجيه");

    await logout(page);
    await login(page, ACCOUNTS.assistant);
    await page.goto("/purchase");
    await expect(page.getByText(code)).toHaveCount(0);
    await expect(page.getByText("دورك رقابي")).toBeVisible();

    await page.goto(url);
    await expect(page.getByRole("heading", { name: /السجل غير موجود|لا تملك صلاحية/ })).toBeVisible();
  });

  test("الفرقة لا تبتّ في طلبها ولا تفتح طلب فرقة أخرى", async ({ page }) => {
    await login(page, ACCOUNTS.ashbal);
    const { url } = await createPurchase(page, "خيمة استطلاع", 3, "للكشافة");

    // لا توجد أزرار قرار لصاحب الطلب
    await expect(page.getByRole("button", { name: "موافقة", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "رفض", exact: true })).toHaveCount(0);

    await logout(page);
    await login(page, ACCOUNTS.kashaf);
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: /لا تملك صلاحية الوصول/ }),
    ).toBeVisible();
  });

  test("التحقّق من صحّة المدخلات برسائل عربية", async ({ page }) => {
    await login(page, ACCOUNTS.ashbal);
    await page.goto("/purchase/new");
    await page.getByLabel("اسم الصنف المطلوب").fill("ا");
    await page.getByRole("button", { name: "تقديم طلب الشراء" }).click();
    await expect(page.getByText("اسم الصنف مطلوب (حرفان على الأقل).")).toBeVisible();

    await page.getByLabel("اسم الصنف المطلوب").fill("حقيبة ميدانية");
    await page.getByLabel("الكمية", { exact: false }).first().fill("0");
    await page.getByRole("button", { name: "تقديم طلب الشراء" }).click();
    await expect(page.getByText("الكمية يجب أن تكون ١ على الأقل.")).toBeVisible();
  });
});
