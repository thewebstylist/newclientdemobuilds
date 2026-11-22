# Sterling // Edge

Demo site for Sterling Creations Ai: AI creative studio + website & app hosting, hosted on a Cloudflare Worker.

**Live:** https://hosting.sterlingcreations.ai (also https://sterling-edge.sterling-50e.workers.dev)

## What's in here

| Path | What it is |
| --- | --- |
| `public/index.html` | Page markup, SEO meta, structured data |
| `public/assets/style.css` | Styles. Colors are tokens in `:root` (neon blue `#2E9BFF`, edge orange `#F6821F`, navy `#07091A`) |
| `public/assets/main.js` | Globe, live telemetry + ping graph, hosting network animation, terminal demo, counters, reveals |
| `src/worker.js` | The Worker: serves the site and two small APIs (`/api/edge`, `/api/ping`) |
| `tools/build.mjs` | Minifies `public/` and bundles it with the Worker into one file: `dist/worker.js` |
| `tools/preview.mjs` | Runs the built Worker locally on http://localhost:8787 with sample edge data |
| `tools/deploy.sh` | Builds and uploads to Cloudflare with one command |

The live data comes from Cloudflare itself: every request carries the visitor's approximate city and the data center (colo) that served it. `/api/edge` hands that back to the page; nothing is stored.

## Workflow for a new client site

1. Copy this folder, rename it (e.g. `acme-plumbing/`), and change `"name"` in `wrangler.jsonc`. That name becomes the URL: `https://<name>.sterling-50e.workers.dev`.
2. Design and edit in `public/`. Preview: `npm install` once, then `npm run preview`.
3. Deploy (pick one):
   - **With the API token saved in the cloud environment** (Network secrets → host `api.cloudflare.com`, header `Authorization`, prefix `Bearer`): `npm run deploy`. Done.
   - **Without a token:** ask Claude to deploy through the Cloudflare connector. Claude uploads `dist/worker.js` through a temporary, key-protected helper Worker, verifies the file hash, publishes, then deletes the helper.
4. Custom domain: see "Client domains" below.

Images (jpg/png/webp) in `public/` are bundled too, which is fine for a few images such as the share image `public/assets/og-image.jpg` (1200×630). For sites with many photos, host them on a CDN or move to Workers Static Assets.

Share tags use `__ORIGIN__` in `index.html`; the Worker swaps in the real address, so link previews keep working after you add a custom domain.

## Client domains (the sterlingcloud.dev hub)

Client domains stay at whatever DNS host they already use. They point one CNAME at the hub, and Cloudflare for SaaS
(enabled on `sterlingcloud.dev`, first 100 hostnames free, then $0.10/hostname/month) issues the certificate.

| Piece | Value |
| --- | --- |
| Hub zone | `sterlingcloud.dev` (registered at Cloudflare) |
| Fallback origin | `edge.sterlingcloud.dev` (AAAA `100::`, proxied, no server behind it) |
| Per-site Worker route | `<hostname>/*` → that site's Worker, added on the hub zone |

To connect a new client hostname (Claude can do steps 1–2 through the Cloudflare connector):
1. Add the custom hostname on the hub zone (SSL/TLS → Custom Hostnames), SSL method HTTP.
2. Add a Worker route on the hub zone: `<hostname>/*` → the client's Worker.
3. Client adds at their DNS host:
   - CNAME `<subdomain>` → `edge.sterlingcloud.dev`
   - TXT `_cf-custom-hostname.<subdomain>` → the ownership value Cloudflare shows
4. Certificate issues automatically within minutes.

Root domains (`client.com` with no subdomain) need a DNS host that supports CNAME flattening/ALIAS at the root; otherwise use `www`.

Live example: `hosting.sterlingcreations.ai` (DNS at SiteGround) → route `hosting.sterlingcreations.ai/*` → Worker `sterling-edge`.
