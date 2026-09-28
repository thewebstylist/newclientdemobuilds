import * as THREE from 'three'
import { coneY } from './Speaker'

// The eruption is not a stateful simulation. Every parcel of paint follows a
// closed-form ballistic path (launch speed, drag, gravity, a little curl), so
// any moment of the eruption can be evaluated directly from one time value.
// Scrolling back and forth is exact, cheap, and runs entirely on the GPU.

import { STAGGER } from './constants'
export { PEAK_T, STAGGER } from './constants'

const PATH_GLSL = /* glsl */ `
uniform float uTime;
uniform float uGravity;
uniform float uDrag;
uniform float uStagger;
uniform float uFade;
uniform vec3 uPalette[8];
varying vec3 vPaint;

float dragD(float t) { return (1.0 - exp(-uDrag * t)) / uDrag; }

vec3 paintPath(vec3 o, vec3 dir, float spd, vec3 side, float curl, float ph, float t) {
  float d = dragD(t);
  float travel = spd * d;
  vec3 p = o + dir * travel;
  p.y -= 0.5 * uGravity * t * t;
  vec3 fwd = cross(side, vec3(0.0, 1.0, 0.0));
  p += side * (curl * sin(travel * 1.9 + ph) * travel * 0.16);
  p += fwd * (curl * 0.6 * (cos(travel * 1.3 + ph * 1.7) - 1.0) * travel * 0.08);
  // Paint cannot pass through the cone, or through the floor.
  float rh = length(p.xz);
  p.y = max(p.y, rh < 0.95 ? o.y - 0.012 : 0.012);
  return p;
}

vec3 paintColor(float idx) {
  return uPalette[int(idx + 0.5)];
}
`

const FRAG_HEAD = /* glsl */ `
varying vec3 vPaint;
uniform float uGlow;
`

function patchFragment(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
    .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vPaint;')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vPaint * uGlow;')
}

const TENDRIL_VERT_HEAD = /* glsl */ `
attribute vec2 aTube;      // u along the tendril, theta around it
attribute float aCap;      // -1..0 start cap, 0..1 end cap, 0 body
attribute vec3 aOrigin;
attribute vec3 aDir;
attribute vec3 aSide;
attribute vec4 aSpeed;     // vmin, vmax, speed curve exponent, colour index
attribute vec4 aShape;     // r0, flat x, flat y, twist
attribute vec4 aMisc;      // curl, phase, bead frequency, unused
`

const TENDRIL_VERT_BODY = /* glsl */ `
  float idx = aSpeed.w;
  float tl = max(uTime - idx * uStagger, 0.0);
  float u = aTube.x;
  float e = 0.012;
  float s0 = mix(aSpeed.x, aSpeed.y, pow(u, aSpeed.z));
  float sA = mix(aSpeed.x, aSpeed.y, pow(max(u - e, 0.0), aSpeed.z));
  float sB = mix(aSpeed.x, aSpeed.y, pow(min(u + e, 1.0), aSpeed.z));
  vec3 c = paintPath(aOrigin, aDir, s0, aSide, aMisc.x, aMisc.y, tl);
  vec3 tang = paintPath(aOrigin, aDir, sB, aSide, aMisc.x, aMisc.y, tl) - paintPath(aOrigin, aDir, sA, aSide, aMisc.x, aMisc.y, tl);
  tang = length(tang) < 1e-5 ? aDir : normalize(tang);
  vec3 B = aSide - dot(aSide, tang) * tang;
  B = length(B) < 1e-4 ? normalize(cross(tang, vec3(0.0, 0.0, 1.0))) : normalize(B);
  vec3 N = cross(B, tang);

  // Stretching thins the column (volume is conserved); the tip keeps its mass.
  float stretch = (aSpeed.y - aSpeed.x) * dragD(tl);
  float thin = inversesqrt(1.0 + stretch * 0.55);
  float prof = mix(1.45, 0.5, smoothstep(0.0, 0.7, u)) * mix(1.0, 1.35, smoothstep(0.8, 1.0, u));
  // Rayleigh-Plateau beading grows as the column thins.
  float bead = 1.0 + 0.32 * sin(u * aMisc.z + aMisc.y * 3.0) * smoothstep(0.25, 1.0, tl) * smoothstep(0.1, 0.5, u);
  float r = aShape.x * prof * thin * bead * smoothstep(0.0, 0.035, tl) * uFade;
  float rx = r * aShape.y;
  float ry = r * aShape.z;

  float th = aTube.y + aShape.w * u * (0.4 + tl);
  float capA = abs(aCap) * 1.5707963;
  float capS = sign(aCap);
  float cs = cos(th), sn = sin(th);
  vec3 radial = N * cs * rx + B * sn * ry;
  vec3 paintP = c + radial * cos(capA) + tang * capS * sin(capA) * 0.5 * (rx + ry);
  vec3 rn = normalize(N * cs / max(rx, 1e-5) + B * sn / max(ry, 1e-5));
  vec3 objectNormal = normalize(rn * cos(capA) + tang * capS * sin(capA));
  vPaint = paintColor(idx);
`

