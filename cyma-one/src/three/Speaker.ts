import * as THREE from 'three'
import { perforationTexture, weaveTexture, boardTexture } from './textures'
import { PARTS } from './parts'

// CYMA One, modelled as the nine parts it would really be machined from.
// Units: the enclosure is 2.0 wide and 0.43 tall. The woofer faces +Y.

export const CONE_INNER_R = 0.2
export const CONE_OUTER_R = 0.765
export const CONE_BASE_Y = 0.27
export const CONE_RISE = 0.125

/** Height of the cone surface at radius r (matches the lathe profile). */
export function coneY(r: number) {
  const k = THREE.MathUtils.clamp((r - CONE_INNER_R) / (CONE_OUTER_R - CONE_INNER_R), 0, 1)
  return CONE_BASE_Y + CONE_RISE * Math.pow(k, 1.35)
}

/** Outer wall radius of the enclosure at height y: a gently barrelled drum. */
function wallR(y: number) {
  const k = THREE.MathUtils.clamp((y - 0.035) / 0.35, 0, 1)
  return 0.93 + 0.07 * Math.sin(Math.PI * (0.18 + 0.72 * k))
}

export interface Component {
  id: string
  name: string
  detail: string
  group: THREE.Group
  /** Rest height offset in the exploded stack (multiplied by explode). */
  lift: number
  /** Assembled vertical extent. */
  bottom: number
  top: number
  /** Local point used to anchor the on-screen label. */
  anchor: THREE.Vector3
  /** Order in which it leaves the assembly (0 first). */
  order: number
}

export interface SpeakerMaterials {
  body: THREE.MeshPhysicalMaterial
  band: THREE.MeshPhysicalMaterial
  polished: THREE.MeshPhysicalMaterial
  cone: THREE.MeshPhysicalMaterial
  rubber: THREE.MeshPhysicalMaterial
}

const v2 = (x: number, y: number) => new THREE.Vector2(x, y)

export class Speaker {
  root = new THREE.Group()
  components: Component[] = []
  materials: SpeakerMaterials
  /** Group the paint pools attach to: they ride with the cone. */
  coneGroup!: THREE.Group
  stackHeight = 0

