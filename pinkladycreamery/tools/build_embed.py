#!/usr/bin/env python3
"""Build a single-file version of the site for a WordPress / Elementor HTML widget.

    python3 tools/build_embed.py

Writes wordpress/pinkladycreamery-homepage-embed.html: one paste-ready block
containing the markup, CSS and JavaScript. Every photo already loads from the
Pink Lady WordPress media library, so nothing needs to be inlined.

What changes from the standalone site:
  * Every CSS rule is scoped under `.plc` so the WordPress theme and this block
    can't restyle each other; keyframes are renamed with a `plc-` prefix.
  * The block breaks out to full browser width even inside a boxed container.
  * The fixed header drops below the WordPress admin bar when logged in.
  * <head>-only tags (title, meta, favicons) are dropped; set those in WordPress.

No third-party packages needed.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "wordpress", "pinkladycreamery-homepage-embed.html")
SCOPE = ".plc"
KEYFRAMES = ("drip", "wobble", "nudge")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


# ---------------------------------------------------------------- CSS scoping
def scope_selector(sel):
    sel = sel.strip()
    if sel in (":root", "html", "body"):
        return SCOPE
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
            out.append(prelude.replace("@keyframes ", "@keyframes plc-") + " {" + body + "}")
        else:
            sels = ", ".join(dict.fromkeys(scope_selector(s) for s in prelude.split(",")))
            out.append(sels + " {" + body + "}")
    return "\n".join(out) + "\n"


def build_css():
    css = re.sub(r"/\*.*?\*/", "", read("assets/css/style.css"), flags=re.S)
    css = re.sub(r"(animation:\s*)(" + "|".join(KEYFRAMES) + r")\b", r"\1plc-\2", css)
    css = scope_css(css)
    # Theme resets go first: they beat the theme's plain element selectors on
    # specificity, while the site's own class rules that follow still win.
    resets = f"""/* ---- WordPress embed: neutralize theme styles inside the block ---- */
{SCOPE} p, {SCOPE} li, {SCOPE} dt, {SCOPE} dd, {SCOPE} span, {SCOPE} small, {SCOPE} strong, {SCOPE} em, {SCOPE} cite, {SCOPE} label {{ color: inherit; font-family: inherit; font-size: inherit; line-height: inherit; letter-spacing: inherit; }}
{SCOPE} h1, {SCOPE} h2, {SCOPE} h3 {{ text-transform: none; }}
{SCOPE} img {{ border: 0; box-shadow: none; border-radius: 0; max-width: 100%; }}
{SCOPE} button, {SCOPE} input, {SCOPE} textarea {{ text-transform: none; box-shadow: none; }}
{SCOPE} a {{ box-shadow: none; text-decoration-style: solid; }}
{SCOPE} ul, {SCOPE} ol {{ margin-top: 0; }}
{SCOPE} blockquote {{ border: 0; padding: 0; background: none; quotes: none; }}
{SCOPE} blockquote::before, {SCOPE} blockquote::after {{ content: none; }}
{SCOPE} dl, {SCOPE} dd {{ margin-left: 0; }}

"""
    extra = f"""
/* ---- WordPress embed: full-bleed wrapper and admin bar ---- */
body {{ overflow-x: hidden; }}
{SCOPE} {{ position: relative; width: 100vw; max-width: 100vw; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); overflow-x: clip; text-align: left; }}
body.admin-bar {SCOPE} .site-header, body.admin-bar {SCOPE} .scroll-progress {{ top: 32px; }}
@media (max-width: 782px) {{ body.admin-bar {SCOPE} .site-header, body.admin-bar {SCOPE} .scroll-progress {{ top: 46px; }} }}
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
    assert 'id="plc-site"' in body, "index.html must wrap the page in #plc-site"
    assert "images/" not in body and "assets/" not in body, "unreplaced local path"
    return ld, fonts, body.strip()


def main():
    ld, fonts, body = build_html()
    out = f"""<!-- Pink Lady Creamery homepage (single-file embed). Paste into one Elementor HTML widget.
     Generated by tools/build_embed.py; edit the source site and re-run instead of editing this file. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<style>
{build_css()}</style>
{ld}
{body}
<script>
{read("assets/js/main.js")}</script>
"""
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(out.encode()) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
