import type { ChapterId } from '../three/director'
import { CHAPTER_LABELS } from '../lib/experience'

const ORDER: ChapterId[] = ['spin', 'crunch', 'lamination', 'crumb', 'bake', 'lens', 'viewer', 'lineup', 'order']

/** Floating down-arrow: glides to the next chapter; its ring shows page progress. */
export default function ScrollCue({ chapter, onGo }: { chapter: ChapterId; onGo: (id: ChapterId) => void }) {
  const i = ORDER.indexOf(chapter)
  const next = i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null
  return (
    <button
      type="button"
      className={`cue${next ? '' : ' is-hidden'}`}
      data-cue
      onClick={() => next && onGo(next)}
      aria-label={next ? `Scroll to next chapter: ${CHAPTER_LABELS[next]}` : 'Scroll down'}
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
