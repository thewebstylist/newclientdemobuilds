import type { ChapterId } from '../three/director'

const NAV: { id: ChapterId; label: string }[] = [
  { id: 'drop', label: 'Experience' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'finishes', label: 'Finishes' },
]

const CURRENT: Partial<Record<ChapterId, ChapterId>> = {
  drop: 'drop', frozen: 'drop', inside: 'drop', engineering: 'engineering', finishes: 'finishes',
}

export default function Header(props: {
  chapter: ChapterId
  sound: boolean
  onSound: () => void
  onNav: (id: string) => void
  trail: boolean
  onTrail?: () => void
}) {
  const { chapter, sound, onSound, onNav, trail, onTrail } = props
  return (
    <header className="site-header">
      <div className="progress" aria-hidden="true"><span data-progress /></div>
      <div className="site-header__brand">
        <a className="wordmark" href="#hero" onClick={(e) => { e.preventDefault(); onNav('hero') }} aria-label="CYMA, back to the top">
          CYMA
        </a>
        <span className="crumb mono" aria-hidden="true">
          <span className="crumb__sep">/</span> <span data-chapter-label>CYMA One</span>
        </span>
      </div>
      <nav className="site-nav" aria-label="Primary">
        <ul>
          {NAV.map((n) => (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                aria-current={CURRENT[chapter] === n.id ? 'true' : undefined}
                onClick={(e) => { e.preventDefault(); onNav(n.id) }}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="site-header__tools">
        {onTrail && (
          <button type="button" className="tool tool--trail" aria-pressed={trail} onClick={onTrail}>
            <span className="tool__swatch" aria-hidden="true" />
            <span className="tool__text">Trail</span>
          </button>
        )}
        <button type="button" className="tool tool--sound" aria-pressed={sound} onClick={onSound} aria-label="Sound">
          <canvas data-spectrum width="88" height="36" aria-hidden="true" />
          <span className="tool__text" aria-hidden="true">{sound ? 'Sound on' : 'Sound off'}</span>
        </button>
      </div>
    </header>
  )
}
