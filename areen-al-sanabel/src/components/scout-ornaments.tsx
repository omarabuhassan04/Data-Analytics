"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/cn";

/**
 * طقم الزخارف الكشفية للمشهد الليلي — كلها SVG خالص بلا صور:
 * بوصلة نحاسية، عقد حبال، خطّافات معدنية، شارات جدارة، عقدة منديل (ووغل)،
 * وخريطة مخيّم محفورة.
 */

/**
 * تقريب نواتج الدوال المثلّثية إلى ٣ منازل.
 * ضروري وليس تجميليًا: Math.sin/‏cos قد تُرجع فروقًا في آخر رقم عشري بين
 * Node على الخادم ومحرّك المتصفّح، فيسجّل React خطأ عدم تطابق الترطيب.
 */
const round3 = (value: number) => Number(value.toFixed(3));

/* ---------------------------------------------------------------- البوصلة */

/** بوصلة نحاسية عتيقة، إبرتها تتأرجح ثم تستقرّ نحو الشمال */
export function BrassCompass({
  size = 46,
  glow = false,
  className,
}: {
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      style={glow ? { filter: "drop-shadow(0 0 10px rgba(255,176,64,0.65))" } : undefined}
      aria-hidden
    >
      <defs>
        <linearGradient id="compassRim" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#f7dfa0" />
          <stop offset="35%" stopColor="#c99a3f" />
          <stop offset="65%" stopColor="#8a6220" />
          <stop offset="100%" stopColor="#d8b160" />
        </linearGradient>
        <radialGradient id="compassFace" cx="0.38" cy="0.32">
          <stop offset="0%" stopColor="#2b2118" />
          <stop offset="70%" stopColor="#16100b" />
          <stop offset="100%" stopColor="#0d0906" />
        </radialGradient>
        <linearGradient id="compassGlass" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <rect x="28.5" y="1" width="7" height="7" rx="3.5" fill="url(#compassRim)" />
      <circle cx="32" cy="33" r="29" fill="url(#compassRim)" />
      <circle cx="32" cy="33" r="25" fill="#6d4d1c" />
      <circle cx="32" cy="33" r="23.5" fill="url(#compassFace)" />

      <g stroke="#d8b160" strokeLinecap="round" opacity="0.85">
        {Array.from({ length: 24 }, (_, index) => {
          const angle = (index * 15 * Math.PI) / 180;
          const long = index % 6 === 0;
          const outer = 21.5;
          const inner = long ? 17 : 19.4;
          return (
            <line
              key={index}
              x1={round3(32 + Math.sin(angle) * inner)}
              y1={round3(33 - Math.cos(angle) * inner)}
              x2={round3(32 + Math.sin(angle) * outer)}
              y2={round3(33 - Math.cos(angle) * outer)}
              strokeWidth={long ? 1.5 : 0.8}
            />
          );
        })}
      </g>

      <g
        fill="#e8c883"
        fontSize="7"
        fontWeight="700"
        textAnchor="middle"
        fontFamily="Cairo, system-ui, sans-serif"
      >
        <text x="32" y="18.5">ش</text>
        <text x="32" y="51.5">ج</text>
        <text x="15.5" y="36">غ</text>
        <text x="48.5" y="36">ق</text>
      </g>

      <motion.g
        style={{ originX: "32px", originY: "33px" }}
        initial={reduceMotion ? false : { rotate: -26 }}
        animate={{ rotate: reduceMotion ? 0 : [-26, 9, -4, 1.5, 0] }}
        transition={{ duration: 2.6, delay: 1, ease: "easeOut" }}
      >
        <polygon points="32,15 35,33 32,36 29,33" fill="#d03a2c" />
        <polygon points="32,51 29,33 32,30 35,33" fill="#cfd4da" />
      </motion.g>
      <circle cx="32" cy="33" r="2.4" fill="#8a6220" stroke="#f0d69b" strokeWidth="0.7" />
      <circle cx="32" cy="33" r="23.5" fill="url(#compassGlass)" />
    </svg>
  );
}

/* ------------------------------------------------------------ عقدة الحبل */

