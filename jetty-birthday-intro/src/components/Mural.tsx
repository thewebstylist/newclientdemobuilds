import React from "react";
import { interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, theme } from "../theme";
import { T } from "../timeline";

const C = theme.colors;

const starPath = (cx: number, cy: number, r: number, rot = 0) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((Math.PI * 2) / 10) * i - Math.PI / 2 + (rot * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
};

const Balloon: React.FC<{ x: number; y: number; fill: string; outline?: string; tilt: number; len: number }> =
  ({ x, y, fill, outline, tilt, len }) => (
    <g transform={`rotate(${tilt} ${x} ${y + 90})`}>
      <path d={`M${x} ${y + 92} q 26 ${len * 0.3} -8 ${len * 0.55} t 10 ${len * 0.45}`}
        stroke={C.blueDeep} strokeWidth={4} fill="none" strokeLinecap="round" />
      <ellipse cx={x} cy={y} rx={68} ry={84} fill={fill} stroke={outline} strokeWidth={outline ? 7 : 0} />
      <path d={`M${x - 11} ${y + 94} L${x + 11} ${y + 94} L${x} ${y + 80} Z`} fill={outline ?? fill} />
      <ellipse cx={x - 24} cy={y - 32} rx={14} ry={24} fill={C.white} opacity={outline ? 0 : 0.75}
        transform={`rotate(-25 ${x - 24} ${y - 32})`} />
    </g>
  );