  constructor(anisotropy: number, mobile: boolean) {
    const seg = mobile ? 96 : 160
    const bandTex = perforationTexture(anisotropy)

    const body = new THREE.MeshPhysicalMaterial({
      color: '#2b2b2f', metalness: 1, roughness: 0.46, envMapIntensity: 1.1,
    })
    const band = new THREE.MeshPhysicalMaterial({
      color: '#2b2b2f', metalness: 1, roughness: 0.52, map: bandTex,
      bumpMap: bandTex, bumpScale: 1.2, envMapIntensity: 1.1,
    })
    const polished = new THREE.MeshPhysicalMaterial({
      color: '#3a3a3f', metalness: 1, roughness: 0.16, envMapIntensity: 1.5,
    })
    const cone = new THREE.MeshPhysicalMaterial({
      color: '#18181b', metalness: 0.2, roughness: 0.62, map: weaveTexture(anisotropy),
      sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#5a5a66'), envMapIntensity: 0.8,
    })
    const rubber = new THREE.MeshPhysicalMaterial({ color: '#0e0e10', metalness: 0, roughness: 0.78, envMapIntensity: 0.6 })
    this.materials = { body, band, polished, cone, rubber }

    const copper = new THREE.MeshPhysicalMaterial({ color: '#c46f3c', metalness: 1, roughness: 0.28 })
    const steel = new THREE.MeshPhysicalMaterial({ color: '#6f7176', metalness: 1, roughness: 0.3 })
    const magnet = new THREE.MeshPhysicalMaterial({ color: '#232326', metalness: 0.7, roughness: 0.42 })
    const spider = new THREE.MeshPhysicalMaterial({ color: '#6e5431', metalness: 0, roughness: 0.8, sheen: 0.5 })
    const pcb = new THREE.MeshPhysicalMaterial({ map: boardTexture(), metalness: 0.25, roughness: 0.5 })
    const chip = new THREE.MeshPhysicalMaterial({ color: '#141416', metalness: 0.2, roughness: 0.35 })
    const dome = new THREE.MeshPhysicalMaterial({ color: '#bfc2c8', metalness: 1, roughness: 0.14 })
    const plug = new THREE.MeshPhysicalMaterial({ color: '#9a9ca2', metalness: 1, roughness: 0.24, envMapIntensity: 1.6 })

    const add = (id: string, anchor: [number, number, number], build: (g: THREE.Group) => void) => {
      const group = new THREE.Group()
      group.name = id
      build(group)
      this.root.add(group)
      const order = PARTS.findIndex((p) => p.id === id)
      const { name, detail } = PARTS[order]
      const c: Component = { id, name, detail, group, lift: 0, bottom: 0, top: 0, order, anchor: new THREE.Vector3(...anchor) }
      this.components.push(c)
      return c
    }

    const lathe = (pts: THREE.Vector2[], mat: THREE.Material, segments = seg) =>
      new THREE.Mesh(new THREE.LatheGeometry(pts, segments, -Math.PI, Math.PI * 2), mat)


    // 09 Base: isolation plinth with a recessed USB-C port.
    add('base', [0.88, 0.02, 0], (g) => {
      g.add(lathe([v2(0, 0), v2(0.8, 0), v2(0.86, 0.006), v2(0.88, 0.03), v2(0.86, 0.036), v2(0, 0.036)], rubber))
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.02), polished)
      port.position.set(0, 0.018, -0.87)
      g.add(port)
    })

    // 08 Enclosure: barrelled wall with the perforated 360-degree band.
    add('enclosure', [1.0, 0.2, 0], (g) => {
      const y0 = 0.035, y1 = 0.385, b0 = 0.12, b1 = 0.29
      const lower: THREE.Vector2[] = [v2(0.84, y0), v2(0.9, y0)]
      for (let i = 0; i <= 10; i++) { const y = y0 + ((b0 - y0) * i) / 10; lower.push(v2(wallR(y), y)) }
      const bandPts: THREE.Vector2[] = []
      for (let i = 0; i <= 12; i++) { const y = b0 + ((b1 - b0) * i) / 12; bandPts.push(v2(wallR(y) - 0.002, y)) }
      const upper: THREE.Vector2[] = []
      for (let i = 0; i <= 10; i++) { const y = b1 + ((y1 - b1) * i) / 10; upper.push(v2(wallR(y), y)) }
      upper.push(v2(0.84, y1))
      g.add(lathe(lower, body), lathe(bandPts, band), lathe(upper, body))
      // Inner wall so the part reads as a hollow shell when lifted away.
      g.add(lathe([v2(0.84, y1), v2(0.84, y0)], rubber))
      // Fine machined grooves either side of the band.
      for (const y of [b0 - 0.006, b1 + 0.006]) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(wallR(y) + 0.001, 0.0028, 6, seg), polished)
        t.rotation.x = Math.PI / 2
        t.position.y = y
        g.add(t)
      }
    })

    // 07 Amplifier and DSP board.
    add('board', [0.72, 0.08, 0], (g) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.016, seg), [chip, pcb, chip])
      disc.position.y = 0.075
      g.add(disc)
      const chips: [number, number, number, number][] = [
        [0.25, 0.1, 0.16, 0.16], [-0.3, 0.2, 0.2, 0.12], [0.05, -0.35, 0.12, 0.12], [-0.2, -0.25, 0.1, 0.18], [0.38, -0.2, 0.08, 0.08],
      ]
      for (const [x, z, w, d] of chips) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), chip)
        m.position.set(x, 0.093, z)
        g.add(m)
      }
      for (let i = 0; i < 9; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.3), steel)
        fin.position.set(-0.52 + i * 0.03, 0.108, 0.25)
        g.add(fin)
      }
    })

    // 06 Neodymium motor.
    add('motor', [0.37, 0.16, 0], (g) => {
      g.add(lathe([v2(0, 0.1), v2(0.36, 0.1), v2(0.36, 0.13), v2(0.1, 0.13), v2(0.1, 0.25), v2(0.07, 0.25), v2(0.07, 0.11), v2(0, 0.11)], steel, 64))
      g.add(lathe([v2(0.14, 0.13), v2(0.35, 0.13), v2(0.35, 0.19), v2(0.14, 0.19)], magnet, 64))
      g.add(lathe([v2(0.13, 0.19), v2(0.36, 0.19), v2(0.36, 0.215), v2(0.13, 0.215)], steel, 64))
    })

    // 05 360-degree mid / high array, hidden behind the perforated band.
    add('array', [0.92, 0.2, 0], (g) => {
      g.add(lathe([v2(0.72, 0.15), v2(0.8, 0.15), v2(0.8, 0.26), v2(0.72, 0.26)], rubber, 96))
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        const big = i % 2 === 0
        const d = new THREE.Group()
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.058 : 0.04, big ? 0.05 : 0.036, 0.05, 32), steel)
        rim.rotation.z = Math.PI / 2
        d.add(rim)
        const face = new THREE.Mesh(
          new THREE.SphereGeometry(big ? 0.048 : 0.03, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          big ? this.materials.cone : dome,
        )
        face.rotation.z = -Math.PI / 2
        face.position.x = 0.02
        d.add(face)
        d.position.set(Math.sin(a) * 0.83, 0.205, Math.cos(a) * 0.83)
        d.rotation.y = a - Math.PI / 2
        g.add(d)
      }
    })

    // 04 Voice coil and spider.
    add('coil', [0.42, 0.24, 0], (g) => {
      g.add(lathe([v2(0.085, 0.17), v2(0.1, 0.17), v2(0.1, 0.275), v2(0.085, 0.275)], copper, 64))
      const pts: THREE.Vector2[] = []
      for (let i = 0; i <= 40; i++) {
        const r = 0.1 + (0.32 * i) / 40
        pts.push(v2(r, 0.245 + 0.009 * Math.sin(i * 1.4)))
      }
      g.add(lathe(pts.reverse(), spider, 96))
    })

    // 03 Woofer diaphragm with its half-roll surround. Paint lives here.
    const coneC = add('cone', [0.8, 0.36, 0], (g) => {
      const pts: THREE.Vector2[] = []
      for (let i = 0; i <= 28; i++) {
        const r = CONE_INNER_R + ((CONE_OUTER_R - CONE_INNER_R) * i) / 28
        pts.push(v2(r, coneY(r)))
      }
      // Lathe normals face up when the profile runs inward, so trace the top
      // surface outside-in, then return along the underside.
      const top = pts.slice().reverse()
      const under = pts.map((p) => v2(p.x, p.y - 0.012))
      g.add(lathe([...top, ...under], this.materials.cone))
      const surround = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.036, 16, seg, Math.PI * 2), rubber)
      surround.rotation.x = Math.PI / 2
      surround.position.y = 0.392
      surround.scale.set(1, 1, 0.7)
      g.add(surround)
    })
    this.coneGroup = coneC.group

    // 02 Machined bezel: the polished chamfer that catches the rim light.
    add('bezel', [0.98, 0.4, 0], (g) => {
      g.add(lathe([
        v2(wallR(0.385), 0.385), v2(0.992, 0.405), v2(0.975, 0.428), v2(0.95, 0.434),
        v2(0.87, 0.434), v2(0.845, 0.425), v2(0.838, 0.395),
      ], polished))
    })

    // 01 Dust cap / phase plug.
    add('cap', [0.2, 0.3, 0], (g) => {
      const capH = 0.065
      const R = (CONE_INNER_R * CONE_INNER_R + capH * capH) / (2 * capH)
      const theta = Math.asin(CONE_INNER_R / R)
      const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 16, 0, Math.PI * 2, 0, theta), plug)
      cap.position.y = CONE_BASE_Y + capH - R + 0.004
      g.add(cap)
    })

    // Exploded stack: parts were added bottom-up, so lift each one until it
    // clears the part below it by a constant gap.
    const GAP = 0.36
    const box = new THREE.Box3()
    let prevTop = 0
    this.components.forEach((c, i) => {
      box.setFromObject(c.group)
      c.bottom = box.min.y
      c.top = box.max.y
      c.lift = i === 0 ? 0 : prevTop + GAP - c.bottom
      prevTop = c.top + c.lift
    })
    this.stackHeight = prevTop

    // Present parts top-down for the anatomy panel.
    this.components.sort((a, b) => a.order - b.order)
  }

  setFinish(color: string, roughness: number) {
    const { body, band, polished } = this.materials
    body.color.set(color)
    band.color.set(color)
    polished.color.set(color).multiplyScalar(1.12)
    body.roughness = roughness
    band.roughness = Math.min(1, roughness + 0.06)
  }

  /**
   * Explode the stack. Parts closer to the top leave first and travel furthest.
   * Returns nothing; transforms are written in place.
   */
  applyExplode(e: number) {
    for (const c of this.components) {
      const start = (c.order / 8) * 0.42
      const k = THREE.MathUtils.smoothstep(e, start, start + 0.58)
      c.group.position.y = c.lift * k
      c.group.rotation.y = k * (c.order % 2 ? 0.18 : -0.12)
    }
  }
}
