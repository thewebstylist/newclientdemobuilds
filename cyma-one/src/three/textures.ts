import * as THREE from 'three'

// All surface detail is drawn procedurally so the scene ships with zero image
// downloads and stays crisp at any resolution.

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

/**
 * Perforated side band. Grey base (multiplies the finish colour), dark holes
 * on a staggered grid, and a clear plate at the front carrying the wordmark.
 * The texture wraps once around the enclosure; u = 0.5 faces the camera.
 */
export function perforationTexture(anisotropy: number) {
  const W = 4096
  const H = 128
  const { c, ctx } = canvas(W, H)
  ctx.fillStyle = '#cfcfcf'
  ctx.fillRect(0, 0, W, H)
  const plateW = 300
  const plateX0 = W / 2 - plateW / 2
  const step = 9
  ctx.fillStyle = '#101010'
  for (let row = 0, y = 8; y < H - 6; row++, y += step * 0.87) {
    const off = row % 2 ? step / 2 : 0
    for (let x = 4 + off; x < W; x += step) {
      if (x > plateX0 - 6 && x < plateX0 + plateW + 6) continue
      ctx.beginPath()
      ctx.arc(x, y, 2.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Engraved wordmark: slightly brighter, so it reads as a machined cut.
  ctx.fillStyle = '#f2f2f2'
  ctx.font = '600 44px "Archivo Variable", Arial, sans-serif'
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '18px'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CYMA', W / 2 + 9, H / 2 + 2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

/** Fine twill weave for the woofer cone. */
export function weaveTexture(anisotropy: number) {
  const S = 256
  const { c, ctx } = canvas(S, S)
  ctx.fillStyle = '#9a9a9a'
  ctx.fillRect(0, 0, S, S)
  const cell = 8
  for (let y = 0; y < S; y += cell) {
    for (let x = 0; x < S; x += cell) {
      const k = ((x + y) / cell) % 4
      ctx.fillStyle = k < 2 ? '#c8c8c8' : '#7c7c7c'
      ctx.fillRect(x, y, cell, cell)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(48, 6)
  tex.anisotropy = anisotropy
  return tex
}

/** Amplifier / DSP board: dark solder mask with gold traces. */
export function boardTexture() {
  const S = 1024
  const { c, ctx } = canvas(S, S)
  ctx.fillStyle = '#0d1411'
  ctx.fillRect(0, 0, S, S)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  ctx.strokeStyle = '#b8914a'
  ctx.lineCap = 'round'
  for (let i = 0; i < 140; i++) {
    ctx.lineWidth = 1 + rnd() * 3
    let x = rnd() * S
    let y = rnd() * S
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 4; k++) {
      if (rnd() > 0.5) x += (rnd() - 0.5) * 260
      else y += (rnd() - 0.5) * 260
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.fillStyle = '#d6b06a'
  for (let i = 0; i < 260; i++) {
    ctx.beginPath()
    ctx.arc(rnd() * S, rnd() * S, 2 + rnd() * 4, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Soft radial glow used for the stage light pool and the shockwave. */
export function radialTexture() {
  const S = 256
  const { c, ctx } = canvas(S, S)
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

export function ringTexture() {
  const S = 512
  const { c, ctx } = canvas(S, S)
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.9)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

/** Opaque white-to-black radial ramp, for alpha maps (read from the green channel). */
export function fadeTexture() {
  const S = 256
  const { c, ctx } = canvas(S, S)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.45, '#8a8a8a')
  g.addColorStop(1, '#000000')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}
