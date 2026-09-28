import { CRUNCH_T, LINEUP_GRID, LINEUP_ROW, LINEUP_SCALE, TRAY_Y } from './constants'

// A Shot is everything the scene needs for one frame. Each chapter is a pure
// function of its own scroll progress; between chapters, shots are blended.
// Nothing here touches three.js, React or the DOM.

export interface Shot {
  // Camera: look at (tx, ty, tz) from azimuth / elevation (degrees), far
  // enough that half-height H and half-width W are visible.
  tx: number; ty: number; tz: number
  az: number; el: number
  H: number; W: number
  distMul: number
  fov: number
  /** Screen-space shift of the subject, as a fraction of the viewport. */
  shiftX: number; shiftY: number
  // Croissant transform. rotY / rotX in degrees. seat 1 = rest its base on py.
  px: number; py: number; pz: number
  scale: number; rotY: number; rotX: number; seat: number
  // Pastry state.
  split: number; crunchT: number; slice: number; bake: number; rise: number
  // Scene layers.
  oven: number; heat: number
  crumb: number; crumbZ: number
  lineup: number; grid: number
  idle: number
  turntable: number
  /** Weight of the visitor's drag angle (viewer chapter). */
  drag: number
  dim: number
}

export const CHAPTERS = ['spin', 'crunch', 'lamination', 'crumb', 'bake', 'lens', 'viewer', 'lineup', 'order'] as const
export type ChapterId = (typeof CHAPTERS)[number]

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const mix = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number, k = 3) => 1 - Math.pow(1 - clamp01(t), k)

export interface Layout { portrait: boolean; wide: boolean }

const base: Shot = {
  tx: 0, ty: 0, tz: 0, az: 0, el: 13, H: 0.8, W: 1.5, distMul: 1, fov: 26,
  shiftX: 0, shiftY: 0,
  px: 0, py: 0, pz: 0, scale: 1, rotY: 336, rotX: 0, seat: 0,
  split: 0, crunchT: 0, slice: 0, bake: 1, rise: 1,
  oven: 0, heat: 0, crumb: 0, crumbZ: 0, lineup: 0, grid: 0, idle: 0, turntable: 0, drag: 0, dim: 0,
}

/** Progress points inside the crunch where the readouts are driven from. */
export const CRUNCH = { snap: 0.12, open: 0.52 }

export function crunchSplit(p: number) { return easeOut((p - CRUNCH.snap) / (CRUNCH.open - CRUNCH.snap), 3) }
export function crunchTime(p: number) { return CRUNCH_T * clamp01((p - CRUNCH.snap) / (0.92 - CRUNCH.snap)) }

/** The first moment in the oven: raw dough on the tray. Also used under the crumb overlay. */
function ovenShot(p: number, l: Layout): Shot {
  const heat = smooth(0, 0.12, p)
  const rise = smooth(0.06, 0.72, p)
  return {
    ...base,
    tx: 0, ty: 0.2, tz: 0,
    az: mix(-8, 6, p), el: mix(9, 13, p),
    H: l.portrait ? 0.62 : 0.72, W: l.portrait ? 0.95 : 1.55,
    distMul: mix(1.02, 0.86, p),
    shiftY: l.portrait ? -0.04 : 0,
    scale: 0.66, rotY: 350, py: TRAY_Y, seat: 1,
    bake: smooth(0.1, 0.92, p), rise,
    oven: 1, heat,
  }
}