const DROP_VERT_HEAD = /* glsl */ `
attribute vec3 aOrigin;
attribute vec3 aDir;
attribute vec3 aSide;
attribute vec3 aPert;
attribute vec4 aD;     // speed, size, curl, phase
attribute vec2 aD2;    // colour index, tip bulb flag
`

const DROP_VERT_BODY = /* glsl */ `
  float idx = aD2.x;
  float tl = max(uTime - idx * uStagger, 0.0);
  vec3 c = paintPath(aOrigin, aDir, aD.x, aSide, aD.z, aD.w, tl) + aPert * dragD(tl);
  vec3 c2 = paintPath(aOrigin, aDir, aD.x, aSide, aD.z, aD.w, tl + 0.01) + aPert * dragD(tl + 0.01);
  float floorY = length(c.xz) < 0.95 ? aOrigin.y - 0.012 : 0.012;
  c.y = max(c.y, floorY);
  c2.y = max(c2.y, floorY);
  vec3 vel = (c2 - c) / 0.01;
  float vl = length(vel);
  vec3 vd = vl > 1e-4 ? vel / vl : vec3(0.0, 1.0, 0.0);
  float sLong = 1.0 + min(vl * 0.035, 0.45);
  float sShort = inversesqrt(sLong);
  vec3 p0 = position;
  float wob = 1.0 + 0.09 * sin(dot(p0, vec3(3.1, 2.3, 1.7)) * 2.0 + aD.w * 5.0);
  float al = dot(p0, vd);
  vec3 pp = (p0 - vd * al) * sShort + vd * al * sLong;
  float size = aD.y * smoothstep(0.0, 0.05, tl) * uFade;
  vec3 paintP = c + pp * size * wob;
  vec3 n0 = normal;
  float an = dot(n0, vd);
  vec3 objectNormal = normalize((n0 - vd * an) / sShort + vd * an / sLong);
  vPaint = paintColor(idx);
`

function patchVertex(shader: THREE.WebGLProgramParametersWithUniforms, head: string, body: string) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + PATH_GLSL + head)
    .replace('#include <beginnormal_vertex>', body)
    .replace('#include <begin_vertex>', 'vec3 transformed = paintP;')
}

// Deterministic randomness so every visitor sees the same sculpture.
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface PoolInfo {
  x: number
  z: number
  r: number
  angle: number
}

export class Paint {
  group = new THREE.Group()
  uniforms = {
    uTime: { value: 0 },
    uGravity: { value: 4.0 },
    uDrag: { value: 0.35 },
    uStagger: { value: STAGGER },
    uFade: { value: 1 },
    uGlow: { value: 0.04 },
    uPalette: { value: Array.from({ length: 8 }, () => new THREE.Color()) },
  }
  pools: THREE.Mesh[] = []
  poolInfo: PoolInfo[] = []
  poolMats: THREE.MeshPhysicalMaterial[] = []
  private tendrils: THREE.InstancedMesh
  private drops: THREE.InstancedMesh

  constructor(coneGroup: THREE.Group, mobile: boolean) {
    const rand = rng(32)
    const R = (a: number, b: number) => a + (b - a) * rand()

    // Eight pools in a ring on the cone.
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2 + Math.PI / 8
      const r = k % 2 ? 0.5 : 0.44
      this.poolInfo.push({ x: Math.sin(angle) * r, z: Math.cos(angle) * r, r: 0.125 + (k % 3) * 0.008, angle })
    }

    const makeMat = () => new THREE.MeshPhysicalMaterial({
      color: '#ffffff', roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
      envMapIntensity: 1.15, specularIntensity: 0.9,
    })

