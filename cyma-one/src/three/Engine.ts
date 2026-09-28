import * as THREE from 'three'
import { Speaker } from './Speaker'
import { Paint } from './Paint'
import { Bursts } from './Bursts'
import { radialTexture, ringTexture } from './textures'
import type { Shot } from './director'
import { FINISHES, PALETTES, type FinishName, type PaletteName } from './palettes'

export interface EngineOptions {
  mobile: boolean
  capture?: boolean
  onAccent?: (hex: string | null) => void
}

const DEG = Math.PI / 180

/** Studio lighting as geometry: softboxes and strip lights in a black room. */
function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene()
  env.background = new THREE.Color('#000000')
  const panel = (w: number, h: number, intensity: number, color: string, pos: [number, number, number], round = false) => {
    const m = new THREE.Mesh(
      round ? new THREE.CircleGeometry(w / 2, 48) : new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    )
    m.position.set(...pos)
    m.lookAt(0, 0.5, 0)
    env.add(m)
  }
  panel(7, 7, 2.2, '#ffffff', [0, 9, 1], true)    // overhead softbox
  panel(1.1, 8, 5.5, '#dfe8ff', [-7, 2.5, -4.5])  // rim strip, cool
  panel(1.1, 8, 4.5, '#fff0dd', [7, 2.5, -5])     // rim strip, warm
  panel(4, 3, 0.5, '#ffffff', [-6, 5, 7])         // soft front fill
  const pmrem = new THREE.PMREMGenerator(renderer)
  const tex = pmrem.fromScene(env, 0.02).texture
  pmrem.dispose()
  return tex
}

