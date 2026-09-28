Build an extraordinary, fully functional cinematic scroll website for [BRAND NAME], a [PROFESSION / BUSINESS TYPE] offering [PRODUCT OR SERVICE] to [AUDIENCE].
This is [A REAL BUSINESS | A FICTIONAL CONCEPT: label all specs and pricing as concept values].

THE CREATIVE IDEA: [TAGLINE, e.g. "SEE THE BASS."]
[ONE-PARAGRAPH STORY: what the visitor watches happen as they scroll. Example: "A black aluminium speaker sits in darkness with eight pools of paint on its woofer. A bass hit launches the paint into a towering fountain, time freezes at the peak, the camera travels inside the colour, then the speaker separates into its parts."]

The result should feel like [STYLE, e.g. an experimental luxury product launch | a calm editorial monograph | a playful neon arcade | a warm artisanal studio]. Make confident creative decisions and complete the build without asking routine questions.

------------------------------------------------------------------
BRAND KIT
------------------------------------------------------------------
- Wordmark: [BRAND NAME] (product name, if any: [PRODUCT NAME])
- Background: [BACKGROUND, e.g. near-pure black #040405 | warm paper white | deep navy]
- Signature colours (up to 8, the visuals supply most of the colour): [COLOUR 1], [COLOUR 2], [COLOUR 3], [COLOUR 4], [COLOUR 5], [COLOUR 6], [COLOUR 7], [COLOUR 8]
- Visitor palette switcher: [e.g. Original / Neon / Sunset / Ocean / Mono | NONE]
- Display font: [DISPLAY FONT, e.g. Archivo at 125% width, weight 800]
- Body font: [BODY FONT]
- Label / data font: [MONO OR LABEL FONT, e.g. JetBrains Mono]
- Typography feel: [e.g. oversized, extra-wide, uppercase, deliberate line breaks]
- Tone of voice: [3 ADJECTIVES]
- Gradients: [e.g. only on one headline detail | none]
- Avoid: [ANYTHING OFF-BRAND]

------------------------------------------------------------------
HERO SUBJECT AND SIGNATURE EFFECT
------------------------------------------------------------------
- Visual approach: [PROCEDURAL REAL-TIME 3D (default) | MY OWN PHOTOS/FOOTAGE (I will supply them) + the same scroll engine]
- Hero subject: [HERO SUBJECT, e.g. a sculptural speaker | an espresso machine | a timber pavilion | a perfume bottle]
- Built from [NUMBER] plausible parts, top to bottom: [PART LIST | "you decide"]
- Materials and lighting: [e.g. bead-blasted aluminium, polished chamfers, cool rim light, studio softboxes]
- Signature effect: [SIGNATURE EFFECT, e.g. paint erupting from the woofer | espresso pouring in slow motion | a building assembling floor by floor | light refracting into a rainbow]
- Optional finishes / variants the visitor can switch live: [e.g. Obsidian / Titanium / Sand | NONE]

------------------------------------------------------------------
CHAPTERS (scroll-driven; vary the layout and text anchor in each)
------------------------------------------------------------------
01 [HERO NAME]
   Wordmark and nav: [NAV ITEM 1] / [NAV ITEM 2] / [NAV ITEM 3]
   Headline: "[HERO HEADLINE]"   Supporting line: "[SUPPORTING LINE]"
   Small descriptor: "[DESCRIPTOR]"
   Primary action: "[PRIMARY CTA]" (plays a guided scroll through chapter 02)
   Secondary action: "[SECONDARY CTA]" (scrolls to [TARGET CHAPTER])
   Opening frame: [WHAT THE FIRST SCREEN SHOWS]

02 [CHAPTER 2 NAME] (pinned; the signature moment, largest scroll span)
   Headline: "[HEADLINE]"   Copy: "[COPY]"
   Scroll drives: [ANTICIPATION] -> [IMPACT] -> [PEAK]
   Readouts: [e.g. a frequency that settles at 32 Hz and a counter from 0 to 8 | NONE]

03 [CHAPTER 3 NAME] (pinned; held moment, camera orbits)
   Headline: "[HEADLINE]"
   Readout: [e.g. orbit degrees | NONE]   Interactive control: [e.g. the palette switcher | NONE]

04 [CHAPTER 4 NAME] (pinned; the camera travels [INTO | AROUND | THROUGH] the subject)
   Headline: "[HEADLINE]"   Copy: "[COPY]"
   Readout: [e.g. 32 Hz to 20 kHz on a log scale | NONE]

05 [CHAPTER 5 NAME, e.g. Engineering | Process | Ingredients] (pinned; exploded view or step-by-step)
   Headline: "[HEADLINE]"
   Part / step labels with a counter and a leader line to the active part.
   Facts panel (REAL facts only, or clearly labelled concept values): [FACT 1], [FACT 2], [FACT 3], [FACT 4], [FACT 5]

06 [CHAPTER 6 NAME, e.g. Finishes | Packages | Book]
   Headline: "[HEADLINE]"   Price or offer: "[PRICE | NONE]" ([PRICE LABEL, e.g. Concept pricing])
   Working selector: [OPTIONS]
   Action: "[CTA]" opens a [RESERVATION | BOOKING | ENQUIRY] dialog with fields: [FIELDS]
   On submit: [DEMO: validate accessibly, send nothing, show an honest demo confirmation | REAL: send to EMAIL/ENDPOINT]

07 [CLOSING NAME]
   Statement: "[CLOSING STATEMENT]"   Back to top control
   Footer: "[FOOTER TEXT]"

------------------------------------------------------------------
MOTION AND INTERACTION (keep all)
------------------------------------------------------------------
- Lenis smooth scrolling; GSAP for small UI motion. ONE ticker drives scroll, the 3D camera, text reveals and readouts; per-frame values are written straight to the DOM, never through React state.
- Each chapter is a pure function: scroll progress -> a "shot" (camera target, azimuth, elevation, framing, effect time, explode amount). Shots blend between chapters.
- The signature effect is a closed-form simulation evaluated on the GPU from a single time value (launch speed, drag, gravity, curl), so scrubbing forwards and backwards is exact. No video scrubbing, no image sequences.
- Sticky (position: sticky) chapter stages, text revealed from each chapter's progress (a --p CSS variable).
- Brief staggered intro on the hero headline.
- Thin progress bar at the top; a floating scroll button at the bottom that glides to the next chapter, shows a page-progress ring and hides on the last chapters.
- Sound toggle OFF by default with a clear speaker / mute icon and a small live spectrum display; if enabled, a short Web Audio pulse at the key moment. Never autoplay.
- Magnetic primary buttons and an optional cursor trail on fine pointers; small [SPLAT / RIPPLE / SPARK] effect on background clicks (never on controls or text selection).

------------------------------------------------------------------
TECHNICAL ARCHITECTURE (keep all)
------------------------------------------------------------------
- React + TypeScript + Vite; Three.js with one fixed full-screen canvas behind the page.
- Model the subject from real parts (lathe and primitive geometry); draw fine surface detail (perforations, engraving, weaves, labels) procedurally with canvas textures. Physical materials, a studio environment map built from emissive softboxes, rim lights, neutral tone mapping.
- Keep all colour variables on the app container (#[brand]-root), not <html>.
- Build as ONE classic deferred script (IIFE, dynamic imports inlined) with a relative base and no crossorigin attributes, so index.html works on any host, in any sub-folder AND when opened straight from disk (file://).
- Self-host fonts, Latin subsets only.
- A ?capture mode renders any chapter still from the live scene; a script uses it to produce the posters, per-palette/per-finish fallbacks and the social image.
- Also produce a single-file build: everything inlined (script, 3D engine, styles, fonts, a few key stills), all CSS scoped to #[brand]-root with inherited text styles reset inside the scope, plus host rules that make page-builder containers full-bleed so sticky chapters work. Outputs: [brand]-widget.html (paste into ONE HTML widget) and [brand]-standalone.html.

------------------------------------------------------------------
ACCESSIBILITY AND RESILIENCE (keep all)
------------------------------------------------------------------
- Semantic sections, one h1, an h2 per chapter, visible focus rings, native radio groups for selectors, accessible names on icon buttons, text equivalents for decorative readouts.
- Dialogs use <dialog>: focus moves in, Escape closes, focus returns to the opener; errors are announced and linked to their fields.
- Reduced motion: honour the system setting with strong stills and simple cuts, but show a notice offering "Play full motion" (remembered, returns to the same chapter).
- No WebGL: retry with compatible settings, then show chapter stills plus a notice explaining hardware acceleration, including the technical reason.
- Safe areas: position everything from --safe-top / --safe-bottom tokens, so the page works on notched phones and inside in-app viewers that overlay a top bar (such as the Claude app). Frame the 3D subject in the visible band between the insets.
- Local scrims only where text sits over imagery; check contrast in every palette.
- No horizontal overflow; comfortable tap targets; art-directed mobile framing.

------------------------------------------------------------------
PERFORMANCE BUDGET (keep all)
------------------------------------------------------------------
- Under 500 KB compressed on first load, about 5 requests, nothing downloaded while scrolling.
- Cap device pixel ratio (1.75 desktop / 1.5 mobile), render only when something changes, step down resolution on slow devices, compile shaders up front.
- Show the hero poster instantly and cross-fade to the live canvas.

------------------------------------------------------------------
VERIFICATION (run before handing off)
------------------------------------------------------------------
Using headless Chromium, screenshot every chapter at start, middle and end on desktop (1440x900) and mobile (390x844), with simulated in-app safe-area insets, with reduced motion, and with WebGL disabled. Test keyboard order, every selector, dialog validation / confirmation / Escape / focus return, sound toggle, click effects and nav. Measure contrast on the rendered page, check for console errors and horizontal overflow, and fix everything found.

------------------------------------------------------------------
DELIVERABLES
------------------------------------------------------------------
1. Source in [REPO / FOLDER NAME] with a README.
2. A zip of the hosted build for [HOST, e.g. bunny.net] (upload the contents; works from a sub-folder).
3. [brand]-widget.html for a single HTML widget at [PAGE URL] (Elementor Canvas layout) and [brand]-standalone.html.
4. A live preview link, and a short handoff: what was built, measured weight and load time, and anything that could not be verified.