const Cake: React.FC<{ x: number; y: number; flip?: boolean }> = ({ x, y, flip }) => {
  const drips = (left: number, top: number, w: number, color: string) => {
    let d = `M${left} ${top} h${w} v18`;
    const n = 7;
    for (let i = n; i > 0; i--) {
      const x0 = left + (w / n) * i;
      const dl = 14 + ((i * 37) % 3) * 12;
      d += ` L${x0 - w / n / 2 + 8} ${top + 18} q -8 ${dl} -16 0`;
      d += ` L${x0 - w / n} ${top + 18}`;
    }
    return <path d={d + "Z"} fill={color} />;
  };
  const s = flip ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * 0.88} 0.88)`}>
      <ellipse cx={0} cy={112} rx={185} ry={22} fill={C.blueDeep} opacity={0.9} />
      {/* bottom tier */}
      <rect x={-145} y={0} width={290} height={110} rx={10} fill={C.blue} />
      {drips(-145, 0, 290, C.white)}
      {[-100, -40, 20, 80].map((sx, i) => (
        <path key={i} d={starPath(sx + 10, 72, 15, i * 12)} fill={C.white} />
      ))}
      {/* top tier */}
      <rect x={-100} y={-92} width={200} height={94} rx={10} fill={C.red} />
      {[-70, -30, 10, 50].map((sx, i) => (
        <rect key={i} x={sx} y={-92} width={18} height={94} fill={C.white} opacity={0.9} />
      ))}
      {drips(-100, -92, 200, C.white)}
      {/* candles */}
      {[-62, -22, 18, 58].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 7} y={-160} width={14} height={68} rx={4} fill={i % 2 ? C.blue : C.red} />
          <rect x={cx - 7} y={-146} width={14} height={9} fill={C.white} />
          <rect x={cx - 7} y={-122} width={14} height={9} fill={C.white} />
          <path d={`M${cx} ${-196} q 13 18 0 30 q -13 -12 0 -30Z`} fill={C.flame} />
        </g>
      ))}
    </g>
  );
};

export const Mural: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // gloss sweep across 21ST + JETTY once the lettering is revealed
  const sweep = interpolate(frame, [(T.reveal + 0.15) * fps, (T.reveal + 0.95) * fps], [-500, 2400],
    { ...clamp, easing: theme.ease.inOut });

  const sprinkles = Array.from({ length: 70 }).map((_, i) => {
    const x = 60 + random(`sx${i}`) * 1800;
    const y = 50 + random(`sy${i}`) * 980;
    // keep the lettering area clean
    if (x > 380 && x < 1540 && y > 110 && y < 980) return null;
    const col = [C.red, C.blue, C.blueDeep][i % 3];
    return i % 4 === 0
      ? <path key={i} d={starPath(x, y, 10 + random(`sr${i}`) * 12, random(`st${i}`) * 90)} fill={col} />
      : <rect key={i} x={x} y={y} width={8} height={22} rx={4} fill={col}
          transform={`rotate(${random(`sa${i}`) * 180} ${x} ${y})`} />;
  });

  // Stacked lettering: small words in blue (red drop), hero words 21ST + JETTY in red (blue drop).
  const LINES = {
    happy: { y: 236, size: 118, len: 520, word: "HAPPY" },
    birthday: { y: 578, size: 118, len: 820, word: "BIRTHDAY" },
    son: { y: 930, size: 118, len: 470, word: "SON!!" },
  };
  const small = (l: { y: number; size: number; len: number; word: string }) => (
    <g key={l.word}>
      <text x={960} y={l.y} textAnchor="middle" fontFamily={theme.fonts.display} fontSize={l.size}
        textLength={l.len} lengthAdjust="spacingAndGlyphs" fill={C.red} transform="translate(7 8)">{l.word}</text>
      <text x={960} y={l.y} textAnchor="middle" fontFamily={theme.fonts.display} fontSize={l.size}
        textLength={l.len} lengthAdjust="spacingAndGlyphs" fill={C.blue}>{l.word}</text>
    </g>
  );
  const twentyFirst = (props: React.SVGProps<SVGTextElement>) => (
    <text x={960} y={470} textAnchor="middle" fontFamily={theme.fonts.display} fontSize={250} {...props}>
      21<tspan fontSize={118} dy={-112} dx={10}>ST</tspan>
    </text>
  );
  const jetty = (props: React.SVGProps<SVGTextElement>) => (
    <text x={960} y={820} textAnchor="middle" fontFamily={theme.fonts.display} fontSize={265}
      textLength={940} lengthAdjust="spacingAndGlyphs" {...props}>JETTY</text>
  );
  const hero = (word: (p: React.SVGProps<SVGTextElement>) => React.ReactElement) => (
    <>
      {word({ fill: C.blue, transform: "translate(11 13)" })}
      {word({ fill: C.red, stroke: C.blueDeep, strokeWidth: 15, paintOrder: "stroke", strokeLinejoin: "round" })}
      {word({ fill: "none", stroke: C.white, strokeWidth: 4, opacity: 0.85, transform: "translate(-4 -5)" })}
    </>
  );

  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080"
      style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: frame < T.hideMuralUntil * fps ? 0 : 1 }}>
      <defs>
        {/* rough brush edges + uneven paint density */}
        <filter id="paint" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={4} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale={7} xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={9} result="grain" />
          <feColorMatrix in="grain" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.45 1.25" result="grainA" />
          <feComposite in="rough" in2="grainA" operator="in" />
        </filter>
        <clipPath id="heroClip">{twentyFirst({})}{jetty({})}</clipPath>
        <linearGradient id="gloss" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g filter="url(#paint)">
        {sprinkles}
        {/* balloons */}
        <Balloon x={215} y={250} fill={C.red} tilt={-10} len={230} />
        <Balloon x={345} y={190} fill={C.white} outline={C.blue} tilt={4} len={250} />
        <Balloon x={290} y={375} fill={C.blue} tilt={-2} len={200} />
        <Balloon x={1705} y={250} fill={C.blue} tilt={10} len={230} />
        <Balloon x={1575} y={190} fill={C.white} outline={C.red} tilt={-4} len={250} />
        <Balloon x={1630} y={375} fill={C.red} tilt={2} len={200} />
        {/* cakes */}
        <Cake x={205} y={850} />
        <Cake x={1715} y={850} flip />
        {/* lettering */}
        {small(LINES.happy)}
        {hero(twentyFirst)}
        {small(LINES.birthday)}
        {hero(jetty)}
        {small(LINES.son)}
        {[[440, 400, 34], [1480, 390, 40], [460, 740, 30], [1500, 905, 28], [700, 160, 20], [1225, 160, 22]].map(([x, y, r], i) => (
          <path key={i} d={starPath(x, y, r, i * 15)} fill={i % 2 ? C.red : C.blue} />
        ))}
      </g>
      {/* fresh-paint gloss sweep, clipped to the hero words */}
      <g clipPath="url(#heroClip)" style={{ mixBlendMode: "screen" }}>
        <rect x={sweep} y={250} width={260} height={600} fill="url(#gloss)" transform={`skewX(-20)`} />
      </g>
    </svg>
  );
};
