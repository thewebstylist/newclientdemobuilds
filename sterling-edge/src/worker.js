// Sterling // Edge Worker
// Serves the bundled site (FILES is injected by tools/build.mjs) plus two tiny APIs:
//   GET /api/edge  -> where this request was served from (Cloudflare's request.cf data)
//   GET /api/ping  -> empty response, used by the page to measure live round-trip time

const COLO_CITY = {
  LAX: "Los Angeles", SJC: "San Jose", SFO: "San Francisco", SAN: "San Diego", SEA: "Seattle", PDX: "Portland",
  LAS: "Las Vegas", PHX: "Phoenix", DEN: "Denver", SLC: "Salt Lake City", DFW: "Dallas", IAH: "Houston", AUS: "Austin",
  ORD: "Chicago", MSP: "Minneapolis", ATL: "Atlanta", MIA: "Miami", IAD: "Ashburn", EWR: "Newark", JFK: "New York",
  BOS: "Boston", YYZ: "Toronto", YVR: "Vancouver", YUL: "Montreal", MEX: "Mexico City", GRU: "São Paulo",
  EZE: "Buenos Aires", SCL: "Santiago", BOG: "Bogotá", LIM: "Lima", LHR: "London", MAN: "Manchester", DUB: "Dublin",
  CDG: "Paris", AMS: "Amsterdam", FRA: "Frankfurt", MUC: "Munich", MAD: "Madrid", BCN: "Barcelona", MXP: "Milan",
  ZRH: "Zurich", VIE: "Vienna", CPH: "Copenhagen", ARN: "Stockholm", OSL: "Oslo", HEL: "Helsinki", WAW: "Warsaw",
  IST: "Istanbul", DXB: "Dubai", BOM: "Mumbai", DEL: "New Delhi", BLR: "Bengaluru", SIN: "Singapore", HKG: "Hong Kong",
  NRT: "Tokyo", KIX: "Osaka", ICN: "Seoul", TPE: "Taipei", SYD: "Sydney", MEL: "Melbourne", AKL: "Auckland",
  JNB: "Johannesburg", CPT: "Cape Town", LOS: "Lagos", NBO: "Nairobi", CAI: "Cairo", HNL: "Honolulu"
};

// Images are bundled as base64; decode once per isolate.
for (const f of Object.values(FILES)) if (f.b64) { f.body = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0)); delete f.b64; }

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
};

const json = (data, extra = {}) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SECURITY_HEADERS, ...extra }
  });

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    if (path === "/api/ping") {
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", ...SECURITY_HEADERS } });
    }

    if (path === "/api/edge") {
      const cf = request.cf || {};
      const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
      return json({
        city: cf.city || null,
        region: cf.region || null,
        country: cf.country || null,
        lat: num(cf.latitude),
        lon: num(cf.longitude),
        colo: cf.colo || null,
        coloCity: COLO_CITY[cf.colo] || null,
        httpProtocol: cf.httpProtocol || null,
        tlsVersion: cf.tlsVersion || null
      });
    }

    const key = path.endsWith("/") ? path + "index.html" : path;
    const file = FILES[key];
    if (!file) {
      const page = FILES["/index.html"];
      return new Response(page.body.replaceAll("__ORIGIN__", url.origin), { status: 404, headers: { "Content-Type": page.type, ...SECURITY_HEADERS } });
    }

    // HTML may reference __ORIGIN__ (share-image URLs must be absolute); fill in the host serving this request.
    const isHtml = file.type.startsWith("text/html");
    const body = isHtml ? file.body.replaceAll("__ORIGIN__", url.origin) : file.body;
    const etag = isHtml ? `"${file.hash}-${url.host}"` : `"${file.hash}"`;
    const headers = {
      "Content-Type": file.type,
      ETag: etag,
      "Cache-Control": key.endsWith(".html") ? "public, max-age=0, must-revalidate" : "public, max-age=86400, stale-while-revalidate=604800",
      ...SECURITY_HEADERS
    };
    if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
    return new Response(request.method === "HEAD" ? null : body, { headers });
  }
};
