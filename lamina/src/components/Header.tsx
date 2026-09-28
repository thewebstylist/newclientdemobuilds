import type { ChapterId } from '../three/director'

const NAV: { id: ChapterId; label: string; wide?: boolean }[] = [
  { id: 'crunch', label: 'Crunch' },
  { id: 'lamination', label: 'Layers', wide: true },
  { id: 'bake', label: 'Bake' },
  { id: 'lineup', label: 'Lineup', wide: true },
  { id: 'order', label: 'Order' },
]

const CURRENT: Partial<Record<ChapterId, ChapterId>> = {
  crunch: 'crunch', lamination: 'lamination', crumb: 'lamination', bake: 'bake', lens: 'bake', viewer: 'bake', lineup: 'lineup', order: 'order',
}

export default function Header({ chapter, sound, onSound, onNav }: {
  chapter: ChapterId
  sound: boolean
  onSound: () => void
  onNav: (id: string) => void
}) {
  return (
    <header className="site-header">
      <div className="progress" aria-hidden="true"><span data-progress /></div>
      <div className="site-header__brand">
        <a className="wordmark" href="#spin" onClick={(e) => { e.preventDefault(); onNav('spin') }} aria-label="LAMINA, back to the top">
          LAMINA
        </a>
        <span className="trail mono" aria-hidden="true">
          <span className="trail__sep">/</span> <span data-chapter-label>Croissant Pro</span>
        </span>
      </div>
      <nav className="site-nav" aria-label="Primary">
        <ul>
          {NAV.map((n) => (
            <li key={n.id} className={n.wide ? 'nav-wide' : undefined}>
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
        <button
          type="button" className="tool tool--sound" aria-pressed={sound} onClick={onSound}
          aria-label="Sound" title={sound ? 'Turn sound off' : 'Turn sound on'}
        >
          <svg className="tool__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path className="tool__speaker" d="M3.5 9.2h3.6L12 5v14l-4.9-4.2H3.5z" />
            {sound ? (
              <g className="tool__waves">
                <path d="M15.2 9.3a3.8 3.8 0 0 1 0 5.4" />
                <path d="M17.9 6.6a7.6 7.6 0 0 1 0 10.8" />
              </g>
            ) : (
              <path className="tool__mute" d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
            )}
          </svg>
          <span className="tool__text" aria-hidden="true">{sound ? 'Sound on' : 'Sound off'}</span>
        </button>
      </div>
    </header>
  )
}
