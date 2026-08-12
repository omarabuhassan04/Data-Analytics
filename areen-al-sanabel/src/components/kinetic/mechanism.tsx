"use client";

import { cn } from "@/lib/cn";

/** تقريب نواتج المثلّثات — يمنع اختلاف الترطيب بين الخادم والمتصفّح */
const round3 = (value: number) => Number(value.toFixed(3));

/** ترس نحاسي بأسنان مولّدة حسابيًا */
function Gear({
  cx,
  cy,
  radius,
  teeth,
  reverse = false,
  spin = 26,
  fill = "#c99a3f",
  rim = "#7f5a1d",
}: {
  cx: number;
  cy: number;
  radius: number;
  teeth: number;
  reverse?: boolean;
  spin?: number;
  fill?: string;
  rim?: string;
}) {
  const toothWidth = (2 * Math.PI * radius) / teeth / 2.1;

  return (
    <g
      className={reverse ? "gear-rev" : "gear"}
      style={{ "--spin": `${spin}s`, transformOrigin: `${cx}px ${cy}px` } as React.CSSProperties}
    >
      {Array.from({ length: teeth }, (_, index) => {
        const angle = (index * 360) / teeth;
        return (
          <rect
            key={index}
            x={round3(cx - toothWidth / 2)}
            y={round3(cy - radius - toothWidth * 0.72)}
            width={round3(toothWidth)}
            height={round3(toothWidth * 0.95)}
            rx={round3(toothWidth * 0.22)}
            fill={fill}
            transform={`rotate(${round3(angle)} ${cx} ${cy})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={radius} fill={fill} />
      <circle cx={cx} cy={cy} r={radius * 0.74} fill={rim} />
      <circle cx={cx} cy={cy} r={radius * 0.62} fill={fill} />
      {/* فتحات التخفيف */}
      {Array.from({ length: 5 }, (_, index) => {
        const angle = ((index * 360) / 5) * (Math.PI / 180);
        return (
          <circle
            key={`hole-${index}`}
            cx={round3(cx + Math.cos(angle) * radius * 0.4)}
            cy={round3(cy + Math.sin(angle) * radius * 0.4)}
            r={round3(radius * 0.11)}
            fill={rim}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={radius * 0.16} fill={rim} />
    </g>
  );
}

/**
 * آلية البوصلة: ثلاثة تروس متشابكة تدور باتجاهات متعاكسة،
 * وقرص بوصلة يدور ببطء في المنتصف.
 */
export function CompassMechanism({
  size = 96,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id="mechFace" cx="0.38" cy="0.32">
          <stop offset="0%" stopColor="#22303a" />
          <stop offset="70%" stopColor="#101a22" />
          <stop offset="100%" stopColor="#080f14" />
        </radialGradient>
        <linearGradient id="mechRim" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#f7dfa0" />
          <stop offset="38%" stopColor="#c99a3f" />
          <stop offset="70%" stopColor="#7f5a1d" />
          <stop offset="100%" stopColor="#d8b160" />
        </linearGradient>
      </defs>

      {/* التروس الجانبية */}
      <Gear cx={22} cy={30} radius={14} teeth={10} spin={22} />
      <Gear cx={98} cy={34} radius={11} teeth={9} reverse spin={17} />
      <Gear cx={30} cy={96} radius={10} teeth={8} reverse spin={19} />
      <Gear cx={94} cy={92} radius={13} teeth={10} spin={25} />

      {/* الترس الحامل للبوصلة */}
      <Gear cx={60} cy={62} radius={40} teeth={20} spin={54} fill="#b8873a" rim="#6b4a18" />

      {/* قرص البوصلة */}
      <circle cx="60" cy="62" r="30" fill="url(#mechRim)" />
      <circle cx="60" cy="62" r="26" fill="url(#mechFace)" />

      <g stroke="#7fe6d0" strokeLinecap="round" opacity="0.85">
        {Array.from({ length: 16 }, (_, index) => {
          const angle = (index * 22.5 * Math.PI) / 180;
          const long = index % 4 === 0;
          const outer = 24;
          const inner = long ? 18.5 : 21.5;
          return (
            <line
              key={index}
              x1={round3(60 + Math.sin(angle) * inner)}
              y1={round3(62 - Math.cos(angle) * inner)}
              x2={round3(60 + Math.sin(angle) * outer)}
              y2={round3(62 - Math.cos(angle) * outer)}
              strokeWidth={long ? 1.6 : 0.8}
            />
          );
        })}
      </g>

      {/* الوردة الدوّارة */}
      <g className="gear" style={{ "--spin": "48s", transformOrigin: "60px 62px" } as React.CSSProperties}>
        <polygon points="60,42 63.5,62 60,66 56.5,62" fill="#e2725b" />
        <polygon points="60,82 56.5,62 60,58 63.5,62" fill="#cfd8de" />
        <polygon points="80,62 60,65.5 56,62 60,58.5" fill="#8a949c" opacity="0.75" />
        <polygon points="40,62 60,58.5 64,62 60,65.5" fill="#8a949c" opacity="0.75" />
      </g>
      <circle cx="60" cy="62" r="3" fill="#c99a3f" stroke="#f3dca6" strokeWidth="0.8" />

      {/* لمعة الزجاج */}
      <circle
        cx="60"
        cy="62"
        r="26"
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.4"
      />
    </svg>
  );
}
