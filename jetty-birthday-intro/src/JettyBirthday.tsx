import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, theme } from "./theme";
import { POLAROIDS, T } from "./timeline";
import { useFonts } from "./components/Fonts";
import { Polaroid, PolaroidShadow } from "./components/Polaroid";
import { Mural } from "./components/Mural";
import { Confetti } from "./components/Confetti";
import { Grade, Grain, Vignette } from "./components/Finish";

export const JettyBirthday: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Top-down camera: starts tight on the collage, rises to reveal the whole mural, then breathes.
  const pull = interpolate(frame, [T.camPullStart * fps, T.camPullEnd * fps], [0, 1], { ...clamp, easing: theme.ease.inOut });
  const settleIn = interpolate(frame, [0, T.holdUntil * fps], [0, 1], { ...clamp, easing: theme.ease.out });
  const breathe = Math.sin(frame / 20) * 0.006;
  const scale = interpolate(pull, [0, 1], [1.62 - settleIn * 0.05, 1.03]) + breathe * pull;
  const rot = interpolate(pull, [0, 1], [-2.5, 0]);
  const panY = interpolate(pull, [0, 1], [18, 0]);

  const byZ = [...POLAROIDS].sort((a, b) => a.z - b.z);
  const W = theme.world.width, H = theme.world.height;

  return (
    <AbsoluteFill style={{ backgroundColor: "#EDEDEF", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateY(${panY}px) scale(${scale}) rotate(${rot}deg)`, transformOrigin: "50% 52%" }}>
        {/* layer 1: tile floor */}
        <Img src={staticFile("floor.jpg")} style={{ position: "absolute", left: -W * 0.1, top: -H * 0.1, width: W * 1.2, height: H * 1.2, objectFit: "cover" }} />
        {/* layer 2: painted mural */}
        <Mural />
        {/* layer 3: confetti + polaroids with floor shadows */}
        <Confetti layer="shadow" />
        {byZ.map((p) => <PolaroidShadow key={`s${p.src}`} {...p} />)}
        {byZ.map((p) => <Polaroid key={p.src} {...p} />)}
        <Confetti layer="paper" />
      </AbsoluteFill>
      {/* layers 4–5: grade, grain, vignette */}
      <Grade />
      <Grain />
      <Vignette />

      {/* SFX: slaps as prints land, whooshes 2 frames before each fly-away, sparkle pop on reveal */}
      {byZ.map((p) => (
        <Sequence key={`a${p.src}`} from={Math.max(0, Math.round((T.landStart + p.z * T.landStagger) * fps) + 2)}>
          <Audio src={staticFile("sfx/slap.wav")} volume={0.55} />
        </Sequence>
      ))}
      {T.flyStarts.map((s, i) => (
        <Sequence key={`w${i}`} from={Math.max(0, Math.round(s * fps) - 2)}>
          <Audio src={staticFile("sfx/whoosh.wav")} volume={0.5} playbackRate={1 + i * 0.06} />
        </Sequence>
      ))}
      <Sequence from={Math.round(T.reveal * fps) - 2}>
        <Audio src={staticFile("sfx/reveal.wav")} volume={0.75} />
      </Sequence>
    </AbsoluteFill>
  );
};
