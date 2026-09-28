// Renders poster + fallback stills from the live scene (?capture mode).
// Usage: node scripts/capture.mjs [--url http://127.0.0.1:5173]
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const i = process.argv.indexOf('--url')
const base = i > -1 ? process.argv[i + 1] : 'http://127.0.0.1:5173'
const out = 'public/posters'
fs.mkdirSync(out, { recursive: true })

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null
let jobs = [
  { name: 'hero', id: 'spin', p: 0 },
  { name: 'crunch', id: 'crunch', p: 0.62 },
  { name: 'lamination', id: 'lamination', p: 0.55 },
  { name: 'crumb', id: 'crumb', p: 0.3 },
  { name: 'bake', id: 'bake', p: 1 },
  { name: 'lineup', id: 'lineup', p: 1 },
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
  await page.goto(`${base}/?${qs}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__laminaReady === true, null, { timeout: 120000 })
  const data = await page.evaluate(([t, qq]) => document.querySelector('canvas').toDataURL(t, qq), [type, q])
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'))
  await page.close()
  console.log(file, Math.round(fs.statSync(file).size / 1024) + 'KB')
}

for (const job of jobs) for (const size of sizes) await shot(job, size, 'image/webp', job.name === 'hero' ? 0.82 : 0.78, `${out}/${job.name}-${size.suffix}.webp`)
// posters/og.jpg (the social preview) is a hand-picked hero frame; it is not regenerated here.
await browser.close()
