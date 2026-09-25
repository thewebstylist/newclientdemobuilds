#!/usr/bin/env python3
"""Build a single-file version of the site for a WordPress / Elementor HTML widget.

    python3 tools/build_embed.py

Writes wordpress/iasi-homepage-embed.html: one paste-ready block containing the
markup, CSS and JavaScript. The new photos are inlined as WebP data URIs; the
logo and hero photo load from her existing WordPress media library.

What changes from the standalone site:
  * Every CSS rule is scoped under `.iasi` so the WordPress theme and this block
    can't restyle each other; keyframes are renamed with an `iasi-` prefix.
  * The block breaks out to full browser width even inside a boxed container.
  * The fixed header drops below the WordPress admin bar when logged in.
  * <head>-only tags (title, meta, favicons) are dropped; set those in WordPress.

Requires Pillow (pip install pillow).
"""
import base64
import io
import os
import re

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "wordpress", "iasi-homepage-embed.html")
SCOPE = ".iasi"

# Already in her WordPress media library (the live site uses them), so the embed
# loads these from there instead of inlining them.
MEDIA_LIBRARY = {
    "images/iasi-logo.png": "https://iasihealth.com/wp-content/uploads/2026/01/IASI-LOGO-large.png",
    "images/treatment-room.jpg": "https://iasihealth.com/wp-content/uploads/2026/01/iasi-health-hero.jpg",
}

# image path in the site -> (max width, quality); inlined as WebP data URIs
IMAGES = {
    "images/nicole-ayers-portrait.webp": (512, 82),
    "images/nicole-treatment.webp": (667, 80),
    "images/libbe-open-system.webp": (1170, 78),
    "images/libbe-controls.webp": (1170, 78),
    "images/iact-logo.webp": (200, 90),
    "images/colon-illustration.webp": (640, 82),
}


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def data_uri(rel, max_w, quality):
    im = Image.open(os.path.join(ROOT, rel))
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


# ---------------------------------------------------------------- CSS scoping
def scope_selector(sel):
    sel = sel.strip()
    if sel in (":root", "html", "body"):
        return SCOPE
    if sel == "html.js":
        return SCOPE + ".js"
    if sel.startswith("html:not(.js) "):
        return SCOPE + ":not(.js) " + sel[len("html:not(.js) "):]
    if sel.startswith(".js "):
        return SCOPE + ".js " + sel[4:]
    return SCOPE + " " + sel


def split_blocks(css):
    """Yield (prelude, body) for each top-level block."""
    i, n = 0, len(css)
    while i < n:
        start = css.find("{", i)
        if start == -1:
            break
        prelude = css[i:start].strip()
        depth, j = 1, start + 1
        while depth and j < n:
            depth += {"{": 1, "}": -1}.get(css[j], 0)
            j += 1
        yield prelude, css[start + 1:j - 1]
        i = j


def scope_css(css):
    out = []
    for prelude, body in split_blocks(css):
        if prelude.startswith("@media"):
            out.append(prelude + " {\n" + scope_css(body) + "}")
        elif prelude.startswith("@keyframes"):
            out.append(prelude.replace("@keyframes ", "@keyframes iasi-") + " {" + body + "}")
        else:
            sels = ", ".join(dict.fromkeys(scope_selector(s) for s in prelude.split(",")))
            out.append(sels + " {" + body + "}")
    return "\n".join(out) + "\n"