/** عقدة حبل مربوطة يدويًا — تُوضع على زوايا الإطار */
export function RopeKnot({ size = 46, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="knotStrand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e3ba74" />
          <stop offset="45%" stopColor="#b3833a" />
          <stop offset="100%" stopColor="#7d5822" />
        </linearGradient>
      </defs>

      {/* الخصلة السفلى (تمرّ تحت) */}
      <g fill="none" stroke="#6d4a1c" strokeWidth="9" strokeLinecap="round">
        <path d="M7,31 C7,17 19,11 27,19" />
        <path d="M41,19 C47,26 41,38 29,34" />
      </g>
      {/* الخصلة العليا (تمرّ فوق) */}
      <g fill="none" stroke="url(#knotStrand)" strokeWidth="8" strokeLinecap="round">
        <path d="M7,31 C7,17 19,11 27,19" />
        <path d="M13,36 C24,41 33,33 35,23" />
      </g>
      <g fill="none" stroke="url(#knotStrand)" strokeWidth="8" strokeLinecap="round">
        <path d="M41,19 C47,26 41,38 29,34" />
      </g>
      {/* جديلة الحبل */}
      <g fill="none" stroke="#5d3f18" strokeWidth="1.1" strokeLinecap="round" opacity="0.55">
        <path d="M7,31 C7,17 19,11 27,19" strokeDasharray="1.5 4" />
        <path d="M13,36 C24,41 33,33 35,23" strokeDasharray="1.5 4" />
        <path d="M41,19 C47,26 41,38 29,34" strokeDasharray="1.5 4" />
      </g>
    </svg>
  );
}

/* ----------------------------------------------------------- خطّاف معدني */

