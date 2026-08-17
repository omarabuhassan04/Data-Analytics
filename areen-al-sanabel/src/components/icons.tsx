/**
 * طقم أيقونات عرين السنابل
 *
 * أيقونات مرسومة خاصةً بهذا النظام بمفردات كشفية: بوصلة، صندوق عتاد،
 * حَقيبة، لافتة مسار، فانوس، سجل، خيمة. كلها بالقواعد نفسها حتى تُقرأ
 * كطقم واحد لا كمجموعة رموز متفرّقة:
 *
 *   • مربّع الرسم 24×24 والشكل محصور بين 2 و22 (هامش بصري ثابت)
 *   • خطوط فقط بسماكة 1.5 ونهايات وزوايا دائرية
 *   • اللون currentColor دائمًا — الأيقونة تتبع نصّها
 *
 * الأيقونة معلومة بصرية لا محتوى: aria-hidden افتراضيًا، ومن احتاجها
 * معرِّفًا وحيدًا يمرّر `label`.
 */

type IconProps = {
  className?: string;
  /** يجعل الأيقونة معلنة لقارئ الشاشة بهذا النص */
  label?: string;
};

function Icon({
  className,
  label,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------- التنقّل */

/** بوصلة — لوحة التحكم */
export function IconCompass(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.9 8.1 13.5 13.5 8.1 15.9 10.5 10.5Z" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** صندوق عتاد — المخزون */
export function IconFootlocker(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M3 11.5h18" />
      <path d="M7.5 7v12M16.5 7v12" />
      <rect x="10.75" y="9.75" width="2.5" height="3.5" rx="0.9" />
    </Icon>
  );
}

/** حقيبة ظهر — سلة العهدة */
export function IconKnapsack(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 20.5v-8.5a6 6 0 0 1 12 0v8.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5Z" />
      <path d="M9.75 11.5V8.5a2.25 2.25 0 0 1 4.5 0v3" />
      <path d="M6.4 15.5h11.2" />
      <rect x="9.5" y="17" width="5" height="4" rx="1" />
    </Icon>
  );
}

/** لافتة مسار — الطلبات */
export function IconSignpost(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v18" />
      <path d="M12 5.5h5.5l2 2-2 2H12Z" />
      <path d="M12 12h-5.5l-2 2 2 2H12Z" />
    </Icon>
  );
}

/** بيان تسليم — طلباتي */
export function IconManifest(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v13a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H16" />
      <rect x="8" y="3" width="8" height="3.5" rx="1.25" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </Icon>
  );
}

/** مستودع — إدارة المخزون */
export function IconDepot(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="14" width="7" height="6.5" rx="1.25" />
      <rect x="13.5" y="14" width="7" height="6.5" rx="1.25" />
      <rect x="8.5" y="6.5" width="7" height="6.5" rx="1.25" />
    </Icon>
  );
}

/** سجل الرحلة — سجل النشاط */
export function IconLogbook(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8.5 3v18" />
      <path d="M5.75 7.5h1.25M5.75 12h1.25M5.75 16.5h1.25" />
      <path d="M11.5 8.5h5.25M11.5 12h5.25M11.5 15.5h3.25" />
    </Icon>
  );
}

/** أعضاء الفرقة — الحسابات */
export function IconTroop(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3.25" />
      <path d="M3.5 20c0-3.1 2.46-5.5 5.5-5.5s5.5 2.4 5.5 5.5" />
      <path d="M16 5.9a3.25 3.25 0 0 1 0 5.2" />
      <path d="M17.25 14.9c1.94.7 3.25 2.5 3.25 4.6" />
    </Icon>
  );
}

/* -------------------------------------------------- المرتجعات والجودة */

/** عودة إلى الصندوق — استلام المرتجعات */
export function IconReturn(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="12.5" width="17" height="8" rx="1.75" />
      <path d="M7.75 9.75A5 5 0 0 1 17 12.2" />
      <path d="M5.25 7.75l2.5 2 -2.1 1.2" />
      <path d="M3.5 16.5h17" />
    </Icon>
  );
}

