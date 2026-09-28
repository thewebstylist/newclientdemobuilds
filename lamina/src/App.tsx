import { useCallback, useEffect, useRef, useState } from 'react'
import type { Engine } from './three/Engine'
import { startExperience, type ExperienceHandle } from './lib/experience'
import type { ChapterId } from './three/director'
import { sound as audio } from './lib/audio'
import { createSpin } from './lib/spin'
import Header from './components/Header'
import { Spin, Crunch, Lamination, Crumb, Bake, Viewer, Lineup } from './components/Chapters'
import Lens from './components/Lens'
import Order from './components/Order'
import ScrollCue from './components/ScrollCue'
import MotionNotice from './components/MotionNotice'
import { posterSrc } from './lib/posters'

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isMobile = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760

export type WebGLState = 'pending' | 'ok' | 'failed'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const expRef = useRef<ExperienceHandle | null>(null)
  const spinRef = useRef(createSpin())
  // The system reduced-motion setting is honoured by default; a visitor can
  // opt into full motion from the notice, and the choice is remembered.
  const [osReduced] = useState(prefersReduced)
  const [motionChoice, setMotionChoice] = useState<string | null>(() => {
    try { return localStorage.getItem('lamina-motion') } catch { return null }
  })
  const reduced = osReduced && motionChoice !== 'full'
  const chapterRef = useRef<ChapterId>('spin')
  const resumeRef = useRef<ChapterId | null>(null)
  const chooseMotion = useCallback((full: boolean) => {
    const v = full ? 'full' : 'reduced'
    // Chapter lengths change between modes; return to the same chapter after the switch.
    resumeRef.current = chapterRef.current
    try { localStorage.setItem('lamina-motion', v) } catch { /* storage unavailable */ }
    setMotionChoice(v)
  }, [])
  const [webgl, setWebgl] = useState<WebGLState>('pending')
  const [glError, setGlError] = useState('')
  const [chapter, setChapter] = useState<ChapterId>('spin')
  const [sound, setSound] = useState(false)

  // Boot: the page is usable immediately; the 3D scene loads in behind the poster.
  useEffect(() => {
    let cancelled = false
    let engine: Engine | null = null
    let exp: ExperienceHandle | null = null
    const root = document.documentElement
    root.classList.toggle('reduced', reduced)
    setWebgl('pending')
    requestAnimationFrame(() => root.classList.add('is-ready'))

    const boot = async () => {
      try {
        const [{ Engine }] = await Promise.all([
          import('./three/Engine'),
          Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]),
        ])
        if (cancelled) return
        engine = new Engine(canvasRef.current!, { mobile: isMobile() })
        engine.resize(window.innerWidth, window.innerHeight)
        engine.warm()
        engineRef.current = engine
        spinRef.current.setEngine(engine)
      } catch (err) {
        console.warn('[LAMINA] WebGL unavailable, showing still compositions.', err)
        engine = null
        if (!cancelled) {
          setGlError(err instanceof Error ? err.message : String(err))
          setWebgl('failed')
          root.classList.add('no-webgl')
        }
      }
      if (cancelled) { engine?.dispose(); return }
      exp = startExperience({
        engine,
        reduced,
        onChapter: (id) => { chapterRef.current = id; setChapter(id) },
        onTick: (dt) => spinRef.current.step(dt),
      })
      expRef.current = exp
      if (resumeRef.current) {
        exp.scrollTo(resumeRef.current, { immediate: true })
        resumeRef.current = null
      }
      if (engine) {
        // Reveal the live canvas once it has drawn a frame over the poster.
        requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && setWebgl('ok')))
      }
    }
    boot()
    return () => {
      cancelled = true
      exp?.destroy()
      engine?.dispose()
      spinRef.current.setEngine(null)
      engineRef.current = null
      expRef.current = null
    }
  }, [reduced])

  const scrollTo = useCallback((id: string) => expRef.current?.scrollTo(id), [])
  const toggleSound = useCallback(async () => {
    if (audio.enabled) { audio.disable(); setSound(false) }
    else setSound(await audio.enable())
  }, [])

  // Drag-to-spin: bind the viewer stage and its angle readout.
  const unbind = useRef<(() => void) | null>(null)
  const viewerStage = useCallback((el: HTMLDivElement | null) => {
    unbind.current?.()
    unbind.current = el ? spinRef.current.attach(el) : null
  }, [])
  const viewerAngle = useCallback((el: HTMLElement | null) => {
    spinRef.current.onAngle((deg) => { if (el) el.textContent = String(deg).padStart(3, '0') })
  }, [])

  const getEngine = useCallback(() => engineRef.current, [])
  const getExp = useCallback(() => expRef.current, [])
  const fallback = webgl === 'failed'

  return (
    <>
      <a className="skip-link" href="#crunch" onClick={(e) => { e.preventDefault(); scrollTo('crunch'); document.getElementById('crunch-title')?.focus() }}>
        Skip to the experience
      </a>
      <div className={`scene scene--${webgl}`} aria-hidden="true">
        <picture className="scene__poster">
          <source media="(max-aspect-ratio: 9/10)" srcSet={posterSrc('hero', 'm')} />
          <img src={posterSrc('hero', 'd')} alt="" fetchPriority="high" decoding="async" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </picture>
        {/* Remounted when the motion mode changes so the new engine gets a fresh context. */}
        <canvas key={reduced ? 'still' : 'motion'} ref={canvasRef} className="scene__canvas" />
        <div className="scene__grade" />
      </div>

      <Header chapter={chapter} sound={sound} onSound={toggleSound} onNav={scrollTo} />

      <main id="main">
        <Spin onOrder={() => scrollTo('order')} onCrunch={() => scrollTo('crunch')} />
        <Crunch fallback={fallback} />
        <Lamination fallback={fallback} />
        <Crumb fallback={fallback} />
        <Bake fallback={fallback} />
        <Lens engine={getEngine} exp={getExp} active={chapter === 'lens' && webgl === 'ok'} />
        <Viewer stageRef={viewerStage} angleRef={viewerAngle} onNudge={(d) => spinRef.current.nudge(d)} />
        <Lineup fallback={fallback} />
        <Order fallback={fallback} />
      </main>

      <footer className="site-footer">
        <p className="mono">LAMINA is a fictional bakery and Croissant Pro is a concept. Nothing is for sale, and nothing on this page collects or sends data.</p>
        <p className="mono">3D, motion and sound are generated live in your browser.</p>
      </footer>

      <ScrollCue chapter={chapter} onGo={scrollTo} />
      <MotionNotice osReduced={osReduced} reduced={reduced} webglFailed={fallback} reason={glError} onChoose={chooseMotion} />
    </>
  )
}
