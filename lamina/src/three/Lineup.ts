import * as THREE from 'three'
import { CroissantPath, sweep, type CroissantShape } from './croissantGeo'
import { crustMaterial } from './pastryMaterials'
import { LINEUP_GRID, LINEUP_ROW, LINEUP_SCALE } from './constants'

// The three pastries that join Croissant Pro in the lineup, built in the same
// style: procedural laminated crust, studio lit.

function centred(obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj)
  const c = box.getCenter(new THREE.Vector3())
  obj.position.sub(c)
  const holder = new THREE.Group()
  holder.add(obj)
  return holder
}

function pastrySweep(shape: CroissantShape, mat: THREE.Material) {
  const path = new CroissantPath(shape)
  const { crust } = sweep(path, { s0: 0, s1: 1, segments: 90, radial: 64 })
  return { mesh: new THREE.Mesh(crust, mat), path }
}

export class Lineup {
  group = new THREE.Group()
  items: THREE.Group[] = []

  constructor(bump: THREE.Texture) {
    // Pain au chocolat: a straight, boxy roll with two dark batons at the ends.
    {
      const { mat } = crustMaterial(bump, { crease: '#e2ad60', crown: '#8a4414', tip: '#6a3210', raw: '#ecd6ae' })
      const { mesh } = pastrySweep({ length: 1.5, arc: 0.06, radius: 0.36, bands: 3, twist: 0.15, seed: 8, taper: 0.18, square: 3.4, floor: 0.35 }, mat)
      const g = new THREE.Group()
      g.add(mesh)
      const choc = new THREE.MeshPhysicalMaterial({ color: '#2a140a', roughness: 0.35, clearcoat: 0.6 })
      const box = new THREE.Box3().setFromObject(mesh)
      const c = box.getCenter(new THREE.Vector3())
      for (const side of [-1, 1]) for (const dz of [-0.1, 0.1]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.14), choc)
        b.position.set(c.x + side * (box.max.x - c.x - 0.02), c.y + 0.02, c.z + dz)
        g.add(b)
      }
      this.items.push(centred(g))
    }
    // Kouign-amann: a caramelised four-lobed cup.
    {
      const geo = new THREE.SphereGeometry(1, 96, 48)
      const pos = geo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
        const th = Math.atan2(z, x)
        const lobes = 1 + 0.2 * Math.cos(4 * th) + 0.04 * Math.cos(8 * th + y * 3)
        const top = y > 0 ? 0.62 + 0.12 * Math.cos(4 * th) * y : 0.3
        pos.setXYZ(i, x * 0.62 * lobes, y * top * 0.62, z * 0.62 * lobes)
      }
      geo.computeVertexNormals()
      const caramel = new THREE.MeshPhysicalMaterial({
        color: '#8c4a14', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, bumpMap: bump, bumpScale: 0.6,
        sheen: 0.3, sheenColor: new THREE.Color('#ffb060'),
      })
      this.items.push(centred(new THREE.Mesh(geo, caramel)))
    }
    // Almond croissant: twice-baked, sliced almonds and a dusting of sugar.
    {
      const { mat } = crustMaterial(bump, { crease: '#d49a4e', crown: '#7a3c10', tip: '#4e2408', raw: '#ecd6ae' })
      const { mesh, path } = pastrySweep({ length: 2.1, arc: 2.2, radius: 0.46, bands: 7, twist: 0.7, seed: 5 }, mat)
      const g = new THREE.Group()
      g.add(mesh)
      const almondMat = new THREE.MeshStandardMaterial({ color: '#e9d4ae', roughness: 0.7 })
      const almond = new THREE.SphereGeometry(1, 12, 6)
      const n = 34
      const almonds = new THREE.InstancedMesh(almond, almondMat, n)
      const sugar = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#fbf7f0', roughness: 1 }), 260)
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3()
      let seed = 3
      const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      for (let i = 0; i < n; i++) {
        path.point(0.2 + r() * 0.6, Math.PI * (0.25 + r() * 0.5), 1.02, p)
        q.setFromEuler(e.set(Math.PI / 2 + (r() - 0.5) * 0.8, r() * 3, (r() - 0.5) * 0.8))
        m.compose(p, q, sc.set(0.075, 0.045, 0.012))
        almonds.setMatrixAt(i, m)
      }
      for (let i = 0; i < 260; i++) {
        path.point(0.08 + r() * 0.84, Math.PI * (0.15 + r() * 0.7), 1.01, p)
        const s = 0.006 + r() * 0.006
        m.compose(p, q.identity(), sc.set(s, s, s))
        sugar.setMatrixAt(i, m)
      }
      g.add(almonds, sugar)
      this.items.push(centred(g))
    }
    this.items.forEach((it) => this.group.add(it))
    this.group.visible = false
  }

  /** k 0..1: the three pastries rise into their slots beside Croissant Pro. grid: 2 x 2 on phones. */
  set(k: number, clock: number, grid: boolean) {
    this.group.visible = k > 0.01
    if (!this.group.visible) return
    const slots = grid ? LINEUP_GRID : LINEUP_ROW
    const sc = grid ? LINEUP_SCALE.grid : LINEUP_SCALE.row
    this.items.forEach((it, i) => {
      const t = THREE.MathUtils.smoothstep(k, 0.1 + i * 0.12, 0.6 + i * 0.12)
      const [x, y] = slots[i + 1]
      it.position.set(x, y + (1 - t) * -0.6, 0)
      it.scale.setScalar(sc * Math.max(0.001, t))
      it.rotation.y = 0.35 + Math.sin(clock * 0.3 + i) * 0.08 + (1 - t) * 1.2
      it.rotation.x = 0.12
    })
  }
}
