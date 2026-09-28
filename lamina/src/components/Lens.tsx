import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Engine, Plates } from '../three/Engine'
import { SHOTS, layoutFor } from '../three/director'
import type { ExperienceHandle } from '../lib/experience'

// X-ray and thermal lens. When the chapter settles, the engine renders the
// same view twice offscreen (X-ray shells, grey-scale heat). The lens draws
// the chosen plate inside a circle under the cursor, and the readout reads
// the plate's pixel at the cursor's exact position.

type Mode = 'xray' | 'thermal'

/** Iron-bow palette for the heat plate. */
const STOPS: [number, [number, number, number]][] = [
  [0, [6, 3, 12]], [0.02, [22, 6, 48]], [0.25, [70, 10, 120]], [0.5, [196, 36, 88]],
  [0.72, [244, 118, 30]], [0.9, [255, 211, 86]], [1, [255, 250, 226]],
]
function ironbow(t: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i]
      const k = (t - a) / (b - a)
      return [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k]
    }
  }
  return STOPS[STOPS.length - 1][1]
}
const LUT = Array.from({ length: 256 }, (_, i) => ironbow(i / 255))

const toCanvas = (img: ImageData) => {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  c.getContext('2d')!.putImageData(img, 0, 0)
  return c
}

interface Built { plates: Plates; xray: HTMLCanvasElement; thermal: HTMLCanvasElement }

