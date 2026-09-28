import { useCallback, useEffect, useRef, useState } from 'react'
import type { Engine } from './three/Engine'
import { PALETTES, type FinishName, type PaletteName } from './three/palettes'
import { startExperience, type ExperienceHandle } from './lib/experience'
import type { ChapterId } from './three/director'
import { bass } from './lib/audio'
import Header from './components/Header'
import { Hero, Drop, Frozen, Inside, Engineering, Specs, Finishes, Closing } from './components/Chapters'
import ReserveModal from './components/ReserveModal'
import Effects from './components/Effects'
import ScrollCue from './components/ScrollCue'
import MotionNotice from './components/MotionNotice'
import { appRoot } from './lib/root'
import { posterSrc } from './lib/posters'

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isMobile = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760

export type WebGLState = 'pending' | 'ok' | 'failed'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const expRef = useRef<ExperienceHandle | null>(null)
  // The system reduced-motion setting is honoured by default; a visitor can
  // opt into full motion from the notice, and the choice is remembered.
  const [osReduced] = useState(prefersReduced)
  const [motionChoice, setMotionChoice] = useState<string | null>(() => {
    try { return localStorage.getItem('subhue-motion') } catch { return null }
  })
  const reduced = osReduced && motionChoice !== 'full'
  const chapterRef = useRef<ChapterId>('hero')
  const resumeRef = useRef<ChapterId | null>(null)
  const chooseMotion = useCallback((full: boolean) => {
    const v = full ? 'full' : 'reduced'
    // Chapter lengths change between modes; return to the same chapter after the switch.
    resumeRef.current = chapterRef.current
    try { localStorage.setItem('subhue-motion', v) } catch { /* storage unavailable */ }
    setMotionChoice(v)
  }, [])
  const [webgl, setWebgl] = useState<WebGLState>('pending')
  const [glError, setGlError] = useState('')
  const [palette, setPalette] = useState<PaletteName>('original')
  const [finish, setFinish] = useState<FinishName>('obsidian')
  const [chapter, setChapter] = useState<ChapterId>('hero')
  const [sound, setSound] = useState(false)
  const [reserveOpen, setReserveOpen] = useState(false)
  const [finePointer] = useState(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  const [trail, setTrail] = useState(() => {
    if (!finePointer || reduced) return false
    try { return localStorage.getItem('subhue-trail') !== 'off' } catch { return true }
  })
  const toggleTrail = useCallback(() => {
    setTrail((t) => {
      try { localStorage.setItem('subhue-trail', t ? 'off' : 'on') } catch { /* storage unavailable */ }
      return !t
    })
  }, [])
  const paletteRef = useRef(palette)
  paletteRef.current = palette

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
        const canvas = canvasRef.current!
        engine = new Engine(canvas, {
          mobile: isMobile(),
          onAccent: (c) => {
            const live = paletteRef.current === 'mono' || !c ? PALETTES[paletteRef.current].accent : c
            appRoot().style.setProperty('--accent-live', live)
          },
        })
        engine.resize(window.innerWidth, window.innerHeight)
        engine.warm()
        engineRef.current = engine
      } catch (err) {
        console.warn('[SUBHUE] WebGL unavailable, showing still compositions.', err)
        engine = null
        if (!cancelled) {
          setGlError(err instanceof Error ? err.message : String(err))
          setWebgl('failed')
          root.classList.add('no-webgl')
        }
      }
      if (cancelled) { engine?.dispose(); return }
      exp = startExperience({ engine, reduced, onChapter: (id) => { chapterRef.current = id; setChapter(id) } })
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
      engineRef.current = null
      expRef.current = null
    }
  }, [reduced])

  useEffect(() => {
    engineRef.current?.setPalette(palette)
    const accent = PALETTES[palette].accent
    const vars = appRoot().style
    vars.setProperty('--accent', accent)
    vars.setProperty('--accent-live', accent)
    PALETTES[palette].colors.forEach((c, i) => vars.setProperty(`--c${i}`, c))
  }, [palette, webgl])

  useEffect(() => {
    engineRef.current?.setFinish(finish)
  }, [finish, webgl])

  useEffect(() => {
    expRef.current?.lock(reserveOpen)
  }, [reserveOpen])

  const scrollTo = useCallback((id: string) => expRef.current?.scrollTo(id), [])
  const playDrop = useCallback(() => {
    if (expRef.current) expRef.current.playDrop()
    else document.getElementById('drop')?.scrollIntoView()
  }, [])

  const toggleSound = useCallback(async () => {
    if (bass.enabled) { bass.disable(); setSound(false) }
    else setSound(await bass.enable())
  }, [])

  return (
    <>
      <a className="skip-link" href="#drop" onClick={(e) => { e.preventDefault(); scrollTo('drop'); document.getElementById('drop-title')?.focus() }}>
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

      <Header chapter={chapter} sound={sound} onSound={toggleSound} onNav={scrollTo} trail={trail} onTrail={finePointer ? toggleTrail : undefined} />

      <main id="main">
        <Hero onDrop={playDrop} onExplore={() => scrollTo('engineering')} />
        <Drop palette={palette} fallback={webgl === 'failed'} />
        <Frozen palette={palette} onPalette={setPalette} fallback={webgl === 'failed'} />
        <Inside fallback={webgl === 'failed'} />
        <Engineering fallback={webgl === 'failed'} />
        <Specs />
        <Finishes finish={finish} onFinish={setFinish} onReserve={() => setReserveOpen(true)} fallback={webgl === 'failed'} />
        <Closing onTop={() => { expRef.current?.scrollTo(0, { duration: 2.2 }); document.querySelector<HTMLElement>('.wordmark')?.focus({ preventScroll: true }) }} fallback={webgl === 'failed'} />
      </main>

      <footer className="site-footer">
        <p className="mono">SUBHUE One is a fictional product concept. Nothing is for sale, and nothing on this page collects or sends data.</p>
        <p className="mono">Concept, 3D and motion built for demonstration.</p>
      </footer>

      <svg className="eng-leader" aria-hidden="true">
        <line data-leader x1="0" y1="0" x2="0" y2="0" />
        <circle data-leader-dot r="3.5" cx="0" cy="0" />
      </svg>

      <ScrollCue chapter={chapter} onGo={scrollTo} />
      <MotionNotice osReduced={osReduced} reduced={reduced} webglFailed={webgl === 'failed'} reason={glError} onChoose={chooseMotion} />

      <ReserveModal open={reserveOpen} finish={finish} onFinish={setFinish} onClose={() => setReserveOpen(false)} />
      <Effects reduced={reduced} trail={trail} modalOpen={reserveOpen} />
    </>
  )
}
