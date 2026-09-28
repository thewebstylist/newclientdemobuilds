import * as THREE from 'three'

// Every surface is drawn procedurally: nothing to download, sharp at any size.

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Grey relief for the crust. u runs around each wrap, v along the croissant:
 * fine laminated striations follow the wrap, broken by lifted flakes and cracks.
 */
export function crustBump(aniso: number) {
  const W = 512, H = 1024
  const { c, ctx } = canvas(W, H)
  const r = rng(11)
  ctx.fillStyle = '#7a7a7a'
  ctx.fillRect(0, 0, W, H)
  // Laminated striations: thin horizontal lines (around the wrap).
  for (let y = 0; y < H; y += 3 + r() * 5) {
    const g = 95 + Math.floor(r() * 90)
    ctx.strokeStyle = `rgba(${g},${g},${g},0.8)`
    ctx.lineWidth = 0.8 + r() * 1.6
    ctx.beginPath()
    let x = 0, yy = y
    ctx.moveTo(x, yy)
    while (x < W) { x += 20 + r() * 40; yy += (r() - 0.5) * 3; ctx.lineTo(x, yy) }
    ctx.stroke()
  }
  // Lifted flakes.
  for (let i = 0; i < 700; i++) {
    const g = 120 + Math.floor(r() * 120)
    ctx.fillStyle = `rgba(${g},${g},${g},0.9)`
    ctx.beginPath()
    ctx.ellipse(r() * W, r() * H, 6 + r() * 22, 1.5 + r() * 3.5, (r() - 0.5) * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  // Hairline cracks.
  ctx.strokeStyle = 'rgba(25,25,25,0.6)'
  for (let i = 0; i < 180; i++) {
    ctx.lineWidth = 0.6 + r()
    let x = r() * W, y = r() * H
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let k = 0; k < 3; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 8; ctx.lineTo(x, y) }
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = aniso
  return t
}

/**
 * The inside of a croissant: a crust ring, then a spiral of laminated dough
 * with long honeycomb air cells between the layers.
 */
export function crumbTexture(aniso: number, openness = 1) {
  const S = 1024
  const { c, ctx } = canvas(S, S)
  const r = rng(29)
  const cx = S / 2, cy = S / 2
  // Clip to the cross-section outline (flat-bottomed ellipse, as the cap UVs).
  const outline = () => {
    ctx.beginPath()
    for (let i = 0; i <= 180; i++) {
      const th = (i / 180) * Math.PI * 2
      let x = Math.cos(th) * 1.1, y = Math.sin(th) * 1.08
      if (y < 0) y *= 0.5
      const px = cx + (x / 2.3) * S, py = cy - (y / 2.3) * S
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  }
  ctx.fillStyle = '#9a5418'
  ctx.fillRect(0, 0, S, S)
  ctx.save()
  outline()
  ctx.clip()
  // Crumb base.
  const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, S * 0.45)
  g.addColorStop(0, '#fff0cc')
  g.addColorStop(1, '#f0d29a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  // Honeycomb cells along a spiral of layers.
  for (let turn = 0; turn < 420 * openness; turn++) {
    const a = r() * Math.PI * 2
    const rr = Math.pow(r(), 0.75) * 0.95
    const spiral = rr * 0.44 * S
    const x = cx + Math.cos(a) * spiral * 1.12
    const y = cy + Math.sin(a) * spiral * (Math.sin(a) > 0 ? 0.54 : 1.08)
    const len = (10 + r() * 34) * (0.6 + rr)
    const th = 2 + r() * 5.5 * openness
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a + Math.PI / 2 + (r() - 0.5) * 0.5)
    const cg = ctx.createLinearGradient(0, -th, 0, th)
    cg.addColorStop(0, 'rgba(176,112,48,0.9)')
    cg.addColorStop(1, 'rgba(112,62,22,0.9)')
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.ellipse(0, 0, len, th, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // Laminated layer lines: the spiral of the roll.
  ctx.strokeStyle = 'rgba(214,166,92,0.55)'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let i = 0; i < 900; i++) {
    const t = i / 900
    const a = t * Math.PI * 2 * 4.5
    const rr = 0.06 + t * 0.4
    const x = cx + Math.cos(a) * rr * S * 1.12
    const y = cy + Math.sin(a) * rr * S * (Math.sin(a) > 0 ? 0.54 : 1.08)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
  // Crust rim.
  ctx.lineWidth = 22
  ctx.strokeStyle = '#8f4b14'
  outline()
  ctx.stroke()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = aniso
  return t
}

export interface PastryUniforms {
  uBake: { value: number }
  uHeat: { value: number }
}

/**
 * Crust material: raw dough to deep golden. Colour comes from the wrap bands
 * (creases stay paler where the dough stretched) and the tips (brown first).
 * uBake 0..1 drives colour, gloss (egg wash) and roughness.
 */
export function crustMaterial(bump: THREE.Texture, palette: { crease: string; crown: string; tip: string; raw: string }) {
  const uniforms: PastryUniforms = { uBake: { value: 1 }, uHeat: { value: 0 } }
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.55, metalness: 0, bumpMap: bump, bumpScale: 0.9,
    clearcoat: 0.25, clearcoatRoughness: 0.4, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffd9a0'),
  })
  const col = (h: string) => new THREE.Color(h)
  const cCrease = col(palette.crease), cCrown = col(palette.crown), cTip = col(palette.tip), cRaw = col(palette.raw)
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, {
      uCrease: { value: cCrease }, uCrown: { value: cCrown }, uTip: { value: cTip }, uRaw: { value: cRaw },
    })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aBand;\nattribute float aTip;\nvarying float vBand;\nvarying float vTip;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBand = aBand;\nvTip = aTip;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uBake;\nuniform float uHeat;\nuniform vec3 uCrease;\nuniform vec3 uCrown;\nuniform vec3 uTip;\nuniform vec3 uRaw;\nvarying float vBand;\nvarying float vTip;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 baked = mix(uCrease, uCrown, smoothstep(0.15, 0.95, vBand));
        baked = mix(baked, uTip, smoothstep(0.55, 1.0, vTip) * 0.8);
        vec3 raw = mix(uRaw * 1.04, uRaw * 0.9, vBand);
        float b = smoothstep(0.0, 1.0, uBake);
        // Browning reaches the crowns and tips before the creases.
        float lead = clamp(b * 1.35 - (1.0 - vBand) * 0.25 + vTip * 0.15, 0.0, 1.0);
        diffuseColor.rgb = mix(raw, baked, lead);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.8, 0.52, uBake) - vBand * 0.1;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.45, 0.12) * uHeat * 0.06;')
  }
  mat.customProgramCacheKey = () => 'lamina-crust-' + palette.crown
  return { mat, uniforms }
}