/** فانوس فحص — حجر الجودة */
export function IconLantern(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.25 5a2.75 2.75 0 0 1 5.5 0" />
      <path d="M7.5 7.25h9" />
      <path d="M8.5 7.25 8 17.9a.6.6 0 0 0 .6.65h6.8a.6.6 0 0 0 .6-.65L15.5 7.25" />
      <path d="M12 11.1c1.35 1.5 1.35 3.1 0 4-1.35-.9-1.35-2.5 0-4Z" />
      <path d="M8.75 21h6.5" />
    </Icon>
  );
}

/** ميزان مطابقة — تسوية الأرصدة */
export function IconReconcile(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5v15" />
      <path d="M6 8h12" />
      <path d="M3.5 14a3 3 0 0 0 5 0L6 8Z" />
      <path d="M15.5 14a3 3 0 0 0 5 0L18 8Z" />
      <path d="M9 20.5h6" />
    </Icon>
  );
}

/* ------------------------------------------------- أنواع الطلبات والحالات */

/** خيمة — طلب عهدة */
export function IconTent(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 21.5 19.5H2.5Z" />
      <path d="M12 10.5 16 19.5H8Z" />
      <path d="M12 3v1.5" />
    </Icon>
  );
}

/** صندوق بزيادة — طلب كمية إضافية */
export function IconRestock(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="10.5" width="17" height="10" rx="1.75" />
      <path d="M3.5 14.5h17" />
      <path d="M12 3v5.5M9.25 5.5 12 3l2.75 2.5" />
    </Icon>
  );
}

/** عربة تزوّد — طلب شراء */
export function IconProcure(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.75 4.5h2.1a1 1 0 0 1 .98.8L8 15.5h9.5" />
      <path d="M6.6 7.5h13.65l-1.6 6.1a1 1 0 0 1-.97.75H7.9" />
      <circle cx="9.25" cy="19" r="1.6" />
      <circle cx="16.75" cy="19" r="1.6" />
    </Icon>
  );
}

/** رجم حجري — قيد الانتظار */
export function IconCairn(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5.5" y="17" width="13" height="3.5" rx="1.5" />
      <rect x="7.25" y="12.75" width="9.5" height="3.5" rx="1.5" />
      <rect x="9" y="8.5" width="6" height="3.5" rx="1.5" />
      <path d="M12 5.5v2" />
    </Icon>
  );
}

/** عدسة — قيد المراجعة */
export function IconLens(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="M15.4 15.4 20.5 20.5" />
      <path d="M8.5 10.75h4.5" />
    </Icon>
  );
}

/** درع بعلامة — مقبول */
export function IconApproved(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 19.5 6v5.4c0 4.6-3 7.7-7.5 9.6-4.5-1.9-7.5-5-7.5-9.6V6Z" />
      <path d="M8.75 11.75 11 14l4.25-4.25" />
    </Icon>
  );
}

/** درع بعلامة رفض — مرفوض */
export function IconRejected(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 19.5 6v5.4c0 4.6-3 7.7-7.5 9.6-4.5-1.9-7.5-5-7.5-9.6V6Z" />
      <path d="M9.75 9.75 14.25 14.25M14.25 9.75 9.75 14.25" />
    </Icon>
  );
}

/** دائرة مشطوبة — ملغى */
export function IconCancelled(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.75 17.25 17.25 6.75" />
    </Icon>
  );
}

/* ------------------------------------------------------------ إشارات */

/** صفّارة — تنبيه */
export function IconWhistle(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.75 9.5H5.5a4 4 0 0 0 0 8h4.25a4 4 0 0 0 3.9-3.05" />
      <path d="M12.75 9.5h6.75a1.25 1.25 0 0 1 0 2.5H12.9" />
      <circle cx="7.75" cy="13.5" r="1.5" />
    </Icon>
  );
}

