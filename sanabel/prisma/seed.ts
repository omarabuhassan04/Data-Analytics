/**
 * البذور — الحسابات والتصنيفات والمخزون الافتتاحي.
 *
 * تحذير: يمسح الجداول ويعيد بناءها. يُشغَّل مرّة واحدة عند تجهيز قاعدة جديدة،
 * ولذلك هو خارج سلسلة البناء عمداً حتى لا يمحو مخزوناً حقيقياً مع كل نشر.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_PASSWORD ?? "Sanabel@2026";

const TEAMS = [
  { key: "ASHBAL", name: "فرقة الأشبال", sortOrder: 1 },
  { key: "KASHAF", name: "فرقة الكشاف", sortOrder: 2 },
  { key: "MOTAQADEM", name: "فرقة المتقدم", sortOrder: 3 },
];

const STAFF = [
  { username: "abuhassan", fullName: "أبوحسان", role: "SUPPLY_LEADER" },
  { username: "ashraf", fullName: "ق.أشرف", role: "GROUP_LEADER" },
  { username: "maghrabi", fullName: "ق.مغربي", role: "ASSISTANT_GROUP_LEADER" },
  { username: "abdulaziz", fullName: "ق.عبدالعزيز", role: "SCOUT_LEADER" },
];

const TEAM_ACCOUNTS = [
  { username: "ashbal", fullName: "قائد فرقة الأشبال", teamKey: "ASHBAL" },
  { username: "kashaf", fullName: "قائد فرقة الكشاف", teamKey: "KASHAF" },
  { username: "motaqadem", fullName: "قائد فرقة المتقدم", teamKey: "MOTAQADEM" },
];

type SeedItem = {
  name: string;
  unit?: string;
  quantity: number;
  threshold: number;
  notes?: string;
};

const CATALOG: Array<{ name: string; icon: string; items: SeedItem[] }> = [
  {
    name: "الخيام والمظلات",
    icon: "tent",
    items: [
      { name: "خيمة ٤ أشخاص", quantity: 12, threshold: 3 },
      { name: "خيمة ٨ أشخاص", quantity: 6, threshold: 2 },
      { name: "خيمة القيادة", quantity: 3, threshold: 1 },
      { name: "مظلة ساحة", quantity: 4, threshold: 1 },
      { name: "أوتاد خيام", quantity: 220, threshold: 60, notes: "تُصرف بالعدد لا بالطقم" },
    ],
  },
  {
    name: "حقائب ومبيت",
    icon: "backpack",
    items: [
      { name: "حقيبة ظهر ٦٥ لتر", quantity: 26, threshold: 6 },
      { name: "كيس نوم", quantity: 34, threshold: 8 },
      { name: "فرشة نوم", quantity: 34, threshold: 8 },
      { name: "حقيبة يومية صغيرة", quantity: 18, threshold: 5 },
    ],
  },
  {
    name: "الحبال والعقد",
    icon: "rope",
    items: [
      { name: "حبل مانيلا ١٠ م", unit: "لفة", quantity: 40, threshold: 10 },
      { name: "حبل تسلّق ٣٠ م", unit: "لفة", quantity: 6, threshold: 2 },
      { name: "عصا كشفية", quantity: 64, threshold: 15 },
      { name: "خيط ربط", unit: "لفة", quantity: 28, threshold: 8 },
    ],
  },
  {
    name: "الإضاءة والطاقة",
    icon: "lantern",
    items: [
      { name: "كشاف يدوي", quantity: 36, threshold: 10 },
      { name: "فانوس مخيم", quantity: 14, threshold: 4 },
      { name: "مصباح رأس", quantity: 22, threshold: 6 },
      { name: "بطاريات AA", unit: "علبة", quantity: 30, threshold: 10 },
      { name: "بطارية محمولة", quantity: 8, threshold: 3 },
    ],
  },
  {
    name: "أدوات الطبخ",
    icon: "pot",
    items: [
      { name: "طنجرة كبيرة", quantity: 10, threshold: 3 },
      { name: "موقد غاز ميداني", quantity: 8, threshold: 2 },
      { name: "أسطوانة غاز", quantity: 12, threshold: 4 },
      { name: "طقم أواني طعام", unit: "طقم", quantity: 16, threshold: 4 },
      { name: "مبرّد ماء ٢٠ لتر", quantity: 6, threshold: 2 },
    ],
  },
  {
    name: "الإسعافات الأولية",
    icon: "aid",
    items: [
      { name: "حقيبة إسعاف كاملة", quantity: 10, threshold: 3 },
      { name: "شاش طبي", unit: "علبة", quantity: 60, threshold: 20 },
      { name: "مطهّر جروح", unit: "علبة", quantity: 25, threshold: 8 },
      { name: "جبيرة إسعافية", quantity: 14, threshold: 4 },
    ],
  },
  {
    name: "عدّة المخيم",
    icon: "tools",
    items: [
      { name: "بلطة معسكر", quantity: 10, threshold: 3 },
      { name: "مطرقة أوتاد", quantity: 16, threshold: 4 },
      { name: "مجرفة صغيرة", quantity: 8, threshold: 2 },
      { name: "صندوق عدّة", quantity: 5, threshold: 2 },
      { name: "منشار يدوي", quantity: 6, threshold: 2 },
    ],
  },
  {
    name: "أدوات النظافة",
    icon: "broom",
    items: [
      { name: "مكنسة", quantity: 12, threshold: 4 },
      { name: "أكياس نفايات", unit: "كيس", quantity: 160, threshold: 50 },
      { name: "صابون سائل", unit: "علبة", quantity: 40, threshold: 12 },
      { name: "دلو بلاستيكي", quantity: 14, threshold: 4 },
    ],
  },
  {
    name: "الرايات والشارات",
    icon: "flag",
    items: [
      { name: "راية فرقة", quantity: 9, threshold: 3 },
      { name: "سارية علم", quantity: 4, threshold: 1 },
      { name: "شارة كتف", quantity: 120, threshold: 30 },
      { name: "منديل كشفي", quantity: 90, threshold: 25 },
    ],
  },
];

async function main() {
  console.log("تفريغ الجداول…");
  await prisma.activityLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.returnLine.deleteMany();
  await prisma.returnBatch.deleteMany();
  await prisma.supplyLine.deleteMany();
  await prisma.supplyRequest.deleteMany();
  await prisma.purchaseRequest.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  console.log("إنشاء الفرق…");
  const teams = new Map<string, number>();
  for (const team of TEAMS) {
    const created = await prisma.team.create({ data: team });
    teams.set(team.key, created.id);
  }

  console.log("إنشاء الحسابات…");
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const person of STAFF) {
    await prisma.user.create({ data: { ...person, passwordHash } });
  }
  for (const account of TEAM_ACCOUNTS) {
    await prisma.user.create({
      data: {
        username: account.username,
        fullName: account.fullName,
        role: "TEAM_LEADER",
        teamId: teams.get(account.teamKey)!,
        passwordHash,
      },
    });
  }

  const supplyLeader = await prisma.user.findUniqueOrThrow({
    where: { username: "abuhassan" },
  });

  console.log("إنشاء المخزون الافتتاحي…");
  let categoryOrder = 0;
  let itemCount = 0;

  for (const group of CATALOG) {
    const category = await prisma.category.create({
      data: { name: group.name, icon: group.icon, sortOrder: ++categoryOrder },
    });

    for (const seed of group.items) {
      const item = await prisma.item.create({
        data: {
          name: seed.name,
          unit: seed.unit ?? "قطعة",
          quantity: seed.quantity,
          threshold: seed.threshold,
          notes: seed.notes,
          categoryId: category.id,
        },
      });
      itemCount++;

      // كل رصيد افتتاحي يدخل الدفتر أيضاً، وإلا فشلت المطابقة من أول يوم
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          reason: "OPENING",
          delta: seed.quantity,
          balanceAfter: seed.quantity,
          actorId: supplyLeader.id,
          actorName: supplyLeader.fullName,
          note: "رصيد افتتاحي عند تأسيس النظام",
        },
      });
    }
  }

  await prisma.activityLog.create({
    data: {
      actorId: supplyLeader.id,
      actorName: supplyLeader.fullName,
      actorRole: "قائد اللوازم",
      action: "ITEM_CREATE",
      entity: "System",
      summary: `تأسيس النظام: ${itemCount} صنفاً في ${categoryOrder} تصنيفات`,
    },
  });

  console.log(
    `تم: ${TEAMS.length} فرق، ${STAFF.length + TEAM_ACCOUNTS.length} حسابات، ${itemCount} صنفاً.`,
  );
  console.log(`كلمة المرور الأولية: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
