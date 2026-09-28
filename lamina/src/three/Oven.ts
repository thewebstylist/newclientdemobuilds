import * as THREE from 'three'

// A deck oven seen from its open mouth: steel cavity, stone deck, glowing
// elements top and bottom, and a parchment-lined tray. The glow and its warm
// lights are driven by `set(visibility, heat)`.

function stoneTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#2a1d14'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 5000; i++) {
    const g = 30 + Math.random() * 40
    ctx.fillStyle = `rgba(${g + 20},${g + 8},${g},0.5)`
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2)
  }
  // Flour dust and old scorch marks.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(220,200,170,${0.03 + Math.random() * 0.05})`
    ctx.beginPath()
    ctx.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 40, 0, Math.PI * 2)
    ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 2)
  return t
}

export class Oven {
  group = new THREE.Group()
  private elements: THREE.MeshBasicMaterial[] = []
  private lights: THREE.PointLight[] = []
  private glow: THREE.Mesh

  constructor() {
    const steel = new THREE.MeshStandardMaterial({ color: '#15110e', metalness: 0.8, roughness: 0.55 })
    const W = 5.2, H = 2.4, D = 3.4
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      mesh.position.set(x, y, z)
      this.group.add(mesh)
      return mesh
    }
    box(W, 0.05, D, new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.95 }), 0, -0.36, -0.6) // stone deck
    box(W, 0.05, D, steel, 0, H - 0.36, -0.6)          // ceiling
    box(0.05, H, D, steel, -W / 2, H / 2 - 0.36, -0.6) // walls
    box(0.05, H, D, steel, W / 2, H / 2 - 0.36, -0.6)
    box(W, H, 0.05, steel, 0, H / 2 - 0.36, -0.6 - D / 2)

    // Heating elements: glowing rods under the ceiling and along the back.
    const rodGeo = new THREE.CylinderGeometry(0.018, 0.018, W * 0.9, 12)
    for (const [y, z] of [[H - 0.55, -1.6], [H - 0.55, -0.6], [H - 0.55, 0.4], [-0.3, -2.2]] as const) {
      const m = new THREE.MeshBasicMaterial({ color: '#ff6a1a' })
      this.elements.push(m)
      const rod = new THREE.Mesh(rodGeo, m)
      rod.rotation.z = Math.PI / 2
      rod.position.set(0, y, z)
      this.group.add(rod)
    }
    for (const [x, y, z] of [[-1.4, 1.5, -0.5], [1.4, 1.5, -0.5], [0, 0.4, -1.8]] as const) {
      const l = new THREE.PointLight('#ff8a3a', 0, 7, 1.6)
      l.position.set(x, y, z)
      this.lights.push(l)
      this.group.add(l)
    }
    // A soft orange haze at the back of the oven.
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 0.95, H * 0.9),
      new THREE.MeshBasicMaterial({ color: '#ff7a2a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.glow.position.set(0, 0.8, -2.25)
    this.group.add(this.glow)

    // Tray with parchment.
    box(1.75, 0.03, 1.0, new THREE.MeshStandardMaterial({ color: '#2b2b2e', metalness: 0.9, roughness: 0.35 }), 0, -0.31, 0)
    box(1.62, 0.005, 0.9, new THREE.MeshStandardMaterial({ color: '#9c8a6c', roughness: 0.95 }), 0, -0.292, 0)

    // The mouth: a thick steel frame between us and the oven.
    const frame = new THREE.MeshStandardMaterial({ color: '#0b0908', metalness: 0.7, roughness: 0.4 })
    box(W + 1.4, 0.5, 0.2, frame, 0, H - 0.1, 1.1)
    box(W + 1.4, 0.35, 0.2, frame, 0, -0.55, 1.1)
    box(0.5, H + 0.6, 0.2, frame, -W / 2 - 0.45, H / 2 - 0.36, 1.1)
    box(0.5, H + 0.6, 0.2, frame, W / 2 + 0.45, H / 2 - 0.36, 1.1)
    this.group.visible = false
  }

  /** visibility 0..1, heat 0..1 (elements brighten, flicker a touch). */
  set(vis: number, heat: number, clock: number) {
    this.group.visible = vis > 0.01
    if (!this.group.visible) return
    const flicker = 0.94 + 0.06 * Math.sin(clock * 7.3) * Math.sin(clock * 3.1)
    const h = vis * (0.35 + 0.65 * heat) * flicker
    this.elements.forEach((m) => m.color.setRGB(1.2 * h + 0.08, 0.42 * h + 0.03, 0.1 * h))
    this.lights.forEach((l, i) => (l.intensity = (i === 2 ? 5 : 7) * h))
    ;(this.glow.material as THREE.MeshBasicMaterial).opacity = 0.16 * h
  }
}
