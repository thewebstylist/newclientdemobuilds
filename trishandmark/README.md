# Trish & Mark: website redesign (demo build)

A static, multi-page redesign of https://www.trishandmark.com (currently on Wix) for Trish Steele and Mark Fangue's "Never Too Late" speaking and storytelling site.

Open `index.html` in a browser; there is no build step.

## Pages

The menu matches the Wix site, minus **Book Online**, which was hidden because that page only said "Nothing to book right now."

| File | Wix page |
| --- | --- |
| `index.html` | Home |
| `our-story.html` | /our-story |
| `speaking.html` | /speaking |
| `about-trish.html` | /about-trish |
| `about-mark.html` | /about-mark |
| `our-journey.html` | /our-journey |
| `media.html` | /media |
| `contact.html` | /contact |

## Files

- `assets/css/style.css`: all styles. Brand colors are tokens in `:root`. Navy `#13294d` and gold `#b48c45` / `#d9bf88` come from the logo; the cream `#fbf8f2` and sand `#ece2d1` come from the original site. Fonts are Cormorant Garamond (headings) and Jost (body) from Google Fonts.
- `assets/js/main.js`: scroll reveals, word-by-word headline reveals, eased parallax, the scroll-scrubbed intro text on the homepage, the expanding Venice photo, the pinned horizontal "Our Journey" gallery (it becomes a swipe carousel on phones), the count-up "74", the hide-on-scroll header and progress bar, the full-screen mobile menu, the photo lightbox and the video player for Trish's story.
- With "reduce motion" turned on in the visitor's system settings, all animation is switched off and content shows immediately.

## Images and video

Every photo, logo and Trish's video still loads from the existing Wix media library (`static.wixstatic.com` / `video.wixstatic.com`), using Wix's resizing URLs at the right size for each slot. If the Wix site is cancelled, those files must be downloaded first and the URLs in the HTML pointed at local copies.

## Content changes from the Wix site

- **Media page:** the magazine list (Harper's Bazaar, Condé Nast Traveler, Elle, Vogue Travel), whose "Download Kit" links went nowhere, was removed so the page doesn't suggest press coverage that hasn't happened. The Press & Media Kit intro and the Media Inquiries button remain. The intro still mentions downloadable media assets, so it needs a real kit link or a small wording change before launch.
- **Contact form:** design only. Submitting shows a note that the form isn't connected yet and gives the email address. To make it live, point the `<form>` at a form service (Formspree, Netlify Forms, etc.) and remove the `data-preview-form` attribute.
- **Social icons:** kept as on Wix, which means they link to the generic facebook.com, instagram.com, etc. home pages. Swap in the real profile URLs in each page's footer.
- **Microcopy:** small labels and section headings were added for the new layout (for example "Partners · Speakers · Authors", "Four ways to begin again", "Every season can open into new love", and the Mark quote "We are all connected." taken from his bio). All main body copy is unchanged from the Wix site.
