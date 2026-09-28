import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { CHAPTERS, SHOTS, blendShots, smooth, dropPaintT, type ChapterId, type Layout, type Shot } from '../three/director'
import { STAGGER } from '../three/constants'
import { PARTS } from '../three/parts'
import type { Engine } from '../three/Engine'
import { bass } from './audio'

gsap.registerPlugin(ScrollTrigger)

// One ticker drives everything scroll-linked: Lenis, the scene, and the DOM
// readouts. Values are written straight to elements, never through React.

interface Range { id: ChapterId; el: HTMLElement; a: number; b: number; sticky: boolean }

const CHAPTER_LABELS: Record<ChapterId, string> = {
  hero: 'CYMA One',
  drop: 'The drop',
  frozen: 'Frozen',
  inside: 'Inside the sound',
  engineering: 'Engineering',
  finishes: 'Finishes',
  closing: 'Sound, made visible',
}

// Reduced motion: each chapter is shown as one strong still.
const STILL_P: Record<ChapterId, number> = { hero: 0, drop: 1, frozen: 0.36, inside: 0.3, engineering: 1, finishes: 0, closing: 0 }

const logHz = (from: number, to: number, t: number) => from * Math.pow(to / from, t)
function fmtHz(hz: number) {
  if (hz >= 1000) return { v: (hz / 1000).toFixed(hz >= 10000 ? 1 : 2), u: 'kHz' }
  return { v: Math.round(hz).toString(), u: 'Hz' }
}

export interface ExperienceHandle {
  scrollTo: (target: string | number, opts?: { duration?: number; immediate?: boolean }) => void
  playDrop: () => void
  lock: (locked: boolean) => void
  refresh: () => void
  destroy: () => void
}

