import * as THREE from 'three'

// The honeycomb crumb, ray-marched per pixel. Cell walls come from 3D Worley
// noise (F2 - F1); a tube along the camera path is always open, so the fly-
// through never hits a wall. Rendered at reduced resolution and composited
// over the main scene with uMix.

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uZ;
uniform float uMix;
uniform float uTime;
varying vec2 vUv;

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
vec2 worley(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float F1 = 8.0, F2 = 8.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 r = g + hash3(i + g) * vec3(0.8, 0.8, 1.0) - f;
    float d = dot(r, r);
    if (d < F1) { F2 = F1; F1 = d; } else if (d < F2) { F2 = d; }
  }
  return sqrt(vec2(F1, F2));
}
vec2 path(float z) { return vec2(sin(z * 0.31) * 0.55, cos(z * 0.23) * 0.4); }

float map(vec3 p) {
  // Rounded air cells around jittered points, stretched along the roll like
  // laminated honeycomb; they overlap into an open, connected crumb.
  vec3 q = p * vec3(1.7, 1.7, 0.62);
  vec2 w = worley(q);
  float cells = (0.63 - w.x) / 1.7;
  float tunnel = 0.5 - length(p.xy - path(p.z));
  return max(cells, tunnel);
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.01, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}

void main() {
  vec2 uv = (vUv * uRes - 0.5 * uRes) / uRes.y;
  float z = uZ;
  vec3 ro = vec3(path(z), z);
  vec3 ta = vec3(path(z + 1.2), z + 1.2);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(fw * 1.2 + uv.x * rt + uv.y * up);

  float t = 0.02;
  float steps = 0.0;
  for (int i = 0; i < 90; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.001) break;
    t += d * 0.85;
    steps += 1.0;
    if (t > 8.0) break;
  }
  t = min(t, 8.0);
  vec3 p = ro + rd * t;
  vec3 n = normalAt(p);
  // A warm lamp rides with the camera; butter glows through the thin walls.
  vec3 toL = normalize(ro + vec3(0.15, 0.25, 0.3) - p);
  float diff = clamp(dot(n, toL), 0.0, 1.0);
  float wrap = clamp(dot(n, toL) * 0.5 + 0.5, 0.0, 1.0);
  float ao = clamp(1.0 - steps / 90.0, 0.0, 1.0);
  vec3 cream = vec3(1.0, 0.86, 0.58);
  vec3 butter = vec3(1.0, 0.7, 0.3);
  vec3 col = cream * (0.18 + 0.82 * diff) * (0.55 + 0.45 * wrap);
  col = mix(col, butter * wrap, 0.25);
  col += vec3(1.0, 0.92, 0.75) * pow(clamp(dot(reflect(-toL, n), -rd), 0.0, 1.0), 28.0) * 0.55;
  col += butter * pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0) * 0.25;
  col *= 0.35 + 0.65 * ao;
  // Depth fog into warm amber, with the lit end of the tunnel glowing.
  float fog = 1.0 - exp(-t * 0.34);
  vec3 far = vec3(0.42, 0.2, 0.06) + vec3(0.5, 0.28, 0.08) * exp(-4.0 * dot(uv, uv));
  col = mix(col, far, fog);
  col *= 1.0 - 0.5 * dot(uv, uv);
  gl_FragColor = vec4(col, uMix);
}
`

export class Crumb {
  private scene = new THREE.Scene()
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private target: THREE.WebGLRenderTarget
  private blit: THREE.Mesh
  private blitScene = new THREE.Scene()
  uniforms = { uRes: { value: new THREE.Vector2(1, 1) }, uZ: { value: 0 }, uMix: { value: 0 }, uTime: { value: 0 } }
  private scale: number

  constructor(mobile: boolean) {
    this.scale = mobile ? 0.45 : 0.5
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
    })
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat))
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
    this.target.texture.colorSpace = THREE.LinearSRGBColorSpace
    this.blit = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: { tMap: { value: this.target.texture }, uMix: this.uniforms.uMix },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D tMap; uniform float uMix; varying vec2 vUv; void main(){ vec4 c = texture2D(tMap, vUv); gl_FragColor = vec4(c.rgb, uMix); }',
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    )
    this.blitScene.add(this.blit)
  }

  resize(w: number, h: number) {
    const sw = Math.max(2, Math.round(w * this.scale)), sh = Math.max(2, Math.round(h * this.scale))
    this.target.setSize(sw, sh)
    this.uniforms.uRes.value.set(sw, sh)
  }

  /** Renders the tunnel into its target, then blends it over whatever is on screen. */
  render(renderer: THREE.WebGLRenderer, mix: number, z: number) {
    this.uniforms.uMix.value = mix
    this.uniforms.uZ.value = z
    const prevTarget = renderer.getRenderTarget()
    const prevClear = renderer.autoClear
    const prevTone = renderer.toneMapping
    renderer.toneMapping = THREE.NoToneMapping
    renderer.setRenderTarget(this.target)
    renderer.render(this.scene, this.cam)
    renderer.setRenderTarget(prevTarget)
    renderer.autoClear = false
    renderer.render(this.blitScene, this.cam)
    renderer.autoClear = prevClear
    renderer.toneMapping = prevTone
  }
}
