import type { CSSProperties, ReactNode } from 'react'
import { posterSrc } from '../lib/posters'

// Scroll chapters. Pinned stages read their progress from --p (written by
// lib/experience.ts); `.rv` lines reveal at --a, `.beat` blocks show between
// --a and --b. Readouts are plain elements the experience writes into.

const v = (o: Record<string, string | number>) => o as CSSProperties

function Fallback({ name, show }: { name: string; show: boolean }) {
  if (!show) return null
  return (
    <picture className="fallback" aria-hidden="true">
      <source media="(max-aspect-ratio: 9/10)" srcSet={posterSrc(name, 'm')} />
      <img src={posterSrc(name, 'd')} alt="" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = 'none')} />
    </picture>
  )
}

const Gold = ({ children }: { children: ReactNode }) => <span className="gold">{children}</span>

/* 01 ------------------------------------------------------------------ */
export function Spin({ onOrder, onCrunch }: { onOrder: () => void; onCrunch: () => void }) {
  return (
    <section id="spin" className="chapter spin" data-sticky style={v({ '--len': 460 })} aria-labelledby="spin-title">
      <div className="stage">
        <div className="spin__head">
          <p className="eyebrow mono intro" style={v({ '--i': 0 })}>LAMINA <span className="dot" /> Introducing</p>
          <h1 id="spin-title" className="pro-title">
            <span className="line" style={v({ '--i': 1 })}><span><Gold>Croissant Pro</Gold></span></span>
          </h1>
          <p className="tagline serif intro" style={v({ '--i': 2 })}>Our most layered croissant ever.</p>
          <p className="spin__facts reduced-only">81 layers. 27 sheets of butter.</p>
        </div>
        <p className="spin__deg beat mono" style={v({ '--a': 0.04, '--b': 0.47 })} aria-hidden="true">
          <span className="label">Rotation</span> <b data-readout="spin-deg">000</b>°
        </p>
        <div className="spin__foot intro" style={v({ '--i': 4 })}>
          <p className="spin__avail">Fresh from 7:00 every morning. <span className="muted">Tomorrow’s bake is open.</span></p>
          <div className="spin__actions">
            <button type="button" className="btn btn--gold" onClick={onOrder}>Order ahead</button>
            <button type="button" className="btn btn--ghost" onClick={onCrunch}>Hear it crunch</button>
          </div>
        </div>

        <div className="beat beat--layers" style={v({ '--a': 0.5, '--b': 0.69 })}>
          <h2 className="display"><span className="big-num">81</span> layers.</h2>
          <p className="lede">Four letter folds, 3 × 3 × 3 × 3. Each one bakes into its own <em className="serif">glass-thin</em> shell.</p>
        </div>
        <div className="beat beat--sheets" style={v({ '--a': 0.78, '--b': 1.2 })}>
          <h2 className="display"><span className="big-num">27</span> sheets.</h2>
          <p className="lede">Of cultured Normandy butter, laminated by hand at 4 °C. Nothing is rushed, and nothing is a machine.</p>
        </div>
      </div>
    </section>
  )
}

/* 02 ------------------------------------------------------------------ */
export function Crunch({ fallback }: { fallback: boolean }) {
  return (
    <section id="crunch" className="chapter crunch" data-sticky style={v({ '--len': 340 })} aria-labelledby="crunch-title">
      <div className="stage">
        <Fallback name="crunch" show={fallback} />
        <div className="crunch__copy">
          <p className="eyebrow mono rv" style={v({ '--a': 0 })}>02 <span className="dot" /> Crunch</p>
          <h2 id="crunch-title" tabIndex={-1} className="display display--l rv" style={v({ '--a': 0.01 })}>It answers <span className="serif">back.</span></h2>
          <p className="lede rv" style={v({ '--a': 0.05 })}>Break one open and 81 layers let go at once. Turn on sound to hear it.</p>
        </div>
        <div className="crunch__hud">
          <div className="readout">
            <span className="label">Peak crunch</span>
            <span className="readout__value"><b data-readout="db">00</b><i>dB</i></span>
            <span className="meter" data-db-meter aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={v({ '--i': i })} />)}</span>
          </div>
          <div className="readout">
            <span className="label">Flakes airborne</span>
            <span className="readout__value"><b data-readout="flakes">000</b></span>
          </div>
        </div>
        <p className="uncrunch serif" style={v({ '--a': 0.72 })}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" /></svg>
          Scroll back up to un-crunch it.
        </p>
      </div>
    </section>
  )
}

