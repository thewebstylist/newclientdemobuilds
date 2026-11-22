#!/usr/bin/env bash
# Builds and deploys this site to Cloudflare Workers with one command:  bash tools/deploy.sh
# Needs a Cloudflare API token with "Workers Scripts: Edit". In Claude Code cloud sessions the token is
# injected by the network proxy (saved as a network secret for api.cloudflare.com), so CLOUDFLARE_API_TOKEN
# can be any placeholder there. Locally, export your real token as CLOUDFLARE_API_TOKEN.
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="${WORKER_NAME:-$(sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' wrangler.jsonc | head -1)}"
ACCOUNT="${CLOUDFLARE_ACCOUNT_ID:-$(sed -n 's/.*"account_id": *"\([^"]*\)".*/\1/p' wrangler.jsonc | head -1)}"
DATE="$(sed -n 's/.*"compatibility_date": *"\([^"]*\)".*/\1/p' wrangler.jsonc | head -1)"
TOKEN="${CLOUDFLARE_API_TOKEN:-proxy-injected}"
API="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/workers"

node tools/build.mjs
echo "Deploying $NAME ..."
curl -sS --fail-with-body -X PUT "$API/scripts/$NAME" \
  -H "Authorization: Bearer $TOKEN" \
  -F "metadata={\"main_module\":\"worker.js\",\"compatibility_date\":\"$DATE\",\"observability\":{\"enabled\":true}};type=application/json" \
  -F "worker.js=@dist/worker.js;type=application/javascript+module" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(!j.success){console.error(JSON.stringify(j.errors));process.exit(1)}console.log("Uploaded version", j.result.etag||j.result.id)})'
curl -sS --fail-with-body -X POST "$API/scripts/$NAME/subdomain" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" --data '{"enabled":true,"previews_enabled":true}' > /dev/null
SUB="$(curl -sS "$API/subdomain" -H "Authorization: Bearer $TOKEN" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).result.subdomain))')"
echo "Live: https://$NAME.$SUB.workers.dev"
