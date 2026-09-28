import { useEffect, useId, useRef, useState } from 'react'
import { FINISHES, FINISH_ORDER, type FinishName } from '../three/palettes'

type Errors = Partial<Record<'name' | 'email', string>>

function validate(name: string, email: string): Errors {
  const e: Errors = {}
  if (!name.trim()) e.name = 'Enter your name.'
  else if (name.trim().length < 2) e.name = 'Name must be at least 2 characters.'
  if (!email.trim()) e.email = 'Enter your email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = 'Enter an email address like name@example.com.'
  return e
}

export default function ReserveModal({ open, finish, onFinish, onClose }: {
  open: boolean
  finish: FinishName
  onFinish: (f: FinishName) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const doneRef = useRef<HTMLHeadingElement>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [tried, setTried] = useState(false)
  const [done, setDone] = useState(false)
  const [summary, setSummary] = useState('')
  const id = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement
      setDone(false)
      setTried(false)
      setErrors({})
      setSummary('')
      d.showModal()
      document.documentElement.classList.add('modal-open')
      requestAnimationFrame(() => nameRef.current?.focus())
    } else if (!open && d.open) {
      d.close()
    }
  }, [open])

  // Native <dialog> handles Escape (cancel) and traps focus; we restore it.
  useEffect(() => {
    const d = ref.current
    if (!d) return
    const onDialogClose = () => {
      document.documentElement.classList.remove('modal-open')
      onClose()
      const el = opener.current
      if (el && document.contains(el)) el.focus({ preventScroll: true })
    }
    d.addEventListener('close', onDialogClose)
    return () => d.removeEventListener('close', onDialogClose)
  }, [onClose])

  useEffect(() => {
    if (done) doneRef.current?.focus()
  }, [done])

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const e = validate(name, email)
    setErrors(e)
    setTried(true)
    const n = Object.keys(e).length
    if (n) {
      setSummary(`${n === 1 ? 'One field needs' : `${n} fields need`} attention.`)
      ;(e.name ? nameRef : emailRef).current?.focus()
      return
    }
    setSummary('')
    setDone(true)
  }

  const recheck = (nextName = name, nextEmail = email) => {
    if (tried) setErrors(validate(nextName, nextEmail))
  }

  const f = FINISHES[finish]

  return (
    <dialog
      ref={ref}
      className="reserve"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-demo`}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close() }}
    >
      <div className="reserve__panel">
        <div className="reserve__visual" aria-hidden="true" style={{ ['--swatch' as string]: f.swatch }}>
          <span className="reserve__disc" />
          <span className="reserve__ring" />
        </div>
        <div className="reserve__body">
          <button type="button" className="reserve__close" aria-label="Close reservation" onClick={() => ref.current?.close()}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l12 12M16 4L4 16" /></svg>
          </button>
          <p className="label mono">Reservation <span aria-hidden="true">·</span> Demo</p>

          {!done ? (
            <>
              <h2 id={`${id}-title`} className="reserve__title display">Reserve CYMA One</h2>
              <p id={`${id}-demo`} className="reserve__notice">
                This is a demonstration. No payment is taken and no reservation is submitted.
                Nothing you type leaves this page.
              </p>
              <form noValidate onSubmit={submit} className="reserve__form">
                <div className={`field ${errors.name ? 'has-error' : ''}`}>
                  <label htmlFor={`${id}-name`}>Name</label>
                  <input
                    ref={nameRef} id={`${id}-name`} name="name" autoComplete="name" value={name}
                    aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-err` : undefined}
                    onChange={(e) => { setName(e.target.value); recheck(e.target.value, email) }}
                  />
                  {errors.name && <p className="field__error" id={`${id}-name-err`}>{errors.name}</p>}
                </div>
                <div className={`field ${errors.email ? 'has-error' : ''}`}>
                  <label htmlFor={`${id}-email`}>Email</label>
                  <input
                    ref={emailRef} id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" value={email}
                    aria-invalid={!!errors.email} aria-describedby={errors.email ? `${id}-email-err` : undefined}
                    onChange={(e) => { setEmail(e.target.value); recheck(name, e.target.value) }}
                  />
                  {errors.email && <p className="field__error" id={`${id}-email-err`}>{errors.email}</p>}
                </div>
                <fieldset className="field field--finish">
                  <legend>Finish</legend>
                  <div className="reserve__finishes">
                    {FINISH_ORDER.map((n) => (
                      <label key={n} className="swatch swatch--small">
                        <input type="radio" name="reserve-finish" value={n} checked={finish === n} onChange={() => onFinish(n)} />
                        <span className="swatch__chip" style={{ ['--swatch' as string]: FINISHES[n].swatch }} aria-hidden="true" />
                        <span className="swatch__name mono">{FINISHES[n].label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="sr-only" role="status" aria-live="polite">{summary}</p>
                <div className="reserve__foot">
                  <div className="reserve__price"><span>$899</span><span className="label mono">Concept pricing</span></div>
                  <button type="submit" className="btn btn--primary">
                    <span className="btn__drop" aria-hidden="true" />
                    Complete demo reservation
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="reserve__done">
              <h2 id={`${id}-title`} className="reserve__title display" tabIndex={-1} ref={doneRef}>Demo complete.</h2>
              <p id={`${id}-demo`} className="reserve__lede">
                Thanks, {name.trim()}. Nothing was sent: CYMA One is a concept, so there is no checkout, no payment and no server behind this form.
              </p>
              <dl className="reserve__summary">
                <div><dt className="mono">Name</dt><dd>{name.trim()}</dd></div>
                <div><dt className="mono">Email</dt><dd>{email.trim()}</dd></div>
                <div><dt className="mono">Finish</dt><dd>{f.label}</dd></div>
                <div><dt className="mono">Charged</dt><dd>$0. No payment taken.</dd></div>
              </dl>
              <p className="reserve__fine">Your details were never stored or transmitted. They disappear when you close this window.</p>
              <button type="button" className="btn btn--primary" onClick={() => ref.current?.close()}>Close</button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
