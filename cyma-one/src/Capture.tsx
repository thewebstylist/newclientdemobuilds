import { useEffect, useRef } from 'react'
import { Engine } from './three/Engine'
import { SHOTS, type ChapterId } from './three/director'
import type { FinishName, PaletteName } from './three/palettes'

// Renders a single chapter still at the window size. Used only by
// scripts/capture.mjs to produce the poster and fallback images, so the
// posters are always the real scene rather than a separate illustration.
export default function Capture({ params }: { params: URLSearchParams }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const w = window.innerWidth
    const h = window.innerHeight
    const mobile = params.get('mobile') === '1'
    const engine = new Engine(canvas, { mobile, capture: true })
    engine.resize(w, h)
    engine.setPalette((params.get('palette') as PaletteName) || 'original')
    engine.setFinish((params.get('finish') as FinishName) || 'obsidian')
    const id = (params.get('capture') as ChapterId) || 'hero'
    const p = Number(params.get('p') ?? 0)
    const shot = SHOTS[id](p, { portrait: w / h < 0.9, wide: w >= 900 && w / h > 1.1 })
    let n = 0
    const loop = () => {
      engine.frame({ ...shot, turntable: 0, tremble: 0 }, 1 / 60)
      // Force a redraw each frame while fonts and textures settle.
      ;(engine as unknown as { lastKey: string }).lastKey = ''
      if (++n < 8) requestAnimationFrame(loop)
      else (window as unknown as { __cymaReady: boolean }).__cymaReady = true
    }
    document.fonts.ready.then(() => requestAnimationFrame(loop))
    return () => engine.dispose()
  }, [params])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', display: 'block' }} />
}