/** شعار المجموعة — شارة مثلّثة بزهرة الشمال */
export function IconCrest(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.75 20 6v5.75c0 4.9-3.2 8.2-8 10.25-4.8-2.05-8-5.35-8-10.25V6Z" />
      <path d="M12 7v8" />
      <path d="M12 9.5 9.5 12.5M12 9.5l2.5 3" />
      <path d="M8.75 15.25h6.5" />
    </Icon>
  );
}

/** خروج */
export function IconExit(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.5 8.25V5.5A1.5 1.5 0 0 0 14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14a1.5 1.5 0 0 0 1.5-1.5v-2.75" />
      <path d="M10 12h10.5M17.75 9l3 3-3 3" />
    </Icon>
  );
}

/** قائمة */
export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

/** إغلاق */
export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
    </Icon>
  );
}

/** سهم رجوع — في واجهة عربية يتّجه لليمين */
export function IconBack(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12H4" />
      <path d="M10 6l-6 6 6 6" />
    </Icon>
  );
}

/** سهم تقدّم */
export function IconForward(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h16" />
      <path d="M14 6l6 6-6 6" />
    </Icon>
  );
}

/** إضافة */
export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

/** إنقاص */
export function IconMinus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  );
}

/** علامة صحّ */
export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5 10 17.5 19 6.5" />
    </Icon>
  );
}

/** بحث */
export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.75 15.75 20.5 20.5" />
    </Icon>
  );
}

/** تقويم */
export function IconCalendar(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M8 3.5v4M16 3.5v4" />
    </Icon>
  );
}

/** ملاحظة */
export function IconNote(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 12.5c0 3.9-3.8 7-8.5 7a9.7 9.7 0 0 1-2.6-.35L4.5 20.5l1.4-3.9A6.6 6.6 0 0 1 3.5 12.5c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z" />
      <path d="M8.75 11h6.5M8.75 14h4" />
    </Icon>
  );
}

/** تعديل */
export function IconEdit(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 19.5h4l10-10a2.12 2.12 0 0 0-3-3l-10 10Z" />
      <path d="M14.75 5.75 18.25 9.25" />
    </Icon>
  );
}

/** حذف */
export function IconTrash(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5.25A1.25 1.25 0 0 1 10.75 4h2.5a1.25 1.25 0 0 1 1.25 1.25V7" />
      <path d="M6.5 7l.9 12.1A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10.5 10.75v6M13.5 10.75v6" />
    </Icon>
  );
}

/** إرسال */
export function IconSend(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 3.5 10.75 13.25" />
      <path d="M20.5 3.5 14.5 20.5l-3.75-7.25L3.5 9.5Z" />
    </Icon>
  );
}

/** مفتاح — كلمة المرور */
export function IconKey(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="4.25" />
      <path d="M11 11l8.5 8.5" />
      <path d="M16.25 15.75l-1.75 1.75M18.5 18l-1.75 1.75" />
    </Icon>
  );
}

/** إضافة عضو */
export function IconTroopAdd(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="8.5" r="3.5" />
      <path d="M4 20c0-3.3 2.7-6 6-6 1.3 0 2.5.4 3.5 1.1" />
      <path d="M17.5 15v5M15 17.5h5" />
    </Icon>
  );
}

/** إضافة تصنيف */
export function IconCategoryAdd(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 12.5V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v.5" />
      <path d="M15.5 12.5h5M18 10v5" />
    </Icon>
  );
}

/** سهم كشف — يتّجه لأسفل ويدور عند الفتح */
export function IconChevron(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </Icon>
  );
}

/** فتح في صفحة */
export function IconExternal(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 4.5h6v6" />
      <path d="M19.5 4.5 11 13" />
      <path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4" />
    </Icon>
  );
}

/** معلومة */
export function IconInfo(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.8" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** دخول */
export function IconEnter(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 8.25V5.5A1.5 1.5 0 0 1 10 4h7.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H10a1.5 1.5 0 0 1-1.5-1.5v-2.75" />
      <path d="M14 12H3.5M6.25 9l-3 3 3 3" />
    </Icon>
  );
}
