import * as THREE from 'three'

// A croissant is a triangle of laminated dough rolled from its wide end and
// curved into a crescent. Here it is a sweep along a crescent path: the
// cross-section is a flat-bottomed ellipse whose radius follows a tapering
// envelope, modulated by helical bands where each turn of dough wraps around.

export interface CroissantShape {
  length: number   // tip-to-tip span of the crescent
  arc: number      // radians of crescent curvature
  radius: number   // max cross-section radius at the belly
  bands: number    // visible wraps
  twist: number    // how diagonal the wraps run
  seed: number
  taper?: number   // envelope exponent: higher = more pointed tips (default 1.25)
  square?: number  // cross-section superellipse exponent: 2 = ellipse, 4 = boxy
  floor?: number   // envelope floor at the ends (0.04 = pointed)
}

export const HERO_SHAPE: CroissantShape = { length: 2.3, arc: 2.35, radius: 0.5, bands: 7, twist: 0.7, seed: 3 }

const TAU = Math.PI * 2

/** Smooth value noise, deterministic. */
function noise2(x: number, y: number, seed: number) {
  const h = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453
    return s - Math.floor(s)
  }
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

export class CroissantPath {
  constructor(public shape: CroissantShape) {}

  /** Envelope radius at s (0..1): full belly, pointed tips. */
  envelope(s: number) {
    const k = Math.sin(Math.PI * THREE.MathUtils.clamp(s, 0, 1))
    const f = this.shape.floor ?? 0.04
    return this.shape.radius * (f + (1 - f) * Math.pow(k, this.shape.taper ?? 1.25))
  }

  /** Centreline point. The belly sits at the back; the horns curve forward (+z) and droop. */
  center(s: number, out = new THREE.Vector3()) {
    const { length, arc } = this.shape
    const R = length / (2 * Math.sin(arc / 2))
    const phi = (s - 0.5) * arc
    const x = R * Math.sin(phi)
    const z = -R * Math.cos(phi)
    const ax = Math.abs(s - 0.5) * 2
    const y = this.envelope(s) * 0.5 - 0.06 * Math.pow(ax, 2.5)
    return out.set(x, y, z)
  }

  tangent(s: number, out = new THREE.Vector3()) {
    const a = this.center(Math.max(0, s - 0.002), new THREE.Vector3())
    const b = this.center(Math.min(1, s + 0.002), new THREE.Vector3())
    return out.subVectors(b, a).normalize()
  }

  /** Band profile: 1 on the crown of a wrap, 0 in the crease between wraps. */
  band(s: number, theta: number) {
    const { bands, twist } = this.shape
    // Wraps are widest at the belly and tighten toward the horns, mirrored like chevrons.
    const x = (s - 0.5) * 2
    const u = Math.sign(x) * Math.pow(Math.abs(x), 0.85)
    const t = (u * bands) / 2 + 0.5 + (theta / TAU) * twist * Math.tanh(x * 5)
    return Math.pow(Math.abs(Math.sin(Math.PI * t)), 0.5)
  }

  /** Surface point for (s, theta) and a radius scale (inner shells for X-ray). */
  point(s: number, theta: number, rScale = 1, out = new THREE.Vector3()) {
    const c = this.center(s)
    const T = this.tangent(s)
    const U = new THREE.Vector3(0, 1, 0)
    const S = new THREE.Vector3().crossVectors(T, U).normalize()
    U.crossVectors(S, T).normalize()
    const env = this.envelope(s)
    // The base that sat on the tray is smooth and flat; the wraps show on top.
    const under = THREE.MathUtils.smoothstep(-Math.sin(theta), 0.05, 0.6)
    const band = THREE.MathUtils.lerp(this.band(s, theta), 0.7, under)
    const nz = noise2(s * 60, theta * 5, this.shape.seed) - 0.5
    const r = env * (0.76 + 0.24 * band) * (1 + nz * 0.05) * rScale
    const n = this.shape.square ?? 2
    const se = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n)
    const dx = se(Math.cos(theta)) * r * 1.1
    let dy = se(Math.sin(theta)) * r * 1.08
    if (dy < 0) dy *= 0.5
    return out.copy(c).addScaledVector(S, dx).addScaledVector(U, dy)
  }
}

export interface SweepOptions {
  s0: number
  s1: number
  segments?: number
  radial?: number
  rScale?: number
  capStart?: boolean
  capEnd?: boolean
}

/**
 * Builds the crust surface for [s0, s1] plus optional flat end caps (the cut
 * faces, textured with the laminated crumb). Returns { crust, caps }.
 * Attributes on the crust: aBand (wrap crown 1 / crease 0), aTip (0 belly, 1 tip).
 */
export function sweep(path: CroissantPath, o: SweepOptions) {
  const segs = o.segments ?? 120
  const rad = o.radial ?? 72
  const rScale = o.rScale ?? 1
  const pos: number[] = [], uv: number[] = [], band: number[] = [], tip: number[] = []
  const p = new THREE.Vector3()
  for (let i = 0; i <= segs; i++) {
    const s = o.s0 + ((o.s1 - o.s0) * i) / segs
    for (let j = 0; j <= rad; j++) {
      const th = (j / rad) * TAU
      path.point(s, th, rScale, p)
      pos.push(p.x, p.y, p.z)
      uv.push(j / rad, s * 5)
      band.push(path.band(s, th))
      tip.push(Math.abs(s - 0.5) * 2)
    }
  }
  const idx: number[] = []
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < rad; j++) {
      const a = i * (rad + 1) + j, b = a + rad + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const crust = new THREE.BufferGeometry()
  crust.setIndex(idx)
  crust.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  crust.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  crust.setAttribute('aBand', new THREE.Float32BufferAttribute(band, 1))
  crust.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1))
  crust.computeVertexNormals()

  // Caps: a fan over the cross-section outline, UV mapped to the unit square
  // so the crumb texture lines up with the crust edge.
  const capPos: number[] = [], capUv: number[] = [], capIdx: number[] = []
  const addCap = (s: number, facing: 1 | -1) => {
    const base = capPos.length / 3
    const c = path.center(s)
    const T = path.tangent(s)
    const U = new THREE.Vector3(0, 1, 0)
    const S = new THREE.Vector3().crossVectors(T, U).normalize()
    U.crossVectors(S, T).normalize()
    const env = path.envelope(s) * rScale
    capPos.push(c.x, c.y, c.z)
    capUv.push(0.5, 0.5)
    for (let j = 0; j <= rad; j++) {
      const th = (j / rad) * TAU
      path.point(s, th, rScale, p)
      capPos.push(p.x, p.y, p.z)
      const d = p.clone().sub(c)
      capUv.push(0.5 + d.dot(S) / (env * 2.3), 0.5 + d.dot(U) / (env * 2.3))
    }
    for (let j = 0; j < rad; j++) {
      const a = base + 1 + j
      if (facing > 0) capIdx.push(base, a, a + 1)
      else capIdx.push(base, a + 1, a)
    }
  }
  if (o.capStart) addCap(o.s0, -1)
  if (o.capEnd) addCap(o.s1, 1)
  let caps: THREE.BufferGeometry | null = null
  if (capIdx.length) {
    caps = new THREE.BufferGeometry()
    caps.setIndex(capIdx)
    caps.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3))
    caps.setAttribute('uv', new THREE.Float32BufferAttribute(capUv, 2))
    caps.computeVertexNormals()
  }
  return { crust, caps }
}
