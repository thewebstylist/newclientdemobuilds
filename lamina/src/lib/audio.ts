// Sound is off by default and only ever starts inside a click. Everything is
// synthesised with Web Audio, so there are no audio files to download:
// the crunch is layered bursts of filtered noise, the oven a low, breathing hum.

class BakerySound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private humGain: GainNode | null = null
  private lastCrunch = 0
  enabled = false

  async enable() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return false
      const ctx = new AC()
      this.ctx = ctx
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -12
      comp.ratio.value = 5
      this.master = ctx.createGain()
      this.master.gain.value = 0.7
      this.master.connect(comp).connect(ctx.destination)
      this.buildHum(ctx)
    }
    await this.ctx.resume()
    this.enabled = true
    return true
  }

  disable() {
    this.enabled = false
    this.hum(0)
    this.ctx?.suspend()
  }

  private buildHum(ctx: AudioContext) {
    // Two detuned low tones through a lowpass, plus soft fan noise.
    const g = ctx.createGain()
    g.gain.value = 0
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 320
    for (const [f, a] of [[58, 0.5], [87.3, 0.22], [116.5, 0.1]] as const) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      const og = ctx.createGain()
      og.gain.value = a
      o.connect(og).connect(lp)
      o.start()
    }
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5 }
    const fan = ctx.createBufferSource()
    fan.buffer = buf
    fan.loop = true
    const fg = ctx.createGain()
    fg.gain.value = 0.5
    fan.connect(fg).connect(lp)
    fan.start()
    // A slow breath in the level, like a burner cycling.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.23
    const lg = ctx.createGain()
    lg.gain.value = 60
    lfo.connect(lg).connect(lp.frequency)
    lfo.start()
    lp.connect(g).connect(this.master!)
    this.humGain = g
  }

  /** Oven hum level 0..1, eased. */
  hum(level: number) {
    if (!this.ctx || !this.humGain) return
    const v = this.enabled ? Math.max(0, Math.min(1, level)) * 0.32 : 0
    this.humGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.25)
  }

  /** The snap: one sharp crack, then a spray of tiny shatters. */
  crunch(level = 1) {
    const ctx = this.ctx
    if (!this.enabled || !ctx || !this.master) return
    const now = ctx.currentTime
    if (now - this.lastCrunch < 0.35) return
    this.lastCrunch = now
    const burst = (t: number, dur: number, freq: number, q: number, gain: number) => {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5)
      const src = ctx.createBufferSource()
      src.buffer = buf
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = freq
      bp.Q.value = q
      const g = ctx.createGain()
      g.gain.value = gain * level
      src.connect(bp).connect(g).connect(this.master!)
      src.start(t)
    }
    const t = now + 0.01
    burst(t, 0.05, 2600, 0.7, 1.4)       // the crack
    burst(t, 0.12, 900, 0.9, 0.8)        // body of the break
    for (let i = 0; i < 26; i++) {       // shatter: flakes letting go
      const dt = 0.02 + Math.pow(Math.random(), 1.6) * 0.5
      burst(t + dt, 0.008 + Math.random() * 0.02, 2500 + Math.random() * 5000, 2 + Math.random() * 4, 0.25 + Math.random() * 0.45)
    }
  }
}

export const sound = new BakerySound()