    // Pools: flattened, slightly irregular lenses that follow the cone slope.
    const poolGeo = new THREE.SphereGeometry(1, 48, 18)
    {
      const pos = poolGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
        const th = Math.atan2(z, x)
        const wob = 1 + 0.07 * Math.sin(3 * th + 1.3) + 0.04 * Math.sin(5 * th + 0.4)
        pos.setXYZ(i, x * wob, y < 0 ? y * 0.15 : y, z * wob)
      }
      poolGeo.computeVertexNormals()
    }
    this.poolInfo.forEach((p, k) => {
      const mat = makeMat()
      this.poolMats.push(mat)
      const m = new THREE.Mesh(poolGeo, mat)
      const rr = Math.hypot(p.x, p.z)
      m.position.set(p.x, coneY(rr) + 0.004, p.z)
      // Tilt to lie on the cone: the surface rises toward the rim.
      const slope = Math.atan((coneY(rr + 0.02) - coneY(rr - 0.02)) / 0.04)
      m.rotation.order = 'YXZ'
      m.rotation.y = p.angle
      m.rotation.x = slope
      m.scale.set(p.r, 0.034, p.r * 1.08)
      m.userData.k = k
      coneGroup.add(m)
      this.pools.push(m)
    })

    // ---- Tendrils ---------------------------------------------------------
    const U = mobile ? 44 : 72
    const TH = mobile ? 10 : 14
    const CAP = 4
    const tubeGeo = new THREE.InstancedBufferGeometry()
    {
      const rows: { u: number; cap: number }[] = []
      for (let i = CAP; i >= 1; i--) rows.push({ u: 0, cap: -i / CAP })
      for (let i = 0; i <= U; i++) rows.push({ u: i / U, cap: 0 })
      for (let i = 1; i <= CAP; i++) rows.push({ u: 1, cap: i / CAP })
      const aTube: number[] = []
      const aCap: number[] = []
      const position: number[] = []
      for (const row of rows) {
        for (let j = 0; j <= TH; j++) {
          aTube.push(row.u, (j / TH) * Math.PI * 2)
          aCap.push(row.cap)
          position.push(0, 0, 0)
        }
      }
      const index: number[] = []
      for (let i = 0; i < rows.length - 1; i++) {
        for (let j = 0; j < TH; j++) {
          const a = i * (TH + 1) + j
          const b = a + TH + 1
          index.push(a, a + 1, b, b, a + 1, b + 1)
        }
      }
      tubeGeo.setIndex(index)
      tubeGeo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
      tubeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(position, 3))
      tubeGeo.setAttribute('aTube', new THREE.Float32BufferAttribute(aTube, 2))
      tubeGeo.setAttribute('aCap', new THREE.Float32BufferAttribute(aCap, 1))
    }

    interface T {
      o: THREE.Vector3; dir: THREE.Vector3; side: THREE.Vector3
      vmin: number; vmax: number; pw: number; k: number
      r0: number; fx: number; fy: number; twist: number; curl: number; phase: number; bead: number
    }
    const tendrils: T[] = []
    const perPool = mobile ? ['jet', 'jet', 'arc', 'ribbon'] : ['jet', 'jet', 'arc', 'arc', 'ribbon']
    const up = new THREE.Vector3(0, 1, 0)
    this.poolInfo.forEach((p, k) => {
      for (const kind of perPool) {
        const a = rand() * Math.PI * 2
        const rr = Math.sqrt(rand()) * p.r * 0.6
        const ox = p.x + Math.cos(a) * rr
        const oz = p.z + Math.sin(a) * rr
        const o = new THREE.Vector3(ox, coneY(Math.hypot(ox, oz)) + 0.02, oz)
        const out = new THREE.Vector3(ox, 0, oz).normalize()
        const tan = new THREE.Vector3(-out.z, 0, out.x)
        let lean = 0, tl = R(-0.12, 0.12), vmin = 2.2, vmax = 5, r0 = 0.045, fx = 1, fy = 1, twist = 0, curl = 0.5, pw = 1.4
        if (kind === 'jet') {
          lean = R(0.03, 0.22); vmin = R(2.2, 2.7); vmax = R(4.4, 6.2); r0 = R(0.075, 0.1); curl = R(0.25, 0.8); pw = R(1.15, 1.5)
        } else if (kind === 'arc') {
          lean = R(0.3, 0.55); vmin = R(2.0, 2.4); vmax = R(3.5, 4.5); r0 = R(0.06, 0.075); curl = R(0.2, 0.6); pw = R(1.0, 1.3)
        } else {
          lean = R(0.12, 0.32); vmin = R(2.1, 2.5); vmax = R(3.9, 5.2); r0 = R(0.06, 0.07); fx = 3.1; fy = 0.32; twist = R(1.4, 3.0); curl = R(0.8, 1.3)
        }
        const dir = up.clone().addScaledVector(out, lean).addScaledVector(tan, tl).normalize()
        const horiz = new THREE.Vector3(dir.x, 0, dir.z)
        if (horiz.lengthSq() < 1e-6) horiz.copy(out)
        horiz.normalize()
        const side = new THREE.Vector3().crossVectors(up, horiz).normalize()
        tendrils.push({ o, dir, side, vmin, vmax, pw, k, r0, fx, fy, twist, curl, phase: R(0, 6.28), bead: R(14, 26) })
      }
    })
    {
      const n = tendrils.length
      const f = (w: number) => new Float32Array(n * w)
      const aO = f(3), aDir = f(3), aSide = f(3), aSpeed = f(4), aShape = f(4), aMisc = f(4)
      tendrils.forEach((t, i) => {
        aO.set([t.o.x, t.o.y, t.o.z], i * 3)
        aDir.set([t.dir.x, t.dir.y, t.dir.z], i * 3)
        aSide.set([t.side.x, t.side.y, t.side.z], i * 3)
        aSpeed.set([t.vmin, t.vmax, t.pw, t.k], i * 4)
        aShape.set([t.r0, t.fx, t.fy, t.twist], i * 4)
        aMisc.set([t.curl, t.phase, t.bead, 0], i * 4)
      })
      tubeGeo.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(aO, 3))
      tubeGeo.setAttribute('aDir', new THREE.InstancedBufferAttribute(aDir, 3))
      tubeGeo.setAttribute('aSide', new THREE.InstancedBufferAttribute(aSide, 3))
      tubeGeo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(aSpeed, 4))
      tubeGeo.setAttribute('aShape', new THREE.InstancedBufferAttribute(aShape, 4))
      tubeGeo.setAttribute('aMisc', new THREE.InstancedBufferAttribute(aMisc, 4))
      tubeGeo.instanceCount = n
    }
    const tMat = makeMat()
    tMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms)
      patchVertex(shader, TENDRIL_VERT_HEAD, TENDRIL_VERT_BODY)
      patchFragment(shader)
    }
    tMat.customProgramCacheKey = () => 'cyma-tendril'
    this.tendrils = new THREE.InstancedMesh(tubeGeo, tMat, tendrils.length)
    this.tendrils.frustumCulled = false

    // ---- Droplets ---------------------------------------------------------
    interface D { o: THREE.Vector3; dir: THREE.Vector3; side: THREE.Vector3; pert: THREE.Vector3; speed: number; size: number; curl: number; phase: number; k: number; tip: number }
    const drops: D[] = []
    const randUnit = () => {
      const z = R(-1, 1), a = R(0, Math.PI * 2), s = Math.sqrt(1 - z * z)
      return new THREE.Vector3(Math.cos(a) * s, z, Math.sin(a) * s)
    }
    for (const t of tendrils) {
      const spd = (u: number) => t.vmin + (t.vmax - t.vmin) * Math.pow(u, t.pw)
      // The bulb at the tip, where a real tendril gathers its mass.
      drops.push({ o: t.o, dir: t.dir, side: t.side, pert: new THREE.Vector3(), speed: t.vmax, size: t.r0 * (t.fx > 1 ? 0.7 : 0.6), curl: t.curl, phase: t.phase, k: t.k, tip: 1 })
      const nb = mobile ? 6 : 12
      for (let i = 0; i < nb; i++) {
        const u = Math.pow(R(0.35, 1), 0.6)
        drops.push({
          o: t.o, dir: t.dir, side: t.side, pert: randUnit().multiplyScalar(R(0.06, 0.5)), speed: spd(u),
          size: t.r0 * Math.pow(R(0.2, 1), 1.6) * 0.6, curl: t.curl, phase: t.phase, k: t.k, tip: 0,
        })
      }
    }
    const spray = mobile ? 300 : 820
    for (let i = 0; i < spray; i++) {
      const k = Math.floor(rand() * 8)
      const p = this.poolInfo[k]
      const a = rand() * Math.PI * 2
      const rr = Math.sqrt(rand()) * p.r
      const ox = p.x + Math.cos(a) * rr, oz = p.z + Math.sin(a) * rr
      const o = new THREE.Vector3(ox, coneY(Math.hypot(ox, oz)) + 0.02, oz)
      const out = new THREE.Vector3(ox, 0, oz).normalize()
      const crown = rand() < 0.25
      const h = crown ? R(0.8, 1.7) : R(0.05, 0.9)
      const hz = randUnit().setY(0).normalize().multiplyScalar(0.5).add(out).normalize()
      const dir = new THREE.Vector3(0, 1, 0).addScaledVector(hz, h).normalize()
      const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), hz).normalize()
      const big = rand() < 0.06
      drops.push({
        o, dir, side, pert: new THREE.Vector3(),
        speed: crown ? R(1.8, 3.4) : R(2.6, 6.6),
        size: big ? R(0.026, 0.042) : 0.005 + 0.018 * Math.pow(rand(), 2.2),
        curl: R(0, 0.2), phase: R(0, 6.28), k, tip: 0,
      })
    }
    const dGeo = new THREE.IcosahedronGeometry(1, mobile ? 1 : 2)
    {
      const n = drops.length
      const f = (w: number) => new Float32Array(n * w)
      const aO = f(3), aDir = f(3), aSide = f(3), aPert = f(3), aD = f(4), aD2 = f(2)
      drops.forEach((d, i) => {
        aO.set([d.o.x, d.o.y, d.o.z], i * 3)
        aDir.set([d.dir.x, d.dir.y, d.dir.z], i * 3)
        aSide.set([d.side.x, d.side.y, d.side.z], i * 3)
        aPert.set([d.pert.x, d.pert.y, d.pert.z], i * 3)
        aD.set([d.speed, d.size, d.curl, d.phase], i * 4)
        aD2.set([d.k, d.tip], i * 2)
      })
      const ig = new THREE.InstancedBufferGeometry()
      ig.index = dGeo.index
      ig.setAttribute('position', dGeo.attributes.position)
      ig.setAttribute('normal', dGeo.attributes.normal)
      ig.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(aO, 3))
      ig.setAttribute('aDir', new THREE.InstancedBufferAttribute(aDir, 3))
      ig.setAttribute('aSide', new THREE.InstancedBufferAttribute(aSide, 3))
      ig.setAttribute('aPert', new THREE.InstancedBufferAttribute(aPert, 3))
      ig.setAttribute('aD', new THREE.InstancedBufferAttribute(aD, 4))
      ig.setAttribute('aD2', new THREE.InstancedBufferAttribute(aD2, 2))
      ig.instanceCount = n
      const dMat = makeMat()
      dMat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, this.uniforms)
        patchVertex(shader, DROP_VERT_HEAD, DROP_VERT_BODY)
        patchFragment(shader)
      }
      dMat.customProgramCacheKey = () => 'cyma-drop'
      this.drops = new THREE.InstancedMesh(ig, dMat, n)
      this.drops.frustumCulled = false
    }
    this.group.add(this.tendrils, this.drops)
  }

  get dropCount() {
    return (this.drops.geometry as THREE.InstancedBufferGeometry).instanceCount
  }

  setPalette(colors: string[], glow: number) {
    colors.forEach((c, i) => {
      this.uniforms.uPalette.value[i].set(c)
      this.poolMats[i].color.set(c)
      this.poolMats[i].emissive.set(c).multiplyScalar(glow)
    })
    this.uniforms.uGlow.value = glow
  }

  /** Paint time, overall visibility, pool visibility, and idle ripple. */
  update(t: number, fade: number, poolFade: number, tremble: number, clock: number) {
    this.uniforms.uTime.value = t
    this.uniforms.uFade.value = fade
    const vis = t > 0.0001 || fade > 0.001
    this.tendrils.visible = vis && t > 0.0001
    this.drops.visible = vis && t > 0.0001
    this.pools.forEach((m, k) => {
      const p = this.poolInfo[k]
      const tl = Math.max(0, t - k * STAGGER)
      // Pools empty as the paint leaves, leaving a thin residual film.
      const left = 1 - 0.72 * THREE.MathUtils.smoothstep(tl, 0, 0.2)
      const ripple = 1 + 0.02 * Math.sin(clock * 1.7 + k * 1.3) + tremble * 0.22 * Math.sin(clock * 38 + k)
      const s = poolFade * left
      m.visible = s > 0.002
      m.scale.set(p.r * (0.6 + 0.4 * s), 0.034 * s * ripple, p.r * 1.08 * (0.6 + 0.4 * s))
    })
  }
}
