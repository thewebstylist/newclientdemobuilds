import * as THREE from 'three'

/** Studio lighting as geometry: a black room with softboxes and thin strip lights. */
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene()
  env.background = new THREE.Color('#000000')
  const panel = (w: number, h: number, intensity: number, color: string, pos: [number, number, number], round = false) => {
    const m = new THREE.Mesh(
      round ? new THREE.CircleGeometry(w / 2, 48) : new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    )
    m.position.set(...pos)
    m.lookAt(0, 0, 0)
    env.add(m)
  }
  panel(6, 6, 1.6, '#fff4e6', [-3, 8, 4], true)   // large key softbox, warm
  panel(0.6, 9, 7, '#ffe2b8', [-7, 1, -5])        // thin rim strip, left
  panel(0.6, 9, 6, '#ffffff', [7, 1.5, -5.5])     // thin rim strip, right
  panel(3, 2, 0.35, '#ffffff', [5, 2, 7])         // faint fill
  const pmrem = new THREE.PMREMGenerator(renderer)
  const tex = pmrem.fromScene(env, 0.015).texture
  pmrem.dispose()
  return tex
}

export function studioLights(scene: THREE.Scene) {
  const key = new THREE.DirectionalLight('#fff1dc', 2.1)
  key.position.set(-3, 5, 4)
  const rimL = new THREE.DirectionalLight('#ffd49a', 4.2)
  rimL.position.set(-5, 1.5, -4)
  const rimR = new THREE.DirectionalLight('#ffffff', 3.4)
  rimR.position.set(5, 2, -4.5)
  const fill = new THREE.DirectionalLight('#ffe9cf', 0.35)
  fill.position.set(4, 1, 5)
  const hemi = new THREE.HemisphereLight('#6b5238', '#000000', 0.25)
  scene.add(key, rimL, rimR, fill, hemi)
  return { key, rimL, rimR, fill, hemi }
}
