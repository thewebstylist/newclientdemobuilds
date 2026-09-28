// Interaction checks: keyboard order, palette + finish selectors, reservation
// validation / confirmation / Escape / focus restore, sound toggle, splats.
// Usage: node scripts/interact.mjs [--url http://127.0.0.1:5173] [--out lab/interact]
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d }
const url = arg('url', 'http://127.0.0.1:5173')
const out = arg('out', 'lab/interact')
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
const results = []
const check = (name, ok, detail = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

// Keyboard order from the top of the page.
const order = []
for (let i = 0; i < 9; i++) {
  await page.keyboard.press('Tab')
  order.push(await page.evaluate(() => {
    const a = document.activeElement
    const outline = getComputedStyle(a).outlineStyle
    return `${a.tagName.toLowerCase()}:${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 24)}[${outline}]`
  }))
}
check('keyboard order', order[0].startsWith('a:Skip'), order.join(' | '))
check('focus ring visible', order.every((o) => !o.endsWith('[none]')))
await page.screenshot({ path: `${out}/focus.png` })

const scrollToId = (id, frac = 0.5) => page.evaluate(([id, frac]) => {
  const el = document.getElementById(id)
  const r = el.getBoundingClientRect()
  const y = r.top + scrollY + Math.max(0, (r.height - innerHeight) * frac)
  window.__cyma.scrollTo(y)
}, [id, frac])

// Palette.
await scrollToId('frozen', 0.4)
await page.waitForTimeout(800)
for (const pal of ['Neon', 'Mono', 'Sunset']) {
  await page.locator(`input[name=palette][value=${pal.toLowerCase()}]`).click()
  await page.waitForTimeout(900)
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())
  const checked = await page.evaluate(() => document.querySelector('input[name=palette]:checked').value)
  check(`palette ${pal}`, checked === pal.toLowerCase(), `accent ${accent}`)
  await page.screenshot({ path: `${out}/palette-${pal.toLowerCase()}.png` })
}
await page.locator('input[name=palette][value=original]').click()

// Finish.
await scrollToId('finishes')
await page.waitForTimeout(1500)
for (const f of ['Titanium', 'Sand']) {
  await page.locator(`.swatches input[value=${f.toLowerCase()}]`).click()
  await page.waitForTimeout(1200)
  const label = await page.locator('.finish-current__name').textContent()
  check(`finish ${f}`, label === f, `label "${label}"`)
  await page.screenshot({ path: `${out}/finish-${f.toLowerCase()}.png` })
}

// Reservation modal.
const reserveBtn = page.getByRole('button', { name: 'Reserve CYMA One' })
await reserveBtn.click()
await page.waitForTimeout(700)
check('dialog opens', await page.locator('dialog.reserve[open]').count() === 1)
check('focus moves into dialog', await page.evaluate(() => document.activeElement?.id?.includes('name') ?? false))
await page.getByRole('button', { name: 'Complete demo reservation' }).click()
await page.waitForTimeout(300)
const errs = await page.locator('.field__error').allTextContents()
check('empty submit shows errors', errs.length === 2, errs.join(' / '))
check('first invalid focused', await page.evaluate(() => document.activeElement?.getAttribute('aria-invalid') === 'true'))
await page.screenshot({ path: `${out}/reserve-errors.png` })
await page.getByLabel('Name').fill('Ada Lovelace')
await page.getByLabel('Email').fill('ada@example')
await page.getByRole('button', { name: 'Complete demo reservation' }).click()
await page.waitForTimeout(300)
const errs2 = await page.locator('.field__error').allTextContents()
check('invalid email caught', errs2.length === 1 && /email/i.test(errs2[0]), errs2.join(' / '))
await page.getByLabel('Email').fill('ada@example.com')
await page.getByRole('button', { name: 'Complete demo reservation' }).click()
await page.waitForTimeout(500)
const done = await page.locator('.reserve__done').textContent()
check('demo confirmation', /Nothing was sent/.test(done) && /Sand/.test(done), done.slice(0, 80))
await page.screenshot({ path: `${out}/reserve-done.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
check('Escape closes dialog', await page.locator('dialog.reserve[open]').count() === 0)
check('focus restored to Reserve', await page.evaluate(() => document.activeElement?.textContent?.includes('Reserve CYMA One') ?? false))

// Sound toggle (off by default, on only after a click).
const sound = page.locator('.tool--sound')
check('sound off by default', (await sound.getAttribute('aria-pressed')) === 'false')
await sound.click()
await page.waitForTimeout(400)
check('sound toggles on', (await sound.getAttribute('aria-pressed')) === 'true')
await sound.click()
await page.waitForTimeout(200)
check('sound toggles off', (await sound.getAttribute('aria-pressed')) === 'false')

// Splat on a background click, none on a button.
await scrollToId('specs', 0)
await page.waitForTimeout(600)
// Count splats as they are created: under software rendering a single slow
// frame can finish the fade-out before a presence check runs.
await page.evaluate(() => {
  window.__splats = 0
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList?.contains('splat')) window.__splats++ })))
    .observe(document.querySelector('.splats'), { childList: true })
})
await page.mouse.click(700, 160)
await page.waitForTimeout(250)
const splats = await page.evaluate(() => window.__splats)
check('splat on background click', splats >= 1, `created ${splats}`)
await page.getByRole('button', { name: 'Sound' }).click()
await page.getByRole('button', { name: 'Sound' }).click()
const onButton = await page.evaluate(() => window.__splats)
check('no splat on a control', onButton === splats, `created ${onButton - splats}`)
await page.screenshot({ path: `${out}/splat.png` })

// Nav smooth scroll.
await page.getByRole('link', { name: 'Engineering' }).first().click()
await page.waitForTimeout(6000)
const y = await page.evaluate(() => ({ y: scrollY, top: document.getElementById('engineering').getBoundingClientRect().top }))
check('nav scrolls to Engineering', Math.abs(y.top) < 40, `top ${Math.round(y.top)}`)

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' / '))
fs.writeFileSync(`${out}/results.txt`, results.join('\n'))
console.log(results.join('\n'))
await browser.close()
