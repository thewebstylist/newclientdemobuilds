import * as THREE from 'three'
import { CroissantPath, HERO_SHAPE, sweep, type CroissantShape } from './croissantGeo'
import { crustMaterial, type PastryUniforms } from './pastryMaterials'

export const SLICES = 7

export interface CroissantState {
  split: number     // 0 whole, 1 halves fully apart (crunch)
  crunchT: number   // flake flight time
  slice: number     // 0 whole, 1 seven slices in a row (lamination)
  bake: number      // 0 raw, 1 golden
  rise: number      // 0 raw dough (flatter, smaller), 1 fully risen
}

interface Piece { group: THREE.Group; home: THREE.Vector3; turn: number }

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Croissant {
  root = new THREE.Group()        // world transform (spin, position, scale)
  private body = new THREE.Group() // centres the model on the origin
  private halves: Piece[] = []
  private slices: Piece[] = []
  private flakes: THREE.InstancedMesh
  private idle: THREE.InstancedMesh
  private flakeSeeds: { o: THREE.Vector3; v: THREE.Vector3; axis: THREE.Vector3; spin: number; size: THREE.Vector3; delay: number }[] = []
  private idleSeeds: { r: number; y: number; a: number; speed: number; size: number; tilt: number }[] = []
  uniforms: PastryUniforms
  path: CroissantPath
  crustMat: THREE.MeshPhysicalMaterial
  capMat: THREE.MeshStandardMaterial
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private e = new THREE.Euler()
  private v = new THREE.Vector3()
  private s3 = new THREE.Vector3()
  /** Number of flakes currently in the air (for the crunch readout). */
  airborne = 0
  flakeCount: number
  private minY = 0
  private centerY = 0
  private xray: THREE.Group | null = null
  private thermal: THREE.ShaderMaterial | null = null

  constructor(opts: { bump: THREE.Texture; crumb: THREE.Texture; mobile: boolean; shape?: CroissantShape }) {
    this.path = new CroissantPath(opts.shape ?? HERO_SHAPE)
    const { mat, uniforms } = crustMaterial(opts.bump, { crease: '#e6b366', crown: '#8e4613', tip: '#5a280b', raw: '#ecd6ae' })
    this.crustMat = mat
    this.uniforms = uniforms
    // The cut crumb is lit from within a little, so the honeycomb reads even facing away from the key.
    this.capMat = new THREE.MeshStandardMaterial({ map: opts.crumb, emissiveMap: opts.crumb, emissive: '#ffffff', emissiveIntensity: 0.22, roughness: 0.82, side: THREE.DoubleSide })

    const segs = opts.mobile ? 70 : 110
    const rad = opts.mobile ? 48 : 72

    // Halves: split at the belly, each with a honeycomb cut face.
    for (const [s0, s1] of [[0, 0.5], [0.5, 1]] as const) {
      this.halves.push(this.piece(s0, s1, segs, rad, s0 === 0 ? { capEnd: true } : { capStart: true }))
    }
    // Seven slices: each shows its laminated cross-section on both faces.
    for (let i = 0; i < SLICES; i++) {
      const s0 = i / SLICES, s1 = (i + 1) / SLICES
      this.slices.push(this.piece(s0, s1, Math.ceil(segs / 3), rad, { capStart: i > 0, capEnd: i < SLICES - 1 }))
    }

    // Centre the model: bounding box of the whole crust.
    const box = new THREE.Box3()
    this.halves.forEach((h) => box.expandByObject(h.group))
    const c = box.getCenter(new THREE.Vector3())
    this.body.position.set(-c.x, -c.y, -c.z)
    this.minY = box.min.y
    this.centerY = c.y
    this.root.add(this.body)

    // Flakes that burst from the break.
    const r = rng(81)
    this.flakeCount = opts.mobile ? 170 : 340
    // Flakes: thin, irregular, slightly curled shards of crust.
    const shard = new THREE.Shape()
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      const rr = 0.35 + r() * 0.2
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.6
      if (k === 0) shard.moveTo(px, py)
      else shard.lineTo(px, py)
    }
    const flakeGeo = new THREE.ShapeGeometry(shard)
    const fp = flakeGeo.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < fp.count; k++) fp.setZ(k, 0.25 * fp.getX(k) * fp.getX(k))
    flakeGeo.computeVertexNormals()
    const flakeMat = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.3, side: THREE.DoubleSide })
    this.flakes = new THREE.InstancedMesh(flakeGeo, flakeMat, this.flakeCount)
    const mid = this.path.center(0.5)
    const col = new THREE.Color()
    for (let i = 0; i < this.flakeCount; i++) {
      const th = r() * Math.PI * 2
      const o = this.path.point(0.5 + (r() - 0.5) * 0.08, th, 0.98)
      const out = o.clone().sub(mid).setX(0).normalize()
      const v = new THREE.Vector3((r() - 0.5) * 1.6, 0.6 + r() * 1.6, (r() - 0.2) * 1.4).add(out.multiplyScalar(0.8 + r()))
      v.multiplyScalar(0.55 + r() * 1.3)
      const big = r() < 0.12
      const w = big ? 0.05 + r() * 0.05 : 0.012 + r() * 0.03
      this.flakeSeeds.push({
        o, v, axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 2 + r() * 8,
        size: new THREE.Vector3(w * 1.6, w * (0.8 + r() * 0.6), w), delay: r() * 0.08,
      })
      col.setHSL(0.075 + r() * 0.03, 0.7, 0.3 + r() * 0.24)
      this.flakes.setColorAt(i, col)
    }
    this.flakes.frustumCulled = false
    this.body.add(this.flakes)

    // A few flakes that drift around the hero croissant.
    this.idle = new THREE.InstancedMesh(flakeGeo, flakeMat, 16)
    for (let i = 0; i < 16; i++) {
      this.idleSeeds.push({ r: 1.3 + r() * 0.9, y: (r() - 0.35) * 1.2, a: r() * Math.PI * 2, speed: 0.08 + r() * 0.12, size: 0.018 + r() * 0.03, tilt: r() * 6 })
      col.setHSL(0.09, 0.7, 0.35 + r() * 0.2)
      this.idle.setColorAt(i, col)
    }
    this.idle.frustumCulled = false
    this.root.add(this.idle)
  }

  private piece(s0: number, s1: number, segs: number, rad: number, caps: { capStart?: boolean; capEnd?: boolean }): Piece {
    const { crust, caps: capGeo } = sweep(this.path, { s0, s1, segments: segs, radial: rad, ...caps })
    const home = this.path.center((s0 + s1) / 2)
    const group = new THREE.Group()
    const crustMesh = new THREE.Mesh(crust, this.crustMat)
    crustMesh.position.copy(home).negate()
    group.add(crustMesh)
    if (capGeo) {
      const capMesh = new THREE.Mesh(capGeo, this.capMat)
      capMesh.position.copy(home).negate()
      group.add(capMesh)
    }
    group.position.copy(home)
    this.body.add(group)
    // Turn needed for this slice's cut face to look at the camera (+z).
    const T = this.path.tangent((s0 + s1) / 2)
    const turn = Math.atan2(T.z, T.x)
    return { group, home, turn }
  }

  update(st: CroissantState, clock: number) {
    const useSlices = st.slice > 0.001
    this.halves.forEach((h) => (h.group.visible = !useSlices))
    this.slices.forEach((s) => (s.group.visible = useSlices))
    this.uniforms.uBake.value = st.bake
    this.crustMat.clearcoat = 0.05 + 0.25 * st.bake
    // Raw dough sits lower and a touch smaller; the oven spring lifts it from the base.
    const sy = 0.8 + 0.2 * st.rise, sxz = 0.94 + 0.06 * st.rise
    this.body.scale.set(sxz, sy, sxz)

    // Crunch: halves drift apart and turn their cut faces to the camera.
    const sp = st.split
    this.halves.forEach((h, i) => {
      const dir = i === 0 ? -1 : 1
      h.group.position.copy(h.home)
      h.group.position.x += dir * sp * 0.62
      h.group.position.y += sp * 0.1
      h.group.rotation.set(0, dir * sp * 0.8, dir * sp * 0.16)
    })

    // Lamination: slices glide into a row, each turned to show its face.
    const k = st.slice
    const row = 0.72
    this.slices.forEach((s, i) => {
      const t = THREE.MathUtils.smoothstep(k, i * 0.05, 0.62 + i * 0.05)
      const target = this.v.set((i - (SLICES - 1) / 2) * row + 0 - this.body.position.x, 0.02 - this.body.position.y, 0.2 - this.body.position.z)
      s.group.position.lerpVectors(s.home, target, t)
      s.group.rotation.set(0, t * s.turn, 0)
    })

    // Flakes: closed-form flight, slowing to hang in the air.
    const ct = st.crunchT
    let air = 0
    this.flakes.visible = ct > 0.0005
    if (this.flakes.visible) {
      const mid = this.path.center(0.5)
      this.flakeSeeds.forEach((f, i) => {
        const t = Math.max(0, ct - f.delay)
        const d = (1 - Math.exp(-2.2 * t)) / 2.2
        this.v.copy(f.o).addScaledVector(f.v, d)
        this.v.y -= 0.18 * t * t
        const grow = THREE.MathUtils.smoothstep(t, 0, 0.04)
        if (t > 0.02) air++
        this.q.setFromEuler(this.e.set(f.axis.x * f.spin * d, f.axis.y * f.spin * d, f.axis.z * f.spin * d))
        this.s3.copy(f.size).multiplyScalar(grow)
        this.v.lerp(mid, 0) // origin already on the crust
        this.m.compose(this.v, this.q, this.s3)
        this.flakes.setMatrixAt(i, this.m)
      })
      this.flakes.instanceMatrix.needsUpdate = true
    }
    this.airborne = air

    // Idle drift.
    this.idleSeeds.forEach((f, i) => {
      const a = f.a + clock * f.speed
      this.v.set(Math.cos(a) * f.r, f.y + Math.sin(clock * 0.4 + i) * 0.06, Math.sin(a) * f.r * 0.6)
      this.q.setFromEuler(this.e.set(f.tilt + clock * 0.3, a, f.tilt))
      this.s3.set(f.size * 1.6, f.size, f.size)
      this.m.compose(this.v, this.q, this.s3)
      this.idle.setMatrixAt(i, this.m)
    })
    this.idle.instanceMatrix.needsUpdate = true
  }

  /** Height of the base below the model origin, before the root transform. */
  bottom(rise: number) {
    return this.minY * (0.8 + 0.2 * rise) - this.centerY
  }

  /**
   * Nested translucent shells, one per group of laminated layers, for the
   * X-ray lens. Built on first use and drawn additively.
   */
  xrayShells() {
    if (this.xray) return this.xray
    const g = new THREE.Group()
    const mat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV;
        void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = 0.03 + 0.34 * pow(f, 2.2);
          gl_FragColor = vec4(vec3(0.62, 0.84, 1.0) * a, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    })
    for (const rs of [1, 0.82, 0.66, 0.5, 0.34, 0.18]) {
      const { crust } = sweep(this.path, { s0: 0.004, s1: 0.996, segments: 90, radial: 56, rScale: rs })
      g.add(new THREE.Mesh(crust, mat))
    }
    g.visible = false
    this.body.add(g)
    this.xray = g
    return g
  }

  /** Grey-scale heat for the thermal lens: the belly holds heat, tips and edges cool first. */
  thermalMaterial() {
    if (this.thermal) return this.thermal
    this.thermal = new THREE.ShaderMaterial({
      vertexShader: `attribute float aTip; attribute float aBand; varying float vTip; varying float vBand; varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vTip = aTip; vBand = aBand; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vTip; varying float vBand; varying vec3 vN; varying vec3 vV;
        void main(){ float facing = abs(dot(normalize(vN), normalize(vV)));
          float core = 1.0 - smoothstep(0.0, 1.0, vTip);
          float h = (0.12 + 0.88 * core) * (0.35 + 0.65 * pow(facing, 0.8)) - (1.0 - vBand) * 0.14;
          h = clamp(0.04 + h * 0.96, 0.02, 1.0);
          gl_FragColor = vec4(h, h, h, 1.0); }`,
      side: THREE.DoubleSide,
    })
    return this.thermal
  }

  /** Crust and flakes, hidden while the X-ray shells draw. */
  setSolidVisible(v: boolean) {
    this.halves.forEach((h) => h.group.children.forEach((c) => (c.visible = v)))
    this.flakes.visible = v && this.flakes.visible
  }

  setIdleVisible(v: number) {
    this.idle.visible = v > 0.01
  }

  /** Meshes used for X-ray and thermal renders. */
  crustMeshes() {
    const out: THREE.Mesh[] = []
    this.halves.forEach((h) => h.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh) }))
    return out
  }
}
