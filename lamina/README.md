# LAMINA Croissant Pro: Our most layered croissant ever (concept launch site)

A cinematic, scroll-driven launch page for **Croissant Pro** from **LAMINA**, a fictional artisan bakery that launches a croissant the way a tech giant launches a flagship phone. Everything you see is a real-time 3D croissant built in code: it spins, snaps in half, separates into seven cross-sections, is flown through, baked from raw dough to golden, seen through an X-ray and thermal lens, spun by hand, and lined up with the rest of the range.

LAMINA is not a real bakery. Specs and prices are labelled as concept values, and the order-ahead card is an honest demo: reserving sends nothing anywhere and says so.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then writes dist/
npm run preview    # serves dist/
```

`dist/` is fully static with relative paths, so it can be hosted from any folder (for example bunny.net storage). It is built as one classic script with no `crossorigin` attributes, so `index.html` also runs when opened straight from disk (`file://`).

## Single-file versions (HTML widget / one page)

```bash
npm run build:standalone
```

writes two files to `dist-standalone/`, each about 1.4 MB with everything inside (script, 3D engine, styles, fonts and key stills):

- `lamina-widget.html`: paste the whole file into one HTML widget (for example Elementor). Use the **Elementor Canvas** layout so the theme's header and footer don't sit over the demo.
- `lamina-croissant-pro.html`: a complete page to open, upload or host anywhere.

All CSS is scoped to `#lamina-root`, with inherited text styles reset inside it, so a host theme can't restyle the demo.

## The chapters

| # | Chapter | What happens |
| --- | --- | --- |
| 01 | Spin | Small under a huge gold **Croissant Pro**, it rises to fill the stage through one full 360° turn, glides left for **81 layers.** and right for **27 sheets.** |
| 02 | Crunch | It snaps at the belly; 340 flakes burst and hang in the air. A dB meter races to 94, a counter shows flakes airborne, and scrolling back up un-crunches it |
| 03 | Lamination | Seven slices step apart like a CT scan while a scan line sweeps across and the layer counter runs 0 → 81, over a spec strip |
| 04 | Crumb | The camera dives into the belly and flies through a ray-marched honeycomb crumb, with glass cards |
| 05 | Bake | Raw dough on a stone deck turns golden and rises; live timer (00:00 → 18:00), deck and core temperature, rise and crust colour name |
| 06 | Lens | X-ray and thermal lens under the cursor. The readout samples the real pixel under the crosshair (temperature or density and layers in path). Touch and arrow keys work too |
| 07 | Viewer | Drag to spin with inertia (arrow keys and buttons too) |
| 08 | Lineup | Croissant Pro steps into the first of four slots beside pain au chocolat, kouign-amann and almond croissant, then a comparison table |
| 09 | Order ahead | Quantity steppers, pickup slots from the real batch schedule, a live next-batch countdown, and a reserve button that confirms nothing was sent |

## How it's built

| Layer | Choice |
| --- | --- |
| App | React 19 + TypeScript + Vite |
| Scroll | Lenis smooth scroll. One `gsap.ticker` callback reads the scroll position, blends camera "shots" (`src/three/director.ts`) and writes readouts straight to the DOM |
| 3D | Three.js on one fixed canvas. The croissant is a swept crescent with chevron wrap bands, a laminated honeycomb cut face and a crust shader driven by a bake uniform (`src/three/`) |
| Crumb | A ray-marched Worley-cell tunnel rendered at half resolution and composited over the scene |
| Lens | The engine renders the settled view offscreen as X-ray shells and grey-scale heat; the lens draws those plates in a circle and reads their pixels |
| Sound | Off by default. The crunch (layered noise bursts) and oven hum are synthesised with Web Audio; no audio files |
| Type | Inter Tight for display and text, Instrument Serif italic for accents, JetBrains Mono for readouts (self-hosted Latin subsets) |

Reduced motion is honoured (each chapter becomes one still, with an opt-in to full motion), and if WebGL is unavailable the page shows stills and says why.

## Asset note

The original brief asked for Higgsfield stills and Kling image-to-video films sliced into frame sequences. Those tools weren't available in the build environment, so every visual is procedural real-time 3D instead. The chapter structure is unchanged, so rendered films could replace any chapter's scene later.

## Checks

```bash
node scripts/shoot.mjs --url http://127.0.0.1:5173 --out lab/desktop            # every chapter at start / middle / end
node scripts/shoot.mjs --url http://127.0.0.1:5173 --out lab/mobile --mobile
node scripts/interact.mjs --url http://127.0.0.1:5173                          # 23 interaction checks
node scripts/capture.mjs --url http://127.0.0.1:5173                           # regenerate posters from the live scene
```
