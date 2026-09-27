import React from "react";
import { interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, theme } from "../theme";
import { T } from "../timeline";

const COLORS = [theme.colors.red, theme.colors.blue, theme.colors.white, theme.colors.red, theme.colors.blue];
const N = 110;

// Top-down confetti: bursts up toward the camera, then flutters down and settles on the floor.
export const Confetti: React.FC<{ layer: "shadow" | "paper" }> = ({ layer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = T.reveal * fps;
  if (frame < t0) return null;
  return (
    <>
      {Array.from({ length: N }).map((_, i) => {
        const delay = random(`d${i}`) * 5;
        const f = frame - t0 - delay;
        if (f < 0) return null;
        const life = (1.1 + random(`l${i}`) * 0.7) * fps;
        const p = Math.min(f / life, 1);
        const ang = random(`a${i}`) * Math.PI * 2;
        const reach = 260 + random(`r${i}`) * 720;
        const spread = interpolate(p, [0, 1], [0, 1], { ...clamp, easing: theme.ease.out });
        const x = 960 + Math.cos(ang) * reach * spread * 1.35;
        const y = 560 + Math.sin(ang) * reach * spread * 0.85;
        // height above floor: pop up fast, fall slowly
        const h = p < 1 ? Math.sin(Math.pow(p, 0.55) * Math.PI) * (0.9 + random(`h${i}`) * 0.9) : 0;
        const settled = p >= 1;
        const spin = settled ? random(`s${i}`) * 360 : random(`s${i}`) * 360 + f * (8 + random(`w${i}`) * 14);
        const flutter = settled ? 1 : Math.cos(f / (2 + random(`q${i}`) * 3));
        const w = 12 + random(`sz${i}`) * 10;
        const round = i % 5 === 0;
        const color = COLORS[i % COLORS.length];
        if (layer === "shadow") {
          return (
            <div key={i} style={{
              position: "absolute", left: x + h * 60, top: y + h * 80, width: w, height: round ? w : w * 1.7,
              borderRadius: round ? "50%" : 2, background: "rgba(20,22,40,0.28)",
              filter: `blur(${1 + h * 6}px)`, transform: `rotate(${spin}deg) scaleY(${Math.abs(flutter) * 0.8 + 0.2})`,
              opacity: 0.8 - h * 0.35,
            }} />
          );
        }
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y, width: w, height: round ? w : w * 1.7,
            borderRadius: round ? "50%" : 2, background: color,
            boxShadow: color === theme.colors.white ? "inset 0 0 0 1px rgba(0,0,0,0.12)" : undefined,
            transform: `scale(${1 + h * 1.1}) rotate(${spin}deg) scaleY(${Math.abs(flutter) * 0.85 + 0.15})`,
            filter: `brightness(${1 + (flutter > 0 ? 0.15 : -0.12)})`,
          }} />
        );
      })}
    </>
  );
};
