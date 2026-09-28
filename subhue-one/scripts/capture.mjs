// Renders poster + fallback stills from the live scene (?capture mode).
// Usage: node scripts/capture.mjs [--url http://127.0.0.1:5173]
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const i = process.argv.indexOf('--url')
const base = i > -1 ? process.argv[i + 1] : 'http://127.0.0.1:5173'
const out = 'public/posters'
fs.mkdirSync(out, { recursive: true })

const palettes = ['original', 'neon', 'sunset', 'ocean', 'mono']
const finishes = ['obsidian', 'titanium', 'sand']
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null
let jobs = [
  { name: 'hero', id: 'hero', p: 0 },
  { name: 'drop', id: 'drop', p: 1 },
  ...palettes.map((pal) => ({ name: `frozen-${pal}`, id: 'frozen', p: 0.36, palette: pal })),
  { name: 'inside', id: 'inside', p: 0.3 },
  { name: 'engineering', id: 'engineering', p: 1 },
  ...finishes.map((f) => ({ name: `finish-${f}`, id: 'finishes', p: 0, finish: f })),
  { name: 'closing', id: 'closing', p: 0 },
]
if (only) jobs = jobs.filter((j) => only.includes(j.name))
const sizes = [
  { suffix: 'd', w: 1600, h: 900, mobile: 0 },
  { suffix: 'm', w: 780, h: 1688, mobile: 1 },
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

async function shot(job, size, type = 'image/webp', q = 0.8, file) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h } })
  const qs = new URLSearchParams({ capture: job.id, p: String(job.p), mobile: String(size.mobile) })
  if (job.palette) qs.set('palette', job.palette)
  if (job.finish) qs.set('finish', job.finish)
  await page.goto(`${base}/?${qs}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__subhueReady === true, null, { timeout: 120000 })
  const data = await page.evaluate(([t, qq]) => document.querySelector('canvas').toDataURL(t, qq), [type, q])
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'))
  await page.close()
  console.log(file, Math.round(fs.statSync(file).size / 1024) + 'KB')
}

for (const job of jobs) for (const size of sizes) await shot(job, size, 'image/webp', job.name === 'hero' ? 0.82 : 0.78, `${out}/${job.name}-${size.suffix}.webp`)
if (!only) await shot({ id: 'drop', p: 1 }, { w: 1200, h: 630, mobile: 0 }, 'image/jpeg', 0.86, `${out}/og.jpg`)
await browser.close()
