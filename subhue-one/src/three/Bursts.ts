import * as THREE from 'three'
import type { Speaker } from './Speaker'

// Restrained pigment bursts that bloom in three of the gaps as the stack
// separates: a thin ring of droplets, flung outward, then held in the air.

interface Burst { lower: string; upper: string; start: number; colors: number[] }

const BURSTS: Burst[] = [
  { lower: 'coil', upper: 'cone', start: 0.18, colors: [0, 1, 4] },
  { lower: 'board', upper: 'motor', start: 0.42, colors: [2, 3, 7] },
  { lower: 'base', upper: 'enclosure', start: 0.6, colors: [5, 6, 1] },
]

export class Bursts {
  mesh: THREE.InstancedMesh
  private seeds: { burst: number; dir: THREE.Vector3; speed: number; size: number; color: number }[] = []
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private p = new THREE.Vector3()
  private s = new THREE.Vector3()
  private col = new THREE.Color()

  constructor(private speaker: Speaker, mobile: boolean) {
    const per = mobile ? 22 : 40
    let seed = 91
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    BURSTS.forEach((b, bi) => {
      for (let i = 0; i < per; i++) {
        const a = rnd() * Math.PI * 2
        const y = (rnd() - 0.5) * 0.22
        const big = rnd() < 0.1
        this.seeds.push({
          burst: bi,
          dir: new THREE.Vector3(Math.cos(a), y, Math.sin(a)).normalize(),
          speed: 0.55 + rnd() * 0.7,
          size: big ? 0.03 + rnd() * 0.018 : 0.007 + Math.pow(rnd(), 2) * 0.02,
          color: b.colors[Math.floor(rnd() * b.colors.length)],
        })
      }
    })
    const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.15 })
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, mobile ? 1 : 2), mat, this.seeds.length)
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  }

  setPalette(colors: string[]) {
    this.seeds.forEach((sd, i) => this.mesh.setColorAt(i, this.col.set(colors[sd.color])))
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  update(explode: number) {
    this.mesh.visible = explode > 0.12
    if (!this.mesh.visible) return
    const byId = (id: string) => this.speaker.components.find((c) => c.id === id)!
    const centers = BURSTS.map((b) => {
      const lo = byId(b.lower)
      const up = byId(b.upper)
      return (lo.top + lo.group.position.y + up.bottom + up.group.position.y) / 2
    })
    this.seeds.forEach((sd, i) => {
      const b = BURSTS[sd.burst]
      const k = THREE.MathUtils.smoothstep(explode, b.start, b.start + 0.4)
      // Paint squeezes out of the seam and is flung just past the rim.
      const r = 0.55 + (0.35 + 0.55 * sd.speed) * k
      this.p.set(sd.dir.x * r, sd.dir.y * 0.5 * r, sd.dir.z * r)
      this.p.y += centers[sd.burst] - 0.05 * k * k
      const sc = sd.size * THREE.MathUtils.smoothstep(k, 0, 0.25)
      // Stretch slightly along the direction of travel.
      this.q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), sd.dir)
      this.s.set(sc * (1 + 0.6 * (1 - k)), sc, sc)
      this.m.compose(this.p, this.q, this.s)
      this.mesh.setMatrixAt(i, this.m)
    })
    this.mesh.instanceMatrix.needsUpdate = true
  }
}
