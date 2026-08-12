"use client";

import {
  Award,
  Compass as CompassIcon,
  Flame,
  Leaf,
  LifeBuoy,
  Map as MapIcon,
  Mountain,
  Tent,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * قسم «الرحلة» في صفحة المعاينة.
 * شخصية كشفية كاملة القوام بحركة مشي دائمة، يحيط بها سديم من الشارات
 * يدور ويتنفّس، وتطفو حولها مجسّمات عقد وبوصلات.
 *
 * هذه الصفحة معاينة تصميم ببيانات تجريبية — لا تتصل بقاعدة بيانات النظام.
 */

/* ------------------------------------------------------- الشخصية الكشفية */

export function ScoutCharacter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 250" className={cn("h-full w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="shirt" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#8d9760" />
          <stop offset="55%" stopColor="#6b7546" />
          <stop offset="100%" stopColor="#4d5531" />
        </linearGradient>
        <linearGradient id="shorts" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#40506d" />
          <stop offset="60%" stopColor="#2f3b52" />
          <stop offset="100%" stopColor="#212b3c" />
        </linearGradient>
        <linearGradient id="skin" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#e6b481" />
          <stop offset="70%" stopColor="#cf9a63" />
          <stop offset="100%" stopColor="#b07f4d" />
        </linearGradient>
        <linearGradient id="hat" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#c79c5c" />
          <stop offset="60%" stopColor="#9c7639" />
          <stop offset="100%" stopColor="#77592a" />
        </linearGradient>
        <linearGradient id="pack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7d4a24" />
          <stop offset="100%" stopColor="#4d2c14" />
        </linearGradient>
      </defs>

      {/* ظلّ أرضي */}
      <ellipse cx="70" cy="242" rx="34" ry="6" fill="rgba(0,0,0,0.45)" />

      <g className="walk-bob">
        {/* حقيبة الظهر خلف الجسم */}
        <g>
          <rect x="26" y="96" width="26" height="42" rx="9" fill="url(#pack)" />
          <rect x="29" y="106" width="20" height="9" rx="3" fill="#3a2010" opacity="0.8" />
          <rect x="31" y="123" width="16" height="6" rx="2" fill="#c99a3f" opacity="0.75" />
        </g>

        {/* الساق الخلفية */}
        <g className="limb" style={{ "--from-angle": "-19deg", "--to-angle": "17deg" } as React.CSSProperties}>
          <rect x="60" y="150" width="15" height="46" rx="7" fill="url(#skin)" />
          <rect x="59" y="192" width="17" height="16" rx="4" fill="#e8e2d4" />
          <rect x="57" y="205" width="21" height="12" rx="4" fill="#4a3320" />
        </g>

        {/* الذراع الخلفية */}
        <g
          className="limb"
          style={{ "--from-angle": "22deg", "--to-angle": "-18deg", "--delay": "0s" } as React.CSSProperties}
        >
          <rect x="46" y="98" width="13" height="42" rx="6.5" fill="url(#shirt)" />
          <circle cx="52.5" cy="143" r="7" fill="url(#skin)" />
        </g>

        {/* الجذع */}
        <path
          d="M50,96 C50,86 58,80 70,80 C82,80 90,86 90,96 L92,150 C92,156 86,159 70,159 C54,159 48,156 48,150 Z"
          fill="url(#shirt)"
        />
        {/* الشورت */}
        <path d="M49,146 L91,146 L92,170 C92,175 84,177 70,177 C56,177 48,175 48,170 Z" fill="url(#shorts)" />
        {/* الحزام */}
        <rect x="48" y="142" width="44" height="7" rx="3" fill="#3b2a16" />
        <rect x="64" y="141" width="12" height="9" rx="2.5" fill="#c99a3f" />

        {/* المنديل */}
        <path d="M58,82 L82,82 L70,106 Z" fill="#c0392b" />
        <path d="M58,82 C62,88 78,88 82,82 L70,90 Z" fill="#9c2b1f" />

        {/* شارات على الجيب */}
        <circle cx="82" cy="112" r="5.5" fill="#c99a3f" />
        <circle cx="82" cy="112" r="3.2" fill="#6b7546" />
        <rect x="54" y="106" width="12" height="4" rx="2" fill="#c99a3f" opacity="0.9" />
        <rect x="54" y="113" width="9" height="4" rx="2" fill="#7fe6d0" opacity="0.7" />

        {/* الساق الأمامية */}
        <g
          className="limb"
          style={{ "--from-angle": "18deg", "--to-angle": "-20deg", "--delay": "0s" } as React.CSSProperties}
        >
          <rect x="68" y="150" width="16" height="46" rx="7.5" fill="url(#skin)" />
          <rect x="67" y="192" width="18" height="16" rx="4" fill="#f2ede1" />
          <rect x="65" y="205" width="22" height="12" rx="4" fill="#5b3f27" />
        </g>

        {/* الرأس */}
        <g>
          <rect x="65" y="70" width="11" height="12" rx="4" fill="url(#skin)" />
          <circle cx="70" cy="58" r="18" fill="url(#skin)" />
          {/* ملامح مبسّطة */}
          <circle cx="63.5" cy="57" r="1.9" fill="#3a2414" />
          <circle cx="76.5" cy="57" r="1.9" fill="#3a2414" />
          <path d="M65,65 C68,68 72,68 75,65" stroke="#3a2414" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {/* القبّعة الكشفية */}
          <ellipse cx="70" cy="45" rx="30" ry="7.5" fill="url(#hat)" />
          <path d="M53,45 C53,32 60,26 70,26 C80,26 87,32 87,45 Z" fill="url(#hat)" />
          <path d="M53,44 C60,40 80,40 87,44 L87,47 C80,43 60,43 53,47 Z" fill="#5f4520" />
          <ellipse cx="70" cy="45" rx="30" ry="7.5" fill="none" stroke="#5f4520" strokeWidth="1.1" />
        </g>

        {/* الذراع الأمامية */}
        <g
          className="limb"
          style={{ "--from-angle": "-24deg", "--to-angle": "20deg", "--delay": "0s" } as React.CSSProperties}
        >
          <rect x="82" y="98" width="13" height="42" rx="6.5" fill="url(#shirt)" />
          <circle cx="88.5" cy="143" r="7" fill="url(#skin)" />
        </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------- شارة في السديم */

function NebulaBadge({
  icon,
  radius,
  period,
  delay,
  reverse,
  size = 46,
}: {
  icon: ReactNode;
  radius: number;
  period: number;
  delay: number;
  reverse?: boolean;
  size?: number;
}) {
  return (
    <span
      className="orbiting absolute left-1/2 top-1/2"
      style={
        {
          "--radius": `${radius}px`,
          "--period": `${period}s`,
          "--delay": `${delay}s`,
          "--dir": reverse ? "reverse" : "normal",
          marginInlineStart: -size / 2,
          marginTop: -size / 2,
        } as React.CSSProperties
      }
    >
      <span
        className="led-edge grid place-items-center rounded-full border border-[rgba(127,230,208,0.35)] bg-[rgba(10,24,26,0.55)] text-[#7fe6d0] backdrop-blur-sm"
        style={{ width: size, height: size, boxShadow: "0 0 18px -4px rgba(86,224,200,0.6)" }}
      >
        {icon}
      </span>
    </span>
  );
}

/* ------------------------------------------------ مجسّم عائم (عقدة/بوصلة) */

function FloatingModel({
  kind,
  className,
  style,
}: {
  kind: "knot" | "compass";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={cn("floating-model absolute", className)} style={style}>
      {kind === "knot" ? (
        <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
          <g fill="none" stroke="#d8ab5c" strokeWidth="6" strokeLinecap="round" opacity="0.85">
            <path d="M10,30 C10,16 22,10 30,18" />
            <path d="M14,36 C25,41 34,33 36,23" />
          </g>
          <g fill="none" stroke="#7d5822" strokeWidth="1.2" strokeDasharray="1.5 4" strokeLinecap="round">
            <path d="M10,30 C10,16 22,10 30,18" />
            <path d="M14,36 C25,41 34,33 36,23" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
          <circle cx="24" cy="24" r="20" fill="rgba(10,24,26,0.6)" stroke="#c99a3f" strokeWidth="3" />
          <circle cx="24" cy="24" r="14" fill="none" stroke="#7fe6d0" strokeWidth="1" opacity="0.6" />
          <polygon points="24,10 27,24 24,27 21,24" fill="#e2725b" />
          <polygon points="24,38 21,24 24,21 27,24" fill="#cfd8de" />
        </svg>
      )}
    </span>
  );
}

/* ----------------------------------------------------------- قسم الرحلة */

export function JourneyStage() {
  return (
    <div className="relative mx-auto flex h-[26rem] w-full max-w-2xl items-center justify-center">
      {/* نواة السديم */}
      <span
        aria-hidden
        className="nebula-core absolute size-[19rem] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(86,224,200,0.22), rgba(255,179,71,0.12) 52%, transparent 76%)",
          filter: "blur(14px)",
        }}
      />
      <span
        aria-hidden
        className="absolute size-[15rem] rounded-full border border-[rgba(127,230,208,0.18)]"
      />
      <span
        aria-hidden
        className="absolute size-[21rem] rounded-full border border-dashed border-[rgba(201,154,63,0.16)]"
      />

      {/* الشارات تدور حول الشخصية */}
      <div aria-hidden className="absolute inset-0">
        <NebulaBadge icon={<Tent className="size-5" />} radius={128} period={26} delay={0} />
        <NebulaBadge icon={<CompassIcon className="size-5" />} radius={128} period={26} delay={-8.6} />
        <NebulaBadge icon={<Flame className="size-5" />} radius={128} period={26} delay={-17.3} />
        <NebulaBadge icon={<LifeBuoy className="size-4" />} radius={172} period={38} delay={0} reverse size={40} />
        <NebulaBadge icon={<Mountain className="size-4" />} radius={172} period={38} delay={-12.6} reverse size={40} />
        <NebulaBadge icon={<Leaf className="size-4" />} radius={172} period={38} delay={-25.3} reverse size={40} />
        <NebulaBadge icon={<Award className="size-4" />} radius={96} period={19} delay={-4} size={36} />
        <NebulaBadge icon={<MapIcon className="size-4" />} radius={96} period={19} delay={-13} size={36} />
      </div>

      {/* مجسّمات طافية */}
      <FloatingModel
        kind="knot"
        className="size-14"
        style={{ insetInlineStart: "8%", top: "16%", "--life": "8s", "--fx": "14px", "--fy": "-20px", "--tilt": "-8deg" } as React.CSSProperties}
      />
      <FloatingModel
        kind="compass"
        className="size-12"
        style={{ insetInlineEnd: "9%", top: "24%", "--life": "9.5s", "--delay": "1.2s", "--fx": "-12px", "--fy": "-16px", "--tilt": "10deg" } as React.CSSProperties}
      />
      <FloatingModel
        kind="knot"
        className="size-10"
        style={{ insetInlineEnd: "14%", bottom: "16%", "--life": "7.4s", "--delay": "2.6s", "--fx": "-9px", "--fy": "14px", "--tilt": "16deg" } as React.CSSProperties}
      />
      <FloatingModel
        kind="compass"
        className="size-9"
        style={{ insetInlineStart: "13%", bottom: "20%", "--life": "10.5s", "--delay": "0.6s", "--fx": "12px", "--fy": "12px", "--tilt": "-14deg" } as React.CSSProperties}
      />

      {/* الشخصية */}
      <div className="relative h-[19rem] w-[11rem] drop-shadow-[0_18px_28px_rgba(0,0,0,0.6)]">
        <ScoutCharacter />
      </div>
    </div>
  );
}
