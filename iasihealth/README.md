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
| `images/iasi-social-preview.jpg` | 1200×630 social share image (link previews in texts, Facebook, LinkedIn, X) |
| `images/colon-illustration.webp` | Water-colon illustration beside the FAQ (created by the client) |

## WordPress single-file version

`wordpress/iasi-homepage-embed.html` is the whole homepage in one block, for pasting into an Elementor **HTML** widget:

1. Edit the homepage with Elementor. Under Page Settings, set **Page Layout** to **Elementor Canvas**, which hides the theme's header and footer (the block has its own).
2. Remove the existing sections, then add one section or container with no padding and drag in an **HTML** widget.
3. Open `iasi-homepage-embed.html` in a text editor, copy everything, and paste it into the widget. Save and view the live page. Animations only run on the live page, not in the editor preview.

Notes:
- All styles are scoped under `.iasi`, so the theme and the block don't restyle each other.
- The block stretches to full screen width even inside a boxed container.
- The logo and hero photo load from her WordPress media library. The newer photos are built into the file.
- Set the page title and meta description in the SEO plugin (for example Yoast), since a widget can't set them.

To regenerate the file after editing the site: `python3 tools/build_embed.py` (needs Pillow).

## Social share preview (text messages, Facebook, LinkedIn, X)

The share image is `images/iasi-social-preview.jpg` (1200×630). Link previews read it from the page `<head>`, which a page-builder widget can't set, so on WordPress:

1. Upload `iasi-social-preview.jpg` to **Media > Add New**.
2. Set it as the homepage share image in the SEO plugin. In Yoast, edit the homepage, open the **Social** tab, and choose it as the Facebook image and the X image. To make it the fallback for every page, also set it under **Yoast SEO > Settings > Site basics > Site image**.
3. Refresh cached previews with the Facebook Sharing Debugger (https://developers.facebook.com/tools/debug/) and LinkedIn Post Inspector (https://www.linkedin.com/post-inspector/). iMessage caches per conversation, so test in a new thread.

`index.html` points to `https://iasihealth.com/wp-content/uploads/2026/09/iasi-social-preview.jpg`, the address WordPress gives the file when uploaded in September 2026. If the uploaded URL differs, update the `og:image` and `twitter:image` tags.
