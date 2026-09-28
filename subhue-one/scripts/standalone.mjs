// Builds the single-file versions of the site:
//   dist-standalone/subhue-widget.html      paste into ONE HTML widget (e.g. Elementor)
//   dist-standalone/subhue-one-standalone.html   a complete page: open, upload or host anywhere
// Everything (script, styles, fonts, key stills) is inlined. All CSS is scoped
// to #subhue-root so a surrounding theme can't restyle the demo and the demo
// can't leak into the theme.
// Usage: npm run build:standalone
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'dist-standalone'
const SCOPE = '#subhue-root'
// Classes the app toggles on <html>; selectors that start with them keep them outside the scope.
const HTML_STATE = ['reduced', 'no-webgl', 'is-ready', 'modal-open', 'lenis']
// Stills embedded in the file. Other chapters fall back to the nearest one (src/lib/posters.ts).
const EMBED = ['hero', 'drop', 'engineering', 'finish-obsidian', 'closing']

execSync(`npx vite build --outDir ${OUT} --emptyOutDir`, { stdio: 'inherit', env: { ...process.env, SUBHUE_STANDALONE: '1' } })

const assets = path.join(OUT, 'assets')
const pick = (ext) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((f) => f.endsWith(ext))), 'utf8')
const js = pick('.js')
const css = pick('.css')

// ---------------------------------------------------------------- CSS scoping
function splitTopLevel(list) {
  const parts = []
  let depth = 0, cur = ''
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) { parts.push(cur); cur = '' } else cur += ch
  }
  parts.push(cur)
  return parts.map((s) => s.trim()).filter(Boolean)
}

function scopeSelector(sel) {
  if (sel.startsWith(':root')) return SCOPE + sel.slice(5)
  if (sel === 'body') return SCOPE
  // Lenis' own rules and bare <html> state rules stay global.
  if (/^\.lenis/.test(sel) || /(^|\s)body(\s|$)/.test(sel)) return sel
  const first = sel.split(/(?=[\s>+~])/)[0]
  const firstIsHtml = /^html(\.|$|\[)/.test(first) || HTML_STATE.some((c) => new RegExp(`^\\.${c}(?![\\w-])`).test(first))
  if (firstIsHtml) {
    const rest = sel.slice(first.length)
    return rest.trim() ? `${first} ${SCOPE} ${rest.trim()}` : sel
  }
  return `${SCOPE} ${sel}`
}

function scopeCss(src) {
  let i = 0
  const readString = () => {
    const q = src[i]
    let s = q
    i++
    while (i < src.length && src[i] !== q) { if (src[i] === '\\') { s += src[i++] } s += src[i++] }
    s += src[i++] ?? ''
    return s
  }
  const readRaw = () => { // contents up to the matching '}' (consumed)
    let depth = 1, s = ''
    while (i < src.length) {
      const ch = src[i]
      if (ch === '"' || ch === "'") { s += readString(); continue }
      if (ch === '{') depth++
      if (ch === '}' && --depth === 0) { i++; return s }
      s += ch
      i++
    }
    return s
  }
  const block = (top) => {
    let out = ''
    while (i < src.length) {
      if (src[i] === '}') { i++; if (!top) return out; continue }
      let prelude = '', depth = 0
      while (i < src.length) {
        const ch = src[i]
        if (ch === '"' || ch === "'") { prelude += readString(); continue }
        if (ch === '(') depth++
        if (ch === ')') depth--
        if ((ch === '{' || ch === ';' || ch === '}') && depth === 0) break
        prelude += ch
        i++
      }
      prelude = prelude.trim()
      if (src[i] === ';') { i++; if (prelude) out += prelude + ';'; continue }
      if (src[i] === '}') continue
      i++ // '{'
      if (prelude.startsWith('@')) {
        const name = prelude.slice(1).split(/[\s(]/)[0]
        out += ['media', 'supports', 'layer', 'container'].includes(name)
          ? `${prelude}{${block(false)}}`
          : `${prelude}{${readRaw()}}` // @font-face, @keyframes, @property: unchanged
      } else {
        out += `${splitTopLevel(prelude).map(scopeSelector).join(',')}{${readRaw()}}`
      }
    }
    return out
  }
  return block(true)
}

// Page builders style bare elements (e.g. ".elementor-kit-7 h2 { color }").
// Inherited text properties would leak in, so reset them inside the scope.
// :where() keeps this at ID-only specificity, below every rule of the demo's own.
const reset = `${SCOPE} :where(h1,h2,h3,h4,h5,h6,p,a,span,strong,b,i,em,small,li,dt,dd,label,legend,button,input,textarea,select){color:inherit;font-family:inherit;font-size:inherit;letter-spacing:inherit;text-transform:inherit;line-height:inherit;font-style:inherit;text-shadow:none}`
const scoped = reset + scopeCss(css)

// Host-page adjustments: run full-bleed inside a page builder's containers,
// keep rem-based type at its intended size, and let sticky chapters stick.
const host = [
  'html{font-size:16px!important;background:#040405}',
  'body{margin:0!important;background:#040405!important;overflow:visible!important}',
  `:is(.elementor,.elementor-section,.elementor-container,.elementor-column,.elementor-widget-wrap,.elementor-widget,.elementor-widget-container,.elementor-element,.e-con,.e-con-inner,.entry-content,.site-main,.site-content,main,article):has(${SCOPE}){max-width:none!important;width:100%!important;padding:0!important;margin:0!important;overflow:visible!important;transform:none!important;filter:none!important;contain:none!important}`,
].join('\n')

// ---------------------------------------------------------------- stills
const posters = {}
for (const name of EMBED) for (const v of ['d', 'm']) {
  const file = path.join('public', 'posters', `${name}-${v}.webp`)
  posters[`${name}-${v}`] = `data:image/webp;base64,${fs.readFileSync(file).toString('base64')}`
}

// ---------------------------------------------------------------- assemble
const safeJs = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')
const widget = `<!-- SUBHUE One: complete demo in one block. Paste into a single HTML widget on a blank page. -->
<style>
${host}
</style>
<style>
${scoped}
</style>
<div id="subhue-root"></div>
<script>window.__SUBHUE_POSTERS=${JSON.stringify(posters)};</script>
<script>
${safeJs}
</script>
`

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>SUBHUE One</title>
<meta name="description" content="SUBHUE One is a fictional sculptural wireless speaker. Scroll to watch a bass hit launch eight colours of paint from its woofer.">
<meta name="theme-color" content="#040405">
<meta property="og:title" content="SUBHUE One: See the bass">
<meta property="og:description" content="Sound takes shape. A cinematic concept launch for a sculptural wireless speaker.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23040405'/%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23f3f1ee' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='3.2' fill='%23ff1f8f'/%3E%3C/svg%3E">
</head>
<body>
${widget}</body>
</html>
`

fs.rmSync(assets, { recursive: true, force: true })
fs.rmSync(path.join(OUT, 'index.html'), { force: true })
fs.rmSync(path.join(OUT, 'posters'), { recursive: true, force: true })
fs.writeFileSync(path.join(OUT, 'subhue-widget.html'), widget)
fs.writeFileSync(path.join(OUT, 'subhue-one-standalone.html'), standalone)
const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
console.log(`subhue-widget.html ${kb('subhue-widget.html')} KB, subhue-one-standalone.html ${kb('subhue-one-standalone.html')} KB`)
