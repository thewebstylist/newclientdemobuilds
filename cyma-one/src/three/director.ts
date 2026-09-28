import { PEAK_T } from './constants'

// A Shot is everything the scene needs for one frame. Each chapter is a pure
// function of its own progress; between chapters, shots are blended. Nothing
// here touches React or the DOM.

export interface Shot {
  tx: number; ty: number; tz: number
  az: number; el: number
  /** Half-height and half-width that must be visible at the target (world units). */
  H: number; W: number
  /** Multiplier on the fitted distance (below 1 flies the camera in). */
  distMul: number
  fov: number
  /** Screen-space shift of the subject, fraction of the viewport. */
  shiftX: number; shiftY: number
  paintT: number; paintFade: number; poolFade: number
  explode: number
  kick: number; tremble: number; flash: number; shock: number
  spin: number; turntable: number
  dim: number
}

export const CHAPTERS = ['hero', 'drop', 'frozen', 'inside', 'engineering', 'finishes', 'closing'] as const
export type ChapterId = (typeof CHAPTERS)[number]

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t

const base: Shot = {
  tx: 0, ty: 1.05, tz: 0, az: 0, el: 17, H: 1.95, W: 1.9, distMul: 1, fov: 30,
  shiftX: 0, shiftY: 0, paintT: 0, paintFade: 1, poolFade: 1, explode: 0,
  kick: 0, tremble: 0, flash: 0, shock: 0, spin: 0, turntable: 0, dim: 0,
}

export interface Layout { portrait: boolean; wide: boolean }

/** Eruption time for drop progress p: fast launch, then decelerating into the freeze. */
export function dropPaintT(p: number) {
  if (p < 0.235) return 0
  const q = clamp01((p - 0.235) / 0.765)
  return PEAK_T * (1 - Math.pow(1 - q, 2.3))
}

export const SHOTS: Record<ChapterId, (p: number, l: Layout) => Shot> = {
  hero: (_p, l) => ({
    ...base,
    W: l.portrait ? 1.4 : 1.8,
    H: l.portrait ? 1.7 : 1.8,
    ty: l.portrait ? 0.95 : 0.98,
    shiftY: l.portrait ? 0.08 : -0.04,
  }),

  drop: (p, l) => {
    const a = smooth(0, 0.22, p)
    // The camera pulls back with the height of the paint, not the scroll.
    const pt = dropPaintT(p)
    const q = Math.pow(pt / PEAK_T, 0.85)
    const kick = smooth(0.2, 0.24, p) * (1 - smooth(0.245, 0.33, p))
    return {
      ...base,
      az: mix(0, -6, a) + q * 16,
      el: mix(mix(17, 12, a), 9, q),
      ty: mix(mix(1.05, 0.72, a), 1.78, q),
      H: mix(mix(1.95, 1.3, a), 2.7, q),
      W: l.portrait ? mix(mix(1.15, 1.05, a), 1.9, q) : mix(mix(1.9, 1.5, a), 2.6, q),
      shiftX: l.wide ? 0.13 : 0,
      shiftY: l.portrait ? mix(0.04, -0.05, q) : -0.02,
      paintT: pt,
      tremble: smooth(0.03, 0.22, p) * (1 - smooth(0.225, 0.26, p)),
      kick,
      flash: kick,
      shock: smooth(0.235, 0.52, p),
    }
  },

  frozen: (p, l) => ({
    ...base,
    az: 16 + 196 * p,
    el: 9 + 12 * Math.sin(Math.PI * p),
    ty: 1.78,
    H: mix(2.7, 2.55, Math.sin(Math.PI * p)),
    W: l.portrait ? 1.9 : 2.6,
    shiftX: l.wide ? 0.13 + 0.03 * smooth(0, 0.3, p) : 0,
    shiftY: l.portrait ? -0.05 : -0.04,
    paintT: PEAK_T,
  }),

  inside: (p, l) => {
    const a = smooth(0, 0.6, p)
    const b = smooth(0.35, 1, p)
    return {
      ...base,
      az: 212 + 48 * p,
      el: mix(mix(9, 6, a), -7, b),
      tx: mix(0, 0.1, a),
      shiftX: l.wide ? mix(0.16, 0, a) : 0,
      ty: mix(1.78, 1.55, a) + 0.15 * b,
      H: 2.35,
      W: l.portrait ? 1.9 : 2.6,
      // Settle about 0.9 units from the axis, among the columns.
      distMul: mix(mix(1, 0.3, a), 0.11, b),
      fov: mix(30, 62, smooth(0.1, 1, p)),
      shiftY: l.portrait ? mix(-0.05, 0, a) : 0,
      paintT: PEAK_T,
    }
  },

  engineering: (p, l) => {
    const e = smooth(0.16, 0.92, p)
    return {
      ...base,
      az: 360 + 22 * p,
      el: mix(20, 7, e),
      ty: mix(0.3, 1.95, e),
      H: mix(1.25, 2.45, e),
      W: l.portrait ? mix(1.2, 1.3, e) : mix(1.6, 1.7, e),
      shiftX: l.wide ? 0.2 : 0,
      shiftY: l.portrait ? 0.1 : 0,
      // The paint dissolves while the camera pulls out of it (the gap before this chapter).
      paintT: PEAK_T + 0.35,
      paintFade: 0,
      poolFade: 0,
      explode: e,
      spin: -28 * e,
    }
  },

  finishes: (_p, l) => ({
    ...base,
    az: 385, el: 22,
    ty: 0.22,
    H: l.portrait ? 1.15 : 1.0,
    W: l.portrait ? 1.35 : 2.05,
    shiftX: l.wide ? -0.2 : 0,
    shiftY: l.portrait ? 0.24 : 0,
    paintT: 0, paintFade: 0, poolFade: 0,
    turntable: 1,
  }),

  closing: (_p, l) => ({
    ...base,
    az: 360, el: 89,
    ty: 0.35,
    H: l.portrait ? 1.6 : 1.95,
    W: l.portrait ? 1.75 : 1.9,
    shiftX: l.wide ? 0.3 : 0,
    shiftY: l.portrait ? -0.16 : 0,
    paintT: 0, paintFade: 1, poolFade: 1,
    dim: 0.1,
  }),
}

export function blendShots(a: Shot, b: Shot, t: number): Shot {
  if (t <= 0) return a
  if (t >= 1) return b
  const out = { ...a }
  for (const k in a) {
    const key = k as keyof Shot
    out[key] = mix(a[key], b[key], t)
  }
  return out
}
