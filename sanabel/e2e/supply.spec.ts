import { expect, test } from "@playwright/test";

import { ACCOUNTS, fromArabicDigits, login, logout, readAvailable } from "./helpers";

/** يقدّم طلب لوازم من الفرقة الحالية ويعيد رقمه المرجعي */
async function submitSupply(
  page: import("@playwright/test").Page,
  items: Array<{ name: string; qty: number }>,
  purpose: string,
) {
  await page.goto("/supply/new");
  for (const { name, qty } of items) {
    await page.getByLabel(`الكمية المطلوبة من ${name}`).fill(String(qty));
  }
  await page.getByLabel("الغرض من الطلب").fill(purpose);
  await page.getByRole("button", { name: "تقديم الطلب وصرف الأصناف" }).click();
  await expect(page).toHaveURL(/\/supply\/\d+$/);
  const heading = await page.getByRole("heading", { level: 1 }).innerText();
  return heading.replace("الطلب", "").trim();
}

test.describe("مسار طلب اللوازم", () => {
  test("الطلب يُعتمد آلياً ويُخصم من المخزون ويُسجَّل في السجل والدفتر", async ({
    page,
  }) => {
    const ITEM = "فانوس مخيم";
    const QTY = 3;

    await login(page, ACCOUNTS.ashbal);
    const before = await readAvailable(page, ITEM);

    const code = await submitSupply(page, [{ name: ITEM, qty: QTY }], "مخيّم الربيع");

    // الحالة الفورية: مصروف، بلا أي خطوة موافقة
    await expect(page.getByText("تم الصرف — عهدة قائمة")).toBeVisible();

    const after = await readAvailable(page, ITEM);
    expect(after).toBe(before - QTY);

    // العملية مسجّلة في سجل الفرقة
    await page.goto("/activity");
    await expect(page.getByText(new RegExp(`طلب لوازم ${code}`))).toBeVisible();

    // والحركة مسجّلة في دفتر المخزون لدى قائد اللوازم
    await logout(page);
    await login(page, ACCOUNTS.supply);
    await page.goto(`/ledger?q=${encodeURIComponent(ITEM)}`);
    const row = page.getByRole("row").filter({ hasText: "صرف عهدة" }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText("فرقة الأشبال");
  });

  test("الصنف الذي نفد لا يُطلب، ويُوجَّه المستخدم إلى طلب شراء", async ({ page }) => {
    // إنزال صنف إلى الصفر عبر الجرد، ثم التحقّق من سلوك شاشة الطلب
    await login(page, ACCOUNTS.supply);
    await page.goto("/manage/items?q=" + encodeURIComponent("منشار يدوي"));
    await page.getByRole("button", { name: "جرد منشار يدوي" }).click();
    await page.getByLabel("الكمية الفعلية بعد العدّ").fill("0");
    await page.getByLabel("سبب التعديل").fill("اختبار: إنزال الرصيد إلى الصفر");
    await page.getByRole("button", { name: "تسجيل الجرد" }).click();
    await expect(page.getByText(/عُدّل الرصيد/)).toBeVisible();

    await logout(page);
    await login(page, ACCOUNTS.ashbal);
    await page.goto("/supply/new");

    const row = page.getByRole("listitem").filter({ hasText: "منشار يدوي" }).first();
    await expect(row.getByText("نفد — قدّم طلب شراء")).toBeVisible();
    // لا يوجد حقل كمية أصلاً لهذا الصنف
    await expect(page.getByLabel("الكمية المطلوبة من منشار يدوي")).toHaveCount(0);
  });

  test("الكمية المطلوبة لا تتجاوز المتاح", async ({ page }) => {
    const ITEM = "مبرّد ماء ٢٠ لتر";
    await login(page, ACCOUNTS.ashbal);
    const available = await readAvailable(page, ITEM);

    await page.goto("/supply/new");
    const input = page.getByLabel(`الكمية المطلوبة من ${ITEM}`);
    await input.fill(String(available + 50));
    // الواجهة تقصّ القيمة عند المتاح بدل السماح بطلب يعرف الخادم أنه سيُرفض
    await expect(input).toHaveValue(String(available));
  });

  test("الطلب الفارغ لا يُرسل", async ({ page }) => {
    await login(page, ACCOUNTS.ashbal);
    await page.goto("/supply/new");
    await expect(
      page.getByRole("button", { name: "تقديم الطلب وصرف الأصناف" }),
    ).toBeDisabled();
  });

  test("فرقة لا ترى طلبات فرقة أخرى ولا تفتحها بالرابط المباشر", async ({ page }) => {
    await login(page, ACCOUNTS.ashbal);
    const code = await submitSupply(page, [{ name: "دلو بلاستيكي", qty: 2 }], "عزل");
    const url = page.url();
    const id = url.split("/").pop()!;

    await logout(page);
    await login(page, ACCOUNTS.kashaf);

    // لا يظهر في قائمتها
    await page.goto("/supply");
    await expect(page.getByText(code)).toHaveCount(0);

    // ولا يُفتح بالرابط المباشر
    await page.goto(`/supply/${id}`);
    await expect(
      page.getByRole("heading", { name: /لا تملك صلاحية الوصول/ }),
    ).toBeVisible();
  });

  test("الأدوار الرقابية ترى طلبات كل الفرق", async ({ page }) => {
    await login(page, ACCOUNTS.group);
    await page.goto("/supply");
    await expect(page.getByRole("cell", { name: "فرقة الأشبال" }).first()).toBeVisible();
  });
});

test.describe("مسار الإرجاع والتحقّق", () => {
  test("السليم وحده يعود للمخزون، والتالف والمفقود يُسجَّلان خارجه", async ({
    page,
  }) => {
    const ITEM = "مطرقة أوتاد";
    const ISSUED = 10;

    await login(page, ACCOUNTS.supply);
    const startAvailable = await readAvailable(page, ITEM);

    await page.goto(`/manage/items?q=${encodeURIComponent(ITEM)}`);
    const managedRow = page.getByRole("row").filter({ hasText: ITEM }).first();
    const startDamaged = fromArabicDigits(
      (await managedRow.locator("td").nth(4).innerText()).replace("—", "0"),
    );
    const startLost = fromArabicDigits(
      (await managedRow.locator("td").nth(5).innerText()).replace("—", "0"),
    );

    // 1) الفرقة تطلب ١٠
    await logout(page);
    await login(page, ACCOUNTS.ashbal);
    const code = await submitSupply(page, [{ name: ITEM, qty: ISSUED }], "معسكر");

    expect(await readAvailable(page, ITEM)).toBe(startAvailable - ISSUED);

    // 2) الفرقة تُرجع ٨ سليم و١ تالف و١ مفقود
    await page.goto("/returns");
    // الفرقة قد تكون لديها عهد أخرى مفتوحة، فنستهدف صفّ هذا الطلب تحديداً
    await page
      .getByRole("row")
      .filter({ hasText: code })
      .getByRole("button", { name: "تقديم إرجاع" })
      .click();
    await page.getByLabel(`سليم من ${ITEM}`).fill("8");
    await page.getByLabel(`تالف من ${ITEM}`).fill("1");
    await page.getByLabel(`مفقود من ${ITEM}`).fill("1");
    await page.getByRole("button", { name: "تقديم الإرجاع" }).click();
    await expect(page.getByText("إرجاع قيد التحقّق")).toBeVisible();

    // لم يتغيّر المخزون بعد — الدعوى ليست رصيداً
    expect(await readAvailable(page, ITEM)).toBe(startAvailable - ISSUED);

    // 3) قائد اللوازم يعاين ويعتمد
    await logout(page);
    await login(page, ACCOUNTS.supply);
    await page.goto("/returns");
    await page
      .getByRole("listitem")
      .filter({ hasText: code })
      .getByRole("button", { name: "التحقّق من الإرجاع" })
      .click();
    await expect(page.getByText(/سيعود إلى المخزون المتاح/)).toBeVisible();
    await page.getByRole("button", { name: "اعتماد الإرجاع" }).click();
    await expect(page.getByText(/تم اعتماد الإرجاع/)).toBeVisible();

    // 4) المعادلة: عاد ٨ فقط
    expect(await readAvailable(page, ITEM)).toBe(startAvailable - ISSUED + 8);

    // 5) التالف والمفقود سُجّلا خارج المتاح
    await page.goto(`/manage/items?q=${encodeURIComponent(ITEM)}`);
    const afterRow = page.getByRole("row").filter({ hasText: ITEM }).first();
    expect(
      fromArabicDigits((await afterRow.locator("td").nth(4).innerText()).replace("—", "0")),
    ).toBe(startDamaged + 1);
    expect(
      fromArabicDigits((await afterRow.locator("td").nth(5).innerText()).replace("—", "0")),
    ).toBe(startLost + 1);

    // 6) العهدة أُغلقت والطلب اكتمل
    await page.goto(`/supply?q=${encodeURIComponent(code)}`);
    const requestRow = page.getByRole("row").filter({ hasText: code }).first();
    await expect(requestRow).toContainText("مكتمل");

    // 7) دفتر الحركة يحمل الحركات الثلاث
    await page.goto(`/ledger?q=${encodeURIComponent(ITEM)}`);
    for (const reason of ["إرجاع صالح", "تسجيل تالف", "تسجيل مفقود"]) {
      await expect(
        page.getByRole("row").filter({ hasText: reason }).first(),
      ).toBeVisible();
    }

    // 8) المطابقة سليمة: مجموع الحركات = الرصيد المخزّن
    await expect(page.getByText("كل الأرصدة مطابقة لدفتر الحركة.")).toBeVisible();
  });

  test("لا يمكن إرجاع أكثر ممّا في العهدة", async ({ page }) => {
    const ITEM = "مجرفة صغيرة";
    await login(page, ACCOUNTS.kashaf);
    await submitSupply(page, [{ name: ITEM, qty: 2 }], "اختبار حدود الإرجاع");

    await page.goto("/returns");
    await page
      .getByRole("row")
      .filter({ hasText: ITEM })
      .getByRole("button", { name: "تقديم إرجاع" })
      .click();
    await page.getByLabel(`سليم من ${ITEM}`).fill("5");

    await expect(page.getByText(/أدخلت ٥ والمتبقّي ٢/)).toBeVisible();
    await expect(page.getByRole("button", { name: "تقديم الإرجاع" })).toBeDisabled();
  });

  test("الإرجاع الجزئي يُبقي العهدة مفتوحة بالباقي", async ({ page }) => {
    const ITEM = "بلطة معسكر";
    await login(page, ACCOUNTS.motaqadem);
    const code = await submitSupply(page, [{ name: ITEM, qty: 4 }], "إرجاع جزئي");

    await page.goto("/returns");
    await page
      .getByRole("row")
      .filter({ hasText: code })
      .getByRole("button", { name: "تقديم إرجاع" })
      .click();
    await page.getByLabel(`سليم من ${ITEM}`).fill("1");
    await page.getByRole("button", { name: "تقديم الإرجاع" }).click();
    await expect(page.getByText("إرجاع قيد التحقّق")).toBeVisible();

    await logout(page);
    await login(page, ACCOUNTS.supply);
    await page.goto("/returns");
    await page
      .getByRole("listitem")
      .filter({ hasText: code })
      .getByRole("button", { name: "التحقّق من الإرجاع" })
      .click();
    await page.getByRole("button", { name: "اعتماد الإرجاع" }).click();
    await expect(page.getByText(/ما زال جزء من العهدة قائماً/)).toBeVisible();

    await page.goto(`/supply?q=${encodeURIComponent(code)}`);
    const row = page.getByRole("row").filter({ hasText: code }).first();
    await expect(row).toContainText("تم الصرف");
  });
});
