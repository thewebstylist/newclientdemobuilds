import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { CHAPTERS, CRUNCH, SHOTS, blendShots, layoutFor, smooth, type ChapterId, type Layout, type Shot } from '../three/director'
import { LINEUP_GRID, LINEUP_ROW, LINEUP_SCALE } from '../three/constants'
import { appRoot } from './root'
import type { Engine } from '../three/Engine'
import { sound } from './audio'

gsap.registerPlugin(ScrollTrigger)

// One ticker drives everything scroll-linked: Lenis, the scene, and the DOM
// readouts. Values are written straight to elements, never through React.

interface Range { id: ChapterId; el: HTMLElement; a: number; b: number; sticky: boolean }

export const CHAPTER_LABELS: Record<ChapterId, string> = {
  spin: 'Croissant Pro',
  crunch: 'The crunch',
  lamination: 'Lamination',
  crumb: 'The crumb',
  bake: 'The bake',
  lens: 'X-ray & thermal',
  viewer: 'Turn it over',
  lineup: 'The lineup',
  order: 'Order ahead',
}

// Reduced motion: each chapter is shown as one strong still.
const STILL_P: Record<ChapterId, number> = { spin: 0, crunch: 0.74, lamination: 0.55, crumb: 0.3, bake: 1, lens: 0, viewer: 0, lineup: 1, order: 0 }

/** Crust colour names across the bake, with the swatch each one shows. */
const COLOURS: [number, string, string][] = [
  [0, 'Raw dough', '#ecd6ae'],
  [0.14, 'Blond', '#e8c07a'],
  [0.36, 'Honey', '#d99a45'],
  [0.6, 'Golden', '#c07326'],
  [0.84, 'Deep amber', '#99511a'],
]

const pad = (n: number, w = 2) => String(Math.max(0, Math.floor(n))).padStart(w, '0')
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

export interface ExperienceHandle {
  scrollTo: (target: string | number, opts?: { duration?: number; immediate?: boolean }) => void
  lock: (locked: boolean) => void
  refresh: () => void
  layout: () => Layout
  /** True while the page rests inside a chapter's own range (not blending into a neighbour). */
  settled: (id: ChapterId) => boolean
  destroy: () => void
}

