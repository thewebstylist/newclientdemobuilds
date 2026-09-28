// Dev-only harness: renders the croissant with URL parameters for quick visual checks.
import * as THREE from 'three'
import { Croissant } from './three/Croissant'
import { crustBump, crumbTexture } from './three/pastryMaterials'
import { studioEnvironment, studioLights } from './three/studio'

const q = new URLSearchParams(location.search)
const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d)
const canvas = document.getElementById('c') as HTMLCanvasElement
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(innerWidth, innerHeight, false)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NeutralToneMapping
renderer.toneMappingExposure = num('exp', 1)
const scene = new THREE.Scene()
scene.background = new THREE.Color('#000000')
scene.environment = studioEnvironment(renderer)
scene.environmentIntensity = num('env', 0.8)
studioLights(scene)
const aniso = renderer.capabilities.getMaxAnisotropy()
const c = new Croissant({ bump: crustBump(aniso), crumb: crumbTexture(aniso), mobile: false })
scene.add(c.root)
c.root.rotation.y = (num('ry', 0) * Math.PI) / 180
c.root.rotation.x = (num('rx', 0) * Math.PI) / 180
const cam = new THREE.PerspectiveCamera(num('fov', 26), innerWidth / innerHeight, 0.05, 100)
const el = (num('el', 22) * Math.PI) / 180, az = (num('az', 0) * Math.PI) / 180, dist = num('dist', 7)
cam.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist)
cam.lookAt(0, 0, 0)
c.update({ split: num('split', 0), crunchT: num('ct', 0), slice: num('slice', 0), bake: num('bake', 1), rise: num('rise', 0) }, 0)
renderer.render(scene, cam)
;(window as unknown as { __ready: boolean }).__ready = true