/** خطّاف تسلّق (كارابينر) معدني بحلقة قفل */
export function Carabiner({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 40 60" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#eef2f6" />
          <stop offset="28%" stopColor="#9aa5b1" />
          <stop offset="55%" stopColor="#5d6874" />
          <stop offset="78%" stopColor="#aab4bf" />
          <stop offset="100%" stopColor="#6b7682" />
        </linearGradient>
        <linearGradient id="steelDim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7d8794" />
          <stop offset="100%" stopColor="#454e59" />
        </linearGradient>
      </defs>

      {/* الجسم على شكل حرف D */}
      <path
        d="M20,4 C31,4 36,13 36,29 C36,45 31,55 20,55 C11,55 6,47 6,36 C6,26 10,20 17,18"
        fill="none"
        stroke="url(#steel)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* البوّابة */}
      <path
        d="M17,18 C22,16 27,14 31,13"
        fill="none"
        stroke="url(#steelDim)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* طوق القفل */}
      <rect
        x="20"
        y="12"
        width="9"
        height="7"
        rx="3"
        transform="rotate(-14 24 15)"
        fill="url(#steel)"
        stroke="#3d454f"
        strokeWidth="0.6"
      />
      {/* بريق معدني */}
      <path
        d="M20,7 C29,7 33,15 33,29"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------------------------------------------------- شارات الجدارة */

export type MeritKind = "knots" | "camping" | "orienteering";

const MERIT_META: Record<MeritKind, { label: string; field: string; ink: string }> = {
  knots: { label: "عقد وربطات", field: "#5b2f22", ink: "#f0b46a" },
  camping: { label: "تخييم", field: "#1f4034", ink: "#8fd8ae" },
  orienteering: { label: "ملاحة", field: "#243a5e", ink: "#94bdf0" },
};

/** شارة جدارة مطرّزة — الحدّ المنقّط يحاكي الغرزة */
export function MeritBadge({
  kind,
  size = 56,
  className,
}: {
  kind: MeritKind;
  size?: number;
  className?: string;
}) {
  const meta = MERIT_META[kind];

  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={cn("shrink-0", className)} aria-hidden>
      {/* حافّة مطرّزة مسنّنة */}
      <circle cx="28" cy="28" r="26" fill="#e0c489" />
      <circle
        cx="28"
        cy="28"
        r="26"
        fill="none"
        stroke="#c9a55f"
        strokeWidth="3"
        strokeDasharray="2.6 3.4"
      />
      <circle cx="28" cy="28" r="22.5" fill={meta.field} />
      <circle
        cx="28"
        cy="28"
        r="24.5"
        fill="none"
        stroke={meta.field}
        strokeWidth="1.6"
        strokeDasharray="2 3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle
        cx="28"
        cy="28"
        r="19"
        fill="none"
        stroke="#e0c489"
        strokeWidth="1"
        strokeDasharray="1.6 3.2"
        opacity="0.6"
      />

      {kind === "knots" && (
        <g fill="none" stroke={meta.ink} strokeWidth="3.4" strokeLinecap="round">
          <path d="M17,22 C23,16 30,16 36,22" />
          <circle cx="22" cy="29" r="5" />
          <circle cx="34" cy="29" r="5" />
          <path d="M16,35 C20,40 25,41 28,38" />
          <path d="M40,35 C36,40 31,41 28,38" />
        </g>
      )}

      {kind === "camping" && (
        <g>
          <path d="M28,15 L40,36 L16,36 Z" fill={meta.ink} />
          <path d="M28,15 L28,36" stroke={meta.field} strokeWidth="2.4" />
          <path d="M28,24 L33,36 L23,36 Z" fill={meta.field} />
          <g fill="#f0a044">
            <path d="M20,42 C21,39 23,38 22,36 C25,37 26,40 24,43 Z" />
            <path d="M34,42 C35,39 37,38 36,36 C39,37 40,40 38,43 Z" />
          </g>
        </g>
      )}

      {kind === "orienteering" && (
        <g>
          <circle cx="28" cy="28" r="12.5" fill="none" stroke={meta.ink} strokeWidth="2.4" />
          <polygon points="28,17 32,29 28,32 24,29" fill="#e2725b" />
          <polygon points="28,39 24,29 28,26 32,29" fill={meta.ink} />
          <circle cx="28" cy="28" r="2" fill="#e0c489" />
        </g>
      )}
    </svg>
  );
}

export function meritLabel(kind: MeritKind): string {
  return MERIT_META[kind].label;
}

/* ------------------------------------------------------- عقدة المنديل (ووغل) */

/** ميدالية نحاسية بفأس ومجرفة متقاطعتين — تتصدّر زرّ الدخول */
export function WoggleCrest({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={cn("shrink-0", className)} aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#8a5f1d" />
      <circle cx="20" cy="20" r="16" fill="#c9942f" />
      <circle cx="20" cy="20" r="13" fill="#a8761f" />

      {/* الفأس */}
      <g transform="rotate(-32 20 20)">
        <rect x="19" y="8" width="2.4" height="24" rx="1.2" fill="#5d3f18" />
        <path d="M21,9 C26,9 29,12 29,15 C29,18 26,20 21,19 Z" fill="#f0e6d2" />
      </g>
      {/* المجرفة */}
      <g transform="rotate(32 20 20)">
        <rect x="18.8" y="8" width="2.4" height="22" rx="1.2" fill="#5d3f18" />
        <path d="M16.5,28 C16.5,33 23.5,33 23.5,28 C23.5,25 16.5,25 16.5,28 Z" fill="#cfd4da" />
      </g>
      <circle cx="20" cy="20" r="16" fill="none" stroke="#f5d489" strokeWidth="1.1" opacity="0.75" />
    </svg>
  );
}

/* -------------------------------------------------------- خريطة المخيّم */

/** خريطة مخيّم محفورة في الخشب — زخرفة خلفية خافتة جدًا */
export function EngravedCampMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <g fill="none" stroke="#f0d9a8" strokeWidth="1.1" strokeLinecap="round">
        {/* خطوط الكنتور */}
        <path d="M20,74 C74,44 130,58 168,40 C210,20 258,34 300,22" />
        <path d="M14,96 C70,66 132,80 172,60 C214,40 264,54 306,42" />
        <path d="M26,120 C82,92 138,104 176,86 C220,64 268,78 312,66" />
        {/* البحيرة */}
        <path d="M250,178 C284,164 330,172 344,196 C356,218 330,238 298,234 C266,230 240,212 244,196 Z" />
        <path d="M262,196 C276,188 296,190 306,200" opacity="0.6" />
        <path d="M270,208 C284,202 300,204 310,212" opacity="0.45" />
        {/* المسار المتقطّع */}
        <path d="M40,262 C96,240 118,196 168,186 C214,176 226,146 268,140" strokeDasharray="7 7" strokeWidth="1.5" />
        {/* الخيام */}
        <g strokeWidth="1.4">
          <path d="M92,206 L104,228 L80,228 Z" />
          <path d="M92,206 L92,228" />
          <path d="M128,222 L138,240 L118,240 Z" />
          <path d="M128,222 L128,240" />
          <path d="M62,232 L72,250 L52,250 Z" />
          <path d="M62,232 L62,250" />
        </g>
        {/* حلقة النار */}
        <circle cx="150" cy="256" r="11" strokeDasharray="3 4" />
        <path d="M147,258 C148,254 151,253 150,250 C154,252 155,256 152,259 Z" strokeWidth="1.2" />
        {/* سهم الشمال */}
        <g transform="translate(344,58)">
          <path d="M0,22 L0,-14" strokeWidth="1.6" />
          <path d="M-6,-6 L0,-16 L6,-6" strokeWidth="1.6" />
          <text
            x="0"
            y="34"
            fill="#f0d9a8"
            stroke="none"
            fontSize="13"
            fontWeight="700"
            textAnchor="middle"
            fontFamily="Cairo, system-ui, sans-serif"
          >
            ش
          </text>
        </g>
        {/* شجر */}
        <g strokeWidth="1.2">
          <path d="M196,246 L204,262 L188,262 Z" />
          <path d="M214,254 L221,268 L207,268 Z" />
          <path d="M40,182 L48,198 L32,198 Z" />
        </g>
      </g>
    </svg>
  );
}

