import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { PASTRIES, type PastryId } from './Chapters'

// Order-ahead card. Everything stays on this page: the reserve button shows a
// confirmation and says plainly that nothing was sent.

const FIRST = 6 * 60 + 20   // first batch 6:20
const LAST = 15 * 60        // last batch 15:00
const EVERY = 40            // a batch every 40 minutes

/** The next few batches from `now`, rolling into tomorrow after the last one. */
function batches(now: Date, count: number) {
  const out: Date[] = []
  const d = new Date(now)
  d.setSeconds(0, 0)
  let mins = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() > 0 ? 1 : 0)
  let dayOffset = 0
  while (out.length < count) {
    let next = mins <= FIRST ? FIRST : FIRST + Math.ceil((mins - FIRST) / EVERY) * EVERY
    if (next > LAST) { dayOffset++; mins = 0; next = FIRST }
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, Math.floor(next / 60), next % 60)
    out.push(t)
    mins = next + 1
  }
  return out
}

const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const dayLabel = (d: Date, now: Date) => (d.toDateString() === now.toDateString() ? 'Today' : 'Tomorrow')
const money = (n: number) => `$${n.toFixed(2)}`
const pad = (n: number) => String(n).padStart(2, '0')

export default function Order({ fallback }: { fallback: boolean }) {
  const [now, setNow] = useState(() => new Date())
  const [qty, setQty] = useState<Record<PastryId, number>>({ pro: 2, choc: 0, kouign: 0, almond: 0 })
  const [slotIdx, setSlotIdx] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState<null | { ref: string; slot: Date; items: [string, number][]; total: number }>(null)
  const doneRef = useRef<HTMLHeadingElement>(null)
  const formHead = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Slots refresh each minute, not each second, so the chosen slot doesn't jump.
  const minuteKey = Math.floor(now.getTime() / 60000)
  const slots = useMemo(() => batches(now, 4), [minuteKey])
  const next = slots[0]
  const left = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
  const countdown = left >= 3600 ? `${Math.floor(left / 3600)}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}` : `${pad(Math.floor(left / 60))}:${pad(left % 60)}`
  const total = PASTRIES.reduce((s, p) => s + p.price * qty[p.id], 0)
  const count = PASTRIES.reduce((s, p) => s + qty[p.id], 0)

  const step = (id: PastryId, d: number) => {
    setError('')
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(12, q[id] + d)) }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (count === 0) { setError('Add at least one pastry to reserve a batch.'); return }
    const ref = 'LMN-' + Math.random().toString(36).slice(2, 6).toUpperCase()
    setDone({ ref, slot: slots[Math.min(slotIdx, slots.length - 1)], items: PASTRIES.filter((p) => qty[p.id] > 0).map((p) => [p.name, qty[p.id]]), total })
  }

  // Move focus to the confirmation (or back to the form) when the view swaps.
  const wasDone = useRef(false)
  useEffect(() => {
    const isDone = !!done
    if (isDone === wasDone.current) return
    wasDone.current = isDone
    ;(isDone ? doneRef.current : formHead.current)?.focus()
  }, [done])

  return (
    <section id="order" className="order" aria-labelledby="order-title">
      {fallback && <div className="order__fallback" aria-hidden="true" />}
      <div className="glass order__card">
        {done ? (
          <div className="order__done">
            <p className="eyebrow mono"><span className="dot dot--live" /> Held for you</p>
            <h2 id="order-title" ref={doneRef} tabIndex={-1} className="display display--m">See you at <span className="serif">{time(done.slot)}.</span></h2>
            <p className="order__notice" role="status">
              Nothing was sent and nobody was charged. LAMINA is a fictional bakery, so this reservation only exists on this page.
            </p>
            <dl className="order__summary">
              <div><dt className="label">Pickup</dt><dd>{dayLabel(done.slot, now)}, {time(done.slot)}</dd></div>
              <div><dt className="label">Order</dt><dd>{done.items.map(([n, q]) => `${q} × ${n}`).join(', ')}</dd></div>
              <div><dt className="label">Total</dt><dd>{money(done.total)} <span className="muted">· pay at pickup</span></dd></div>
              <div><dt className="label">Ref</dt><dd className="mono">{done.ref}</dd></div>
            </dl>
            <button type="button" className="btn btn--ghost" onClick={() => setDone(null)}>Change order</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="eyebrow mono">09 <span className="dot" /> Order ahead</p>
            <h2 id="order-title" ref={formHead} tabIndex={-1} className="display display--m">Reserve the <span className="serif">next batch.</span></h2>
            <p className="order__batch" aria-live="off">
              <span className="dot dot--live" aria-hidden="true" />
              Next batch out of the oven in <b className="mono" data-countdown>{countdown}</b>
            </p>
            <fieldset className="order__items">
              <legend className="label">Pastries</legend>
              {PASTRIES.map((p) => (
                <div key={p.id} className="stepper">
                  <div className="stepper__info">
                    <span className="stepper__name">{p.name}</span>
                    <span className="mono muted">{money(p.price)}</span>
                  </div>
                  <div className="stepper__ctrl">
                    <button type="button" aria-label={`One fewer ${p.name}`} onClick={() => step(p.id, -1)} disabled={qty[p.id] === 0}>
                      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9" /></svg>
                    </button>
                    <output className="mono" aria-live="polite" aria-label={`${p.name} quantity`}>{qty[p.id]}</output>
                    <button type="button" aria-label={`One more ${p.name}`} onClick={() => step(p.id, 1)} disabled={qty[p.id] === 12}>
                      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9M8 3.5v9" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </fieldset>
            <fieldset className="order__slots">
              <legend className="label">Pickup</legend>
              <div className="slots">
                {slots.map((s, i) => (
                  <label key={s.getTime()} className="slot">
                    <input type="radio" name="slot" value={i} checked={slotIdx === i} onChange={() => setSlotIdx(i)} />
                    <span className="slot__day mono">{dayLabel(s, now)}</span>
                    <span className="slot__time">{time(s)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p className="order__error" role="alert">{error}</p>}
            <div className="order__foot">
              <p className="order__total"><span className="label">{count} item{count === 1 ? '' : 's'}</span><b>{money(total)}</b></p>
              <button type="submit" className="btn btn--gold">Reserve</button>
            </div>
            <p className="order__fine">Demo only. Reserving sends nothing anywhere.</p>
          </form>
        )}
      </div>
    </section>
  )
}