export function startExperience(opts: {
  engine: Engine | null
  reduced: boolean
  onChapter?: (id: ChapterId) => void
}): ExperienceHandle {
  const { engine, reduced } = opts
  const root = document.documentElement
  const lenis = reduced ? null : new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, touchMultiplier: 1.1 })
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update)
  }

  let ranges: Range[] = []
  let vh = window.innerHeight
  let maxScroll = 1
  let layout: Layout = { portrait: false, wide: true }

  const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)
  const els = {
    progress: q('[data-progress]'),
    cue: q('[data-cue]'),
    chapterLabel: q('[data-chapter-label]'),
    dropHz: q('[data-readout="drop-hz"]'),
    dropHzUnit: q('[data-readout="drop-hz-unit"]'),
    dropColors: q('[data-readout="drop-colors"]'),
    dots: Array.from(document.querySelectorAll<HTMLElement>('[data-color-dot]')),
    orbit: q('[data-readout="orbit"]'),
    dial: q('[data-orbit-dial]'),
    insideHz: q('[data-readout="inside-hz"]'),
    insideUnit: q('[data-readout="inside-hz-unit"]'),
    insideMarker: q('[data-inside-marker]'),
    compIndex: q('[data-readout="comp-index"]'),
    compName: q('[data-readout="comp-name"]'),
    compDetail: q('[data-readout="comp-detail"]'),
    compItems: Array.from(document.querySelectorAll<HTMLElement>('[data-comp-item]')),
    leader: q<SVGLineElement>('[data-leader]'),
    leaderDot: q<SVGCircleElement>('[data-leader-dot]'),
    spectrum: q<HTMLCanvasElement>('[data-spectrum]'),
  }

  // Resolves the CSS safe-area insets (env() or an app override) to pixels.
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:var(--safe-top);padding-bottom:var(--safe-bottom)'
  document.body.appendChild(probe)

  function measure() {
    const footer = document.querySelector<HTMLElement>('.site-footer')
    if (footer) root.style.setProperty('--footer-h', `${footer.offsetHeight}px`)
    const ps = getComputedStyle(probe)
    engine?.setInsets(parseFloat(ps.paddingTop) || 0, parseFloat(ps.paddingBottom) || 0)
    vh = window.innerHeight
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh)
    const w = window.innerWidth
    layout = { portrait: w / vh < 0.9, wide: w >= 900 && w / vh > 1.1 }
    ranges = CHAPTERS.map((id) => {
      const el = document.getElementById(id)!
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const h = rect.height
      const sticky = el.hasAttribute('data-sticky') && !reduced
      let a: number, b: number
      if (id === 'hero') { a = 0; b = 0 }
      else if (sticky) { a = top; b = top + h - vh }
      else if (h <= vh) { a = b = top + h / 2 - vh / 2 }
      else { a = top; b = top + h - vh }
      a = Math.min(a, maxScroll)
      b = Math.min(Math.max(a, b), maxScroll)
      return { id, el, a, b, sticky }
    })
  }

  const shotFor = (i: number, p: number) => {
    const r = ranges[i]
    return SHOTS[r.id](reduced ? STILL_P[r.id] : p, layout)
  }

  interface Frame { shot: Shot; active: number; p: number[]; dim: number }
  function compute(y: number): Frame {
    const p = ranges.map((r) => (r.b > r.a ? Math.min(1, Math.max(0, (y - r.a) / (r.b - r.a))) : y >= r.a ? 1 : 0))
    let shot: Shot
    let active = 0
    let dim = 0
    const n = ranges.length
    if (y <= ranges[0].b) { shot = shotFor(0, p[0]); active = 0 }
    else if (y >= ranges[n - 1].a) { shot = shotFor(n - 1, p[n - 1]); active = n - 1 }
    else {
      shot = shotFor(0, 0)
      for (let i = 0; i < n; i++) {
        const r = ranges[i]
        if (y >= r.a && y <= r.b) { shot = shotFor(i, p[i]); active = i; break }
        const next = ranges[i + 1]
        if (next && y > r.b && y < next.a) {
          const t = (y - r.b) / (next.a - r.b)
          if (reduced) {
            // Cut through black instead of moving the camera.
            shot = t < 0.5 ? shotFor(i, 1) : shotFor(i + 1, 0)
            dim = Math.sin(Math.PI * t) * 0.92
          } else {
            shot = blendShots(shotFor(i, 1), shotFor(i + 1, 0), smooth(0, 1, t))
          }
          active = t < 0.5 ? i : i + 1
          break
        }
      }
    }
    return { shot, active, p, dim }
  }

  // --- DOM writers (only touch the DOM when a value changes) -------------
  const last = new Map<unknown, string>()
  const setText = (el: Element | null, v: string) => {
    if (!el || last.get(el) === v) return
    last.set(el, v)
    el.textContent = v
  }
  const setVar = (el: HTMLElement, name: string, v: string) => {
    const k = `${name}`
    const cache = (el as unknown as { __v?: Record<string, string> })
    cache.__v ||= {}
    if (cache.__v[k] === v) return
    cache.__v[k] = v
    el.style.setProperty(name, v)
  }

  const debug: { frame?: Frame; scrollTo?: (y: number) => void; ranges?: () => unknown } = {}
  let lastActive = -1
  let lastDropP = 0
  let spectrumEnergy = 0
  let spectrumBand = 0.05
  let spectrumFrozen = false

  function writeDom(f: Frame, y: number) {
    const pageP = (y / maxScroll).toFixed(4)
    if (els.progress) els.progress.style.transform = `scaleX(${pageP})`
    if (els.cue) setVar(els.cue, '--page-p', pageP)
    ranges.forEach((r, i) => setVar(r.el, '--p', (reduced ? 1 : f.p[i]).toFixed(4)))
    root.style.setProperty('--scene-dim', f.dim.toFixed(3))

    if (f.active !== lastActive) {
      lastActive = f.active
      const id = ranges[f.active].id
      setText(els.chapterLabel, CHAPTER_LABELS[id])
      opts.onChapter?.(id)
    }

    // 02 The drop: frequency settles at 32 Hz, colour count follows launches.
    const pd = reduced ? 1 : f.p[1]
    const sweep = smooth(0.02, 0.23, pd)
    const hz = pd >= 0.23 ? 32 : logHz(2400, 32, sweep)
    const h1 = fmtHz(hz)
    setText(els.dropHz, h1.v)
    setText(els.dropHzUnit, h1.u)
    const t = dropPaintT(pd)
    let launched = 0
    for (let k = 0; k < 8; k++) if (t > k * STAGGER + 0.001) launched++
    setText(els.dropColors, String(launched))
    els.dots.forEach((d, k) => d.classList.toggle('is-on', k < launched))
    if (!reduced && lastDropP < 0.235 && pd >= 0.235 && pd < 0.5) bass.pulse()
    lastDropP = pd

    // 03 Frozen: orbit degrees.
    const pf = reduced ? STILL_P.frozen : f.p[2]
    const deg = Math.round(196 * pf)
    setText(els.orbit, String(deg).padStart(3, '0'))
    if (els.dial) els.dial.style.transform = `rotate(${deg}deg)`

    // 04 Inside: 32 Hz up to 20 kHz on a log scale.
    const pi = reduced ? 1 : f.p[3]
    const ti = smooth(0.06, 0.94, pi)
    const h2 = fmtHz(logHz(32, 20000, ti))
    setText(els.insideHz, h2.v)
    setText(els.insideUnit, h2.u)
    if (els.insideMarker) els.insideMarker.style.transform = `translateX(${(ti * 100).toFixed(2)}%)`

    // 05 Engineering: the component that most recently left the stack.
    const e = f.shot.explode
    let comp = 0
    for (let i = 0; i < 9; i++) if (e >= (i / 8) * 0.42 + 0.06) comp = i
    const pe = reduced ? 1 : f.p[4]
    if (pe <= 0.16 && !reduced) comp = 0
    setText(els.compIndex, String(comp + 1).padStart(2, '0'))
    setText(els.compName, PARTS[comp].name)
    setText(els.compDetail, PARTS[comp].detail)
    els.compItems.forEach((el, i) => el.classList.toggle('is-active', i === comp))
    updateLeader(comp, f)

    // Spectrum targets per chapter.
    const id = ranges[f.active].id
    spectrumFrozen = id === 'frozen' || (id === 'drop' && pd > 0.97)
    if (id === 'hero') { spectrumEnergy = 0.16; spectrumBand = 0.08 }
    else if (id === 'drop') { spectrumEnergy = 0.2 + 0.5 * f.shot.tremble + 0.9 * f.shot.flash + 0.35 * smooth(0.24, 0.5, pd); spectrumBand = 0.04 }
    else if (id === 'frozen') { spectrumEnergy = 0.55; spectrumBand = 0.05 }
    else if (id === 'inside') { spectrumEnergy = 0.5; spectrumBand = 0.05 + ti * 0.9 }
    else if (id === 'engineering') { spectrumEnergy = 0.22; spectrumBand = 0.3 }
    else { spectrumEnergy = 0.12; spectrumBand = 0.2 }
  }

  function updateLeader(comp: number, f: Frame) {
    const line = els.leader
    if (!line || !engine) return
    const svg = line.ownerSVGElement!
    const pe = f.p[4]
    const visible = ranges[f.active].id === 'engineering' && pe > 0.18 && window.innerWidth >= 900
    svg.style.opacity = visible ? '1' : '0'
    if (!visible) return
    const item = els.compItems[comp]
    if (!item) return
    const r = item.getBoundingClientRect()
    const a = engine.project(comp)
    line.setAttribute('x1', String(r.right + 12))
    line.setAttribute('y1', String(r.top + r.height / 2))
    line.setAttribute('x2', a.x.toFixed(1))
    line.setAttribute('y2', a.y.toFixed(1))
    els.leaderDot?.setAttribute('cx', a.x.toFixed(1))
    els.leaderDot?.setAttribute('cy', a.y.toFixed(1))
  }

  // --- Spectrum: 24 bars, drawn at ~30 fps, frozen with time in chapter 03.
  const spec = els.spectrum
  const sctx = spec?.getContext('2d') ?? null
  const bars = new Float32Array(24)
  let specClock = 0
  let specAccum = 0
  function drawSpectrum(dt: number) {
    if (!spec || !sctx) return
    specAccum += dt
    if (specAccum < 1 / 30) return
    specAccum = 0
    if (!spectrumFrozen && !reduced) specClock += 1 / 30
    const W = spec.width, H = spec.height
    const color = getComputedStyle(root).getPropertyValue('--accent-live').trim() || '#fff'
    sctx.clearRect(0, 0, W, H)
    const bw = W / bars.length
    for (let i = 0; i < bars.length; i++) {
      const x = i / (bars.length - 1)
      const peak = Math.exp(-Math.pow((x - spectrumBand) / 0.16, 2))
      const wob = reduced ? 0.6 : 0.55 + 0.45 * Math.sin(specClock * (5 + i * 0.7) + i * 1.9) * Math.sin(specClock * 2.3 + i)
      const target = Math.min(1, 0.06 + spectrumEnergy * (0.25 + 0.85 * peak) * (0.6 + 0.4 * wob))
      bars[i] += (target - bars[i]) * (spectrumFrozen ? 0.05 : 0.35)
      const h = Math.max(1, bars[i] * H)
      sctx.fillStyle = color
      sctx.globalAlpha = 0.35 + 0.65 * bars[i]
      sctx.fillRect(i * bw + 1, H - h, Math.max(1, bw - 2), h)
    }
    sctx.globalAlpha = 1
  }

  // --- Main tick ----------------------------------------------------------
  let lastTime = performance.now()
  function tick(time: number) {
    const now = performance.now()
    const dt = Math.min(0.1, (now - lastTime) / 1000)
    lastTime = now
    lenis?.raf(time * 1000)
    const y = lenis ? lenis.scroll : window.scrollY
    const f = compute(y)
    debug.frame = f
    writeDom(f, y)
    if (engine) {
      const shot = f.dim > 0 ? { ...f.shot, dim: Math.max(f.shot.dim, f.dim) } : f.shot
      engine.frame(shot, dt)
    }
    drawSpectrum(dt)
  }

  const onResize = () => {
    if (engine) engine.resize(window.innerWidth, window.innerHeight)
    measure()
    ScrollTrigger.refresh()
  }
  window.addEventListener('resize', onResize)
  const ro = new ResizeObserver(() => measure())
  ro.observe(document.body)
  gsap.ticker.lagSmoothing(0)
  gsap.ticker.add(tick)
  onResize()

  // Deterministic scrolling and state inspection for scripts/shoot.mjs.
  ;(window as unknown as { __cyma?: unknown }).__cyma = debug
  debug.scrollTo = (y: number) => (lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y))
  debug.ranges = () => ranges.map((r) => ({ id: r.id, a: r.a, b: r.b }))

  const offsetFor = (target: string | number) => {
    if (typeof target === 'number') return target
    const r = ranges.find((x) => x.id === target)
    if (r) return r.a
    const el = document.getElementById(target)
    return el ? el.getBoundingClientRect().top + window.scrollY : 0
  }

  return {
    scrollTo(target, o = {}) {
      const y = offsetFor(target)
      if (lenis) lenis.scrollTo(y, { duration: o.duration ?? 1.6, immediate: o.immediate, easing: (t) => 1 - Math.pow(1 - t, 3.2) })
      else window.scrollTo({ top: y, behavior: 'auto' })
    },
    playDrop() {
      const r = ranges.find((x) => x.id === 'drop')!
      if (!lenis) { window.scrollTo({ top: r.b, behavior: 'auto' }); return }
      // A guided pass through the eruption: arrive, hold on the tremble, hit.
      const y0 = r.a + (r.b - r.a) * 0.02
      const y1 = r.a + (r.b - r.a) * 0.985
      lenis.scrollTo(y0, {
        duration: 1.1,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        onComplete: () => lenis.scrollTo(y1, { duration: 5.2, easing: (t) => (t < 0.35 ? 0.3 * Math.pow(t / 0.35, 2) : 0.3 + 0.7 * (1 - Math.pow(1 - (t - 0.35) / 0.65, 2.4))) }),
      })
    },
    lock(locked) {
      if (!lenis) return
      if (locked) lenis.stop()
      else lenis.start()
    },
    refresh: onResize,
    destroy() {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      probe.remove()
      lenis?.destroy()
    },
  }
}
