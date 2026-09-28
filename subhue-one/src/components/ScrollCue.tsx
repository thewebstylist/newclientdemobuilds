import type { ChapterId } from '../three/director'

const NEXT: Partial<Record<ChapterId, { id: ChapterId; label: string }>> = {
  hero: { id: 'drop', label: 'The drop' },
  drop: { id: 'frozen', label: 'Frozen' },
  frozen: { id: 'inside', label: 'Inside the sound' },
  inside: { id: 'engineering', label: 'Engineering' },
  engineering: { id: 'finishes', label: 'Finishes' },
}

/** Floating down-arrow: glides to the next chapter; its ring shows page progress. */
export default function ScrollCue({ chapter, onGo }: { chapter: ChapterId; onGo: (id: ChapterId) => void }) {
  const next = NEXT[chapter]
  return (
    <button
      type="button"
      className={`cue${next ? '' : ' is-hidden'}`}
      data-cue
      onClick={() => next && onGo(next.id)}
      aria-label={next ? `Scroll to next chapter: ${next.label}` : 'Scroll down'}
      tabIndex={next ? 0 : -1}
      aria-hidden={next ? undefined : true}
    >
      <svg className="cue__ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle className="cue__track" cx="24" cy="24" r="22" pathLength={100} />
        <circle className="cue__fill" cx="24" cy="24" r="22" pathLength={100} />
      </svg>
      <svg className="cue__arrow" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v13M6.5 12.5 12 18l5.5-5.5" />
      </svg>
    </button>
  )
}