export class Engine {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 1, 0.02, 80)
  speaker: Speaker
  paint: Paint
  bursts: Bursts
  private rims: THREE.DirectionalLight[] = []
  private shockRing: THREE.Mesh
  private stage: THREE.Mesh
  private target = new THREE.Vector3()
  private turntable = 0
  private lastKey = ''
  private frameTimes: number[] = []
  private maxDpr: number
  private sampleCanvas: HTMLCanvasElement | null = null
  private lastSample = 0
  private width = 1
  private height = 1
  private clock = 0
  /** Vertical shift that centres the subject in the area between safe insets. */
  private insetShift = 0
  private tmp = new THREE.Vector3()
  opts: EngineOptions

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.opts = opts
    // Some laptops refuse a high-performance, antialiased context (blocklisted
    // GPUs, power saving). Retry with the most compatible settings first.
    const base = { canvas, alpha: false, preserveDrawingBuffer: !!opts.capture }
    try {
      this.renderer = new THREE.WebGLRenderer({ ...base, antialias: true, powerPreference: 'high-performance' })
    } catch (err) {
      console.warn('[CYMA] Retrying WebGL with compatible settings.', err)
      this.renderer = new THREE.WebGLRenderer({ ...base, antialias: false, powerPreference: 'default' })
    }
    this.maxDpr = opts.capture ? 1 : Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75)
    this.renderer.setPixelRatio(this.maxDpr)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.setClearColor('#040405', 1)

    const s = this.scene
    s.background = new THREE.Color('#040405')
    s.fog = new THREE.Fog('#040405', 14, 36)
    s.environment = studioEnvironment(this.renderer)
    s.environmentIntensity = 0.9

    const key = new THREE.DirectionalLight('#ffffff', 1.5)
    key.position.set(3, 6, 5)
    const fill = new THREE.DirectionalLight('#ffffff', 0.35)
    fill.position.set(-5, 2, 4)
    const rimA = new THREE.DirectionalLight('#dce6ff', 3.6)
    rimA.position.set(-5, 3, -4)
    const rimB = new THREE.DirectionalLight('#fff1e0', 2.8)
    rimB.position.set(5, 2.5, -4.5)
    this.rims = [rimA, rimB]
    s.add(key, fill, rimA, rimB, new THREE.HemisphereLight('#8899aa', '#000000', 0.12))


    this.stage = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.stage.rotation.x = -Math.PI / 2
    this.stage.position.y = 0.002
    this.stage.scale.setScalar(6.5)
    s.add(this.stage)

    this.shockRing = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.shockRing.rotation.x = -Math.PI / 2
    this.shockRing.position.y = 0.004
    s.add(this.shockRing)

    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
    this.speaker = new Speaker(aniso, opts.mobile)
    s.add(this.speaker.root)
    this.paint = new Paint(this.speaker.coneGroup, opts.mobile)
    this.speaker.root.add(this.paint.group)
    this.bursts = new Bursts(this.speaker, opts.mobile)
    this.speaker.root.add(this.bursts.mesh)

    this.setPalette('original')
    this.setFinish('obsidian')
  }

  /** Compile every shader up front so the first scroll never hitches. */
  warm() {
    this.paint.update(0.6, 1, 1, 0, 0)
    this.renderer.compile(this.scene, this.camera)
  }

  setPalette(name: PaletteName) {
    const p = PALETTES[name]
    this.paint.setPalette(p.colors, p.glow)
    this.bursts.setPalette(p.colors)
    this.lastKey = ''
  }

  setFinish(name: FinishName) {
    const f = FINISHES[name]
    this.speaker.setFinish(f.body, f.roughness)
    this.lastKey = ''
  }

  /** Safe-area insets (px): the subject is framed in the visible band between them. */
  setInsets(top: number, bottom: number) {
    this.insetShift = this.height > 0 ? (top - bottom) / (2 * this.height) : 0
    this.lastKey = ''
  }

  resize(w: number, h: number) {
    this.width = w
    this.height = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.lastKey = ''
  }

  /** Render one frame for the given shot. Skips work when nothing changed. */
  frame(shot: Shot, dt: number) {
    this.clock += dt
    const animated = shot.turntable > 0.001 || shot.tremble > 0.001 || shot.kick > 0.001 || (shot.poolFade > 0.01 && shot.paintT < 0.25)
    const key = JSON.stringify(shot)
    if (!animated && key === this.lastKey) return false
    this.lastKey = key

    // Camera: fit the requested extents, then shift the subject on screen.
    const cam = this.camera
    cam.fov = shot.fov
    const tanV = Math.tan((shot.fov * DEG) / 2)
    const fit = Math.max(shot.H / tanV, shot.W / (tanV * cam.aspect))
    const dist = fit * shot.distMul
    const az = shot.az * DEG
    const el = shot.el * DEG
    this.target.set(shot.tx, shot.ty, shot.tz)
    cam.position.set(
      shot.tx + Math.cos(el) * Math.sin(az) * dist,
      shot.ty + Math.sin(el) * dist,
      shot.tz + Math.cos(el) * Math.cos(az) * dist,
    )
    cam.up.set(0, 1, 0)
    if (shot.el > 85) cam.up.set(-Math.sin(az), 0, -Math.cos(az))
    cam.lookAt(this.target)
    cam.updateProjectionMatrix()
    cam.projectionMatrix.elements[8] = -2 * shot.shiftX
    cam.projectionMatrix.elements[9] = -2 * (shot.shiftY - this.insetShift)
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert()

    // Speaker.
    this.turntable += dt * 0.22 * shot.turntable
    this.speaker.root.rotation.y = shot.spin * DEG + this.turntable
    this.speaker.applyExplode(shot.explode)
    this.bursts.update(shot.explode)
    const cone = this.speaker.coneGroup
    cone.position.y += shot.kick * 0.075 + shot.tremble * 0.007 * Math.sin(this.clock * Math.PI * 2 * 7)
    const capGroup = this.speaker.components.find((c) => c.id === 'cap')!.group
    capGroup.position.y += shot.kick * 0.075 + shot.tremble * 0.007 * Math.sin(this.clock * Math.PI * 2 * 7)

    this.paint.update(shot.paintT, shot.paintFade, shot.poolFade, shot.tremble, this.clock)

    // Light: the hit flashes the rims; the shockwave rolls across the floor.
    this.rims[0].intensity = 3.6 * (1 + shot.flash * 1.6)
    this.rims[1].intensity = 2.8 * (1 + shot.flash * 1.6)
    const sh = shot.shock
    const ringMat = this.shockRing.material as THREE.MeshBasicMaterial
    ringMat.opacity = sh > 0 && sh < 1 ? Math.sin(Math.PI * Math.min(1, sh * 1.4)) * 0.3 * (1 - sh) : 0
    this.shockRing.scale.setScalar(2.2 + sh * 9)
    ;(this.stage.material as THREE.MeshBasicMaterial).opacity = 0.075 * (1 - shot.explode * 0.6) + shot.flash * 0.12
    this.renderer.toneMappingExposure = 1.05 * (1 - shot.dim)

    this.renderer.render(this.scene, cam)
    this.afterRender(dt)
    return true
  }

  private afterRender(dt: number) {
    if (this.opts.capture) return
    // Adaptive resolution: step down if frames are consistently slow.
    this.frameTimes.push(dt)
    if (this.frameTimes.length >= 90) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      this.frameTimes.length = 0
      const cur = this.renderer.getPixelRatio()
      if (avg > 0.028 && cur > 1) {
        this.renderer.setPixelRatio(Math.max(1, cur - 0.25))
        this.renderer.setSize(this.width, this.height, false)
      }
    }
    // Low-frequency accent sampling from the rendered frame.
    const now = performance.now()
    if (this.opts.onAccent && now - this.lastSample > 1400) {
      this.lastSample = now
      this.opts.onAccent(this.sampleAccent())
    }
  }

  private sampleAccent(): string | null {
    try {
      if (!this.sampleCanvas) {
        this.sampleCanvas = document.createElement('canvas')
        this.sampleCanvas.width = 32
        this.sampleCanvas.height = 18
      }
      const ctx = this.sampleCanvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null
      ctx.drawImage(this.renderer.domElement, 0, 0, 32, 18)
      const d = ctx.getImageData(0, 0, 32, 18).data
      let x = 0, y = 0, w = 0
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        const s = max === 0 ? 0 : (max - min) / max
        if (max < 0.22 || s < 0.4) continue
        let h = 0
        if (max === r) h = ((g - b) / (max - min)) % 6
        else if (max === g) h = (b - r) / (max - min) + 2
        else h = (r - g) / (max - min) + 4
        h *= Math.PI / 3
        const wt = s * max * max
        x += Math.cos(h) * wt
        y += Math.sin(h) * wt
        w += wt
      }
      if (w < 1.2) return null
      const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
      return `hsl(${hue.toFixed(0)} 92% 67%)`
    } catch {
      return null
    }
  }

  /** Screen position (CSS px) of a component's label anchor. */
  project(i: number) {
    const c = this.speaker.components[i]
    this.tmp.copy(c.anchor)
    c.group.localToWorld(this.tmp)
    this.tmp.project(this.camera)
    return { x: (this.tmp.x * 0.5 + 0.5) * this.width, y: (-this.tmp.y * 0.5 + 0.5) * this.height, z: this.tmp.z }
  }

  dispose() {
    this.renderer.dispose()
    // Release the GPU context now rather than waiting for garbage collection.
    this.renderer.forceContextLoss()
  }
}
