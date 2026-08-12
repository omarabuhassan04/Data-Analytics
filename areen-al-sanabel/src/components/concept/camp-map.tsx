"use client";

import { Minus, Plus, RotateCcw, RotateCw, Maximize2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * خريطة المخيّم التفاعلية — معاينة تصميم ببيانات تجريبية.
 * مرسومة على رقّ ينفرد عند الظهور، بتضاريس متعدّدة المستويات،
 * ودبابيس نابضة، ومسارات ضوئية متحرّكة بين المحطّات.
 */

type Station = {
  id: string;
  name: string;
  x: number;
  y: number;
  tone: "fire" | "water" | "rope" | "peak";
};

const STATIONS: Station[] = [
  { id: "campfire", name: "حلقة النار", x: 300, y: 300, tone: "fire" },
  { id: "rope", name: "جسر الحبال", x: 152, y: 214, tone: "rope" },
  { id: "lake", name: "بحيرة الفجر", x: 470, y: 196, tone: "water" },
  { id: "watch", name: "برج المراقبة", x: 404, y: 92, tone: "peak" },
  { id: "knots", name: "ساحة العقد", x: 205, y: 372, tone: "rope" },
  { id: "summit", name: "قمّة الاستكشاف", x: 552, y: 330, tone: "peak" },
];

/** المسارات بين المحطّات — تُرسم كخطوط ضوئية متحرّكة */
const TRAILS: [string, string][] = [
  ["campfire", "rope"],
  ["campfire", "lake"],
  ["campfire", "knots"],
  ["lake", "watch"],
  ["lake", "summit"],
];

const TONE_COLOR: Record<Station["tone"], string> = {
  fire: "#ff8a24",
  water: "#56c8e0",
  rope: "#d8ab5c",
  peak: "#7fe6d0",
};

function station(id: string): Station {
  return STATIONS.find((entry) => entry.id === id)!;
}

export function CampMap() {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [active, setActive] = useState<string | null>("campfire");

  const clampZoom = (value: number) => Math.min(2.2, Math.max(0.7, Number(value.toFixed(2))));

  return (
    <div className="relative">
      {/* أدوات التحكّم */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="holo-panel led-edge flex items-center gap-1 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - 0.15))}
            aria-label="تصغير الخريطة"
            className="grid size-9 place-items-center rounded-lg text-[#a8c2bd] transition-colors hover:bg-white/10 hover:text-[#dff3ee]"
          >
            <Minus className="size-4" />
          </button>
          <span className="tabular min-w-14 text-center text-xs font-bold text-[#7fe6d0]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + 0.15))}
            aria-label="تكبير الخريطة"
            className="grid size-9 place-items-center rounded-lg text-[#a8c2bd] transition-colors hover:bg-white/10 hover:text-[#dff3ee]"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="holo-panel led-edge flex items-center gap-1 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setRotation((r) => r - 15)}
            aria-label="تدوير يسارًا"
            className="grid size-9 place-items-center rounded-lg text-[#a8c2bd] transition-colors hover:bg-white/10 hover:text-[#dff3ee]"
          >
            <RotateCcw className="size-4" />
          </button>
          <span className="tabular min-w-14 text-center text-xs font-bold text-[#7fe6d0]">
            {rotation}°
          </span>
          <button
            type="button"
            onClick={() => setRotation((r) => r + 15)}
            aria-label="تدوير يمينًا"
            className="grid size-9 place-items-center rounded-lg text-[#a8c2bd] transition-colors hover:bg-white/10 hover:text-[#dff3ee]"
          >
            <RotateCw className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setRotation(0);
          }}
          className="holo-panel led-edge inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#a8c2bd] transition-colors hover:text-[#dff3ee]"
        >
          <Maximize2 className="size-4" />
          إعادة الضبط
        </button>
      </div>

      {/* الرقّ */}
      <div className="unfurl overflow-hidden rounded-2xl border-2 border-[#8a6220] shadow-[0_28px_60px_-24px_rgba(0,0,0,0.9)]">
        <div
          className="relative aspect-[16/10] w-full overflow-hidden"
          style={{ background: "linear-gradient(168deg, #e8d8ae 0%, #d9c290 45%, #c2a874 100%)" }}
        >
          {/* نسيج الرقّ */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23p)'/%3E%3C/svg%3E\")",
            }}
          />
          {/* حواف محروقة */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 50% 50%, transparent 52%, rgba(120,80,30,0.35) 82%, rgba(70,42,14,0.6) 100%)",
            }}
          />

          <svg
            viewBox="0 0 700 440"
            className="absolute inset-0 h-full w-full transition-transform duration-500 ease-out"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            role="img"
            aria-label="خريطة مخيّم تجريبية تعرض ستّ محطّات ومسارات بينها"
          >
            {/* تضاريس متعدّدة المستويات */}
            <g fill="none" stroke="#8a6a34" strokeWidth="1.1" opacity="0.5">
              <path d="M40,120 C140,66 250,96 340,58 C430,20 560,48 664,26" />
              <path d="M34,152 C136,98 250,128 342,90 C434,52 566,80 668,58" />
              <path d="M30,186 C134,132 252,162 346,124 C440,86 570,114 672,92" />
              <path d="M44,392 C150,352 232,400 330,376 C428,352 560,392 660,368" />
              <path d="M48,414 C154,374 236,422 334,398 C432,374 564,414 664,390" />
            </g>

            {/* البحيرة */}
            <g>
              <path
                d="M418,168 C466,146 546,158 566,196 C584,232 546,264 490,258 C436,252 398,224 404,198 Z"
                fill="#7fc4d8"
                opacity="0.55"
              />
              <path
                d="M418,168 C466,146 546,158 566,196 C584,232 546,264 490,258 C436,252 398,224 404,198 Z"
                fill="none"
                stroke="#3f7f96"
                strokeWidth="1.6"
              />
              <path d="M432,204 C452,194 486,196 500,208" stroke="#3f7f96" strokeWidth="1" fill="none" opacity="0.6" />
              <path d="M446,222 C466,212 496,214 512,226" stroke="#3f7f96" strokeWidth="1" fill="none" opacity="0.45" />
            </g>

            {/* غابة */}
            <g fill="#5c7a3a" opacity="0.75">
              {[
                [96, 300], [124, 322], [78, 336], [148, 296], [612, 236], [640, 260],
                [596, 272], [190, 150], [216, 172], [166, 178], [534, 388], [566, 404],
              ].map(([x, y], index) => (
                <g key={index} transform={`translate(${x},${y})`}>
                  <path d="M0,-18 L9,4 L-9,4 Z" />
                  <path d="M0,-8 L11,14 L-11,14 Z" />
                  <rect x="-1.6" y="14" width="3.2" height="6" fill="#6b4a2c" />
                </g>
              ))}
            </g>

            {/* المسارات الضوئية */}
            <g>
              {TRAILS.map(([fromId, toId]) => {
                const from = station(fromId);
                const to = station(toId);
                const midX = (from.x + to.x) / 2 + (to.y - from.y) * 0.14;
                const midY = (from.y + to.y) / 2 - (to.x - from.x) * 0.14;
                const d = `M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`;
                return (
                  <g key={`${fromId}-${toId}`}>
                    <path d={d} stroke="#8a6a34" strokeWidth="3.4" fill="none" opacity="0.4" />
                    <path
                      className="map-trail"
                      d={d}
                      stroke="#fff0c2"
                      strokeWidth="2.4"
                      fill="none"
                      strokeLinecap="round"
                      style={{ filter: "drop-shadow(0 0 4px rgba(255,190,80,0.95))" }}
                    />
                  </g>
                );
              })}
            </g>

            {/* الدبابيس */}
            {STATIONS.map((entry, index) => {
              const color = TONE_COLOR[entry.tone];
              const isActive = active === entry.id;
              return (
                <g key={entry.id} transform={`translate(${entry.x},${entry.y})`}>
                  <circle
                    className="pin-halo"
                    r="16"
                    fill={color}
                    style={{ "--period": `${2.2 + index * 0.3}s`, "--delay": `${index * 0.4}s` } as React.CSSProperties}
                  />
                  <circle r="11" fill="#2b1c0c" opacity="0.35" />
                  <circle r="9" fill={color} stroke="#3a2712" strokeWidth="1.6" />
                  <circle r="3.4" fill="#2b1c0c" opacity="0.75" />

                  {/* منطقة نقر كبيرة لسهولة الاستخدام */}
                  <circle
                    r="22"
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onClick={() => setActive(entry.id)}
                  />

                  <g transform={`rotate(${-rotation})`}>
                    <rect
                      x="-52"
                      y="-46"
                      width="104"
                      height="24"
                      rx="7"
                      fill={isActive ? "#2b1c0c" : "rgba(43,28,12,0.72)"}
                      stroke={isActive ? color : "transparent"}
                      strokeWidth="1.4"
                    />
                    <text
                      x="0"
                      y="-29"
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="700"
                      fill="#f4e6c4"
                      fontFamily="Cairo, system-ui, sans-serif"
                    >
                      {entry.name}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* وردة الشمال */}
            <g transform="translate(72,68)" opacity="0.75">
              <circle r="26" fill="none" stroke="#8a6a34" strokeWidth="1.4" />
              <polygon points="0,-24 5,-4 0,0 -5,-4" fill="#a8452f" />
              <polygon points="0,24 -5,4 0,0 5,4" fill="#6b4a2c" />
              <text
                x="0"
                y="-30"
                textAnchor="middle"
                fontSize="13"
                fontWeight="800"
                fill="#6b4a2c"
                fontFamily="Cairo, system-ui, sans-serif"
              >
                ش
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* بطاقة المحطّة المختارة */}
      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {STATIONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActive(entry.id)}
              aria-pressed={active === entry.id}
              className={cn(
                "trail-btn led-edge rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                active === entry.id
                  ? "bg-[rgba(86,224,200,0.16)] text-[#b6ffe9]"
                  : "bg-[rgba(10,16,20,0.6)] text-[#a8c2bd] hover:text-[#dff3ee]",
              )}
            >
              <span
                className="relative me-1.5 inline-block size-2 rounded-full align-middle"
                style={{ background: TONE_COLOR[entry.tone] }}
              />
              <span className="relative">{entry.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
