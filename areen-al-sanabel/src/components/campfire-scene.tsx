"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { useIgnition } from "@/components/ignition";

/**
 * مشهد المخيّم الليلي خلف صفحة الدخول.
 *
 * كل عناصر المشهد مرسومة برمجيًا (SVG + تدرّجات CSS) ولا تعتمد على أي صورة:
 * لا تحميل إضافي، وتبقى حادّة على شاشات الدقّة العالية.
 *
 * ملاحظة عن التوليد العشوائي: تُستخدم بذرة ثابتة لأن المكوّن يُعرض على
 * الخادم والعميل معًا — لو استُخدم Math.random لاختلف الناتج بينهما
 * وحدث خطأ ترطيب (hydration mismatch).
 */

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round3 = (value: number) => Number(value.toFixed(3));

/** شجرة صنوبر بطبقات مثلّثة — نقطة الأصل عند قاعدة الجذع */
function pinePath(height: number, width: number): string {
  return [
    `M0,${-height}`,
    `L${-width * 0.34},${-height * 0.64}`,
    `L${-width * 0.2},${-height * 0.64}`,
    `L${-width * 0.63},${-height * 0.33}`,
    `L${-width * 0.42},${-height * 0.33}`,
    `L${-width},0`,
    `L${width},0`,
    `L${width * 0.42},${-height * 0.33}`,
    `L${width * 0.63},${-height * 0.33}`,
    `L${width * 0.2},${-height * 0.64}`,
    `L${width * 0.34},${-height * 0.64}`,
    "Z",
  ].join(" ");
}

/** شكل اللهب: قطرة غير متماثلة قليلًا لتبدو طبيعية */
function flamePath(width: number, height: number, lean = 0): string {
  return [
    "M0,0",
    `C${-width},${-height * 0.36} ${-width * 0.58},${-height * 0.74} ${lean},${-height}`,
    `C${width * 0.58 + lean},${-height * 0.74} ${width},${-height * 0.36} 0,0`,
    "Z",
  ].join(" ");
}

