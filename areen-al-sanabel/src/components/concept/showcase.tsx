"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Compass,
  Flame,
  LayoutDashboard,
  LifeBuoy,
  Leaf,
  Map as MapIcon,
  Mountain,
  Tent,
  TriangleAlert,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { CampMap } from "@/components/concept/camp-map";
import { JourneyStage } from "@/components/concept/journey";
import { ForestBackdrop } from "@/components/kinetic/forest-backdrop";
import { CompassMechanism } from "@/components/kinetic/mechanism";
import { FiberProgress, HoloPanel, RopeFrame } from "@/components/kinetic/parts";
import { cn } from "@/lib/cn";

/* ------------------------------------------------- بيانات تجريبية للعرض */

const TABS = [
  { id: "dashboard", label: "لوحة القيادة", icon: <LayoutDashboard className="size-[18px]" /> },
  { id: "adventures", label: "المغامرات", icon: <Mountain className="size-[18px]" /> },
  { id: "badges", label: "الشارات", icon: <Award className="size-[18px]" /> },
  { id: "resources", label: "المصادر", icon: <BookOpen className="size-[18px]" /> },
  { id: "profile", label: "الملف", icon: <User className="size-[18px]" /> },
] as const;

type TabId = (typeof TABS)[number]["id"];

const MY_BADGES = [
  { label: "عقد وربطات", value: 8, max: 10, tone: "cool" as const },
  { label: "تخييم واستكشاف", value: 6, max: 12, tone: "warm" as const },
  { label: "إسعافات أولية", value: 9, max: 9, tone: "cool" as const },
  { label: "ملاحة وخرائط", value: 3, max: 10, tone: "hot" as const },
];

const ADVENTURE_LOG = [
  { label: "مخيّم غابات دبين", value: 4, max: 4, tone: "cool" as const },
  { label: "مسير وادي الموجب", value: 7, max: 12, tone: "warm" as const },
  { label: "ليلة الرصد الفلكي", value: 2, max: 6, tone: "warm" as const },
  { label: "تحدّي جسر الحبال", value: 1, max: 8, tone: "hot" as const },
];

const ADVENTURES = [
  { name: "مخيّم غابات دبين", when: "١٢–١٤ آب", level: "متوسّط", icon: <Tent className="size-5" /> },
  { name: "مسير وادي الموجب", when: "٢٦ آب", level: "متقدّم", icon: <Mountain className="size-5" /> },
  { name: "ليلة الرصد الفلكي", when: "٣ أيلول", level: "مبتدئ", icon: <Compass className="size-5" /> },
  { name: "تحدّي جسر الحبال", when: "١٧ أيلول", level: "متقدّم", icon: <LifeBuoy className="size-5" /> },
];

const BADGE_GRID = [
  { name: "عقد وربطات", icon: <LifeBuoy className="size-6" />, earned: true },
  { name: "نار ومأوى", icon: <Flame className="size-6" />, earned: true },
  { name: "تخييم", icon: <Tent className="size-6" />, earned: true },
  { name: "ملاحة", icon: <Compass className="size-6" />, earned: false },
  { name: "خرائط", icon: <MapIcon className="size-6" />, earned: false },
  { name: "طبيعة", icon: <Leaf className="size-6" />, earned: true },
  { name: "تسلّق", icon: <Mountain className="size-6" />, earned: false },
  { name: "قيادة", icon: <Award className="size-6" />, earned: true },
];

const RESOURCES = [
  { name: "دليل العقد الأساسية", kind: "كتيّب", icon: <BookOpen className="size-5" /> },
  { name: "قراءة الخريطة والبوصلة", kind: "فيديو", icon: <Video className="size-5" /> },
  { name: "سلامة المخيّم", kind: "كتيّب", icon: <TriangleAlert className="size-5" /> },
  { name: "إشارات المسير", kind: "بطاقة", icon: <MapIcon className="size-5" /> },
];

/* ------------------------------------------------------------- الصفحة */

