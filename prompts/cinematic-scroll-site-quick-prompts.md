# Cinematic scroll site: three quick prompts

Pick one, replace the [BRACKETS], and paste the whole block into a new session.
Fewer blanks means more creative decisions are left to Claude.

| Version | Blanks | Use it when |
|---|---|---|
| 1. Spark | 3 | You only know who it's for and the feeling you want |
| 2. Essentials | 6 | You know the look and the one big moment |
| 3. Directed | 10 | You know the story, sections and facts |

The "Build standards" block is identical in all three. Leave it as it is.

---

## Version 1: Spark (3 blanks)

```text
Build an extraordinary, fully functional cinematic scroll website for [BRAND NAME], a [WHAT THEY DO, e.g. specialty coffee roaster in Portland].
The feeling: [VIBE IN A FEW WORDS, e.g. warm, slow, luxurious].

You decide everything else and commit to it without asking me questions: the creative idea and tagline, one hero subject built as real-time 3D, one unforgettable signature effect that scrolling drives (the peak moment of the site), a bold colour palette on a deliberate background, a distinctive display font paired with a clean body font and a precise label font, 6 or 7 chapters with names, headlines and short copy, one clear call to action, and a closing statement. If I haven't given you real facts, prices or claims, treat it as a concept: label any numbers as concept values and make any form an honest demo that sends nothing.

BUILD STANDARDS (keep as is)
- React + TypeScript + Vite. Three.js real-time 3D on one fixed full-screen canvas: the subject is modelled from plausible parts, fine detail is drawn procedurally, lit like a studio product shoot.
- The signature effect is computed on the GPU from a single time value, so scroll scrubbing is exact in both directions. No video scrubbing, no image sequences.
- Lenis smooth scroll and ONE ticker driving everything; each chapter is a camera "shot" tied to scroll progress, blended between chapters; sticky pinned chapters with text that reveals with progress; brief intro stagger on the hero.
- Thin progress bar, a floating button that glides to the next chapter, a sound toggle OFF by default with a clear speaker icon (optional short Web Audio accent at the key moment), magnetic primary buttons, a subtle click effect on the background.
- Accessibility: semantic headings, visible focus, native <dialog> with Escape and focus return, accessible validation. Reduced motion shows strong stills but offers "Play full motion". If WebGL is unavailable, show chapter stills and a notice explaining hardware acceleration. Respect safe-area insets (notched phones and in-app viewers with a top bar) for text and 3D framing.
- Performance: under 500 KB compressed first load, capped pixel ratio, render only when something changes, an instant hero poster rendered from the live scene.
- Build: one classic deferred script with relative paths, so it works on any host, in a sub-folder and when opened from disk. Also produce a single-file build with CSS scoped to the brand's root element, for pasting into one HTML widget (e.g. Elementor), plus a standalone single-file page.
- Verify with headless Chromium: every chapter at start, middle and end on desktop and mobile, with reduced motion and without WebGL; test every control, the dialog and the nav; fix what you find.
- Deliver: source with a README, a hosting zip, the widget and standalone files, a preview link, and a short handoff with measured weight and load time.
```

---

## Version 2: Essentials (6 blanks)

```text
Build an extraordinary, fully functional cinematic scroll website for [BRAND NAME], a [WHAT THEY DO AND FOR WHOM, e.g. boutique architecture studio for private clients].

- Style: [STYLE, e.g. calm editorial monograph | experimental luxury launch | playful neon]
- Colours: [2 TO 8 COLOURS AND A BACKGROUND | "choose for me"]
- Hero subject: [THE THING IN 3D, e.g. a timber pavilion | a perfume bottle | an espresso machine]
- The big moment: [WHAT SCROLLING MAKES HAPPEN, e.g. the pavilion assembles beam by beam, then light floods through it]
- Main action: [CTA, e.g. "Book a consultation" | "Reserve yours"]

You decide the tagline, fonts, 6 or 7 chapters with headlines and copy, supporting readouts, and the closing statement, and commit without asking me questions. Only use facts, prices or claims I give you; otherwise label numbers as concept values and make the form an honest demo that sends nothing.

BUILD STANDARDS (keep as is)
- React + TypeScript + Vite. Three.js real-time 3D on one fixed full-screen canvas: the subject is modelled from plausible parts, fine detail is drawn procedurally, lit like a studio product shoot.
- The signature effect is computed on the GPU from a single time value, so scroll scrubbing is exact in both directions. No video scrubbing, no image sequences.
- Lenis smooth scroll and ONE ticker driving everything; each chapter is a camera "shot" tied to scroll progress, blended between chapters; sticky pinned chapters with text that reveals with progress; brief intro stagger on the hero.
- Thin progress bar, a floating button that glides to the next chapter, a sound toggle OFF by default with a clear speaker icon (optional short Web Audio accent at the key moment), magnetic primary buttons, a subtle click effect on the background.
- Accessibility: semantic headings, visible focus, native <dialog> with Escape and focus return, accessible validation. Reduced motion shows strong stills but offers "Play full motion". If WebGL is unavailable, show chapter stills and a notice explaining hardware acceleration. Respect safe-area insets (notched phones and in-app viewers with a top bar) for text and 3D framing.
- Performance: under 500 KB compressed first load, capped pixel ratio, render only when something changes, an instant hero poster rendered from the live scene.
- Build: one classic deferred script with relative paths, so it works on any host, in a sub-folder and when opened from disk. Also produce a single-file build with CSS scoped to the brand's root element, for pasting into one HTML widget (e.g. Elementor), plus a standalone single-file page.
- Verify with headless Chromium: every chapter at start, middle and end on desktop and mobile, with reduced motion and without WebGL; test every control, the dialog and the nav; fix what you find.
- Deliver: source with a README, a hosting zip, the widget and standalone files, a preview link, and a short handoff with measured weight and load time.
```

