# iasi health: website redesign (demo build)

A static, single-page redesign of https://iasihealth.com, the site for Nicole Ayers' colon hydrotherapy practice in South Pasadena.

- `index.html`: page markup, SEO meta and LocalBusiness structured data
- `assets/css/style.css`: styles. Brand colors are set as tokens in `:root`: `#1d8fc6` for main text and `#f4f3ef` for the background.
- `assets/js/main.js`: transform-based parallax (works on iOS), scroll reveals, mobile menu, bio expander, "Open now" hours badge (Pacific time)

Open `index.html` in a browser; there is no build step.

## Images

Already included: `images/treatment-room.jpg` (the parallax background for the hero, mission and sanctuary sections), `images/iasi-logo.png`, and the favicon and touch icon made from the logo. The decorative flower pattern still loads from the live WordPress media library.

All photos below are in `images/`. To swap one, replace the file and keep the same filename. If a file is missing, a soft placeholder shows in its place.

| File | Photo |
| --- | --- |
| `images/nicole-ayers-portrait.webp` | Nicole's bio portrait (arms crossed, blue scrubs) |
| `images/nicole-treatment.webp` | Nicole with a client on the treatment table |
| `images/libbe-open-system.webp` | The LIBBE table in the treatment room |
| `images/libbe-controls.webp` | Close-up of the LIBBE control panel |
| `images/iact-logo.webp` | I-ACT association logo |
| `images/colon-illustration.webp` | Water-colon illustration beside the FAQ (created by the client) |
