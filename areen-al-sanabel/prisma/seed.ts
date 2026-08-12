/**
 * بذور قاعدة البيانات — عرين السنابل
 *
 * يُنشئ الحسابات السبعة، تصنيفات العتاد الكشفي، مجموعة أغراض ابتدائية،
 * وعيّنة من الطلبات حتى يكون النظام قابلًا للعرض فور التشغيل.
 *
 * التشغيل:  npm run db:seed
 * تنبيه: هذا الملف يمسح البيانات الحالية ويعيد بناءها من الصفر.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Areen@2026";

/**
 * حارس نشر: كلمة المرور الافتراضية معروفة ومنشورة في التوثيق، وهذا الملف
 * يمسح البيانات ويعيد بناءها. تشغيله على قاعدة إنتاج بكلمة المرور الافتراضية
 * يعني إتاحة حساب قائد اللوازم للجميع — لذا نمنعه صراحةً.
 */
if (process.env.NODE_ENV === "production" && DEFAULT_PASSWORD === "Areen@2026") {
  console.error(
    "\n✖ رُفض التشغيل: لا يجوز زرع بيانات الإنتاج بكلمة المرور الافتراضية المعروفة.\n" +
      "  عيّن SEED_DEFAULT_PASSWORD إلى كلمة مرور قوية ثم أعد المحاولة.\n",
  );
  process.exit(1);
}

type SeedItem = {
  name: string;
  unit: string;
  quantity: number;
  threshold: number;
  notes?: string;
};

type SeedCategory = {
  name: string;
  icon: string;
  items: SeedItem[];
};

