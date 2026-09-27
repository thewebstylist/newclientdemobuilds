// theme.ts — single source of truth. Never inline colors/easings in components.
import { Easing } from "remotion";

export const theme = {
  colors: {
    red: "#E3122A",
    redDeep: "#B3121F",
    blue: "#1F46C8",
    blueDeep: "#122E8A",
    white: "#FFFFFF",
    paper: "#FBFAF5",
    paperShade: "#ECE9E0",
    ink: "#1B1B22",
    flame: "#FFC23A",
    shadow: "rgba(20, 22, 40, 1)",
  },
  fonts: {
    display: "LuckiestGuy",
    hand: "PermanentMarker",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
    soft: Easing.bezier(0.45, 0, 0.2, 1),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
    slap: { damping: 13, stiffness: 260, mass: 0.5 },
  },
  world: { width: 1920, height: 1080 },
} as const;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
