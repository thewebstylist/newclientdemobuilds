# Pink Lady Creamery: website redesign (demo build)

A static, single-page redesign of https://pinkladycreamery.com, the site for Pink Lady Creamery's family owned, Mediterranean-inspired boutique ice cream catering in LA, Orange County and the Inland Empire.

- `index.html`: page markup, SEO meta and structured data
- `assets/css/style.css`: styles. Brand colors are tokens in `:root`: blush `#fdefef`, pink `#f3bfcb`, gold `#cca955` and cocoa `#855d3f`, taken from the current site. Fonts are Cormorant Garamond (headings) and Jost (body text), from Google Fonts.
- `assets/js/main.js`: all scroll motion, in plain JavaScript with no libraries

Open `index.html` in a browser; there is no build step.

## Images

Every photo loads straight from the existing WordPress media library (`https://pinkladycreamery.com/wp-content/uploads/...`), so the redesign uses the same files as the live site and nothing needs to be re-uploaded. To swap a photo, upload the new one to **Media** in WordPress and replace its URL in `index.html`.

| Section | Media library file |
| --- | --- |
| Logo (header) / brown logo (footer) | `2025/09/PL-LOGO-1.png`, `2025/11/brownlogo-1024x193.png` |
| Hero arch photo (gold flakes being placed) | `2025/10/flavor-819x1024.jpg` |
| "Scooping in LA \| OC \| IE" banner | `2025/11/triplescoopbanner.jpg` (the current desktop hero slide) |
| Intro arch photo (caramel drizzle) | `2025/11/dubai-1-copy-819x1024.jpg` |
| 19 flavor photos | `2025/11/PL-ORANGE-BLOSSOM.jpg`, `DUBAI.jpg`, `PISTACHIO.jpg`, ... `PUMPKIN.jpg` (the same photos as the current flavor tiles) |
| Toppings background | `2025/11/Topping57.jpg` (halawa and pistachio crumbs) |
| Our Story background | `2025/11/Topping41.jpg` (coconut and rose petals) |

## What changed from the current site

- **First screen**: the brand line stays as the headline, with the booking button, three trust points (family owned, no guest minimum, 19 flavors) and an arched photo with floating scoops, all visible without scrolling.
- **Scroll motion**, all soft and eased:
  - the headline rises word by word
  - the scoops and sprinkles drift at different depths, and the "We scoop, you celebrate" seal turns as you scroll
  - the triple-scoop banner opens from a rounded window to full width
  - the flavor ticker speeds up with scrolling and follows its direction
  - the 12 signature flavors scroll sideways while the section stays pinned, and the background tints to each flavor's color
  - the topping pills slide in opposite directions over the toppings photo
  - the "how it works" line draws itself as you read down the steps
  - the stat counters count up
- **Trust and booking path**: a 3-step "how it works", 12 event types, the new Ice Cream Party Boxes, the family story, the FAQ from the current site, and a booking form with the same fields as the current contact form. "Book" buttons appear throughout, plus a sticky "Book Your Event" bar on phones.
- **Design details**: arched photo frames (a nod to Mediterranean architecture), a scalloped pink-and-white awning along the top of the header that echoes their awning graphic, and a scalloped edge above the footer.
- Typos from the current copy are fixed (for example "choclate", "raosted", "pinapple", "film premiers").
- **Accessibility**: works with a keyboard, has visible focus states and AA-contrast text. When the visitor's device asks for reduced motion, the animation turns off and the flavors become a normal swipe row.

## Booking form

In this demo, **Send My Event Request** opens the visitor's email app with a pre-filled message to `events@pinkladycreamery.com` (name, phone, email, event date, time, location, guest count, message). The current site's WPForms form can't run inside an HTML widget, so for submissions that go straight into WordPress, replace the `<form class="book-form">` block with the WPForms form. Use a Shortcode widget in Elementor placed just after the HTML widget, or the equivalent Elementor Form widget.

## WordPress single-file version

`wordpress/pinkladycreamery-homepage-embed.html` is the whole homepage in one block, for pasting into an Elementor **HTML** widget:

1. Edit the homepage with Elementor. Under Page Settings, set **Page Layout** to **Elementor Canvas**, which hides the theme's header and footer (the block has its own).
2. Remove the existing sections, then add one section or container with no padding and drag in an **HTML** widget.
3. Open `pinkladycreamery-homepage-embed.html` in a text editor, copy everything, and paste it into the widget. Save and view the live page. Animations only run on the live page, not in the editor preview.

Notes:
- All styles are scoped under `.plc`, so the Blocksy theme and the block don't restyle each other.
- The block stretches to full screen width even inside a boxed container.
- The pinned flavor carousel needs the section and container holding the widget to have **Overflow: Default** and no entrance animation or motion effect (both would stop it from staying pinned).
- Set the page title and meta description in the SEO plugin (for example Yoast), since a widget can't set them. The suggested title and description are in the `<head>` of `index.html`.

To regenerate the file after editing the site: `python3 tools/build_embed.py` (no extra packages needed).

## Open questions for the client

1. **Reviews**: do they have client reviews (Google, Yelp, Instagram comments or emails) they're happy to show? A short testimonial strip would add a lot of trust. None are on the current site, so the demo doesn't invent any.
2. **Event photos**: are there photos of the scoop cart or station at a real event, or of the family? An "at your event" photo is the next most persuasive image after the flavors.
3. **Phone number**: should a phone or text number appear next to the email?
4. **Packages**: can the packages (basic and larger options, and what's included) be named or priced publicly? Even "packages start at..." helps visitors decide to reach out.
5. **Newsletter**: the current "let's be friends" signup isn't in the demo. Should it come back in the footer, and which email service does it feed?
6. **How it works, step 3**: "we set up a beautiful scoop station and serve every guest" describes the service in general terms. Confirm or adjust the wording.