export function ConceptShowcase() {
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <div className="kinetic relative min-h-dvh overflow-hidden bg-[#04070c]">
      <ForestBackdrop className="pointer-events-none fixed inset-0" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* لافتة توضيحية — هذه معاينة تصميم لا جزء من النظام */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#ffb347]/40 bg-[rgba(42,20,8,0.8)] px-4 py-2.5 backdrop-blur-sm">
          <TriangleAlert className="size-4 shrink-0 text-[#ffb347]" />
          <p className="flex-1 text-xs font-bold text-[#ffd98a]">
            معاينة تصميم — المحتوى هنا تجريبي بالكامل ولا يتصل ببيانات النظام.
          </p>
          <Link
            href="/"
            className="text-xs font-bold text-[#7fe6d0] underline underline-offset-2 hover:text-[#b6ffe9]"
          >
            العودة إلى لوحة التحكم الحقيقية
          </Link>
        </div>

        {/* الترويسة المنحنية: خشب مصقول ونحاس */}
        <RopeFrame className="mb-5">
          <div
            className="relative overflow-hidden px-5 py-5 sm:px-7"
            style={{
              background:
                "linear-gradient(178deg, #4a3218 0%, #2e1f10 48%, #1b1209 100%)",
              borderRadius: "0 0 46% 46% / 0 0 18% 18%",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,transparent,#c99a3f,transparent)]"
            />
            <div className="relative flex flex-wrap items-center gap-5">
              <CompassMechanism size={112} className="drop-shadow-[0_0_22px_rgba(201,154,63,0.5)]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c99a3f]">
                  Areen Al-Sanabel
                </p>
                <h1 className="mt-1 text-2xl font-extrabold text-[#f7e6c4] sm:text-3xl">
                  لوحة القيادة الكشفية
                </h1>
                <p className="mt-1.5 text-sm text-[#c8a97c]">
                  رحلتك، شاراتك، ومغامرات المجموعة في مكان واحد
                </p>
              </div>
            </div>
          </div>
        </RopeFrame>

        {/* أزرار التنقّل المحفورة بحواف LED */}
        <nav className="mb-5 flex flex-wrap gap-2">
          {TABS.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              aria-pressed={tab === entry.id}
              style={{ "--delay": `${index * 0.3}s` } as React.CSSProperties}
              className={cn(
                "trail-btn led-edge flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors",
                tab === entry.id
                  ? "bg-[#0e2a28]/90 text-[#b6ffe9] shadow-[0_0_24px_-6px_rgba(86,224,200,0.75)]"
                  : "bg-[rgba(10,16,20,0.62)] text-[#a8c2bd] hover:text-[#dff3ee]",
              )}
            >
              <span className="relative">{entry.icon}</span>
              <span className="relative">{entry.label}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {tab === "dashboard" && (
              <>
                <HoloPanel className="overflow-hidden">
                  <SectionTitle
                    icon={<Compass className="size-5 text-[#7fe6d0]" />}
                    title="الرحلة"
                    subtitle="شاراتك تدور حولك وتتبدّل مع تقدّمك"
                  />
                  <JourneyStage />
                </HoloPanel>

                <div className="grid gap-5 lg:grid-cols-2">
                  <HoloPanel className="overflow-hidden">
                    <SectionTitle
                      icon={<Award className="size-5 text-[#7fe6d0]" />}
                      title="شاراتي"
                      subtitle="تقدّمك في كلّ مسار جدارة"
                    />
                    <div className="space-y-4 p-4 sm:p-5">
                      {MY_BADGES.map((badge) => (
                        <FiberProgress
                          key={badge.label}
                          label={badge.label}
                          value={badge.value}
                          max={badge.max}
                          tone={badge.tone}
                          suffix="متطلّب"
                        />
                      ))}
                    </div>
                  </HoloPanel>

                  <HoloPanel className="overflow-hidden">
                    <SectionTitle
                      icon={<Mountain className="size-5 text-[#7fe6d0]" />}
                      title="سجلّ المغامرات"
                      subtitle="ما أنجزته من مهامّ كل رحلة"
                    />
                    <div className="space-y-4 p-4 sm:p-5">
                      {ADVENTURE_LOG.map((entry) => (
                        <FiberProgress
                          key={entry.label}
                          label={entry.label}
                          value={entry.value}
                          max={entry.max}
                          tone={entry.tone}
                          suffix="مهمّة"
                        />
                      ))}
                    </div>
                  </HoloPanel>
                </div>

                <HoloPanel className="overflow-hidden">
                  <SectionTitle
                    icon={<MapIcon className="size-5 text-[#7fe6d0]" />}
                    title="خريطة المخيّم التفاعلية"
                    subtitle="كبّر، دوّر، وتنقّل بين المحطّات"
                  />
                  <div className="p-4 sm:p-5">
                    <CampMap />
                  </div>
                </HoloPanel>
              </>
            )}

            {tab === "adventures" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {ADVENTURES.map((adventure) => (
                  <HoloPanel key={adventure.name} className="flex items-center gap-4 p-5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[rgba(86,224,200,0.12)] text-[#7fe6d0]">
                      {adventure.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#f0f8f6]">{adventure.name}</p>
                      <p className="mt-0.5 text-xs text-[#8fa8a3]">
                        {adventure.when} · مستوى {adventure.level}
                      </p>
                    </div>
                  </HoloPanel>
                ))}
              </div>
            )}

            {tab === "badges" && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {BADGE_GRID.map((badge) => (
                  <HoloPanel
                    key={badge.name}
                    className={cn(
                      "flex flex-col items-center gap-2 p-5 text-center",
                      !badge.earned && "opacity-55",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-14 place-items-center rounded-full border",
                        badge.earned
                          ? "border-[rgba(127,230,208,0.5)] bg-[rgba(86,224,200,0.12)] text-[#7fe6d0]"
                          : "border-[rgba(150,170,166,0.25)] bg-[rgba(255,255,255,0.04)] text-[#6f8a86]",
                      )}
                      style={
                        badge.earned
                          ? { boxShadow: "0 0 20px -5px rgba(86,224,200,0.7)" }
                          : undefined
                      }
                    >
                      {badge.icon}
                    </span>
                    <p className="text-sm font-bold text-[#dff3ee]">{badge.name}</p>
                    <p className="text-[11px] font-semibold text-[#8fa8a3]">
                      {badge.earned ? "محقّقة" : "قيد العمل"}
                    </p>
                  </HoloPanel>
                ))}
              </div>
            )}

            {tab === "resources" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {RESOURCES.map((resource) => (
                  <HoloPanel key={resource.name} className="flex items-center gap-4 p-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[rgba(255,179,71,0.12)] text-[#ffc978]">
                      {resource.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#f0f8f6]">{resource.name}</p>
                      <p className="mt-0.5 text-xs text-[#8fa8a3]">{resource.kind}</p>
                    </div>
                  </HoloPanel>
                ))}
              </div>
            )}

            {tab === "profile" && (
              <HoloPanel className="p-6">
                <div className="flex flex-wrap items-center gap-5">
                  <span className="grid size-20 place-items-center rounded-full bg-[rgba(86,224,200,0.12)] text-3xl font-extrabold text-[#7fe6d0]">
                    ر
                  </span>
                  <div>
                    <p className="text-xl font-extrabold text-[#f0f8f6]">رائدة الفرقة</p>
                    <p className="mt-0.5 text-sm text-[#8fa8a3]">فرقة الأشبال · عضوة منذ ٢٠٢٣</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <Stat label="شارات محقّقة" value="٥" />
                  <Stat label="مغامرات" value="١٢" />
                  <Stat label="ساعات خدمة" value="٤٨" />
                </div>
              </HoloPanel>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[color:var(--panel-line)] p-4 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(86,224,200,0.1)]">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-bold text-[#f0f8f6] sm:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[#8fa8a3]">{subtitle}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--panel-line)] bg-[rgba(10,16,20,0.55)] p-4 text-center">
      <p className="text-2xl font-extrabold text-[#7fe6d0]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#a8c2bd]">{label}</p>
    </div>
  );
}
