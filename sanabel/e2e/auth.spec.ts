import { expect, test } from "@playwright/test";

import { ACCOUNTS, PASSWORD, login } from "./helpers";

test.describe("المصادقة والصلاحيات", () => {
  test("الصفحات محميّة: زائر بلا جلسة يُحوَّل إلى الدخول", async ({ page }) => {
    for (const path of ["/", "/inventory", "/supply", "/purchase", "/manage/users"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("كلمة مرور خاطئة تُرفض برسالة عربية واحدة لا تكشف وجود الحساب", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("اسم المستخدم").fill(ACCOUNTS.supply);
    await page.getByLabel("كلمة المرور").fill("كلمة-خاطئة-تماماً1");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();

    await expect(
      page.getByText("اسم المستخدم أو كلمة المرور غير صحيحة."),
    ).toBeVisible();

    // نفس الرسالة تماماً لحساب غير موجود
    await page.getByLabel("اسم المستخدم").fill("لا-يوجد-هذا-الحساب");
    await page.getByLabel("كلمة المرور").fill(PASSWORD);
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(
      page.getByText("اسم المستخدم أو كلمة المرور غير صحيحة."),
    ).toBeVisible();
  });

  test("حقول فارغة تُظهر رسالة تحقّق ولا تُرسل", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page.getByText("اسم المستخدم مطلوب.")).toBeVisible();
  });

  test("قائد اللوازم يرى أدوات الإدارة", async ({ page }) => {
    await login(page, ACCOUNTS.supply);
    const nav = page.getByRole("navigation", { name: "التنقّل الرئيسية" }).or(
      page.getByRole("navigation").first(),
    );
    await expect(nav.getByRole("link", { name: "إدارة الأصناف" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "الحسابات" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "دفتر الحركة" })).toBeVisible();
  });

  test("قائد الفرقة لا يرى أدوات الإدارة ولا يصل إليها بالرابط المباشر", async ({
    page,
  }) => {
    await login(page, ACCOUNTS.ashbal);
    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: "إدارة الأصناف" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "الحسابات" })).toHaveCount(0);

    // الحدّ الحقيقي على الخادم: الرابط المباشر يفشل أيضاً
    await page.goto("/manage/users");
    await expect(page.getByRole("heading", { name: /لا تملك صلاحية الوصول/ })).toBeVisible();

    await page.goto("/manage/items");
    await expect(page.getByRole("heading", { name: /لا تملك صلاحية الوصول/ })).toBeVisible();

    await page.goto("/ledger");
    await expect(page.getByRole("heading", { name: /لا تملك صلاحية الوصول/ })).toBeVisible();
  });

  test("الأدوار الرقابية تطّلع ولا تعدّل", async ({ page }) => {
    await login(page, ACCOUNTS.group);
    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: "المخزون" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "إدارة الأصناف" })).toHaveCount(0);

    await page.goto("/manage/items");
    await expect(page.getByRole("heading", { name: /لا تملك صلاحية الوصول/ })).toBeVisible();

    // لا يستطيع تقديم طلبات
    await page.goto("/supply/new");
    await expect(page.getByRole("heading", { name: /لا تملك صلاحية الوصول/ })).toBeVisible();
  });
});
