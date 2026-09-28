import { useEffect, useState } from 'react'

const Close = ({ onClick }: { onClick: () => void }) => (
  <button type="button" className="notice__close" aria-label="Dismiss" onClick={onClick}>
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
  </button>
)

/**
 * Explains why the page is showing stills (the system asks for reduced
 * motion, or 3D is unavailable) and offers the full experience where possible.
 */
export default function MotionNotice({ osReduced, reduced, webglFailed, onChoose }: {
  osReduced: boolean
  reduced: boolean
  webglFailed: boolean
  onChoose: (full: boolean) => void
}) {
  const [dismissed, setDismissed] = useState<string | null>(null)
  const kind = webglFailed ? 'nogl' : reduced ? 'reduced' : osReduced ? 'full' : null

  // The "switch back" option is a courtesy; it steps aside after a few seconds.
  useEffect(() => {
    if (kind !== 'full') return
    const t = setTimeout(() => setDismissed('full'), 7000)
    return () => clearTimeout(t)
  }, [kind])

  if (!kind || dismissed === kind) return null

  if (kind === 'nogl') {
    return (
      <div className="notice" role="status">
        <p>
          <strong>3D isn’t available in this browser,</strong> so you’re seeing stills. Turning on
          hardware (graphics) acceleration in your browser settings usually brings the full experience back.
        </p>
        <Close onClick={() => setDismissed(kind)} />
      </div>
    )
  }

  if (kind === 'reduced') {
    return (
      <div className="notice" role="status">
        <p>
          <strong>Your device asks for reduced motion,</strong> so the story plays as a series of stills.
        </p>
        <Close onClick={() => setDismissed(kind)} />
        <div className="notice__actions">
          <button type="button" className="btn btn--primary" onClick={() => onChoose(true)}>
            <span className="btn__drop" aria-hidden="true" />
            Play full motion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="notice notice--quiet" role="status">
      <button type="button" className="btn btn--ghost" onClick={() => onChoose(false)}>
        Switch to reduced motion
      </button>
      <Close onClick={() => setDismissed(kind)} />
    </div>
  )
}