const CATEGORIES: SeedCategory[] = [
  {
    name: "خيام ومعدات تخييم",
    icon: "tent",
    items: [
      { name: "خيمة لأربعة أشخاص", unit: "خيمة", quantity: 12, threshold: 4 },
      { name: "خيمة لثمانية أشخاص", unit: "خيمة", quantity: 5, threshold: 2 },
      { name: "خيمة قيادة كبيرة", unit: "خيمة", quantity: 2, threshold: 1 },
      { name: "أوتاد حديدية", unit: "قطعة", quantity: 180, threshold: 60 },
      { name: "مطرقة أوتاد", unit: "قطعة", quantity: 6, threshold: 3 },
      { name: "فرشة نوم", unit: "قطعة", quantity: 40, threshold: 15 },
      { name: "كيس نوم", unit: "قطعة", quantity: 3, threshold: 10, notes: "بحاجة إلى تزويد قبل المخيّم الصيفي" },
      { name: "مظلّة شمسية كبيرة", unit: "قطعة", quantity: 0, threshold: 2 },
    ],
  },
  {
    name: "حبال وعقد",
    icon: "cable",
    items: [
      { name: "حبل قطني ١٠ متر", unit: "متر", quantity: 200, threshold: 50 },
      { name: "حبل مانيلا ٢٠ متر", unit: "متر", quantity: 120, threshold: 40 },
      { name: "حبل رفيع للربطات", unit: "متر", quantity: 300, threshold: 100 },
      { name: "بكرة رفع", unit: "قطعة", quantity: 4, threshold: 2 },
      { name: "خطّاف معدني (كارابينر)", unit: "قطعة", quantity: 2, threshold: 8, notes: "الكمية منخفضة" },
      { name: "عصا خشبية للربطات", unit: "قطعة", quantity: 60, threshold: 20 },
    ],
  },
  {
    name: "أدوات مطبخ",
    icon: "cooking-pot",
    items: [
      { name: "طنجرة كبيرة", unit: "قطعة", quantity: 6, threshold: 2 },
      { name: "موقد غاز ميداني", unit: "قطعة", quantity: 4, threshold: 2 },
      { name: "أسطوانة غاز", unit: "أسطوانة", quantity: 3, threshold: 2 },
      { name: "مقلاة", unit: "قطعة", quantity: 5, threshold: 2 },
      { name: "طقم أدوات تقطيع", unit: "طقم", quantity: 3, threshold: 1 },
      { name: "صحون بلاستيكية", unit: "قطعة", quantity: 150, threshold: 50 },
      { name: "أكواب", unit: "قطعة", quantity: 140, threshold: 50 },
      { name: "خزّان ماء ٢٠ لتر", unit: "قطعة", quantity: 0, threshold: 3 },
    ],
  },
  {
    name: "إسعافات أولية",
    icon: "heart-pulse",
    items: [
      { name: "حقيبة إسعافات أولية", unit: "حقيبة", quantity: 8, threshold: 4 },
      { name: "شاش طبي", unit: "لفة", quantity: 25, threshold: 10 },
      { name: "لاصق جروح", unit: "علبة", quantity: 12, threshold: 6 },
      { name: "معقّم جروح", unit: "عبوة", quantity: 9, threshold: 5 },
      { name: "قفازات طبية", unit: "علبة", quantity: 2, threshold: 5 },
      { name: "جبيرة تثبيت", unit: "قطعة", quantity: 4, threshold: 2 },
    ],
  },
  {
    name: "إضاءة وطاقة",
    icon: "flashlight",
    items: [
      { name: "كشّاف يدوي", unit: "قطعة", quantity: 18, threshold: 8 },
      { name: "فانوس مخيّم", unit: "قطعة", quantity: 10, threshold: 4 },
      { name: "بطاريات AA", unit: "علبة", quantity: 14, threshold: 6 },
      { name: "كيبل تمديد ٢٠ متر", unit: "قطعة", quantity: 3, threshold: 2 },
      { name: "بطارية شحن محمولة", unit: "قطعة", quantity: 0, threshold: 4 },
    ],
  },
  {
    name: "ملاحة واستكشاف",
    icon: "compass",
    items: [
      { name: "بوصلة", unit: "قطعة", quantity: 22, threshold: 10 },
      { name: "خريطة طبوغرافية", unit: "قطعة", quantity: 8, threshold: 4 },
      { name: "صافرة", unit: "قطعة", quantity: 30, threshold: 12 },
      { name: "منظار", unit: "قطعة", quantity: 3, threshold: 2 },
      { name: "جهاز اتصال لاسلكي", unit: "قطعة", quantity: 4, threshold: 4 },
    ],
  },
  {
    name: "أعلام ورايات",
    icon: "flag",
    items: [
      { name: "علم المملكة الأردنية الهاشمية", unit: "قطعة", quantity: 6, threshold: 2 },
      { name: "راية المجموعة", unit: "قطعة", quantity: 4, threshold: 2 },
      { name: "سارية علم", unit: "قطعة", quantity: 5, threshold: 2 },
      { name: "شارات الفرق", unit: "قطعة", quantity: 70, threshold: 30 },
    ],
  },
  {
    name: "أدوات عامة",
    icon: "wrench",
    items: [
      { name: "سكين متعدد الاستعمالات", unit: "قطعة", quantity: 12, threshold: 5 },
      { name: "مجرفة صغيرة", unit: "قطعة", quantity: 7, threshold: 3 },
      { name: "حقيبة ظهر", unit: "قطعة", quantity: 25, threshold: 10 },
      { name: "صندوق تخزين بلاستيكي", unit: "قطعة", quantity: 15, threshold: 6 },
      { name: "طفاية حريق صغيرة", unit: "قطعة", quantity: 2, threshold: 3 },
    ],
  },
];

