// Interaction checks: keyboard order, sound toggle + synthesis, crunch readouts,
// lens (both modes, pixel readout under the cursor, keyboard), drag-to-spin
// with inertia, order steppers / validation / reserve confirmation, un-crunch.
// Usage: node scripts/interact.mjs [--url http://127.0.0.1:5173] [--out lab/interact]
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d }
const url = arg('url', 'http://127.0.0.1:5173')
const out = arg('out', 'lab/interact')
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
const results = []
const check = (name, ok, detail = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }
const text = (sel) => page.locator(sel).first().textContent()

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

// Keyboard order from the top of the page.
const order = []
for (let i = 0; i < 9; i++) {
  await page.keyboard.press('Tab')
  order.push(await page.evaluate(() => {
    const a = document.activeElement
    const outline = getComputedStyle(a).outlineStyle
    return `${a.tagName.toLowerCase()}:${(a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 22)}[${outline}]`
  }))
}
check('keyboard order', order[0].startsWith('a:Skip'), order.join(' | '))
check('focus ring visible', order.every((o) => !o.endsWith('[none]')))

const range = (id) => page.evaluate((id) => window.__lamina.ranges().find((r) => r.id === id), id)
const goto = async (id, p, wait = 1800) => {
  const r = await range(id)
  await page.evaluate((y) => window.__lamina.scrollTo(y), r.a + (r.b - r.a) * p)
  await page.waitForTimeout(wait)
}

// Sound: off by default, toggles on, crunch synthesises.
const snd = page.locator('.tool--sound')
check('sound off by default', (await snd.getAttribute('aria-pressed')) === 'false')
await snd.click()
await page.waitForTimeout(300)
check('sound toggles on', (await snd.getAttribute('aria-pressed')) === 'true')
const ctxState = await page.evaluate(async () => {
  const m = await import('/src/lib/audio.ts')
  return m.sound.enabled
})
check('audio engine enabled', ctxState === true)

// Crunch readouts.
await goto('crunch', 0.05)
const db0 = await text('[data-readout="db"]')
await goto('crunch', 0.6)
const db1 = await text('[data-readout="db"]')
const fl = Number(await text('[data-readout="flakes"]'))
check('dB meter counts to 94', db0 === '00' && db1 === '94', `${db0} -> ${db1}`)
check('flakes airborne counter', fl > 100, `${fl}`)
await page.screenshot({ path: `${out}/crunch.png` })
await goto('crunch', 0.02)
const flBack = Number(await text('[data-readout="flakes"]'))
check('un-crunch on scroll back', flBack === 0, `${flBack}`)
await snd.click()

// Lamination counter.
await goto('lamination', 0.9)
check('layer counter reaches 81', (await text('[data-readout="layers"]')) === '81')

// Bake readouts.
await goto('bake', 1)
const bt = await text('[data-readout="bake-time"]'), bc = await text('[data-readout="bake-colour"]')
check('bake timer and colour', bt === '18:00' && bc === 'Deep amber', `${bt} ${bc}`)
await goto('bake', 0.0)
const b0 = await text('[data-readout="bake-colour"]')
check('bake starts raw', b0 === 'Raw dough', `${b0} ${await text('[data-readout="bake-time"]')} ${JSON.stringify(await range('bake'))} y=${await page.evaluate(() => scrollY)}`)

// Lens.
await goto('lens', 0.5, 2500)
await page.waitForFunction(() => document.querySelector('.lens__stage.is-ready'), null, { timeout: 30000 })
const box = await page.evaluate(() => { const c = document.querySelector('.scene__canvas').getBoundingClientRect(); return { w: c.width, h: c.height } })
await page.mouse.move(box.w * 0.5, box.h * 0.52)
await page.waitForTimeout(400)
const tOn = await text('.lens__value b'), dOn = await text('.lens__detail')
await page.mouse.move(box.w * 0.62, box.h * 0.14)
await page.waitForTimeout(400)
const tOff = await text('.lens__value b'), dOff = await text('.lens__detail')
check('thermal reads croissant vs air', Number(tOn) > 40 && dOff === 'Room air', `on ${tOn} ${dOn} / off ${tOff} ${dOff}`)
await page.mouse.move(box.w * 0.5, box.h * 0.52)
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/lens-thermal.png` })
await page.getByRole('button', { name: 'X-ray' }).click()
await page.mouse.move(box.w * 0.52, box.h * 0.5)
await page.waitForTimeout(400)
const xv = await text('.lens__value b'), xd = await text('.lens__detail')
check('x-ray reads layers', /layers in path/.test(xd), `${xv} ${xd}`)
await page.screenshot({ path: `${out}/lens-xray.png` })
await page.focus('.lens__stage')
await page.keyboard.press('ArrowLeft')
await page.keyboard.press('ArrowLeft')
await page.waitForTimeout(400)
check('lens keyboard live region', ((await text('.lens__panel [aria-live]')) || '').length > 3, await text('.lens__panel [aria-live]'))

// Drag to spin.
await goto('viewer', 0.5, 1200)
const a0 = await text('.viewer__angle b')
await page.mouse.move(700, 450)
await page.mouse.down()
for (let i = 1; i <= 10; i++) { await page.mouse.move(700 + i * 22, 450); await page.waitForTimeout(16) }
await page.mouse.up()
await page.waitForTimeout(80)
const a1 = await text('.viewer__angle b')
await page.waitForTimeout(900)
const a2 = await text('.viewer__angle b')
check('drag spins', a0 !== a1, `${a0} -> ${a1} -> ${a2} (inertia)`)
await page.screenshot({ path: `${out}/viewer.png` })
await page.getByRole('button', { name: 'Spin right' }).click()
await page.waitForTimeout(700)
check('spin button nudges', (await text('.viewer__angle b')) !== a2)

// Order card.
await page.evaluate(() => document.getElementById('order').scrollIntoView())
await page.evaluate(() => window.__lamina.scrollTo(document.getElementById('order').getBoundingClientRect().top + scrollY))
await page.waitForTimeout(1200)
const cd = await text('[data-countdown]')
await page.waitForTimeout(1100)
const cd2 = await text('[data-countdown]')
check('next-batch countdown ticks', cd !== cd2, `${cd} -> ${cd2}`)
await page.getByRole('button', { name: 'One fewer Croissant Pro' }).click()
await page.getByRole('button', { name: 'One fewer Croissant Pro' }).click()
await page.getByRole('button', { name: 'Reserve' }).click()
check('empty order is blocked', ((await page.locator('.order__error').textContent()) || '').includes('at least one'))
await page.getByRole('button', { name: 'One more Kouign-Amann' }).click()
await page.getByRole('button', { name: 'One more Croissant Pro' }).click()
await page.locator('.slot').nth(2).click()
check('total updates', (await text('.order__total b')) === '$13.75', await text('.order__total b'))
await page.getByRole('button', { name: 'Reserve' }).click()
await page.waitForTimeout(300)
const notice = await text('.order__notice')
const focused = await page.evaluate(() => document.activeElement?.id)
check('reserve says nothing was sent', /Nothing was sent/.test(notice), notice)
check('focus moves to confirmation', focused === 'order-title')
await page.screenshot({ path: `${out}/order-done.png` })
await page.getByRole('button', { name: 'Change order' }).click()
check('change order returns to form', await page.getByRole('button', { name: 'Reserve' }).isVisible())

check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '))
fs.writeFileSync(`${out}/results.txt`, results.join('\n'))
console.log(results.join('\n'))
await browser.close()