export function CampfireScene() {
  const reduceMotion = useReducedMotion();
  const { lit, struck } = useIgnition();
  const [handVisible, setHandVisible] = useState(false);

  // اليد تظهر لمرّة واحدة فقط عند إشعال المستخدم بنفسه
  useEffect(() => {
    if (!struck || reduceMotion) return;
    setHandVisible(true);
    const timer = window.setTimeout(() => setHandVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, [struck, reduceMotion]);

  const stars = useMemo(() => {
    const random = mulberry32(20260811);
    return Array.from({ length: 130 }, () => ({
      left: round3(random() * 100),
      top: round3(random() * 68),
      size: round3(0.6 + random() * 1.7),
      twinkle: round3(3 + random() * 5),
      delay: round3(random() * 6),
      opacity: round3(0.25 + random() * 0.6),
    }));
  }, []);

  const embers = useMemo(() => {
    const random = mulberry32(90210);
    return Array.from({ length: 22 }, () => ({
      offset: round3(-36 + random() * 72),
      drift: round3(-55 + random() * 110),
      size: round3(1.6 + random() * 2.6),
      life: round3(4 + random() * 4.5),
      delay: round3(random() * 7),
    }));
  }, []);

  const smoke = useMemo(() => {
    const random = mulberry32(5150);
    return Array.from({ length: 7 }, () => ({
      offset: round3(-30 + random() * 60),
      drift: round3(-30 + random() * 90),
      size: round3(26 + random() * 34),
      life: round3(8 + random() * 6),
      delay: round3(random() * 9),
      peak: round3(0.1 + random() * 0.14),
    }));
  }, []);

  const sparks = useMemo(() => {
    const random = mulberry32(31337);
    return Array.from({ length: 30 }, () => {
      const angle = -Math.PI / 2 + (random() - 0.5) * 1.5;
      const distance = 110 + random() * 190;
      return {
        sx: round3(Math.cos(angle) * distance),
        sy: round3(Math.sin(angle) * distance),
        size: round3(1.8 + random() * 3),
        life: round3(0.8 + random() * 0.9),
        delay: round3(random() * 0.35),
        warm: random() > 0.45,
      };
    });
  }, []);

  const ridges = useMemo(() => {
    const build = (seed: number, count: number, min: number, max: number) => {
      const random = mulberry32(seed);
      return Array.from({ length: count }, (_, index) => {
        const height = min + random() * (max - min);
        return {
          x: round3((index + 0.5) * (1200 / count) + (random() - 0.5) * 26),
          height: round3(height),
          width: round3(height * (0.3 + random() * 0.12)),
        };
      });
    };
    return { far: build(77, 30, 55, 125), near: build(1337, 20, 105, 205) };
  }, []);

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* سماء الليل */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 100%, #23160c 0%, #14100f 32%, #0a0d14 62%, #05070c 100%)",
        }}
      />

      {/* النجوم */}
      <div className="absolute inset-0">
        {stars.map((star, index) => (
          <span
            key={index}
            className="star absolute rounded-full bg-white"
            style={
              {
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                "--twinkle": `${star.twinkle}s`,
                "--delay": `${star.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
        <div
          className="absolute inset-x-0 top-[6%] h-40 opacity-[0.13] blur-2xl"
          style={{
            background:
              "linear-gradient(102deg, transparent 12%, #9fb6d8 38%, #cfe0f5 52%, #9fb6d8 66%, transparent 88%)",
          }}
        />
      </div>

      {/* صفّا أشجار الصنوبر — يزدادان وضوحًا مع اشتعال النار */}
      <motion.svg
        animate={{ opacity: lit ? 0.9 : 0.45 }}
        transition={{ duration: 1.6, ease }}
        className="absolute inset-x-0 bottom-[16%] h-[38vh] w-full"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
      >
        <g fill="#0b1119">
          {ridges.far.map((tree, index) => (
            <path key={index} d={pinePath(tree.height, tree.width)} transform={`translate(${tree.x},240)`} />
          ))}
        </g>
      </motion.svg>

      <motion.svg
        animate={{ opacity: lit ? 1 : 0.6 }}
        transition={{ duration: 1.6, ease }}
        className="absolute inset-x-0 bottom-[10%] h-[44vh] w-full"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
      >
        <g fill="#05080d">
          {ridges.near.map((tree, index) => (
            <path key={index} d={pinePath(tree.height, tree.width)} transform={`translate(${tree.x},240)`} />
          ))}
        </g>
      </motion.svg>

      {/* أرض المخيّم */}
      <div
        className="absolute inset-x-0 bottom-0 h-[22%]"
        style={{ background: "linear-gradient(180deg, #05070b 0%, #0b0906 45%, #120c07 100%)" }}
      />

      {/* بركة الضوء على الأرض */}
      <motion.div
        animate={{ opacity: lit ? 1 : 0.22 }}
        transition={{ duration: 1.8, ease }}
        className="absolute bottom-0 left-1/2 h-[26vh] w-[min(1100px,150vw)] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,146,45,0.30), rgba(255,120,20,0.12) 45%, transparent 78%)",
          filter: "blur(28px)",
        }}
      />

      {/* هالة النار */}
      <motion.div
        animate={{ opacity: lit ? 1 : 0.18, scale: lit ? 1 : 0.55 }}
        transition={{ duration: 1.6, ease }}
        className="fire-glow absolute bottom-[4vh] left-1/2 h-[62vh] w-[min(900px,130vw)] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,168,60,0.55), rgba(255,110,20,0.22) 42%, transparent 72%)",
          filter: "blur(34px)",
        }}
      />

      {/* خيوط الدخان */}
      {lit && !reduceMotion && (
        <div className="absolute bottom-[16vh] left-1/2 h-0 w-0">
          {smoke.map((tendril, index) => (
            <span
              key={index}
              className="smoke absolute rounded-full"
              style={
                {
                  left: tendril.offset,
                  width: tendril.size,
                  height: tendril.size * 1.4,
                  background:
                    "radial-gradient(closest-side, rgba(190,180,170,0.5), rgba(140,130,120,0))",
                  filter: "blur(9px)",
                  "--drift": `${tendril.drift}px`,
                  "--life": `${tendril.life}s`,
                  "--delay": `${tendril.delay}s`,
                  "--peak": tendril.peak,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* نار المخيّم */}
      <motion.div
        animate={{ scale: lit ? 1 : 0.42, opacity: lit ? 1 : 0.7, y: lit ? 0 : 26 }}
        transition={{ duration: 1.5, ease }}
        className="absolute bottom-[3vh] left-1/2 h-[clamp(190px,30vh,320px)] w-[clamp(240px,34vw,380px)] -translate-x-1/2"
        style={{ transformOrigin: "50% 90%" }}
      >
        <svg viewBox="0 0 220 200" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="logBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b4a2c" />
              <stop offset="45%" stopColor="#3d2917" />
              <stop offset="100%" stopColor="#1a1109" />
            </linearGradient>
            <radialGradient id="coalGlow">
              <stop offset="0%" stopColor="#ffd08a" />
              <stop offset="45%" stopColor="#ff7a12" />
              <stop offset="100%" stopColor="rgba(180,50,0,0)" />
            </radialGradient>
            <filter id="softBlur" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
            <filter id="tinyBlur" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.6" />
            </filter>
          </defs>

          <g filter="url(#softBlur)">
            {[
              { cx: 96, cy: 163, rx: 26, ry: 9, breathe: 2.6, delay: 0 },
              { cx: 124, cy: 166, rx: 22, ry: 8, breathe: 3.4, delay: 0.7 },
              { cx: 110, cy: 158, rx: 30, ry: 10, breathe: 4.1, delay: 1.4 },
            ].map((coal, index) => (
              <ellipse
                key={index}
                className="coal"
                cx={coal.cx}
                cy={coal.cy}
                rx={coal.rx}
                ry={coal.ry}
                fill="url(#coalGlow)"
                style={{ "--breathe": `${coal.breathe}s`, "--delay": `${coal.delay}s` } as React.CSSProperties}
              />
            ))}
          </g>

          {/* الحطب المتراكم */}
          <g>
            <g transform="translate(110,158) rotate(-13)">
              <rect x="-76" y="-11" width="152" height="22" rx="11" fill="url(#logBody)" />
              <ellipse cx="-76" cy="0" rx="5.5" ry="11" fill="#6d4b2b" />
              <ellipse cx="-76" cy="0" rx="2.8" ry="6" fill="#8d6540" opacity="0.75" />
              <path d="M-60,-6 C-30,-9 20,-4 60,-7" stroke="#0f0a06" strokeWidth="1" fill="none" opacity="0.5" />
            </g>
            <g transform="translate(112,166) rotate(11)">
              <rect x="-68" y="-10" width="136" height="20" rx="10" fill="url(#logBody)" />
              <ellipse cx="68" cy="0" rx="5" ry="10" fill="#5f4228" />
              <ellipse cx="68" cy="0" rx="2.4" ry="5.4" fill="#835c37" opacity="0.7" />
            </g>
            <g transform="translate(96,150) rotate(-58)">
              <rect x="-46" y="-8" width="92" height="16" rx="8" fill="url(#logBody)" />
              <ellipse cx="-46" cy="0" rx="4" ry="8" fill="#6d4b2b" />
            </g>
            <ellipse cx="110" cy="152" rx="62" ry="12" fill="#ff8a24" opacity="0.18" />
          </g>

          {/* ألسنة اللهب */}
          <motion.g
            transform="translate(110,152)"
            animate={{ opacity: lit ? 1 : 0.35 }}
            transition={{ duration: 1.2 }}
          >
            <path
              className="flame"
              d={flamePath(46, 128, -6)}
              fill="#c2410c"
              opacity="0.55"
              filter="url(#softBlur)"
              style={{ "--sway": "3.4s", "--flicker": "2.3s" } as React.CSSProperties}
            />
            <path
              className="flame"
              d={flamePath(34, 104, 4)}
              fill="#f97316"
              opacity="0.85"
              filter="url(#tinyBlur)"
              style={{ "--sway": "2.5s", "--flicker": "1.6s", "--delay": "0.25s" } as React.CSSProperties}
            />
            <path
              className="flame"
              d={flamePath(23, 74, -3)}
              fill="#fbbf24"
              style={{ "--sway": "2.1s", "--flicker": "1.25s", "--delay": "0.5s" } as React.CSSProperties}
            />
            <path
              className="flame"
              d={flamePath(12, 44, 2)}
              fill="#fff3c4"
              style={{ "--sway": "1.7s", "--flicker": "0.95s", "--delay": "0.15s" } as React.CSSProperties}
            />
            <path
              className="flame"
              d={flamePath(13, 52, 8)}
              fill="#fb923c"
              opacity="0.8"
              transform="translate(-26,2) rotate(-12)"
              filter="url(#tinyBlur)"
              style={{ "--sway": "2.9s", "--flicker": "1.9s", "--delay": "0.8s" } as React.CSSProperties}
            />
            <path
              className="flame"
              d={flamePath(11, 42, -7)}
              fill="#fb923c"
              opacity="0.75"
              transform="translate(25,4) rotate(13)"
              filter="url(#tinyBlur)"
              style={{ "--sway": "3.1s", "--flicker": "2.1s", "--delay": "1.1s" } as React.CSSProperties}
            />
          </motion.g>
        </svg>

        {/* الجمر المتصاعد */}
        {lit && (
          <div className="absolute bottom-[34%] left-1/2 h-0 w-0">
            {embers.map((ember, index) => (
              <span
                key={index}
                className="ember absolute rounded-full"
                style={
                  {
                    left: ember.offset,
                    width: ember.size,
                    height: ember.size,
                    background: index % 3 === 0 ? "#ffe9b0" : "#ff9a2e",
                    boxShadow: "0 0 6px rgba(255,150,40,0.9)",
                    "--drift": `${ember.drift}px`,
                    "--life": `${ember.life}s`,
                    "--delay": `${ember.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}

        {/* انفجار الشرر لحظة الإشعال */}
        {lit && !reduceMotion && (
          <div className="absolute bottom-[36%] left-1/2 h-0 w-0">
            {sparks.map((spark, index) => (
              <span
                key={index}
                className="spark absolute rounded-full"
                style={
                  {
                    width: spark.size,
                    height: spark.size,
                    background: spark.warm ? "#ffd08a" : "#ff8a24",
                    boxShadow: "0 0 8px rgba(255,170,60,0.95)",
                    filter: "blur(0.4px)",
                    "--sx": `${spark.sx}px`,
                    "--sy": `${spark.sy}px`,
                    "--life": `${spark.life}s`,
                    "--delay": `${spark.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* اليد الرقمية وهي تقدح عود الفحم */}
      <AnimatePresence>
        {handVisible && (
          <motion.div
            key="hand"
            exit={{ opacity: 0 }}
            className="absolute bottom-[6vh] left-1/2 h-[clamp(150px,22vh,240px)] w-[clamp(180px,26vw,290px)] translate-x-[10%]"
          >
            <svg viewBox="0 0 200 180" className="striking-hand h-full w-full overflow-visible">
              <defs>
                <linearGradient id="skinRim" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#c9772f" />
                  <stop offset="55%" stopColor="#4a2a14" />
                  <stop offset="100%" stopColor="#180d06" />
                </linearGradient>
              </defs>

              {/* الساعد والقبضة — ظلّ داكن بحافّة مضاءة من النار */}
              <path
                d="M196,160 C170,150 146,132 128,110 C118,98 108,88 96,82 C84,76 76,64 82,54 C88,44 104,44 116,52 L150,76 C168,90 186,116 200,140 Z"
                fill="#0d0805"
              />
              <path
                d="M96,82 C84,76 76,64 82,54 C88,44 104,44 116,52 L138,68 C126,78 110,84 96,82 Z"
                fill="url(#skinRim)"
                opacity="0.9"
              />
              <path
                d="M84,58 C90,50 102,49 112,55"
                stroke="#ffb066"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
                opacity="0.75"
              />

              {/* عود الفحم المشتعل */}
              <g transform="rotate(-34 78 62)">
                <rect x="18" y="55" width="72" height="11" rx="5.5" fill="#241609" />
                <rect x="18" y="55" width="72" height="4" rx="2" fill="#3d2716" opacity="0.8" />
                <circle cx="20" cy="60" r="7" fill="#ff8a24" />
                <circle cx="20" cy="60" r="4" fill="#ffe9b0" />
                <ellipse cx="14" cy="58" rx="9" ry="7" fill="#ff9a2e" opacity="0.55" style={{ filter: "blur(4px)" }} />
              </g>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* تعتيم الأطراف */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(105% 78% at 50% 62%, transparent 38%, rgba(2,4,8,0.55) 78%, rgba(1,2,5,0.88) 100%)",
        }}
      />

      {/* ستارة الظلام قبل الإشعال */}
      <motion.div
        initial={false}
        animate={{ opacity: lit ? 0 : 0.62 }}
        transition={{ duration: 1.5, ease }}
        className="absolute inset-0 bg-[#020306]"
      />
    </div>
  );
}
