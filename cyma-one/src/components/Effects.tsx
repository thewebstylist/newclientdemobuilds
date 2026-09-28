import { useEffect, useRef } from 'react'
import gsap from 'gsap'

const INTERACTIVE = 'a, button, input, select, textarea, label, summary, dialog, [role="button"], [role="radio"], [tabindex], .no-splat'

const paintColor = (i: number) => getComputedStyle(document.documentElement).getPropertyValue(`--c${i}`).trim() || '#ff1f8f'

/** Irregular splat outline: a noisy circle plus a few satellite droplets. */
function splatSVG(color: string) {
  const pts: string[] = []
  const n = 14
  const seed = Math.random() * 10
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = 22 + 7 * Math.sin(a * 3 + seed) + 5 * Math.sin(a * 5 + seed * 2) + (Math.random() < 0.25 ? 9 : 0)
    pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`)
  }
  // Smooth closed path through the points (Catmull-Rom as quadratic mids).
  const P = pts.map((p) => p.split(',').map(Number))
  let d = ''
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P[i]
    const [x1, y1] = P[(i + 1) % n]
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
    d += i === 0 ? `M${mx},${my}` : `Q${x0},${y0} ${mx},${my}`
  }
  const [x0, y0] = P[0]
  const [x1, y1] = P[1]
  d += `Q${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}Z`
  let drops = ''
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 34 + Math.random() * 14
    drops += `<circle cx="${(50 + Math.cos(a) * r).toFixed(1)}" cy="${(50 + Math.sin(a) * r).toFixed(1)}" r="${(1.5 + Math.random() * 3).toFixed(1)}"/>`
  }
  return `<svg viewBox="0 0 100 100" fill="${color}"><path d="${d}"/>${drops}</svg>`
}

export default function Effects({ reduced, trail, modalOpen }: { reduced: boolean; trail: boolean; modalOpen: boolean }) {
  const trailRef = useRef<HTMLCanvasElement>(null)
  const splatRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef(modalOpen)
  modalRef.current = modalOpen

  // Reveal-on-enter for non-pinned blocks.
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target) } })
    }, { threshold: 0.2 })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])

  // Magnetic primary buttons, fine pointers only.
  useEffect(() => {
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const btns = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'))
    const cleanups = btns.map((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' })
      const yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' })
      const move = (e: PointerEvent) => {
        const r = b.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dx = e.clientX - cx, dy = e.clientY - cy
        const reach = Math.max(r.width, r.height) * 0.75
        if (Math.abs(dx) < reach && Math.abs(dy) < reach) { xTo(dx * 0.22); yTo(dy * 0.3) }
        else { xTo(0); yTo(0) }
      }
      window.addEventListener('pointermove', move, { passive: true })
      return () => { window.removeEventListener('pointermove', move); gsap.set(b, { x: 0, y: 0 }) }
    })
    return () => cleanups.forEach((c) => c())
  }, [reduced])

  // Paint splats on background clicks (mouse only, never on controls or text selection).
  useEffect(() => {
    const layer = splatRef.current
    if (!layer) return
    const onClick = (e: MouseEvent) => {
      const pe = e as PointerEvent
      if (pe.pointerType && pe.pointerType !== 'mouse') return
      if (e.button !== 0 || e.detail > 1 || modalRef.current) return
      const t = e.target as Element
      if (t.closest(INTERACTIVE)) return
      const sel = window.getSelection()
      if (sel && sel.toString().length > 0) return
      if (layer.childElementCount > 10) layer.firstElementChild?.remove()
      const el = document.createElement('div')
      el.className = 'splat'
      el.innerHTML = splatSVG(paintColor(Math.floor(Math.random() * 8)))
      const size = 70 + Math.random() * 60
      el.style.cssText = `left:${e.clientX - size / 2}px;top:${e.clientY - size / 2}px;width:${size}px;height:${size}px`
      layer.appendChild(el)
      if (reduced) {
        gsap.fromTo(el, { opacity: 0.9 }, { opacity: 0, duration: 0.8, delay: 0.4, onComplete: () => el.remove() })
      } else {
        gsap.fromTo(el, { scale: 0.2, rotate: Math.random() * 90, opacity: 1 }, { scale: 1, duration: 0.5, ease: 'expo.out' })
        gsap.to(el, { opacity: 0, scale: 1.08, duration: 1.1, delay: 0.9, ease: 'power2.in', onComplete: () => el.remove() })
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [reduced])

  // Paint trail: a short, fading ribbon behind the cursor. Idles when still.
  useEffect(() => {
    const c = trailRef.current
    if (!c || !trail || reduced) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr }
    size()
    window.addEventListener('resize', size)
    const pts: { x: number; y: number; t: number }[] = []
    let raf = 0
    let hue = 0
    const draw = () => {
      const now = performance.now()
      while (pts.length && now - pts[0].t > 420) pts.shift()
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i]
        const life = 1 - (now - b.t) / 420
        ctx.strokeStyle = paintColor((hue + Math.floor(i / 6)) % 8)
        ctx.globalAlpha = Math.max(0, life) * 0.85
        ctx.lineWidth = Math.max(0.5, life * 5) * dpr
        ctx.beginPath()
        ctx.moveTo(a.x * dpr, a.y * dpr)
        ctx.lineTo(b.x * dpr, b.y * dpr)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      raf = pts.length > 1 ? requestAnimationFrame(draw) : 0
      if (!raf) ctx.clearRect(0, 0, c.width, c.height)
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || modalRef.current) return
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() })
      if (pts.length > 60) pts.shift()
      if (pts.length % 24 === 0) hue = (hue + 1) % 8
      if (!raf) raf = requestAnimationFrame(draw)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('resize', size)
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, c.width, c.height)
    }
  }, [trail, reduced])

  return (
    <>
      <div className="splats" ref={splatRef} aria-hidden="true" />
      <canvas className="trail" ref={trailRef} aria-hidden="true" />
    </>
  )
}
