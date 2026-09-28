import { useEffect, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FINISHES, FINISH_ORDER, PALETTES, PALETTE_ORDER, PIGMENT_NAMES, type FinishName, type PaletteName } from '../three/palettes'
import { PARTS } from '../three/parts'

type Vars = CSSProperties & Record<`--${string}`, string | number>

/** A line that reveals at chapter progress `at` (reads the section's --p). */
function Rv({ at, children, className = '', as: Tag = 'span' }: { at: number; children: React.ReactNode; className?: string; as?: 'span' | 'p' | 'div' }) {
  return <Tag className={`rv ${className}`} style={{ '--a': at } as Vars}>{children}</Tag>
}

/** Still composition shown only when WebGL is unavailable. */
function Fallback({ name, show }: { name: string; show: boolean }) {
  if (!show) return null
  return (
    <picture className="fallback" aria-hidden="true">
      <source media="(max-aspect-ratio: 9/10)" srcSet={`posters/${name}-m.webp`} />
      <img src={`posters/${name}-d.webp`} alt="" loading="lazy" decoding="async" />
    </picture>
  )
}

const PaintDot = () => <span className="paint-dot" aria-hidden="true">.</span>

// ---------------------------------------------------------------- 01 HERO
export function Hero({ onDrop, onExplore }: { onDrop: () => void; onExplore: () => void }) {
  return (
    <section id="hero" className="hero" aria-labelledby="hero-title">
      <p className="hero__descriptor mono intro" style={{ '--i': 0 } as Vars}>
        CYMA One <span aria-hidden="true">—</span> Sculptural wireless sound.
      </p>
      <h1 id="hero-title" className="hero__title display">
        <span className="line intro" style={{ '--i': 1 } as Vars}><span>See the</span></span>
        <span className="line line--offset intro" style={{ '--i': 2 } as Vars}><span>Bass<PaintDot /><span className="sr-only">.</span></span></span>
      </h1>
      <div className="hero__foot">
        <p className="hero__support intro" style={{ '--i': 3 } as Vars}>Sound takes shape.</p>
        <div className="hero__actions intro" style={{ '--i': 4 } as Vars}>
          <button type="button" className="btn btn--primary" data-magnetic onClick={onDrop}>
            <span className="btn__drop" aria-hidden="true" />
            Experience the drop
          </button>
          <a className="btn btn--ghost" href="#engineering" onClick={(e) => { e.preventDefault(); onExplore() }}>
            Explore CYMA One
          </a>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 02 DROP
export function Drop({ palette, fallback }: { palette: PaletteName; fallback: boolean }) {
  const colors = PALETTES[palette].colors
  return (
    <section id="drop" className="chapter drop" data-sticky style={{ '--len': 300 } as Vars} aria-labelledby="drop-title">
      <div className="stage">
        <Fallback name="drop" show={fallback} />
        <div className="drop__copy scrim">
          <h2 id="drop-title" className="display display--l" tabIndex={-1}>
            <Rv at={0.0} className="block">Feel every</Rv>
            <Rv at={0.04} className="block">frequency.</Rv>
          </h2>
          <Rv as="p" at={0.1} className="lede">A pulse becomes movement.</Rv>
          <Rv as="p" at={0.3} className="lede">Movement becomes colour.</Rv>
        </div>
        <div className="drop__hud" aria-hidden="true">
          <div className="readout">
            <span className="label mono">Fundamental</span>
            <span className="readout__value">
              <b data-readout="drop-hz">2.40</b>
              <i data-readout="drop-hz-unit">kHz</i>
            </span>
          </div>
          <div className="readout">
            <span className="label mono">Colours</span>
            <span className="readout__value">
              <b data-readout="drop-colors">0</b>
              <i>/ 8</i>
            </span>
            <span className="dots">
              {colors.map((c, i) => (
                <span key={i} data-color-dot title={PIGMENT_NAMES[i]} style={{ '--c': c } as Vars} />
              ))}
            </span>
          </div>
        </div>
        <div className="rail" aria-hidden="true"><span /></div>
        <p className="sr-only">
          As you scroll, a bass note settles at 32 hertz and the woofer launches eight colours of paint into a tall fountain.
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 03 FROZEN
export function Frozen({ palette, onPalette, fallback }: { palette: PaletteName; onPalette: (p: PaletteName) => void; fallback: boolean }) {
  return (
    <section id="frozen" className="chapter frozen" data-sticky style={{ '--len': 240 } as Vars} aria-labelledby="frozen-title">
      <div className="stage">
        <Fallback name={`frozen-${palette}`} show={fallback} />
        <div className="frozen__orbit" aria-hidden="true">
          <svg viewBox="0 0 40 40" className="dial">
            <circle cx="20" cy="20" r="18" />
            <g data-orbit-dial><line x1="20" y1="20" x2="20" y2="3" /></g>
          </svg>
          <span className="label mono">Orbit</span>
          <span className="orbit__value mono"><b data-readout="orbit">000</b>°</span>
        </div>
        <h2 id="frozen-title" className="frozen__title display display--l scrim">
          <Rv at={0.02} className="block">A moment.</Rv>
          <Rv at={0.08} className="block">Amplified.</Rv>
        </h2>
        <fieldset className="palette">
          <legend className="label mono">Palette</legend>
          <div className="palette__options">
            {PALETTE_ORDER.map((name) => (
              <label key={name} className="palette__opt">
                <input type="radio" name="palette" value={name} checked={palette === name} onChange={() => onPalette(name)} />
                <span className="palette__strip" aria-hidden="true">
                  {PALETTES[name].colors.map((c, i) => <i key={i} style={{ background: c }} />)}
                </span>
                <span className="palette__name">{PALETTES[name].label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 04 INSIDE
const TICKS = [
  { hz: 32, l: '32' }, { hz: 100, l: '100' }, { hz: 1000, l: '1k' }, { hz: 10000, l: '10k' }, { hz: 20000, l: '20k' },
]
const logPos = (hz: number) => Math.log(hz / 32) / Math.log(20000 / 32)

export function Inside({ fallback }: { fallback: boolean }) {
  return (
    <section id="inside" className="chapter inside" data-sticky style={{ '--len': 210 } as Vars} aria-labelledby="inside-title">
      <div className="stage">
        <Fallback name="inside" show={fallback} />
        <h2 id="inside-title" className="inside__title display display--xl scrim">
          <Rv at={0.0}>Go deeper.</Rv>
        </h2>
        <div className="inside__copy scrim">
          <Rv as="p" at={0.28} className="lede">Detail you can feel.</Rv>
          <Rv as="p" at={0.42} className="lede">Space you can hear.</Rv>
        </div>
        <div className="meter" aria-hidden="true">
          <div className="meter__value mono">
            <b data-readout="inside-hz">32</b> <i data-readout="inside-hz-unit">Hz</i>
          </div>
          <div className="meter__scale">
            {TICKS.map((t) => (
              <span key={t.hz} className="meter__tick mono" style={{ left: `${logPos(t.hz) * 100}%` }}>{t.l}</span>
            ))}
            <span className="meter__track"><span className="meter__marker" data-inside-marker /></span>
          </div>
        </div>
        <p className="sr-only">The camera travels into the suspended paint while the readout sweeps from 32 hertz to 20 kilohertz.</p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 05 ENGINEERING
export function Engineering({ fallback }: { fallback: boolean }) {
  return (
    <section id="engineering" className="chapter eng" data-sticky style={{ '--len': 300 } as Vars} aria-labelledby="eng-title">
      <div className="stage">
        <Fallback name="engineering" show={fallback} />
        <h2 id="eng-title" className="eng__title display display--m scrim">
          <Rv at={0.02} className="block">Every layer</Rv>
          <Rv at={0.06} className="block">has a purpose.</Rv>
        </h2>
        <div className="eng__panel">
          <p className="eng__count mono" aria-hidden="true">
            <span className="label">Component</span> <b data-readout="comp-index">01</b> <span className="eng__of">/ 09</span>
          </p>
          <p className="eng__name" data-readout="comp-name" aria-hidden="true">{PARTS[0].name}</p>
          <p className="eng__detail" data-readout="comp-detail" aria-hidden="true">{PARTS[0].detail}</p>
          <ol className="eng__list" aria-label="CYMA One components, top to bottom">
            {PARTS.map((p, i) => (
              <li key={p.id} data-comp-item>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span> {p.name}
                <span className="sr-only">: {p.detail}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- SPECS
function useCountUps(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-count]'))
    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        els.forEach((el, i) => {
          const to = Number(el.dataset.count)
          const o = { v: 0 }
          el.textContent = '0'
          gsap.to(o, {
            v: to, duration: 1.6, delay: i * 0.08, ease: 'power3.out',
            onUpdate: () => { el.textContent = String(Math.round(o.v)) },
          })
        })
      },
    })
    return () => st.kill()
  }, [ref])
}

export function Specs() {
  const ref = useRef<HTMLElement>(null)
  useCountUps(ref)
  return (
    <section id="specs" className="specs" ref={ref} aria-labelledby="specs-title">
      <div className="specs__head">
        <h2 id="specs-title" className="label mono">Concept specifications</h2>
        <p className="specs__note">Design targets for a fictional product, not measured results.</p>
      </div>
      <dl className="specs__list">
        <div className="spec">
          <dt className="mono">Frequency response</dt>
          <dd className="spec__big"><span data-count="32">32</span>&thinsp;Hz<span className="spec__dash">–</span><span data-count="20">20</span>&thinsp;kHz</dd>
        </div>
        <div className="spec">
          <dt className="mono">Total power</dt>
          <dd className="spec__big"><span data-count="240">240</span>&thinsp;W</dd>
        </div>
        <div className="spec">
          <dt className="mono">Architecture</dt>
          <dd>Three-way active system</dd>
        </div>
        <div className="spec">
          <dt className="mono">Connectivity</dt>
          <dd>Wi-Fi, Bluetooth, USB-C</dd>
        </div>
        <div className="spec">
          <dt className="mono">Enclosure</dt>
          <dd>Precision-machined aluminium</dd>
        </div>
      </dl>
    </section>
  )
}

// ---------------------------------------------------------------- 06 FINISHES
export function Finishes({ finish, onFinish, onReserve, fallback }: {
  finish: FinishName; onFinish: (f: FinishName) => void; onReserve: () => void; fallback: boolean
}) {
  const f = FINISHES[finish]
  return (
    <section id="finishes" className="finishes" aria-labelledby="finishes-title">
      <div className="finishes__view" aria-hidden="true">
        <Fallback name={`finish-${finish}`} show={fallback} />
      </div>
      <div className="finishes__panel reveal">
        <h2 id="finishes-title" className="display display--m">
          <span className="block">Bold sound.</span>
          <span className="block">Your signature.</span>
        </h2>
        <div className="finish-current" aria-live="polite">
          <span className="label mono">Finish</span>
          <strong className="finish-current__name">{f.label}</strong>
          <span className="finish-current__note">{f.note}</span>
        </div>
        <fieldset className="swatches">
          <legend className="sr-only">Choose a finish</legend>
          {FINISH_ORDER.map((name) => (
            <label key={name} className="swatch">
              <input type="radio" name="finish" value={name} checked={finish === name} onChange={() => onFinish(name)} />
              <span className="swatch__chip" style={{ '--swatch': FINISHES[name].swatch } as Vars} aria-hidden="true" />
              <span className="swatch__name mono">{FINISHES[name].label}</span>
            </label>
          ))}
        </fieldset>
        <div className="price">
          <span className="price__value">$899</span>
          <span className="label mono">Concept pricing</span>
        </div>
        <button type="button" className="btn btn--primary btn--wide" data-magnetic onClick={onReserve}>
          <span className="btn__drop" aria-hidden="true" />
          Reserve CYMA One
        </button>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 07 CLOSING
export function Closing({ onTop, fallback }: { onTop: () => void; fallback: boolean }) {
  return (
    <section id="closing" className="closing" aria-labelledby="closing-title">
      <Fallback name="closing" show={fallback} />
      <h2 id="closing-title" className="closing__title display display--xl reveal">
        <span className="block">Sound,</span>
        <span className="block">made</span>
        <span className="block">visible<PaintDot /><span className="sr-only">.</span></span>
      </h2>
      <button type="button" className="btn btn--ghost closing__top" onClick={onTop}>
        Back to top <span aria-hidden="true">↑</span>
      </button>
    </section>
  )
}