export default function Lens({ engine, exp, active }: {
  engine: () => Engine | null
  exp: () => ExperienceHandle | null
  active: boolean
}) {
  const [mode, setMode] = useState<Mode>('thermal')
  const [ready, setReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef<HTMLElement>(null)
  const unitRef = useRef<HTMLElement>(null)
  const detailRef = useRef<HTMLParagraphElement>(null)
  const liveRef = useRef<HTMLParagraphElement>(null)
  const built = useRef<Built | null>(null)
  const pos = useRef<{ x: number; y: number } | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const build = useCallback(() => {
    const e = engine()
    const x = exp()
    if (!e || !x || !x.settled('lens')) return false
    const plates = e.renderPlates(SHOTS.lens(0, layoutFor(window.innerWidth, window.innerHeight)))
    const heatImg = new ImageData(plates.w, plates.h)
    for (let i = 0; i < plates.heat.length; i++) {
      const c = LUT[plates.heat[i]]
      heatImg.data[i * 4] = c[0]
      heatImg.data[i * 4 + 1] = c[1]
      heatImg.data[i * 4 + 2] = c[2]
      heatImg.data[i * 4 + 3] = 255
    }
    built.current = { plates, xray: toCanvas(plates.xray), thermal: toCanvas(heatImg) }
    return true
  }, [engine, exp])

  // Build plates once the chapter holds still; rebuild after a resize.
  useEffect(() => {
    if (!active) { setReady(false); return }
    let raf = 0
    let tries = 0
    const attempt = () => {
      if (build()) setReady(true)
      else if (++tries < 600) raf = requestAnimationFrame(attempt)
    }
    raf = requestAnimationFrame(attempt)
    const onResize = () => { built.current = null; setReady(false); tries = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(attempt) }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [active, build])

  // Draw loop: the lens follows the pointer, or drifts over the croissant until one arrives.
  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let t0 = performance.now()
    let lastKey = ''
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const b = built.current
      const x = exp()
      if (!b) return
      const W = window.innerWidth, H = window.innerHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr) }
      const settled = !!x?.settled('lens')
      canvas.style.opacity = settled ? '1' : '0'
      const e = engine()
      let p = pos.current
      if (!p) {
        const c = e ? e.projectWorld(0, 0.05, 0) : { x: W / 2, y: H / 2 }
        const t = (performance.now() - t0) / 1000
        const rx = Math.min(W * 0.26, 360), ry = Math.min(H * 0.07, 60)
        p = { x: c.x + Math.sin(t * 0.55) * rx, y: c.y + Math.sin(t * 1.1) * ry }
      }
      const R = W < 700 ? 78 : 118
      const m = modeRef.current
      const key = `${p.x.toFixed(1)},${p.y.toFixed(1)},${m},${W},${H},${settled}`
      if (key === lastKey) return
      lastKey = key
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.beginPath()
      ctx.arc(p.x, p.y, R, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(m === 'xray' ? b.xray : b.thermal, 0, 0, W, H)
      if (m === 'xray') {
        // Faint film grid, like a radiograph.
        ctx.strokeStyle = 'rgba(160,210,255,0.08)'
        ctx.lineWidth = 1
        for (let gx = Math.floor((p.x - R) / 24) * 24; gx < p.x + R; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, p.y - R); ctx.lineTo(gx, p.y + R); ctx.stroke() }
        for (let gy = Math.floor((p.y - R) / 24) * 24; gy < p.y + R; gy += 24) { ctx.beginPath(); ctx.moveTo(p.x - R, gy); ctx.lineTo(p.x + R, gy); ctx.stroke() }
      }
      ctx.restore()
      // Ring and crosshair.
      ctx.lineWidth = 1.5
      ctx.strokeStyle = m === 'xray' ? 'rgba(170,215,255,0.9)' : 'rgba(255,205,120,0.95)'
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.stroke()
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p.x - 9, p.y); ctx.lineTo(p.x - 3, p.y); ctx.moveTo(p.x + 3, p.y); ctx.lineTo(p.x + 9, p.y)
      ctx.moveTo(p.x, p.y - 9); ctx.lineTo(p.x, p.y - 3); ctx.moveTo(p.x, p.y + 3); ctx.lineTo(p.x, p.y + 9)
      ctx.stroke()

      // Readout: sample the plate pixel under the crosshair.
      const px = Math.max(0, Math.min(b.plates.w - 1, Math.round((p.x / W) * b.plates.w)))
      const py = Math.max(0, Math.min(b.plates.h - 1, Math.round((p.y / H) * b.plates.h)))
      const i = py * b.plates.w + px
      let value = '', unit = '', detail = ''
      if (m === 'thermal') {
        const h = b.plates.heat[i]
        if (h < 6) { value = '21.0'; unit = '°C'; detail = 'Room air' }
        else {
          const temp = 21 + (h / 255) * 76
          value = temp.toFixed(1); unit = '°C'
          detail = temp > 80 ? 'Core: still steaming' : temp > 55 ? 'Crumb: warm' : 'Crust: cooling fast'
        }
      } else {
        const d = b.plates.xray.data
        const l = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / (3 * 255)
        if (l < 0.03) { value = '0.00'; unit = 'g/cm³'; detail = 'Air' }
        else {
          value = (0.08 + l * 0.46).toFixed(2); unit = 'g/cm³'
          detail = `${Math.min(81, Math.max(1, Math.round(l * 100)))} layers in path`
        }
      }
      if (valueRef.current) valueRef.current.textContent = value
      if (unitRef.current) unitRef.current.textContent = unit
      if (detailRef.current) detailRef.current.textContent = detail
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); t0 = 0 }
  }, [ready, engine, exp])

  // Pointer, touch and keyboard.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const set = (e: PointerEvent) => {
      if ((e.target as Element).closest('button')) return
      pos.current = { x: e.clientX, y: e.clientY }
    }
    const move = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.buttons) set(e) }
    const key = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 60 : 24
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
      if (!d) return
      e.preventDefault()
      const e2 = engine()
      const c = pos.current ?? (e2 ? e2.projectWorld(0, 0.05, 0) : { x: innerWidth / 2, y: innerHeight / 2 })
      pos.current = { x: Math.max(0, Math.min(innerWidth, c.x + d[0])), y: Math.max(0, Math.min(innerHeight, c.y + d[1])) }
      requestAnimationFrame(() => {
        if (liveRef.current) liveRef.current.textContent = `${valueRef.current?.textContent ?? ''} ${unitRef.current?.textContent ?? ''}, ${detailRef.current?.textContent ?? ''}`
      })
    }
    el.addEventListener('pointerdown', set)
    el.addEventListener('pointermove', move)
    el.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', set)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('keydown', key)
    }
  }, [engine])

  return (
    <section id="lens" className="chapter lens" data-sticky style={{ '--len': 170 } as CSSProperties} aria-labelledby="lens-title">
      <div className={`stage lens__stage${ready ? ' is-ready' : ''}`} ref={stageRef} tabIndex={0} aria-describedby="lens-help">
        <canvas ref={canvasRef} className="lens__canvas" aria-hidden="true" />
        <div className="lens__copy">
          <p className="eyebrow mono">06 <span className="dot" /> Lens</p>
          <h2 id="lens-title" className="display display--l">See <span className="serif">through it.</span></h2>
          <p id="lens-help" className="lede">Move across the croissant. X-ray shows the layers; thermal shows where the heat is hiding. Arrow keys move the lens.</p>
        </div>
        <div className="glass lens__panel">
          <div className="seg" role="group" aria-label="Lens mode">
            <button type="button" aria-pressed={mode === 'xray'} onClick={() => setMode('xray')}>X-ray</button>
            <button type="button" aria-pressed={mode === 'thermal'} onClick={() => setMode('thermal')}>Thermal</button>
          </div>
          <p className="lens__value mono"><b ref={valueRef}>--</b><i ref={unitRef}></i></p>
          <p className="lens__detail" ref={detailRef}>{ready ? '' : 'Calibrating lens…'}</p>
          {mode === 'thermal' && <span className="lens__scale" aria-hidden="true"><i>21°</i><i>97°C</i></span>}
          <p className="sr-only" aria-live="polite" ref={liveRef} />
        </div>
      </div>
    </section>
  )
}
