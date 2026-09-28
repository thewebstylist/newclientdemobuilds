import { useEffect, useRef } from 'react'
import { Engine } from './three/Engine'
import { SHOTS, layoutFor, type ChapterId } from './three/director'

// Renders a single chapter still at the window size. Used only by
// scripts/capture.mjs to produce the poster and fallback images, so the
// posters are always the real scene rather than a separate illustration.
export default function Capture({ params }: { params: URLSearchParams }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const w = window.innerWidth
    const h = window.innerHeight
    const engine = new Engine(canvas, { mobile: params.get('mobile') === '1', capture: true })
    engine.resize(w, h)
    const id = (params.get('capture') as ChapterId) || 'spin'
    const p = Number(params.get('p') ?? 0)
    const shot = SHOTS[id](p, layoutFor(w, h))
    let n = 0
    const loop = () => {
      engine.invalidate()
      engine.frame({ ...shot, turntable: 0 }, 1 / 60)
      if (++n < 8) requestAnimationFrame(loop)
      else (window as unknown as { __laminaReady: boolean }).__laminaReady = true
    }
    document.fonts.ready.then(() => requestAnimationFrame(loop))
    return () => engine.dispose()
  }, [params])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', display: 'block' }} />
}