/* 03 ------------------------------------------------------------------ */
const SPEC_STRIP: [string, string][] = [
  ['Folds', '4 × letter'],
  ['Butter', '27 sheets · 82% fat'],
  ['Layer', '0.18 mm'],
  ['Proof', '72 h cold'],
  ['Bake', '18 min · 205 °C'],
]

export function Lamination({ fallback }: { fallback: boolean }) {
  return (
    <section id="lamination" className="chapter lamination" data-sticky style={v({ '--len': 340 })} aria-labelledby="lam-title">
      <div className="stage">
        <Fallback name="lamination" show={fallback} />
        <div className="scan" aria-hidden="true"><span className="mono">CT · 0.2 mm · <b data-readout="slice">1/7</b></span></div>
        <div className="lam__copy">
          <p className="eyebrow mono rv" style={v({ '--a': 0 })}>03 <span className="dot" /> Lamination</p>
          <h2 id="lam-title" className="display display--l rv" style={v({ '--a': 0.01 })}>Seven slices. <span className="serif">No secrets.</span></h2>
        </div>
        <div className="lam__count">
          <span className="readout__value"><b data-readout="layers" className="gold-num">00</b></span>
          <span className="label">Layers counted</span>
        </div>
        <dl className="spec-strip rv" style={v({ '--a': 0.3 })}>
          {SPEC_STRIP.map(([k, val]) => (
            <div key={k}><dt className="label">{k}</dt><dd>{val}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* 04 ------------------------------------------------------------------ */
const CARDS = [
  { a: 0.16, b: 0.4, side: 'l', k: 'Honeycomb', t: 'Open cells up to 6 mm, stretched along the roll like a cathedral nave.' },
  { a: 0.4, b: 0.63, side: 'r', k: 'Steam', t: 'Butter is 16% water. In the oven it flashes to steam and pushes every layer apart.' },
  { a: 0.63, b: 0.86, side: 'l', k: '72 hours', t: 'Three days of cold ferment, for a crumb that tastes of cultured butter and toasted wheat.' },
]

export function Crumb({ fallback }: { fallback: boolean }) {
  return (
    <section id="crumb" className="chapter crumb" data-sticky style={v({ '--len': 320 })} aria-labelledby="crumb-title">
      <div className="stage">
        <Fallback name="crumb" show={fallback} />
        <h2 id="crumb-title" className="crumb__title display display--l">Inside <span className="serif">the crumb.</span></h2>
        {CARDS.map((c) => (
          <div key={c.k} className={`glass beat crumb__card crumb__card--${c.side}`} style={v({ '--a': c.a, '--b': c.b })}>
            <p className="label">{c.k}</p>
            <p>{c.t}</p>
          </div>
        ))}
        <p className="crumb__depth mono" aria-hidden="true">Depth <b data-readout="depth">0.0</b> mm</p>
      </div>
    </section>
  )
}

/* 05 ------------------------------------------------------------------ */
export function Bake({ fallback }: { fallback: boolean }) {
  return (
    <section id="bake" className="chapter bake" data-sticky style={v({ '--len': 360 })} aria-labelledby="bake-title">
      <div className="stage">
        <Fallback name="bake" show={fallback} />
        <div className="bake__copy">
          <p className="eyebrow mono rv" style={v({ '--a': 0 })}>05 <span className="dot" /> Bake</p>
          <h2 id="bake-title" className="display display--l rv" style={v({ '--a': 0.01 })}>Raw to <span className="serif">golden.</span></h2>
          <p className="lede rv" style={v({ '--a': 0.04 })}>Eighteen minutes on a stone deck at 205 °C. Scroll to bake it.</p>
        </div>
        <div className="glass oven-panel" data-bake-panel>
          <div className="oven-panel__row oven-panel__row--time">
            <span className="label">Timer</span>
            <span className="oven-panel__time mono"><b data-readout="bake-time">00:00</b><i>/ 18:00</i></span>
          </div>
          <div className="oven-panel__bar" aria-hidden="true"><span /></div>
          <dl className="oven-panel__grid">
            <div><dt className="label">Deck</dt><dd className="mono">205<i>°C</i></dd></div>
            <div><dt className="label">Core</dt><dd className="mono"><b data-readout="bake-core">21</b><i>°C</i></dd></div>
            <div><dt className="label">Rise</dt><dd className="mono"><b data-readout="bake-rise">+0</b><i>%</i></dd></div>
          </dl>
          <div className="oven-panel__colour">
            <span className="oven-panel__swatch" aria-hidden="true" />
            <span className="label">Crust</span>
            <b data-readout="bake-colour">Raw dough</b>
          </div>
        </div>
      </div>
    </section>
  )
}

/* 07 ------------------------------------------------------------------ */
export function Viewer({ stageRef, angleRef, onNudge }: {
  stageRef: (el: HTMLDivElement | null) => void
  angleRef: (el: HTMLElement | null) => void
  onNudge: (deg: number) => void
}) {
  return (
    <section id="viewer" className="chapter viewer" data-sticky style={v({ '--len': 170 })} aria-labelledby="viewer-title">
      <div className="stage viewer__stage" ref={stageRef} tabIndex={0} aria-describedby="viewer-help">
        <div className="viewer__copy">
          <p className="eyebrow mono">07 <span className="dot" /> Viewer</p>
          <h2 id="viewer-title" className="display display--l">Turn it <span className="serif">over.</span></h2>
          <p id="viewer-help" className="lede">Drag to spin, or use the arrow keys. Every angle is live 3D.</p>
        </div>
        <div className="viewer__hud">
          <button type="button" className="round-btn" aria-label="Spin left" onClick={() => onNudge(-60)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <p className="viewer__angle mono"><b ref={angleRef}>336</b>°</p>
          <button type="button" className="round-btn" aria-label="Spin right" onClick={() => onNudge(60)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
        <p className="viewer__hint mono" aria-hidden="true"><span className="viewer__hand" />Drag</p>
      </div>
    </section>
  )
}

/* 08 ------------------------------------------------------------------ */
export const PASTRIES = [
  { id: 'pro', name: 'Croissant Pro', price: 6.5, note: 'The flagship' },
  { id: 'choc', name: 'Pain au Chocolat', price: 6.75, note: 'Two batons, 70%' },
  { id: 'kouign', name: 'Kouign-Amann', price: 7.25, note: 'Caramelised' },
  { id: 'almond', name: 'Almond Croissant', price: 7.5, note: 'Twice baked' },
] as const
export type PastryId = (typeof PASTRIES)[number]['id']

const money = (n: number) => `$${n.toFixed(2)}`

const SPEC_ROWS: [string, string[]][] = [
  ['Layers', ['81', '54', '36', '81']],
  ['Butter sheets', ['27', '18', '12', '27']],
  ['Bake', ['18 min', '17 min', '24 min', '18 + 9 min']],
  ['Peak crunch', ['94 dB', '88 dB', '91 dB', '86 dB']],
  ['Weight', ['85 g', '90 g', '110 g', '120 g']],
  ['Best within', ['2 hours', '3 hours', '6 hours', '1 day']],
]

export function Lineup({ fallback }: { fallback: boolean }) {
  return (
    <>
      <section id="lineup" className="chapter lineup" data-sticky style={v({ '--len': 220 })} aria-labelledby="lineup-title">
        <div className="stage">
          <Fallback name="lineup" show={fallback} />
          <div className="lineup__copy">
            <p className="eyebrow mono rv" style={v({ '--a': 0 })}>08 <span className="dot" /> Lineup</p>
            <h2 id="lineup-title" className="display display--l rv" style={v({ '--a': 0.01 })}>The <span className="serif">Pro</span> lineup.</h2>
          </div>
          <ul className="lineup__labels" aria-label="The lineup">
            {PASTRIES.map((p, i) => (
              <li key={p.id} className="lineup__label" data-lineup-label={i}>
                <span className="lineup__name">{i === 0 ? <Gold>{p.name}</Gold> : p.name}</span>
                <span className="mono">{p.note} · {money(p.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section id="specs" className="specs" aria-labelledby="specs-title">
        <div className="specs__head">
          <h2 id="specs-title" className="display display--m">Compare the lineup.</h2>
          <p className="specs__note">Concept values. LAMINA is a fictional bakery.</p>
        </div>
        <div className="specs__wrap" tabIndex={0} role="region" aria-label="Lineup comparison table">
          <table className="specs__table">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Spec</span></th>
                {PASTRIES.map((p, i) => <th key={p.id} scope="col" className={i === 0 ? 'is-pro' : undefined}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {SPEC_ROWS.map(([k, vals]) => (
                <tr key={k}>
                  <th scope="row" className="label">{k}</th>
                  {vals.map((val, i) => <td key={i} className={i === 0 ? 'is-pro' : undefined}>{val}</td>)}
                </tr>
              ))}
              <tr>
                <th scope="row" className="label">Price</th>
                {PASTRIES.map((p, i) => <td key={p.id} className={i === 0 ? 'is-pro' : undefined}>{money(p.price)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
