import type { Engine } from '../three/Engine'

// Drag-to-spin with inertia. Horizontal drag turns the croissant, vertical
// drag tilts it (springing back on release). Arrow keys and the buttons give
// the same spin a push, so it works without a pointer.

export interface SpinControl {
  attach: (el: HTMLElement) => () => void
  nudge: (deg: number) => void
  step: (dt: number) => boolean
  setEngine: (e: Engine | null) => void
  onAngle: (fn: (deg: number) => void) => void
}

export function createSpin(): SpinControl {
  let engine: Engine | null = null
  let angle = 0
  let tilt = 0
  let vel = 0
  let dragging = false
  let lastX = 0, lastY = 0, lastT = 0
  let listener: ((deg: number) => void) | null = null
  let reported = NaN

  const report = () => {
    const shown = Math.round((((336 + angle) % 360) + 360) % 360)
    if (shown !== reported) { reported = shown; listener?.(shown) }
  }

  return {
    setEngine(e) { engine = e },
    onAngle(fn) { listener = fn; reported = NaN; report() },
    nudge(deg) { vel += deg * 3.2 },
    attach(el) {
      const down = (e: PointerEvent) => {
        if (e.button !== 0 || (e.target as Element).closest('button, a')) return
        dragging = true
        vel = 0
        lastX = e.clientX; lastY = e.clientY; lastT = performance.now()
        el.setPointerCapture?.(e.pointerId)
        el.classList.add('is-dragging')
      }
      const move = (e: PointerEvent) => {
        if (!dragging) return
        const now = performance.now()
        const dx = e.clientX - lastX, dy = e.clientY - lastY
        const dt = Math.max(1, now - lastT) / 1000
        const d = dx * 0.5
        angle += d
        vel = vel * 0.6 + (d / dt) * 0.4
        if (e.pointerType === 'mouse') tilt = Math.max(-24, Math.min(24, tilt + dy * 0.25))
        lastX = e.clientX; lastY = e.clientY; lastT = now
        report()
      }
      const up = () => {
        if (!dragging) return
        dragging = false
        el.classList.remove('is-dragging')
        // A pause before release means no fling.
        if (performance.now() - lastT > 90) vel = 0
      }
      const key = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') { vel -= 150; e.preventDefault() }
        if (e.key === 'ArrowRight') { vel += 150; e.preventDefault() }
      }
      el.addEventListener('pointerdown', down)
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
      el.addEventListener('keydown', key)
      return () => {
        el.removeEventListener('pointerdown', down)
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', up)
        el.removeEventListener('keydown', key)
      }
    },
    step(dt) {
      let moving = dragging
      if (!dragging && Math.abs(vel) > 0.5) {
        angle += vel * dt
        vel *= Math.exp(-dt * 2.6)
        moving = true
      } else if (!dragging) vel = 0
      if (!dragging && Math.abs(tilt) > 0.05) { tilt *= Math.exp(-dt * 5); moving = true }
      if (engine) { engine.dragAngle = angle; engine.dragTilt = tilt }
      if (moving) report()
      return moving
    },
  }
}
