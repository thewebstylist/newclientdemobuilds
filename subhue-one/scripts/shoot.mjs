// Visual verification: walks every chapter at start / middle / end and saves
// screenshots plus console errors. Usage:
//   node scripts/shoot.mjs --url http://127.0.0.1:5173 --out lab/desktop [--w 1440 --h 900] [--reduced] [--mobile]
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > -1 ? process.argv[i + 1] : d
}
const flag = (k) => process.argv.includes(`--${k}`)
const url = arg('url', 'http://127.0.0.1:5173')
const out = arg('out', 'lab/shots')
const mobile = flag('mobile')
const W = Number(arg('w', mobile ? 390 : 1440))
const H = Number(arg('h', mobile ? 844 : 900))
const only = arg('only', '')
fs.mkdirSync(out, { recursive: true })

const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({
  executablePath: exe,
  args: flag('nogl') ? ['--disable-3d-apis', '--disable-webgl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  isMobile: mobile,
  hasTouch: mobile,
  reducedMotion: flag('reduced') ? 'reduce' : 'no-preference',
})
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`) })
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()}`))
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`) })

await page.goto(url, { waitUntil: 'networkidle' })
if (flag('inset')) {
  // Simulate the Claude iPhone app: a 100px top bar over the page and the
  // home indicator, delivered as safe-area insets (as the artifact viewer does).
  await page.addStyleTag({ content: `:root{--safe-top:100px;--safe-bottom:34px;padding-top:100px;padding-bottom:34px}
    body::after{content:'';position:fixed;left:0;right:0;top:0;height:100px;background:rgba(40,40,44,.55);z-index:999;pointer-events:none}` })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
}
await page.waitForTimeout(2500)

const chapters = await page.evaluate(() => {
  const ids = ['hero', 'drop', 'frozen', 'inside', 'engineering', 'specs', 'finishes', 'closing']
  return ids.map((id) => {
    const el = document.getElementById(id)
    const r = el.getBoundingClientRect()
    return { id, top: r.top + scrollY, h: r.height, sticky: el.hasAttribute('data-sticky') }
  })
})
const vh = H
const stops = []
for (const c of chapters) {
  if (only && !only.split(',').includes(c.id)) continue
  if (c.sticky && !flag('reduced')) {
    for (const [n, p] of [['a', 0.02], ['b', 0.5], ['c', 0.98]]) stops.push({ name: `${c.id}-${n}`, y: c.top + (c.h - vh) * p })
  } else {
    stops.push({ name: c.id, y: c.id === 'hero' ? 0 : c.top + Math.max(0, (c.h - vh) / 2) })
  }
}
if (!only) stops.push({ name: 'footer', y: 1e7 })
const t0 = Date.now()
for (const s of stops) {
  await page.evaluate((y) => (window.__subhue ? window.__subhue.scrollTo(Math.min(y, document.documentElement.scrollHeight)) : window.scrollTo(0, y)), s.y)
  await page.waitForTimeout(1300)
  await page.screenshot({ path: path.join(out, `${s.name}.png`) })
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
fs.writeFileSync(path.join(out, 'report.txt'), [`overflowX=${overflow}`, `stops=${stops.length}`, `time=${Date.now() - t0}ms`, ...logs].join('\n'))
console.log(`overflowX=${overflow}`)
console.log(logs.slice(0, 30).join('\n') || 'no console errors')
await browser.close()