def build_css():
    css = re.sub(r"/\*.*?\*/", "", read("assets/css/style.css"), flags=re.S)
    css = re.sub(r"(animation:\s*)(drip|float)\b", r"\1iasi-\2", css)
    css = scope_css(css)
    room = MEDIA_LIBRARY["images/treatment-room.jpg"]
    # Theme resets go first: they beat the theme's plain element selectors on
    # specificity, while the site's own class rules that follow still win.
    resets = f"""/* ---- WordPress embed: neutralize theme styles inside the block ---- */
{SCOPE} p, {SCOPE} li, {SCOPE} dt, {SCOPE} dd, {SCOPE} address, {SCOPE} figcaption, {SCOPE} span, {SCOPE} small, {SCOPE} strong, {SCOPE} em {{ color: inherit; font-family: inherit; font-size: inherit; line-height: inherit; letter-spacing: inherit; }}
{SCOPE} h1, {SCOPE} h2, {SCOPE} h3 {{ text-transform: none; }}
{SCOPE} img {{ border: 0; box-shadow: none; border-radius: 0; max-width: 100%; }}
{SCOPE} button {{ text-transform: none; box-shadow: none; }}
{SCOPE} a {{ box-shadow: none; text-decoration-style: solid; }}
{SCOPE} ul, {SCOPE} ol {{ margin-top: 0; }}
{SCOPE} blockquote {{ border: 0; padding: 0; background: none; quotes: none; }}
{SCOPE} blockquote::before, {SCOPE} blockquote::after {{ content: none; }}
{SCOPE} iframe {{ border: 0; }}

"""
    extra = f"""
/* ---- WordPress embed: full-bleed wrapper, shared photo, admin bar ---- */
body {{ overflow-x: hidden; }}
{SCOPE} {{ position: relative; width: 100vw; max-width: 100vw; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); overflow-x: clip; text-align: left; }}
{SCOPE} .bg-room {{ background-image: url("{room}"); }}
body.admin-bar {SCOPE} .site-header {{ top: 32px; }}
@media (max-width: 782px) {{ body.admin-bar {SCOPE} .site-header {{ top: 46px; }} }}
"""
    return resets + css + extra


# ---------------------------------------------------------------- HTML
def build_html():
    html = read("index.html")
    ld = re.search(r'<script type="application/ld\+json">.*?</script>', html, re.S).group(0)
    fonts = re.search(r'<link href="https://fonts\.googleapis\.com/css2[^>]+>', html).group(0)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)

    body = re.sub(r'\s*<a class="skip-link"[^>]*>.*?</a>', "", body)
    body = re.sub(r'\s*<script src="assets/js/main\.js"[^>]*></script>', "", body)

    # parallax backgrounds -> one shared CSS class (keeps the photo inlined once)
    body = re.sub(
        r'class="parallax-media"([^>]*?) style="background-image:url\(\'images/treatment-room\.jpg\'\);?([^"]*)"',
        lambda m: f'class="parallax-media bg-room"{m.group(1)}' + (f' style="{m.group(2)}"' if m.group(2) else ""),
        body,
    )
    for rel, url in MEDIA_LIBRARY.items():
        body = body.replace(f'src="{rel}"', f'src="{url}"')
    for rel, (w, q) in IMAGES.items():
        body = body.replace(f'src="{rel}"', f'src="{data_uri(rel, w, q)}"')
    assert "images/" not in body, "unreplaced local image path"
    return ld, fonts, body.strip()


def build_js():
    js = read("assets/js/main.js")
    js = js.replace(
        "  var doc = document.documentElement;\n  doc.classList.add('js');",
        "  var root = document.getElementById('iasi-site');\n  if (!root || root.getAttribute('data-ready')) return;\n  root.setAttribute('data-ready', '1');\n  root.classList.add('js');",
    )
    js = js.replace(
        "    if (!link) return;",
        "    if (!link || !root.contains(link)) return;",
    )
    assert "root.classList.add('js')" in js and "root.contains(link)" in js, "main.js changed; update build_embed.py"
    return js


def main():
    ld, fonts, body = build_html()
    out = f"""<!-- iasi health homepage (single-file embed). Paste into one Elementor HTML widget.
     Generated by tools/build_embed.py; edit the source site and re-run instead of editing this file. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<style>
{build_css()}</style>
{ld}
<div class="iasi" id="iasi-site">
<script>document.getElementById('iasi-site').classList.add('js')</script>
{body}
</div>
<script>
{build_js()}</script>
"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(out.encode()) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