export const SHOTS: Record<ChapterId, (p: number, l: Layout) => Shot> = {
  // 01 Spin. Small under the title, rises through one full turn, then glides
  // left (81 layers) and right (27 sheets).
  spin: (p, l) => {
    const rise = smooth(0.03, 0.42, p)
    const turn = smooth(0.02, 0.46, p)
    const left = smooth(0.46, 0.58, p) * (1 - smooth(0.7, 0.84, p))
    const right = smooth(0.72, 0.86, p)
    const side = right - left
    const off = Math.max(left, right)
    return {
      ...base,
      el: mix(15, 14, rise),
      H: l.portrait ? 0.95 : 0.8,
      W: l.portrait ? 1.28 : 1.45,
      scale: mix(l.portrait ? 0.46 : 0.4, 1, rise) * (1 - (l.portrait ? 0.18 : 0.16) * off),
      py: mix(l.portrait ? -0.14 : -0.44, 0, rise),
      rotX: mix(6, 0, rise),
      rotY: -24 + 360 * turn + 36 * left - 36 * right,
      shiftX: l.portrait ? 0 : side * (l.wide ? 0.19 : 0.15),
      shiftY: l.portrait ? off * 0.15 : 0,
      idle: 1,
    }
  },

  // 02 Crunch. It snaps at the belly; flakes burst and hang.
  crunch: (p, l) => {
    const s = crunchSplit(p)
    const snap = smooth(CRUNCH.snap - 0.004, CRUNCH.snap + 0.03, p) * (1 - smooth(CRUNCH.snap + 0.03, CRUNCH.snap + 0.12, p))
    return {
      ...base,
      rotY: 360,
      az: mix(0, -12, p), el: mix(12, 16, s),
      ty: 0.02 + snap * 0.015,
      H: mix(0.8, 0.95, s),
      W: l.portrait ? mix(1.3, 2.05, s) : mix(1.5, 2.3, s),
      shiftY: l.portrait ? 0.06 : -0.02,
      split: s,
      crunchT: crunchTime(p),
    }
  },

  // 03 Lamination. Seven slices step apart like a CT scan, then close up.
  lamination: (p, l) => {
    const out = smooth(0.05, 0.5, p) * (1 - smooth(0.86, 1, p))
    const wide = smooth(0.02, 0.36, p) * (1 - smooth(0.86, 1, p))
    return {
      ...base,
      rotY: 360,
      el: mix(13, 7, out),
      H: mix(0.8, l.portrait ? 1.1 : 0.72, wide),
      W: l.portrait ? mix(1.3, 2.75, wide) : mix(1.5, 2.8, wide),
      shiftY: l.portrait ? 0.05 : 0.04 * wide,
      slice: out,
    }
  },

  // 04 Crumb. Fly into the belly; the ray-marched honeycomb takes over the
  // frame. Behind it the scene is swapped for the oven.
  crumb: (p, l) => {
    const crumb = Math.min(smooth(0, 0.14, p), 1 - smooth(0.86, 1, p))
    const z = p * 15
    if (p < 0.5) {
      const dive = smooth(0, 0.16, p)
      return { ...base, rotY: 360, el: mix(13, 4, dive), distMul: mix(1, 0.24, dive), ty: mix(0, 0.12, dive), crumb, crumbZ: z }
    }
    return { ...ovenShot(0, l), crumb, crumbZ: z }
  },

  // 05 Bake. Raw to golden in the deck oven.
  bake: (p, l) => ovenShot(p, l),

  // 06 X-ray and thermal lens: the frame holds still so the lens can read it.
  lens: (_p, l) => ({
    ...base,
    rotY: 336, el: 15,
    H: l.portrait ? 0.9 : 0.86, W: l.portrait ? 1.24 : 1.62,
    shiftY: l.portrait ? 0.04 : 0,
  }),

  // 07 Drag to spin.
  viewer: (_p, l) => ({
    ...base,
    rotY: 336, el: 19,
    H: l.portrait ? 0.9 : 0.8, W: l.portrait ? 1.25 : 1.55,
    shiftY: l.portrait ? 0.06 : -0.02,
    drag: 1,
  }),

  // 08 Lineup. Croissant Pro steps into the first slot.
  lineup: (p, l) => {
    const k = smooth(0, 0.6, p)
    const slot = l.portrait ? LINEUP_GRID[0] : LINEUP_ROW[0]
    const sc = l.portrait ? LINEUP_SCALE.grid : LINEUP_SCALE.row
    return {
      ...base,
      el: mix(15, 10, k),
      ty: l.portrait ? mix(0, 0.02, k) : 0,
      H: l.portrait ? mix(0.9, 1.0, k) : mix(0.8, 0.9, k),
      W: l.portrait ? mix(1.22, 1.3, k) : mix(1.45, 3.75, k),
      shiftY: l.portrait ? mix(0.04, 0.12, k) : mix(0, 0.08, k),
      px: mix(0, slot[0], k), py: mix(0, slot[1], k),
      scale: mix(1, sc, k),
      rotY: mix(336, 380, k), rotX: 7 * k,
      lineup: k, grid: l.portrait ? 1 : 0,
    }
  },

  // 09 Order ahead. A slow turntable beside the order card.
  order: (_p, l) => ({
    ...base,
    el: 17,
    H: l.portrait ? 1.35 : 0.8, W: l.portrait ? 1.2 : 1.5,
    scale: l.portrait ? 0.62 : 0.86,
    shiftX: l.wide ? 0.23 : 0,
    shiftY: l.portrait ? 0.32 : 0,
    rotY: 336,
    turntable: 1, idle: 1,
    dim: 0.08,
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

export function layoutFor(w: number, h: number): Layout {
  return { portrait: w / h < 0.9, wide: w >= 900 && w / h > 1.1 }
}
