"use client";

import { useMemo } from "react";

/**
 * خلفية الغابة الحيّة: ثلاث طبقات عمق، ضوء دافئ، ظلال حيوانات تعبر خطّ
 * الشجر، وحقل جسيمات من شرر وأوراق متساقطة.
 *
 * كل شيء مرسوم برمجيًا. المواضع تُولَّد ببذرة ثابتة لأن المكوّن يُعرض على
 * الخادم أيضًا، والعشوائية غير المبذورة تُحدث خطأ ترطيب.
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

function ridge(seed: number, count: number, min: number, max: number) {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, index) => {
    const height = min + random() * (max - min);
    return {
      x: round3((index + 0.5) * (1200 / count) + (random() - 0.5) * 30),
      height: round3(height),
      width: round3(height * (0.28 + random() * 0.14)),
    };
  });
}

/** ظلّ غزال جانبي */
const DEER =
  "M18,46 C21,34 33,29 48,30 C59,31 68,34 72,39 L76,29 C77,23 73,19 76,14 L80,19 L82,9 " +
  "L85,19 L89,11 L89,23 C89,30 84,35 82,42 C80,49 76,54 69,56 L65,70 L60,70 L63,56 " +
  "L45,57 L43,70 L38,70 L41,56 C29,56 20,53 18,46 Z";

/** ظلّ بومة محلّقة */
const OWL =
  "M50,34 C45,24 36,19 23,17 C11,15 4,20 0,26 C9,28 18,32 27,36 C36,41 43,44 50,44 " +
  "C57,44 64,41 73,36 C82,32 91,28 100,26 C96,20 89,15 77,17 C64,19 55,24 50,34 Z";

