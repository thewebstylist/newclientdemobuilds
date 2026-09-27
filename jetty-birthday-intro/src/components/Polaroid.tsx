import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, theme } from "../theme";
import { T } from "../timeline";

export const PW = 520; // polaroid width (world px)
export const PH = 620;
const BORDER = 24;
const PHOTO = PW - BORDER * 2;

type Props = {
  src: string; x: number; y: number; rot: number; z: number; fly: number;
  dir: readonly [number, number] | readonly number[];
};

// Returns {lift, dx, dy, spin, opacity, blur} for a polaroid at the current frame.
const usePose = ({ z, fly, dir }: Pick<Props, "z" | "fly" | "dir">) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slap-down entrance: dropped from above (lift 0.9 -> 0), staggered by stack order.
  const landAt = (T.landStart + z * T.landStagger) * fps;
  const land = spring({ frame: frame - landAt, fps, config: theme.spring.slap });
  const inOpacity = interpolate(frame - landAt, [0, 3], [0, 1], clamp);
  const landLift = interpolate(land, [0, 1], [0.4, 0]);
  const landSpin = interpolate(land, [0, 1], [10 * (z % 2 ? 1 : -1), 0]);

  // Fly-away: short anticipation lift, then accelerate off-frame toward the camera.
  const start = T.flyStarts[fly] * fps;
  const dur = T.flyDur * fps;
  const peel = interpolate(frame, [start, start + dur * 0.28], [0, 1], { ...clamp, easing: theme.ease.out });
  const go = interpolate(frame, [start + dur * 0.12, start + dur], [0, 1], { ...clamp, easing: theme.ease.in });
  const dist = 2300 * go;
  const len = Math.hypot(dir[0], dir[1]);
  const dx = (dir[0] / len) * dist;
  const dy = (dir[1] / len) * dist;
  const lift = landLift + peel * 0.18 + go * 0.9;
  const spin = landSpin + go * 38 * (dir[0] >= 0 ? 1 : -1);
  // velocity-driven motion blur
  const goPrev = interpolate(frame - 1, [start + dur * 0.12, start + dur], [0, 1], { ...clamp, easing: theme.ease.in });
  const blur = Math.min(14, (go - goPrev) * 2300 * 0.06);
  return { lift, dx, dy, spin, opacity: inOpacity, blur, gone: go >= 1 };
};

export const PolaroidShadow: React.FC<Props> = (p) => {
  const { lift, dx, dy, spin, opacity, gone } = usePose(p);
  if (gone) return null;
  return (
    <div style={{
      position: "absolute", left: p.x - PW / 2, top: p.y - PH / 2, width: PW, height: PH,
      transform: `translate(${dx * 0.85 + lift * 70}px, ${dy * 0.85 + lift * 95}px) rotate(${p.rot + spin}deg) scale(${1 + lift * 0.18})`,
      background: theme.colors.shadow, borderRadius: 6,
      filter: `blur(${6 + lift * 34}px)`,
      opacity: opacity * interpolate(lift, [0, 1.2], [0.38, 0.1], clamp),
    }} />
  );
};

export const Polaroid: React.FC<Props> = (p) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { lift, dx, dy, spin, opacity, blur, gone } = usePose(p);
  if (gone) return null;
  // Ken Burns inside the print, alternating direction per photo
  const kb = interpolate(frame, [0, durationInFrames], [0, 1], { easing: theme.ease.inOut });
  const zoom = p.z % 2 ? 1.1 - kb * 0.08 : 1.02 + kb * 0.08;
  const pan = (p.z % 2 ? 1 : -1) * kb * 14;
  // idle breathing while resting on the floor
  const breathe = Math.sin(frame / (18 + p.z * 3)) * 0.4;
  return (
    <div style={{
      position: "absolute", left: p.x - PW / 2, top: p.y - PH / 2, width: PW, height: PH,
      transform: `translate(${dx}px, ${dy}px) rotate(${p.rot + spin + breathe}deg) scale(${1 + lift * 0.55})`,
      opacity, filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      background: `linear-gradient(160deg, ${theme.colors.paper} 0%, ${theme.colors.paperShade} 100%)`,
      borderRadius: 5,
      boxShadow: "0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 1px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        position: "absolute", left: BORDER, top: BORDER, width: PHOTO, height: PHOTO,
        overflow: "hidden", background: "#222",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
      }}>
        <Img src={staticFile(p.src)} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${zoom}) translateX(${pan}px)`,
        }} />
        {/* print gloss */}
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(125deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)" }} />
      </div>
    </div>
  );
};