---

## Version 3: Directed (10 blanks)

```text
Build an extraordinary, fully functional cinematic scroll website for [BRAND NAME], a [PROFESSION / BUSINESS] offering [PRODUCT OR SERVICE] to [AUDIENCE].

- Tagline: "[TAGLINE]"
- The scroll story in one or two sentences: [WHAT THE VISITOR WATCHES HAPPEN, e.g. "A cold-brew bottle sits in darkness; scrolling pours coffee upward into a frozen spiral, then the bottle separates to show its layers."]
- Style and colours: [STYLE] with [COLOURS AND BACKGROUND]
- Fonts: [DISPLAY / BODY / LABEL FONTS | "choose for me"]
- Sections, in order: [4 TO 7 SECTION NAMES, e.g. Arrival / The Pour / Held / Inside / Craft / Choose / Close]
- Facts I can stand behind: [REAL FACTS AND NUMBERS | "none: this is a concept"]
- Choices visitors can switch live: [e.g. three finishes or packages | NONE]
- Main action and form: [CTA] opening a [BOOKING | ENQUIRY | RESERVATION] form with [FIELDS]; on submit [DEMO: send nothing, show an honest confirmation | REAL: send to EMAIL]

Write headlines and copy for each section in the brand's voice, choose readouts that fit the story, and commit to your creative decisions without asking me questions. Never invent statistics: use my facts or label numbers as concept values.

BUILD STANDARDS (keep as is)
- React + TypeScript + Vite. Three.js real-time 3D on one fixed full-screen canvas: the subject is modelled from plausible parts, fine detail is drawn procedurally, lit like a studio product shoot.
- The signature effect is computed on the GPU from a single time value, so scroll scrubbing is exact in both directions. No video scrubbing, no image sequences.
- Lenis smooth scroll and ONE ticker driving everything; each chapter is a camera "shot" tied to scroll progress, blended between chapters; sticky pinned chapters with text that reveals with progress; brief intro stagger on the hero.
- Thin progress bar, a floating button that glides to the next chapter, a sound toggle OFF by default with a clear speaker icon (optional short Web Audio accent at the key moment), magnetic primary buttons, a subtle click effect on the background.
- Accessibility: semantic headings, visible focus, native <dialog> with Escape and focus return, accessible validation. Reduced motion shows strong stills but offers "Play full motion". If WebGL is unavailable, show chapter stills and a notice explaining hardware acceleration. Respect safe-area insets (notched phones and in-app viewers with a top bar) for text and 3D framing.
- Performance: under 500 KB compressed first load, capped pixel ratio, render only when something changes, an instant hero poster rendered from the live scene.
- Build: one classic deferred script with relative paths, so it works on any host, in a sub-folder and when opened from disk. Also produce a single-file build with CSS scoped to the brand's root element, for pasting into one HTML widget (e.g. Elementor), plus a standalone single-file page.
- Verify with headless Chromium: every chapter at start, middle and end on desktop and mobile, with reduced motion and without WebGL; test every control, the dialog and the nav; fix what you find.
- Deliver: source with a README, a hosting zip, the widget and standalone files, a preview link, and a short handoff with measured weight and load time.
```