export function startExperience(opts: {
  engine: Engine | null
  reduced: boolean
  onChapter?: (id: ChapterId) => void
  /** Called each frame the viewer is active, so drag inertia can advance. */
  onTick?: (dt: number) => boolean
}): ExperienceHandle {
  const { engine, reduced } = opts
  // CSS variables are written on the app container (see lib/root.ts).
  const vars = appRoot()
  const lenis = reduced ? null : new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, touchMultiplier: 1.1 })
  if (lenis) lenis.on('scroll', ScrollTrigger.update)

  let ranges: Range[] = []
  let vh = window.innerHeight
  let maxScroll = 1
  let layout: Layout = { portrait: false, wide: true }

  const q = <T extends Element = HTMLElement>(sel: string) => vars.querySelector<T>(sel)
  const qa = (sel: string) => Array.from(vars.querySelectorAll<HTMLElement>(sel))
  const els = {
    progress: q('[data-progress]'),
    cue: q('[data-cue]'),
    chapterLabel: q('[data-chapter-label]'),
    spinDeg: q('[data-readout="spin-deg"]'),
    db: q('[data-readout="db"]'),
    dbMeter: q('[data-db-meter]'),
    flakes: q('[data-readout="flakes"]'),
    layers: q('[data-readout="layers"]'),
    slice: q('[data-readout="slice"]'),
    depth: q('[data-readout="depth"]'),
    bakeTime: q('[data-readout="bake-time"]'),
    bakeCore: q('[data-readout="bake-core"]'),
    bakeRise: q('[data-readout="bake-rise"]'),
    bakeColour: q('[data-readout="bake-colour"]'),
    bakePanel: q('[data-bake-panel]'),
    lineupLabels: qa('[data-lineup-label]'),
  }

  // Resolves the CSS safe-area insets (env() or an app override) to pixels.
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:var(--safe-top);padding-bottom:var(--safe-bottom)'
  vars.appendChild(probe)

  function measure() {
    const footer = document.querySelector<HTMLElement>('.site-footer')
    if (footer) vars.style.setProperty('--footer-h', `${footer.offsetHeight}px`)
    const ps = getComputedStyle(probe)
    engine?.setInsets(parseFloat(ps.paddingTop) || 0, parseFloat(ps.paddingBottom) || 0)
    vh = window.innerHeight
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh)
    layout = layoutFor(window.innerWidth, vh)
    ranges = CHAPTERS.map((id) => {
      const el = document.getElementById(id)!
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY
      const h = rect.height
      const sticky = el.hasAttribute('data-sticky') && !reduced
      let a: number, b: number
      if (sticky) { a = top; b = top + h - vh }
      else if (h <= vh) { a = b = top + h / 2 - vh / 2 }
      else { a = top; b = top + h - vh }
      a = Math.max(0, Math.min(a, maxScroll))
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
    const p = ranges.map((r) => (r.b > r.a ? clamp01((y - r.a) / (r.b - r.a)) : y >= r.a ? 1 : 0))
    let shot: Shot = shotFor(0, p[0])
    let active = 0
    let dim = 0
    const n = ranges.length
    if (y <= ranges[0].b) { shot = shotFor(0, p[0]); active = 0 }
    else if (y >= ranges[n - 1].a) { shot = shotFor(n - 1, p[n - 1]); active = n - 1 }
    else {
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
  const setVar = (el: HTMLElement | null, name: string, v: string) => {
    if (!el) return
    const k = `${name}`
    const cache = el as unknown as { __v?: Record<string, string> }
    cache.__v ||= {}
    if (cache.__v[k] === v) return
    cache.__v[k] = v
    el.style.setProperty(name, v)
  }

  const debug: { frame?: Frame; scrollTo?: (y: number) => void; ranges?: () => unknown; airborne?: number; engine?: Engine | null } = { engine }
  let lastActive = -1
  let lastCrunchP = 0
  const idx = (id: ChapterId) => CHAPTERS.indexOf(id)
  const pOf = (f: Frame, id: ChapterId) => (reduced ? STILL_P[id] : f.p[idx(id)])

  function writeDom(f: Frame, y: number) {
    const pageP = (y / maxScroll).toFixed(4)
    if (els.progress) els.progress.style.transform = `scaleX(${pageP})`
    setVar(els.cue, '--page-p', pageP)
    ranges.forEach((r, i) => setVar(r.el, '--p', (reduced ? 1 : f.p[i]).toFixed(4)))
    vars.style.setProperty('--scene-dim', f.dim.toFixed(3))

    if (f.active !== lastActive) {
      lastActive = f.active
      const id = ranges[f.active].id
      setText(els.chapterLabel, CHAPTER_LABELS[id])
      opts.onChapter?.(id)
    }

    // 01 Spin: degrees turned.
    const ps = pOf(f, 'spin')
    setText(els.spinDeg, pad(360 * smooth(0.02, 0.46, ps), 3))

    // 02 Crunch: the meter races to its 94 dB peak and holds; flakes in the air.
    const pc = pOf(f, 'crunch')
    const db = pc < CRUNCH.snap ? 0 : 94 * (1 - Math.pow(1 - clamp01((pc - CRUNCH.snap) / 0.08), 2.4))
    setText(els.db, pad(db, 2))
    setVar(els.dbMeter, '--db', (db / 94).toFixed(3))
    const air = engine ? engine.croissant.airborne : Math.round(340 * clamp01((pc - CRUNCH.snap) * 8))
    debug.airborne = air
    setText(els.flakes, pad(air, 3))
    if (!reduced && lastCrunchP < CRUNCH.snap && pc >= CRUNCH.snap && pc < CRUNCH.snap + 0.2) sound.crunch()
    lastCrunchP = pc

    // 03 Lamination: layers counted as the scan passes.
    const pl = pOf(f, 'lamination')
    setText(els.layers, pad(81 * smooth(0.1, 0.78, pl), 2))
    const scan = clamp01((pl - 0.08) / 0.74)
    setText(els.slice, `${Math.min(7, 1 + Math.floor(scan * 7))}/7`)

    // 04 Crumb: depth into the roll.
    setText(els.depth, (f.shot.crumb > 0.01 ? f.shot.crumbZ * 2.6 : 0).toFixed(1))

    // 05 Bake: timer, core temperature, rise and crust colour.
    const pb = pOf(f, 'bake')
    const bt = clamp01((pb - 0.04) / 0.9)
    const secs = bt * 18 * 60
    setText(els.bakeTime, `${pad(secs / 60)}:${pad(secs % 60)}`)
    setText(els.bakeCore, String(Math.round(21 + 75 * Math.pow(bt, 0.75))))
    setText(els.bakeRise, `+${Math.round(38 * smooth(0.06, 0.72, pb))}`)
    const bake = smooth(0.1, 0.92, pb)
    let ci = 0
    for (let i = 0; i < COLOURS.length; i++) if (bake >= COLOURS[i][0]) ci = i
    setText(els.bakeColour, COLOURS[ci][1])
    setVar(els.bakePanel, '--crust', COLOURS[ci][2])
    setVar(els.bakePanel, '--bake', bt.toFixed(4))
    const hum = f.shot.oven * (0.35 + 0.65 * f.shot.heat) * (1 - f.shot.crumb)
    sound.hum(reduced ? 0 : hum)

    // 08 Lineup: name cards follow each pastry on screen.
    if (engine && els.lineupLabels.length) {
      const k = f.shot.lineup
      const grid = f.shot.grid > 0.5
      const slots = grid ? LINEUP_GRID : LINEUP_ROW
      const sc = grid ? LINEUP_SCALE.grid : LINEUP_SCALE.row
      els.lineupLabels.forEach((el, i) => {
        const [x, yy] = slots[i]
        const pt = engine.projectWorld(x, yy - 0.55 * sc, 0)
        el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`
        setVar(el, '--k', clamp01((k - 0.35 - i * 0.1) * 4).toFixed(3))
      })
    }
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
    const moving = opts.onTick ? opts.onTick(dt) : false
    if (engine) {
      const shot = f.dim > 0 ? { ...f.shot, dim: Math.max(f.shot.dim, f.dim) } : f.shot
      engine.frame(shot, dt, moving)
    }
    writeDom(f, y)
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
  ;(window as unknown as { __lamina?: unknown }).__lamina = debug
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
    lock(locked) {
      if (!lenis) return
      if (locked) lenis.stop()
      else lenis.start()
    },
    refresh: onResize,
    layout: () => layout,
    settled(id) {
      const r = ranges.find((x) => x.id === id)
      if (!r) return false
      // Reduced motion holds one still per chapter; it is settled once the cut has finished.
      if (reduced) return !!debug.frame && ranges[debug.frame.active].id === id && debug.frame.dim < 0.02
      const y = lenis ? lenis.scroll : window.scrollY
      return y >= r.a - 2 && y <= r.b + 2
    },
    destroy() {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      probe.remove()
      lenis?.destroy()
      sound.hum(0)
    },
  }
}