export function ForestBackdrop({ className }: { className?: string }) {
  const ridges = useMemo(
    () => ({
      far: ridge(4021, 34, 45, 105),
      mid: ridge(881, 24, 90, 165),
      near: ridge(1337, 16, 150, 250),
    }),
    [],
  );

  const leaves = useMemo(() => {
    const random = mulberry32(6060);
    return Array.from({ length: 20 }, () => ({
      left: round3(random() * 100),
      size: round3(5 + random() * 7),
      drift: round3(-70 + random() * 190),
      life: round3(13 + random() * 12),
      delay: round3(random() * 18),
      peak: round3(0.3 + random() * 0.4),
      spin: round3(240 + random() * 420),
      warm: random() > 0.5,
    }));
  }, []);

  const motes = useMemo(() => {
    const random = mulberry32(2244);
    return Array.from({ length: 46 }, () => ({
      left: round3(random() * 100),
      bottom: round3(random() * 55),
      size: round3(1.4 + random() * 2.8),
      dx: round3(-60 + random() * 120),
      dy: round3(-90 - random() * 170),
      life: round3(7 + random() * 9),
      delay: round3(random() * 12),
      peak: round3(0.35 + random() * 0.55),
      warm: random() > 0.35,
    }));
  }, []);

  return (
    <div aria-hidden className={className ?? "pointer-events-none absolute inset-0 overflow-hidden"}>
      {/* السماء وعمق المشهد */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 90% at 50% 108%, #3a2410 0%, #1d1a14 26%, #101820 52%, #070c14 78%, #04070c 100%)",
        }}
      />

      {/* ضباب دافئ يفصل الطبقات ويعمّق المنظور */}
      <div
        className="absolute inset-x-0 bottom-[22%] h-[34%]"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,150,60,0.09) 55%, rgba(255,130,40,0.05))",
          filter: "blur(22px)",
        }}
      />

      {/* الطبقة البعيدة */}
      <svg
        className="absolute inset-x-0 bottom-[26%] h-[30vh] w-full opacity-60"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
      >
        <g fill="#132030">
          {ridges.far.map((tree, index) => (
            <path key={index} d={pinePath(tree.height, tree.width)} transform={`translate(${tree.x},240)`} />
          ))}
        </g>
      </svg>

      {/* البومة تحلّق فوق خطّ الشجر */}
      <div className="absolute inset-x-0 bottom-[46%] h-16">
        <svg
          viewBox="0 0 100 60"
          className="wildlife absolute h-10 w-16 fill-[#0a121c]"
          style={
            {
              "--life": "58s",
              "--delay": "6s",
              "--from": "-16vw",
              "--to": "116vw",
              "--peak": 0.55,
            } as React.CSSProperties
          }
        >
          <path d={OWL} />
          <ellipse cx="50" cy="34" rx="9" ry="11" />
          <path d="M43,25 L46,18 L50,25 Z M57,25 L54,18 L50,25 Z" />
        </svg>
      </div>

      {/* الطبقة الوسطى */}
      <svg
        className="absolute inset-x-0 bottom-[16%] h-[38vh] w-full opacity-90"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
      >
        <g fill="#0a121c">
          {ridges.mid.map((tree, index) => (
            <path key={index} d={pinePath(tree.height, tree.width)} transform={`translate(${tree.x},240)`} />
          ))}
        </g>
      </svg>

      {/* الغزال يعبر بين الطبقتين */}
      <div className="absolute inset-x-0 bottom-[17%] h-24">
        <svg
          viewBox="0 0 100 72"
          className="wildlife absolute h-16 w-24 fill-[#050a10]"
          style={
            {
              "--life": "46s",
              "--delay": "14s",
              "--from": "112vw",
              "--to": "-16vw",
              "--flip": -1,
              "--peak": 0.72,
            } as React.CSSProperties
          }
        >
          <path d={DEER} />
        </svg>
      </div>

      {/* الطبقة القريبة */}
      <svg
        className="absolute inset-x-0 bottom-[8%] h-[46vh] w-full"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
      >
        <g fill="#03070c">
          {ridges.near.map((tree, index) => (
            <path key={index} d={pinePath(tree.height, tree.width)} transform={`translate(${tree.x},240)`} />
          ))}
        </g>
      </svg>

      {/* أرضية المخيّم ووهجها */}
      <div
        className="absolute inset-x-0 bottom-0 h-[20%]"
        style={{ background: "linear-gradient(180deg, #03070c 0%, #0c0a07 55%, #140d07 100%)" }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[30vh] w-[min(1400px,160vw)] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,150,50,0.24), rgba(255,120,20,0.09) 48%, transparent 78%)",
          filter: "blur(30px)",
        }}
      />

      {/* الأوراق المتساقطة */}
      {leaves.map((leaf, index) => (
        <span
          key={`leaf-${index}`}
          className="leaf absolute top-0"
          style={
            {
              left: `${leaf.left}%`,
              width: leaf.size,
              height: leaf.size * 0.62,
              borderRadius: "60% 10% 60% 10%",
              background: leaf.warm ? "#b4652a" : "#7d5a22",
              "--drift": `${leaf.drift}px`,
              "--life": `${leaf.life}s`,
              "--delay": `${leaf.delay}s`,
              "--peak": leaf.peak,
              "--spin-end": `${leaf.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* حقل الشرر والجسيمات الضوئية */}
      {motes.map((mote, index) => (
        <span
          key={`mote-${index}`}
          className="mote absolute rounded-full"
          style={
            {
              left: `${mote.left}%`,
              bottom: `${mote.bottom}%`,
              width: mote.size,
              height: mote.size,
              background: mote.warm ? "#ffb347" : "#7fe6d0",
              boxShadow: mote.warm
                ? "0 0 8px rgba(255,160,60,0.9)"
                : "0 0 8px rgba(110,230,205,0.85)",
              "--dx": `${mote.dx}px`,
              "--dy": `${mote.dy}px`,
              "--life": `${mote.life}s`,
              "--delay": `${mote.delay}s`,
              "--peak": mote.peak,
            } as React.CSSProperties
          }
        />
      ))}

      {/* تعتيم الأطراف */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 82% at 50% 58%, transparent 40%, rgba(2,4,8,0.5) 76%, rgba(1,2,5,0.86) 100%)",
        }}
      />
    </div>
  );
}
