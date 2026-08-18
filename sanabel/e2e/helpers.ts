import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.SEED_PASSWORD ?? "Sanabel@2026";

export const ACCOUNTS = {
  supply: "abuhassan",
  group: "ashraf",
  assistant: "maghrabi",
  scouts: "abdulaziz",
  ashbal: "ashbal",
  kashaf: "kashaf",
  motaqadem: "motaqadem",
} as const;

export async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("اسم المستخدم").fill(username);
  await page.getByLabel("كلمة المرور").fill(PASSWORD);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.getByText("أهلاً")).toBeVisible();
}

export async function logout(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "تسجيل الخروج" }).first().click();
  await expect(page).toHaveURL(/\/login/);
}

/**
 * الكمية المتاحة من صنف، مقروءة من صفحة المخزون.
 *
 * تُقرأ من الواجهة لا من قاعدة البيانات عمداً: المطلوب إثبات أن الرقم الذي
 * يراه المستخدم صحيح، لا أن الجدول وحده صحيح.
 */
export async function readAvailable(page: Page, itemName: string): Promise<number> {
  await page.goto(`/inventory?q=${encodeURIComponent(itemName)}`, {
    waitUntil: "domcontentloaded",
  });
  // بعد عملية كتابة يكون هناك تحديث جارٍ قد يبتلع التنقّل؛ ننتظر أن يستقرّ
  // مربّع البحث على القيمة المطلوبة قبل قراءة الصف
  await expect(page.getByRole("searchbox", { name: /ابحث عن صنف/ })).toHaveValue(
    itemName,
  );
  const row = page.getByRole("row").filter({ hasText: itemName }).first();
  await expect(row).toBeVisible();
  // العمود الثالث هو «المتاح» في كل الأدوار
  const cell = row.locator("td").nth(2);
  return fromArabicDigits(await cell.innerText());
}

/** يستخرج أول عدد من نصّ مكتوب بالأرقام العربية الشرقية */
export function fromArabicDigits(text: string): number {
  const normalized = text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const match = normalized.match(/\d+/);
  if (!match) throw new Error(`لا يوجد رقم في النص: «${text}»`);
  return Number(match[0]);
}

export function toArabicDigits(value: number): string {
  return String(value).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
