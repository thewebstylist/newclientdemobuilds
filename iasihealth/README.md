# iasi health: website redesign (demo build)

A static, single-page redesign of https://iasihealth.com, the site for Nicole Ayers' colon hydrotherapy practice in South Pasadena.

- `index.html`: page markup, SEO meta and LocalBusiness structured data
- `assets/css/style.css`: styles. Brand colors are set as tokens in `:root`: `#1d8fc6` for main text and `#f4f3ef` for the background.
- `assets/js/main.js`: transform-based parallax (works on iOS), scroll reveals, mobile menu, bio expander, "Open now" hours badge (Pacific time)

Open `index.html` in a browser; there is no build step.

## Images

Already included: `images/treatment-room.jpg` (the parallax background for the hero, mission and sanctuary sections), `images/iasi-logo.png`, and the favicon and touch icon made from the logo. The decorative flower pattern still loads from the live WordPress media library.

Drop the new photos into `images/` using these exact filenames. Until a file is added, a soft placeholder shows in its place.

| File | Photo |
| --- | --- |
| `images/nicole-ayers-portrait.jpg` | Nicole's bio portrait (arms crossed, blue scrubs) |
| `images/nicole-treatment.jpg` | Nicole with a client on the treatment table |
| `images/libbe-open-system.jpg` | The LIBBE table in the treatment room |
| `images/libbe-controls.jpg` | Close-up of the LIBBE control panel |
| `images/iact-logo.png` | I-ACT association logo |
| `images/colon-illustration.png` | *(Optional)* licensed water/colon illustration for the FAQ section. Use only a properly licensed, unwatermarked file. |
