// Sound is off by default and is only ever created inside a click handler.
// The bass pulse is synthesised, so there is no audio file to download.

class BassSynth {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  enabled = false

  async enable() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return false
      this.ctx = new AC()
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.ratio.value = 4
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.55
      this.master.connect(comp).connect(this.ctx.destination)
    }
    await this.ctx.resume()
    this.enabled = true
    this.pulse(0.35)
    return true
  }

  disable() {
    this.enabled = false
    this.ctx?.suspend()
  }

  /** One controlled 32 Hz hit: pitch drop, soft click, long decay. */
  pulse(level = 1) {
    const ctx = this.ctx
    if (!this.enabled || !ctx || !this.master) return
    const t = ctx.currentTime + 0.01

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(64, t)
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.22)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.9 * level, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + 1.7)

    // Second harmonic so the pulse is audible on small speakers.
    const h = ctx.createOscillator()
    h.type = 'triangle'
    h.frequency.setValueAtTime(128, t)
    h.frequency.exponentialRampToValueAtTime(64, t + 0.2)
    const hg = ctx.createGain()
    hg.gain.setValueAtTime(0.0001, t)
    hg.gain.exponentialRampToValueAtTime(0.18 * level, t + 0.01)
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    h.connect(hg).connect(this.master)
    h.start(t)
    h.stop(t + 0.8)

    // Transient: a short band of filtered noise, the paint leaving the cone.
    const len = Math.floor(ctx.sampleRate * 0.08)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const ng = ctx.createGain()
    ng.gain.value = 0.25 * level
    src.connect(lp).connect(ng).connect(this.master)
    src.start(t)
  }
}

export const bass = new BassSynth()
