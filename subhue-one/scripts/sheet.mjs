// Contact sheet: node scripts/sheet.mjs <dir> [cols] [thumbWidth]
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
const dir = path.resolve(process.argv[2])
const cols = Number(process.argv[3] || 3)
const tw = Number(process.argv[4] || 480)
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png') && f !== 'sheet.png').sort((a, b) => fs.statSync(path.join(dir, a)).mtimeMs - fs.statSync(path.join(dir, b)).mtimeMs)
const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:6px;padding:6px;font:12px monospace;color:#ccc">${files.map((f) => `<div><img src="data:image/png;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}" style="width:${tw}px;display:block"><div>${f}</div></div>`).join('')}</body>`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: cols * (tw + 6) + 6, height: 400 } })
await p.setContent(html)
await p.screenshot({ path: path.join(dir, 'sheet.png'), fullPage: true })
await b.close()