const USERS = [
  {
    username: "supplies",
    fullName: "قائد اللوازم",
    role: "SUPPLIES_LEADER",
    teamName: null,
  },
  {
    username: "group.leader",
    fullName: "قائد المجموعة",
    role: "GROUP_LEADER",
    teamName: null,
  },
  {
    username: "deputy",
    fullName: "مساعد قائد المجموعة",
    role: "DEPUTY_GROUP_LEADER",
    teamName: null,
  },
  {
    username: "scouts.leader",
    fullName: "قائد الكشافين",
    role: "SCOUTS_LEADER",
    teamName: null,
  },
  {
    username: "ashbal",
    fullName: "مسؤول فرقة الأشبال",
    role: "TEAM_LEADER",
    teamName: "فرقة الأشبال",
  },
  {
    username: "kashafa",
    fullName: "مسؤول فرقة الكشافة",
    role: "TEAM_LEADER",
    teamName: "فرقة الكشافة",
  },
  {
    username: "jawwala",
    fullName: "مسؤول فرقة الجوالة",
    role: "TEAM_LEADER",
    teamName: "فرقة الجوالة",
  },
] as const;

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  console.log("↻ مسح البيانات الحالية…");
  await prisma.activityLog.deleteMany();
  await prisma.requestNote.deleteMany();
  await prisma.requestLine.deleteMany();
  await prisma.request.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("↻ إنشاء الحسابات…");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const users = new Map<string, { id: number; fullName: string; teamName: string | null }>();

  for (const user of USERS) {
    const created = await prisma.user.create({
      data: {
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        teamName: user.teamName,
        passwordHash,
      },
    });
    users.set(user.username, {
      id: created.id,
      fullName: created.fullName,
      teamName: created.teamName,
    });
  }

  console.log("↻ إنشاء التصنيفات والأغراض…");
  const items = new Map<string, { id: number; unit: string }>();

  for (const [index, category] of CATEGORIES.entries()) {
    const createdCategory = await prisma.category.create({
      data: { name: category.name, icon: category.icon, sortOrder: index },
    });

    for (const item of category.items) {
      const createdItem = await prisma.item.create({
        data: {
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          threshold: item.threshold,
          notes: item.notes ?? null,
          categoryId: createdCategory.id,
        },
      });
      items.set(item.name, { id: createdItem.id, unit: createdItem.unit });
    }
  }

  /**
   * ينشئ طلبًا تجريبيًا. طلبات العهدة تخصم من المخزون فعليًا
   * بنفس منطق التطبيق، حتى تبقى الأرقام المعروضة متّسقة.
   */
  async function createRequest(input: {
    username: string;
    type: "EQUIPMENT" | "ADDITIONAL" | "PURCHASE";
    status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
    purpose: string;
    neededInDays: number;
    createdDaysAgo: number;
    decisionNote?: string;
    lines: { itemName: string; quantity: number; note?: string }[];
    notes?: { author: string; body: string }[];
  }) {
    const requester = users.get(input.username)!;
    const deducts = input.type === "EQUIPMENT" && input.status !== "REJECTED";
    const decided = input.status === "APPROVED" || input.status === "REJECTED";
    const createdAt = daysFromNow(-input.createdDaysAgo);

    const request = await prisma.request.create({
      data: {
        type: input.type,
        status: input.status,
        requesterId: requester.id,
        teamName: requester.teamName ?? "—",
        purpose: input.purpose,
        neededOn: daysFromNow(input.neededInDays),
        createdAt,
        decidedById: decided ? users.get("supplies")!.id : null,
        decidedAt: decided ? daysFromNow(-input.createdDaysAgo + 1) : null,
        decisionNote: input.decisionNote ?? null,
        lines: {
          create: input.lines.map((line) => {
            const item = items.get(line.itemName);
            return {
              itemId: item?.id ?? null,
              itemName: line.itemName,
              unit: item?.unit ?? "قطعة",
              quantity: line.quantity,
              deducted: deducts && item ? line.quantity : 0,
              note: line.note ?? null,
            };
          }),
        },
      },
    });

    if (deducts) {
      for (const line of input.lines) {
        const item = items.get(line.itemName);
        if (item) {
          await prisma.item.update({
            where: { id: item.id },
            data: { quantity: { decrement: line.quantity } },
          });
        }
      }
    }

    for (const note of input.notes ?? []) {
      await prisma.requestNote.create({
        data: {
          requestId: request.id,
          authorId: users.get(note.author)!.id,
          body: note.body,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        actorId: requester.id,
        actorName: requester.fullName,
        action: "REQUEST_SUBMIT",
        entity: "Request",
        entityId: request.id,
        summary: `قدّم طلبًا رقم #${request.id}`,
        createdAt,
      },
    });

    return request;
  }

  console.log("↻ إنشاء طلبات تجريبية…");

  await createRequest({
    username: "ashbal",
    type: "EQUIPMENT",
    status: "PENDING",
    purpose: "مخيّم نهاية الأسبوع في غابات دبين",
    neededInDays: 5,
    createdDaysAgo: 1,
    lines: [
      { itemName: "خيمة لأربعة أشخاص", quantity: 4 },
      { itemName: "فرشة نوم", quantity: 12 },
      { itemName: "كشّاف يدوي", quantity: 6 },
      { itemName: "حقيبة إسعافات أولية", quantity: 1, note: "للفرقة بأكملها" },
    ],
  });

  await createRequest({
    username: "kashafa",
    type: "EQUIPMENT",
    status: "APPROVED",
    purpose: "تدريب الربطات والعقد في المقر",
    neededInDays: 2,
    createdDaysAgo: 6,
    decisionNote: "تم التسليم، يُرجى الإرجاع خلال أسبوع",
    lines: [
      { itemName: "حبل قطني ١٠ متر", quantity: 40 },
      { itemName: "عصا خشبية للربطات", quantity: 20 },
      { itemName: "حبل رفيع للربطات", quantity: 50 },
    ],
    notes: [
      {
        author: "scouts.leader",
        body: "يُرجى التأكد من فحص الحبال قبل التسليم وبعد الإرجاع.",
      },
    ],
  });

  await createRequest({
    username: "jawwala",
    type: "PURCHASE",
    status: "PENDING",
    purpose: "تجهيز رحلة الجوالة الطويلة",
    neededInDays: 14,
    createdDaysAgo: 2,
    lines: [
      { itemName: "خزّان ماء ٢٠ لتر", quantity: 4, note: "نفدت الكمية بالكامل من المخزون" },
      { itemName: "بطارية شحن محمولة", quantity: 6 },
      { itemName: "حذاء مسير جبلي", quantity: 10, note: "غير مُدرج في المخزون حاليًا" },
    ],
  });

  await createRequest({
    username: "ashbal",
    type: "ADDITIONAL",
    status: "UNDER_REVIEW",
    purpose: "زيادة عدد المشاركين في المخيّم إلى ٣٥ شبلًا",
    neededInDays: 7,
    createdDaysAgo: 3,
    lines: [
      { itemName: "كيس نوم", quantity: 15, note: "المتوفّر لا يكفي العدد الجديد" },
      { itemName: "قفازات طبية", quantity: 4 },
    ],
    notes: [
      {
        author: "scouts.leader",
        body: "العدد المذكور مطابق لكشف المشاركين المعتمد.",
      },
    ],
  });

  await createRequest({
    username: "kashafa",
    type: "EQUIPMENT",
    status: "REJECTED",
    purpose: "نشاط داخلي قصير",
    neededInDays: 1,
    createdDaysAgo: 9,
    decisionNote: "الأجهزة محجوزة لنشاط المجموعة في نفس التاريخ",
    lines: [{ itemName: "جهاز اتصال لاسلكي", quantity: 4 }],
  });

  const [userCount, itemCount, requestCount] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.request.count(),
  ]);

  console.log("\n✔ اكتملت التهيئة — عرين السنابل");
  console.log(`  الحسابات: ${userCount} | الأغراض: ${itemCount} | الطلبات: ${requestCount}`);
  console.log(`  كلمة المرور لجميع الحسابات: ${DEFAULT_PASSWORD}`);
  console.log("  أسماء الدخول: supplies, group.leader, deputy, scouts.leader, ashbal, kashafa, jawwala\n");
}

main()
  .catch((error) => {
    console.error("✖ فشلت تهيئة البيانات:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
