import * as THREE from 'three'
import { Croissant } from './Croissant'
import { Oven } from './Oven'
import { Lineup } from './Lineup'
import { Crumb } from './Crumb'
import { crustBump, crumbTexture } from './pastryMaterials'
import { studioEnvironment, studioLights } from './studio'
import type { Shot } from './director'

export interface EngineOptions {
  mobile: boolean
  capture?: boolean
}

/** Offscreen renders of the lens view: X-ray (RGBA) and thermal heat (0..1 per pixel). */
export interface Plates {
  w: number
  h: number
  xray: ImageData
  heat: Uint8Array
}

const DEG = Math.PI / 180

export class Engine {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(26, 1, 0.02, 60)
  croissant: Croissant
  oven: Oven
  lineup: Lineup
  crumb: Crumb
  /** Visitor's drag angle in degrees (viewer chapter), with inertia applied by the page. */
  dragAngle = 0
  dragTilt = 0
  private lights: ReturnType<typeof studioLights>
  private target = new THREE.Vector3()
  private turntable = 0
  private lastKey = ''
  private frameTimes: number[] = []
  private maxDpr: number
  private width = 1
  private height = 1
  private clock = 0
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
      console.warn('[LAMINA] Retrying WebGL with compatible settings.', err)
      this.renderer = new THREE.WebGLRenderer({ ...base, antialias: false, powerPreference: 'default' })
    }
    this.maxDpr = opts.capture ? 1 : Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75)
    this.renderer.setPixelRatio(this.maxDpr)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1
    this.renderer.setClearColor('#000000', 1)

    const s = this.scene
    s.background = new THREE.Color('#000000')
    s.environment = studioEnvironment(this.renderer)
    s.environmentIntensity = 0.8
    this.lights = studioLights(s)

    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
    const bump = crustBump(aniso)
    this.croissant = new Croissant({ bump, crumb: crumbTexture(aniso), mobile: opts.mobile })
    s.add(this.croissant.root)
    this.oven = new Oven()
    s.add(this.oven.group)
    this.lineup = new Lineup(bump)
    s.add(this.lineup.group)
    this.crumb = new Crumb(opts.mobile)
  }

  /** Compile every shader up front so the first scroll never hitches. */
  warm() {
    this.oven.group.visible = true
    this.lineup.group.visible = true
    this.renderer.compile(this.scene, this.camera)
    this.oven.group.visible = false
    this.lineup.group.visible = false
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
    const dpr = this.renderer.getPixelRatio()
    this.crumb.resize(w * dpr, h * dpr)
    this.camera.aspect = w / h
    this.lastKey = ''
  }

  invalidate() { this.lastKey = '' }

  private placeCamera(shot: Shot) {
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
    cam.lookAt(this.target)
    cam.updateProjectionMatrix()
    cam.projectionMatrix.elements[8] = -2 * shot.shiftX
    cam.projectionMatrix.elements[9] = -2 * (shot.shiftY - this.insetShift)
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert()
  }

  /** Render one frame for the given shot. Skips work when nothing changed. */
  frame(shot: Shot, dt: number, dragMoving = false) {
    this.clock += dt
    const animated = shot.idle > 0.01 || shot.turntable > 0.001 || shot.oven > 0.01 || shot.lineup > 0.01 || dragMoving
    const key = JSON.stringify(shot) + (shot.drag > 0 ? `${this.dragAngle.toFixed(2)},${this.dragTilt.toFixed(2)}` : '')
    if (!animated && key === this.lastKey) return false
    this.lastKey = key

    this.placeCamera(shot)

    // Croissant.
    const c = this.croissant
    this.turntable += dt * 0.28 * shot.turntable
    const root = c.root
    root.scale.setScalar(shot.scale)
    const seat = shot.seat * -c.bottom(shot.rise) * shot.scale
    root.position.set(shot.px, shot.py + seat, shot.pz)
    root.rotation.set(
      (shot.rotX + shot.drag * this.dragTilt) * DEG,
      (shot.rotY + shot.drag * this.dragAngle) * DEG + this.turntable,
      0,
    )
    c.update({ split: shot.split, crunchT: shot.crunchT, slice: shot.slice, bake: shot.bake, rise: shot.rise }, this.clock)
    c.setIdleVisible(shot.idle)
    c.uniforms.uHeat.value = shot.heat * shot.oven

    // Oven: slides away downward as it fades, like the door dropping open.
    this.oven.set(shot.oven, shot.heat, this.clock)
    this.oven.group.position.y = -(1 - shot.oven) * 5
    this.lineup.set(shot.lineup, this.clock, shot.grid > 0.5)

    // Studio light gives way to the oven's glow.
    const studio = 1 - 0.75 * shot.oven
    this.lights.key.intensity = 2.1 * studio
    this.lights.rimL.intensity = 4.2 * (1 - 0.5 * shot.oven)
    this.lights.rimR.intensity = 3.4 * studio
    this.lights.fill.intensity = 0.35 * studio
    this.scene.environmentIntensity = 0.8 * (1 - 0.45 * shot.oven)
    this.renderer.toneMappingExposure = 1 - shot.dim

    // The crumb overlay covers the whole frame at full strength.
    if (shot.crumb < 0.999) this.renderer.render(this.scene, this.camera)
    if (shot.crumb > 0.001) this.crumb.render(this.renderer, shot.crumb, shot.crumbZ)
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
        const dpr = this.renderer.getPixelRatio()
        this.crumb.resize(this.width * dpr, this.height * dpr)
      }
    }
  }

  /**
   * Renders the current view twice offscreen, as X-ray and as thermal, at CSS
   * resolution. The lens draws these under the cursor and reads their pixels.
   */
  renderPlates(shot: Shot): Plates {
    const w = Math.max(2, Math.round(Math.min(this.width, 1800)))
    const h = Math.max(2, Math.round((this.height * w) / this.width))
    const r = this.renderer
    const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true })
    const buf = new Uint8Array(w * h * 4)
    const prev = { tone: r.toneMapping, bg: this.scene.background, env: this.scene.environment }
    const c = this.croissant
    this.placeCamera(shot)
    // A clean studio frame: only the croissant.
    this.oven.group.visible = false
    this.lineup.group.visible = false
    c.setIdleVisible(0)
    r.toneMapping = THREE.NoToneMapping
    this.scene.background = new THREE.Color('#000000')
    r.setRenderTarget(rt)

    const read = () => {
      r.readRenderTargetPixels(rt, 0, 0, w, h, buf)
      // WebGL rows run bottom-up.
      const out = new Uint8ClampedArray(w * h * 4)
      for (let y = 0; y < h; y++) out.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4)
      return out
    }

    // X-ray: nested additive shells.
    const shells = c.xrayShells()
    shells.visible = true
    c.setSolidVisible(false)
    r.clear()
    r.render(this.scene, this.camera)
    const xray = new ImageData(read(), w, h)
    shells.visible = false
    c.setSolidVisible(true)

    // Thermal: every surface drawn with the heat shader.
    this.scene.overrideMaterial = c.thermalMaterial()
    r.clear()
    r.render(this.scene, this.camera)
    const rgba = read()
    this.scene.overrideMaterial = null
    const heat = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) heat[i] = rgba[i * 4]

    r.setRenderTarget(null)
    r.toneMapping = prev.tone
    this.scene.background = prev.bg
    rt.dispose()
    this.lastKey = ''
    return { w, h, xray, heat }
  }

  /** Screen position (CSS px) of a point in croissant space. */
  project(x: number, y: number, z: number) {
    this.tmp.set(x, y, z)
    this.croissant.root.localToWorld(this.tmp)
    this.tmp.project(this.camera)
    return { x: (this.tmp.x * 0.5 + 0.5) * this.width, y: (-this.tmp.y * 0.5 + 0.5) * this.height }
  }

  /** Screen position (CSS px) of a world-space point. */
  projectWorld(x: number, y: number, z: number) {
    this.tmp.set(x, y, z).project(this.camera)
    return { x: (this.tmp.x * 0.5 + 0.5) * this.width, y: (-this.tmp.y * 0.5 + 0.5) * this.height }
  }

  dispose() {
    this.renderer.dispose()
    // Release the GPU context now rather than waiting for garbage collection.
    this.renderer.forceContextLoss()
  }
}
