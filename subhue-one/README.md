# SUBHUE One: See the bass (concept launch site)

A cinematic, scroll-driven product page for **SUBHUE One**, a fictional sculptural wireless speaker. The name joins *sub* (sub-bass) and *hue* (colour): bass you can see. A bass hit launches eight pools of paint from the woofer into a towering fountain; time freezes at the peak; the camera orbits and travels inside the colour; then the speaker separates into its nine machined parts.

SUBHUE One is not a real product. Specifications and pricing are labelled as concept values, and the reservation form is an honest demo: nothing is submitted, stored or charged.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then writes dist/
npm run preview    # serves dist/
```

`dist/` is fully static with relative paths, so it can be hosted from any folder. It is built as one classic script (no ES modules, no `crossorigin` attributes), so `index.html` also runs when opened straight from disk (`file://`).

## Single-file versions (HTML widget / one page)

```bash
npm run build:standalone
```

writes two files to `dist-standalone/`, each about 1.5 MB with everything inside (script, 3D engine, styles, fonts and the key stills):

- `subhue-widget.html`: paste the whole file into one HTML widget. Built for a page such as newsite2026.com/subhue made of a single Elementor HTML widget. Use the **Elementor Canvas** page layout so the theme's header and footer don't sit on top of the demo.
- `subhue-one-standalone.html`: a complete page to open, upload or host anywhere.

All CSS is scoped to `#subhue-root`, and inherited text styles are reset inside it, so a site's theme (for example Elementor kit colours on headings) can't restyle the demo and the demo doesn't restyle the site. A few host rules make the page builder's containers full-bleed so the pinned chapters can stick. Chapter fallback stills for browsers without 3D are reduced to five embedded images; other chapters use the nearest one.

## How it's built

| Layer | Choice |
| --- | --- |
| App | React 19 + TypeScript + Vite |
| Scroll | Lenis smooth scrolling. One `gsap.ticker` callback reads the scroll position, blends camera "shots" and writes DOM readouts directly (no React state per frame) |
| 3D | Three.js, one fixed canvas behind the page |
| Motion | GSAP (count-ups, magnetic buttons, splats), CSS custom-property reveals driven by chapter progress `--p` |
| Type | Archivo Variable at 125% width for display, JetBrains Mono for technical labels (self-hosted via Fontsource) |

### The scene (`src/three/`)

- **`Speaker.ts`**: the speaker as nine real parts (phase plug, bezel, woofer diaphragm, voice coil + spider, 360° mid/high array, neodymium motor, amplifier + DSP board, enclosure, isolation base). All surface detail (perforations, engraved wordmark, carbon weave, circuit board) is drawn procedurally. Exploded-view spacing is computed from each part's bounding box.
- **`Paint.ts`**: the eruption. Every parcel of paint follows a closed-form ballistic path (launch speed, drag, gravity, curl), evaluated in the vertex shader from a single time value. Scrubbing forwards and backwards is exact and costs nothing on the CPU. Tendrils thin as they stretch and bead as they thin; bulbs gather at the tips; droplets break away.
- **`director.ts`**: each chapter is a pure function `progress → Shot` (camera, paint time, explode amount, etc.). Between chapters, shots are blended.
- **`Engine.ts`**: renderer, studio lighting built as emissive softboxes baked into an environment map, adaptive resolution, render-on-change, and low-frequency accent sampling from the rendered frame.

### Chapters

1. **Hero**: the loaded speaker in darkness, staggered headline intro.
2. **The drop** (pinned): anticipation tremble, impact with shockwave and rim flash, eruption slowing into the freeze. Frequency readout settles at 32 Hz; colour counter follows each pool's launch.
3. **Frozen** (pinned): 196° orbit with a degree readout and the Original / Neon / Sunset / Ocean / Mono palettes (shader colours + UI accent).
4. **Inside the sound** (pinned): the camera flies in among the columns; readout sweeps 32 Hz → 20 kHz.
5. **Engineering** (pinned): the paint dissolves, the stack separates part by part, pigment bursts in three seams, and a leader line tracks the active part. Concept specifications follow with count-ups.
6. **Finishes**: Obsidian / Titanium / Sand re-materials the live model; reservation modal.
7. **Closing**: top-down view of the woofer with its eight pools, back to top.

### Posters and fallbacks

`public/posters/` holds stills rendered from the live scene by `scripts/capture.mjs` (it drives the `?capture=` mode). They serve as:

- the instant hero poster shown before WebGL is ready;
- full chapter compositions if WebGL is unavailable (including one per palette and per finish, so the selectors still work);
- the social share image (`og.jpg`).

Re-render them after changing the scene: start `npm run dev`, then run `node scripts/capture.mjs`.

## Accessibility and motion

- Semantic sections with one `h1` and an `h2` per chapter; decorative readouts are `aria-hidden` with short text equivalents.
- Visible focus rings in the active palette accent; native radio groups for palette and finish.
- The reservation dialog uses `<dialog>`: focus moves in, Escape closes, focus returns to the button that opened it. Errors are announced, linked with `aria-describedby`, and the first invalid field is focused.
- `prefers-reduced-motion`: no smooth scrolling or pinning, each chapter becomes one strong still with a cut through black, and the cursor trail, magnetic buttons and intro motion are disabled.
- Sound is off by default and only starts from the header toggle. When on, a synthesised 32 Hz pulse plays at the moment of impact.

## Verification scripts

- `node scripts/shoot.mjs --out lab/desktop` (add `--mobile` or `--reduced`) walks every chapter at start, middle and end, saves screenshots and reports console errors and horizontal overflow.
- `node scripts/sheet.mjs lab/desktop 4 420` builds a contact sheet.
