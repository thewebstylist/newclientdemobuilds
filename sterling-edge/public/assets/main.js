/* Sterling // Edge — interactions
   - Globe (canvas): dotted Earth, arcs from Pasadena to edge cities, visitor arc
   - Live edge data from /api/edge, live round-trip sparkline from /api/ping
   - Hosting network canvas, terminal demo, counters, reveals, nav */
(() => {
  "use strict";
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const C = { blue: "#2E9BFF", ice: "#A8C6FF", orange: "#F6821F", amber: "#FBAD41", ember: "#FF4F1F", fg: "#F2F6FF" };
  const rad = (d) => (d * Math.PI) / 180;

  /* ---------- Nav ---------- */
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const menuBtn = $("#menuBtn"), mobileNav = $("#mobileNav");
  const setMenu = (open) => {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    mobileNav.classList.toggle("open", open);
    mobileNav.inert = !open;
    nav.classList.toggle("menu-open", open);
    doc.classList.toggle("menu-lock", open);
  };
  menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
  $$("a", mobileNav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && mobileNav.classList.contains("open")) { setMenu(false); menuBtn.focus(); } });
  window.matchMedia("(min-width: 881px)").addEventListener("change", (m) => { if (m.matches) setMenu(false); });
  $("#yr").textContent = new Date().getFullYear();

  /* ---------- Timecode ---------- */
  const tc = $("#tc"), t0 = performance.now();
  const pad = (n) => String(n).padStart(2, "0");
  if (!reduce) setInterval(() => {
    const ms = performance.now() - t0, s = Math.floor(ms / 1000);
    tc.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(Math.floor((ms % 1000) / 41.67))}`;
  }, 42);

  /* ---------- Counters ---------- */
  const countUp = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target = +el.dataset.count;
    if (reduce) { el.textContent = target; return; }
    const dur = 1600, start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Reveals: varied entrances, staggered groups, word-split headlines ---------- */
  const splitWords = (el) => {
    const out = document.createDocumentFragment();
    let i = 0;
    const wrap = (node) => {
      const w = document.createElement("span"), wi = document.createElement("span");
      w.className = "w"; wi.className = "wi"; wi.style.setProperty("--wd", `${i++ * 70}ms`);
      wi.append(node); w.append(wi); return w;
    };
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          out.append(/^\s+$/.test(part) ? document.createTextNode(" ") : wrap(document.createTextNode(part)));
        });
      } else if (node.nodeName === "BR") out.append(node);
      else out.append(wrap(node));
    }
    el.textContent = ""; el.append(out); el.classList.add("split");
  };
  if (!reduce) $$(".section .sec-head h2, .cta h2").forEach(splitWords);

  const groups = [
    [".sec-head", "up", 0],
    [".tele-grid > .panel", "up", 90],
    [".bento > .panel", "scale", 80],
    [".net-panel", "left", 0],
    [".host-side > .panel", "right", 140],
    [".feat-grid > .feat", "up", 60],
    [".plans > .plan", "up", 120],
    [".p2p-chips", "up", 0],
    [".p2p-stage > *", "scale", 140],
    [".work-grid > .wcard", "clip", 90],
    [".steps > .step", "left", 120],
    [".cta-in", "blur", 0]
  ];
  const revealTargets = [];
  for (const [sel, anim, step] of groups) {
    const parents = new Map();
    $$(sel).forEach((el) => {
      const k = el.parentElement, n = parents.get(k) || 0;
      parents.set(k, n + 1);
      el.classList.add("rv"); el.dataset.anim = anim; el.style.setProperty("--d", `${Math.min(n, 6) * step}ms`);
      revealTargets.push(el);
    });
  }
  $$(".checks").forEach((ul) => $$("li", ul).forEach((li, i) => li.style.setProperty("--li", `${i * 70}ms`)));
  $$(".feat .fi > *").forEach((shape) => shape.setAttribute("pathLength", "100"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add("in");
      $$("[data-count]", el).forEach(countUp);
      const g = $(".g-val", el);
      if (g) { const p = +g.dataset.pct; g.style.strokeDasharray = `${p} ${100 - p}`; }
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  // Clip-revealed items start fully clipped, which the observer reads as invisible, so watch their container instead
  const clipIo = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      Array.from(en.target.children).forEach((el) => { if (el.dataset.anim === "clip") el.classList.add("in"); });
      clipIo.unobserve(en.target);
    });
  }, { threshold: 0.08 });
  revealTargets.forEach((el) => (el.dataset.anim === "clip" ? clipIo.observe(el.parentElement) : io.observe(el)));
  $$(".hero [data-count]").forEach(countUp);

  /* ---------- Scroll-linked motion: progress bar, hero parallax, marquee, image drift ---------- */
  const progress = $("#progress"), heroIn = $(".hero-in"), heroStats = $(".hero-stats"), heroSky = $(".hero-sky"), globeEl = $("#globe");
  const mq = $(".mq-track"), wimgs = $$(".wimg");
  [heroIn, heroStats, heroSky, globeEl, ...wimgs].forEach((el) => el && el.classList.add("parallax"));
  let ticking = false;
  const scrollFrame = () => {
    const y = window.scrollY, vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
    if (!reduce) {
      if (y < vh * 1.2) {
        const k = Math.min(1, y / (vh * 0.9));
        heroIn.style.transform = `translate3d(0,${(y * 0.28).toFixed(1)}px,0)`;
        heroIn.style.opacity = (1 - k * 0.9).toFixed(3);
        heroStats.style.transform = `translate3d(0,${(y * 0.12).toFixed(1)}px,0)`;
        heroSky.style.transform = `translate3d(0,${(y * 0.35).toFixed(1)}px,0)`;
        globeEl.style.transform = `translate3d(0,${(y * 0.18).toFixed(1)}px,0) scale(${(1 + k * 0.12).toFixed(3)}) rotate(${(k * -8).toFixed(2)}deg)`;
      }
      for (const w of wimgs) {
        const r = w.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const off = (r.top + r.height / 2 - vh / 2) / vh;
        w.style.transform = `translate3d(0,${(off * -36).toFixed(1)}px,0)`;
      }
    }
    ticking = false;
  };
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(scrollFrame); } };
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
  scrollFrame();

  // Marquee drifts on its own, speeds up and leans with scroll velocity, then eases back
  if (mq && !reduce) {
    mq.style.animation = "none";
    let mqX = 0, lastY = window.scrollY, lastT = performance.now(), vel = 0;
    const mqLoop = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
      const y = window.scrollY, dy = y - lastY; lastY = y;
      vel += (dy / dt - vel) * 0.12;
      const speed = 60 + Math.min(900, Math.abs(vel) * 0.6);
      const half = mq.scrollWidth / 2 || 1;
      mqX = (mqX + speed * dt * (vel < -5 ? -1 : 1) + half) % half;
      const skew = Math.max(-8, Math.min(8, vel * -0.006));
      mq.style.transform = `translate3d(${(-mqX).toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      requestAnimationFrame(mqLoop);
    };
    requestAnimationFrame(mqLoop);
  }

  /* Run a loop only while its element is on screen */
  const whenVisible = (el, onShow, onHide) => {
    new IntersectionObserver(([en]) => (en.isIntersecting ? onShow() : onHide && onHide()), { threshold: 0.05 }).observe(el);
  };

  /* ---------- Canvas helper ---------- */
  const fitCanvas = (cv) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  };

  /* ---------- Globe ---------- */
  const HOME = { name: "Pasadena", lat: 34.1478, lon: -118.1445 };
  const CITIES = [
    ["London", 51.5, -0.12], ["Tokyo", 35.68, 139.69], ["São Paulo", -23.55, -46.63], ["Sydney", -33.87, 151.21],
    ["New York", 40.71, -74.0], ["Singapore", 1.35, 103.82], ["Frankfurt", 50.11, 8.68], ["Mumbai", 19.08, 72.88],
    ["Johannesburg", -26.2, 28.05], ["Mexico City", 19.43, -99.13], ["Honolulu", 21.31, -157.86], ["Seoul", 37.57, 126.98],
    ["Dubai", 25.2, 55.27], ["Toronto", 43.65, -79.38], ["Santiago", -33.45, -70.67], ["Stockholm", 59.33, 18.07],
    ["Lagos", 6.52, 3.38], ["Miami", 25.76, -80.19], ["Hong Kong", 22.32, 114.17], ["Auckland", -36.85, 174.76],
    ["Chicago", 41.88, -87.63], ["Paris", 48.86, 2.35], ["Seattle", 47.61, -122.33], ["Bogotá", 4.71, -74.07]
  ];
  const ARC_TARGETS = [0, 1, 2, 3, 4, 5, 7, 8, 10, 12, 14, 19];
  const vec = (lat, lon) => { const p = rad(lat), l = rad(lon); return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)]; };
  const slerp = (a, b, t) => {
    const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(d);
    if (om < 1e-4) return a.slice();
    const s = Math.sin(om), k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  };
  const globeCv = $("#globe");
  const globe = {
    rot: rad(118) - 0.5, tilt: -0.38, pts: [], arcs: [], visitor: null, running: false, t: 0,
    init() {
      const n = window.innerWidth < 700 ? 900 : 1500, ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
        this.pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
      }
      const h = vec(HOME.lat, HOME.lon);
      this.arcs = ARC_TARGETS.map((i, k) => this.makeArc(h, vec(CITIES[i][1], CITIES[i][2]), k * 0.37, C.blue));
      this.resize();
      window.addEventListener("resize", () => this.resize());
    },
    makeArc(a, b, phase, color) {
      const seg = 48, pts = [], d = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
      for (let i = 0; i <= seg; i++) {
        const t = i / seg, p = slerp(a, b, t), lift = 1 + Math.sin(Math.PI * t) * (0.08 + d * 0.12);
        pts.push([p[0] * lift, p[1] * lift, p[2] * lift]);
      }
      return { pts, phase, color, end: b };
    },
    setVisitor(lat, lon) {
      const v = vec(lat, lon), h = vec(HOME.lat, HOME.lon);
      // Skip a separate marker when the visitor is within ~200 km of the studio
      if (Math.acos(Math.min(1, v[0] * h[0] + v[1] * h[1] + v[2] * h[2])) > 0.03) { this.visitor = v; this.arcs.push(this.makeArc(h, v, 0, C.orange)); }
      if (!this.running) this.draw();
    },
    resize() { Object.assign(this, fitCanvas(globeCv)); if (!this.running) this.draw(); },
    proj(p) {
      const cr = Math.cos(this.rot), sr = Math.sin(this.rot);
      const x = p[0] * cr + p[2] * sr, z0 = -p[0] * sr + p[2] * cr;
      const ct = Math.cos(this.tilt), st = Math.sin(this.tilt);
      const y = p[1] * ct - z0 * st, z = p[1] * st + z0 * ct;
      const R = Math.min(this.w, this.h) * 0.42;
      return [this.w / 2 + x * R, this.h / 2 - y * R, z];
    },
    draw() {
      const { ctx, w, h } = this;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.42, cx = w / 2, cy = h / 2;
      // atmosphere
      const at = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.25);
      at.addColorStop(0, "rgba(46,155,255,0.28)"); at.addColorStop(1, "rgba(46,155,255,0)");
      ctx.fillStyle = at; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, "rgba(28,40,90,0.85)"); body.addColorStop(1, "rgba(7,9,26,0.92)");
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      // dots
      for (const p of this.pts) {
        const [x, y, z] = this.proj(p);
        if (z < -0.15) continue;
        const a = z > 0 ? 0.25 + z * 0.65 : 0.08;
        ctx.fillStyle = `rgba(168,198,255,${a.toFixed(3)})`;
        const s = z > 0 ? 1.1 + z * 0.9 : 0.8;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      // city markers
      for (const c of CITIES) {
        const [x, y, z] = this.proj(vec(c[1], c[2]));
        if (z <= 0) continue;
        ctx.fillStyle = `rgba(251,173,65,${(0.4 + z * 0.6).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(x, y, 1.8 + z * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      // arcs
      for (const arc of this.arcs) {
        const P = arc.pts.map((p) => this.proj(p)), n = P.length - 1;
        ctx.lineWidth = 1.1; ctx.strokeStyle = arc.color === C.orange ? "rgba(246,130,31,0.45)" : "rgba(46,155,255,0.28)";
        ctx.beginPath(); let pen = false;
        for (const [x, y, z] of P) { if (z > -0.05) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; }
        ctx.stroke();
        // travelling pulse
        const prog = ((this.t * 0.22 + arc.phase) % 1.4) / 1.0;
        if (prog <= 1) {
          const head = Math.floor(prog * n), tail = Math.max(0, head - 10);
          ctx.lineWidth = 2.2; ctx.strokeStyle = arc.color; ctx.shadowColor = arc.color; ctx.shadowBlur = 10;
          ctx.beginPath(); pen = false;
          for (let i = tail; i <= head; i++) { const [x, y, z] = P[i]; if (z > -0.05) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } }
          ctx.stroke(); ctx.shadowBlur = 0;
          if (prog > 0.96) { const [x, y, z] = P[n]; if (z > 0) { ctx.strokeStyle = arc.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 6 + (prog - 0.96) * 200, 0, Math.PI * 2); ctx.stroke(); } }
        }
      }
      // home + visitor markers
      const mark = (v, col, label) => {
        const [x, y, z] = this.proj(v);
        if (z <= 0) return;
        const pr = 6 + 4 * Math.sin(this.t * 3);
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, pr + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.font = "600 11px 'JetBrains Mono', monospace"; ctx.fillStyle = "#F2F6FF"; ctx.fillText(label, x + 14, y - 10);
      };
      mark(vec(HOME.lat, HOME.lon), C.blue, "PASADENA");
      if (this.visitor) mark(this.visitor, C.orange, "YOU");
    },
    loop(ts) {
      if (!this.running) return;
      this.t = ts / 1000;
      this.rot += 0.0016;
      this.draw();
      requestAnimationFrame((t) => this.loop(t));
    },
    start() { if (reduce || this.running) return; this.running = true; requestAnimationFrame((t) => this.loop(t)); },
    stop() { this.running = false; }
  };
  globe.init();
  whenVisible(globeCv, () => globe.start(), () => globe.stop());

  /* ---------- Edge data ---------- */
  const regionName = (code) => { try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code); } catch { return code; } };
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  fetch("/api/edge", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      const place = d.city || (d.country ? regionName(d.country) : "your area");
      const chip = $("#liveText");
      chip.textContent = "";
      chip.append("You're in ");
      const b1 = document.createElement("b"); b1.textContent = place; chip.append(b1);
      chip.append(" · served from ");
      const b2 = document.createElement("b"); b2.textContent = d.colo || "the edge"; chip.append(b2);
      if (d.coloCity) chip.append(` (${d.coloCity})`);
      setText("tCity", place);
      setText("tCountry", [d.region, d.country ? regionName(d.country) : ""].filter(Boolean).join(", ") || "Approximate location");
      setText("tColo", d.colo || "Edge");
      setText("tColoName", d.coloCity ? `${d.coloCity} data center` : "Nearest edge data center");
      setText("tProto", d.httpProtocol || "HTTPS");
      setText("tTls", d.tlsVersion ? `${d.tlsVersion} encrypted` : "Encrypted connection");
      setText("footColo", d.colo ? `${d.colo}${d.coloCity ? " · " + d.coloCity : ""}` : "the edge");
      if (typeof d.lat === "number" && typeof d.lon === "number") globe.setVisitor(d.lat, d.lon);
    })
    .catch(() => {
      $("#liveText").textContent = "Served from the edge closest to you";
      setText("tCity", "Nearby"); setText("tCountry", "Location unavailable here");
      setText("tColo", "Edge"); setText("tProto", "HTTPS");
    });

  /* ---------- Live ping sparkline ---------- */
  const pings = [], MAXP = 30;
  const sparkLine = $("#sparkLine"), sparkArea = $("#sparkArea"), sparkDot = $("#sparkDot");
  const drawSpark = () => {
    if (!pings.length) return;
    const max = Math.max(60, ...pings) * 1.25, W = 300, H = 80, step = W / (MAXP - 1);
    const xy = pings.map((v, i) => [i * step, H - (v / max) * H]);
    const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    sparkLine.setAttribute("d", d);
    sparkArea.setAttribute("d", `${d} L${xy[xy.length - 1][0].toFixed(1)} ${H} L0 ${H} Z`);
    const [lx, ly] = xy[xy.length - 1];
    sparkDot.setAttribute("cx", lx); sparkDot.setAttribute("cy", ly);
    const now = pings[pings.length - 1], min = Math.min(...pings), avg = pings.reduce((a, b) => a + b, 0) / pings.length;
    setText("tPingNow", `${Math.round(now)} ms`);
    setText("tPingStats", `${pings.length} pings · best ${Math.round(min)} ms · average ${Math.round(avg)} ms`);
  };
  let pingTimer = null, pingCount = 0;
  const ping = async () => {
    const s = performance.now();
    try {
      const r = await fetch(`/api/ping?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw 0;
      pings.push(performance.now() - s);
      if (pings.length > MAXP) pings.shift();
      drawSpark();
    } catch { setText("tPingStats", "Live ping runs on the deployed site"); stopPing(); }
    if (++pingCount > 240) stopPing();
  };
  const startPing = () => { if (!pingTimer) { ping(); pingTimer = setInterval(ping, 1200); } };
  const stopPing = () => { clearInterval(pingTimer); pingTimer = null; };
  whenVisible($("#speed"), startPing, stopPing);

  /* ---------- Hosting network canvas ---------- */
  const netCv = $("#net");
  const EDGES = CITIES.map((c) => ({ x: (c[2] + 180) / 360, y: (90 - c[1]) / 180, name: c[0], flash: 0 }))
    .concat([{ x: (HOME.lon + 180) / 360, y: (90 - HOME.lat) / 180, name: "Pasadena", flash: 0, home: true }]);
  const net = {
    packets: [], running: false, last: 0, spawnAcc: 0,
    resize() { Object.assign(this, fitCanvas(netCv)); if (!this.running) this.draw(0); },
    map(e) { const padX = 18, padY = 14, yr = [0.12, 0.82]; return [padX + e.x * (this.w - padX * 2), padY + ((e.y - yr[0]) / (yr[1] - yr[0])) * (this.h - padY * 2)]; },
    spawn() {
      const vx = Math.random(), vy = 0.18 + Math.random() * 0.58;
      let best = null, bd = 1e9;
      for (const e of EDGES) { const d = (e.x - vx) ** 2 + (e.y - vy) ** 2; if (d < bd) { bd = d; best = e; } }
      this.packets.push({ from: { x: vx, y: vy }, to: best, t: 0, back: false });
    },
    draw(dt) {
      const { ctx, w, h } = this;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      // dot grid
      ctx.fillStyle = "rgba(168,198,255,0.12)";
      for (let x = 10; x < w; x += 16) for (let y = 8; y < h; y += 16) ctx.fillRect(x, y, 1.2, 1.2);
      // backbone
      const home = EDGES[EDGES.length - 1], [hx, hy] = this.map(home);
      ctx.lineWidth = 1;
      for (const e of EDGES) {
        if (e.home) continue;
        const [x, y] = this.map(e);
        ctx.strokeStyle = "rgba(46,155,255,0.12)";
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + x) / 2, Math.min(hy, y) - 40, x, y); ctx.stroke();
      }
      // packets
      for (const p of this.packets) {
        p.t += dt * (p.back ? 1.6 : 1.3);
        const [ex, ey] = this.map(p.to), [vx, vy] = this.map({ x: p.from.x, y: p.from.y });
        const t = Math.min(1, p.t), a = p.back ? [ex, ey] : [vx, vy], b = p.back ? [vx, vy] : [ex, ey];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 18;
        const qx = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * mx + t * t * b[0], qy = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * my + t * t * b[1];
        ctx.strokeStyle = p.back ? "rgba(246,130,31,0.35)" : "rgba(46,155,255,0.35)";
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mx, my, b[0], b[1]); ctx.stroke();
        const col = p.back ? C.orange : C.blue;
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(qx, qy, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        if (!p.back) { ctx.fillStyle = "rgba(46,155,255,0.6)"; ctx.beginPath(); ctx.arc(vx, vy, 2, 0, Math.PI * 2); ctx.fill(); }
        if (t >= 1) { if (!p.back) { p.back = true; p.t = 0; p.to.flash = 1; } else p.done = true; }
      }
      this.packets = this.packets.filter((p) => !p.done);
      // edges
      for (const e of EDGES) {
        const [x, y] = this.map(e);
        e.flash = Math.max(0, e.flash - dt * 1.6);
        if (e.home) {
          ctx.fillStyle = C.fg; ctx.shadowColor = C.blue; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          ctx.font = "600 10px 'JetBrains Mono', monospace"; ctx.fillStyle = C.ice; ctx.fillText("PASADENA STUDIO", x + 10, y + 4);
          continue;
        }
        ctx.fillStyle = C.orange;
        ctx.beginPath(); ctx.arc(x, y, 3 + e.flash * 2, 0, Math.PI * 2); ctx.fill();
        if (e.flash > 0) { ctx.strokeStyle = `rgba(251,173,65,${e.flash.toFixed(2)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 6 + (1 - e.flash) * 14, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
      }
    },
    loop(ts) {
      if (!this.running) return;
      const dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0.016;
      this.last = ts;
      this.spawnAcc += dt;
      while (this.spawnAcc > 0.22) { this.spawnAcc -= 0.22; if (this.packets.length < 40) this.spawn(); }
      this.draw(dt);
      requestAnimationFrame((t) => this.loop(t));
    },
    start() { if (reduce || this.running) return; this.running = true; this.last = 0; requestAnimationFrame((t) => this.loop(t)); },
    stop() { this.running = false; }
  };
  net.resize();
  if (reduce) { for (let i = 0; i < 14; i++) net.spawn(); net.packets.forEach((p) => (p.t = Math.random() * 0.9)); net.draw(0); }
  window.addEventListener("resize", () => net.resize());
  whenVisible(netCv, () => net.start(), () => net.stop());

  /* ---------- Prompt → Production ---------- */
  const SCEN = [
    { prompt: "late-night taco truck in Echo Park, loud", slug: "noche-tacos", name: "Noche Tacos", tag: "Echo Park's loudest late-night window. Al pastor off the trompo until 3 am.", c1: "See the menu", c2: "Find the truck", voice: "playful, after-dark", pal: "ember / cream / ink", type: "Montserrat Black", bg: "#FFF4E6", fg: "#2B1408", acc: "#D2380F" },
    { prompt: "boutique reformer pilates studio in Pasadena, calm + premium", slug: "still-point", name: "Still Point Pilates", tag: "Reformer classes for strong, quiet bodies. Six machines, never crowded.", c1: "Book a class", c2: "Meet the coaches", voice: "calm, premium", pal: "sage / linen / pine", type: "Montserrat Light + Bold", bg: "#EEF2EC", fg: "#1F2A24", acc: "#5E7F6B" },
    { prompt: "electric bike shop in Long Beach, test rides daily", slug: "volt-cycle", name: "Volt Cycle Co.", tag: "Long Beach e-bikes, tuned in-house. Test-ride any bike, any day.", c1: "Book a test ride", c2: "Shop bikes", voice: "energetic, technical", pal: "volt / graphite / white", type: "Montserrat Black Italic", bg: "#0E1116", fg: "#F4F7FA", acc: "#FFD23F" }
  ];
  const term = $("#termBody"), mini = $("#miniSite");
  let scenIdx = 0, runId = 0, p2pVisible = false, cycleTimer = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const line = (cls, text) => { const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = text; return s; };
  const applySite = (s) => {
    mini.style.background = s.bg; mini.style.color = s.fg;
    setText("miniUrl", `https://${s.slug}.sterling.dev`);
    setText("miniName", s.name); setText("miniTag", s.tag);
    const c1 = $("#miniC1"), c2 = $("#miniC2");
    c1.textContent = s.c1; c2.textContent = s.c2;
    c1.style.background = s.acc; c1.style.color = s.bg;
    c2.style.background = "transparent"; c2.style.color = s.fg; c2.style.boxShadow = `inset 0 0 0 1.5px ${s.fg}`;
    $("#miniName").style.color = s.acc;
    setText("dep1", `${s.slug} · production`);
  };
  const run = async (i) => {
    const id = ++runId, s = SCEN[i], alive = () => id === runId;
    $$(".pchip").forEach((b, k) => b.classList.toggle("active", k === i));
    clearTimeout(cycleTimer);
    if (reduce) {
      term.textContent = "";
      [["bl", "✴︎ "], ["p", "describe your business:\n"], ["", `“${s.prompt}”\n`], ["ok", `✓ brand voice ...... ${s.voice}\n`], ["ok", `✓ palette .......... ${s.pal}\n`], ["ok", `✓ type ............. ${s.type}\n`], ["ok", "✓ deployed ......... 330/330 edge cities\n"]].forEach(([c, t]) => term.append(line(c, t)));
      applySite(s); setText("depCount", "330 / 330"); return;
    }
    term.textContent = "";
    mini.classList.add("booting");
    const badge = $("#deploys .badge"); badge.className = "badge build"; badge.textContent = "Building";
    setText("depCount", "0 / 330");
    term.append(line("bl", "✴︎ "), line("p", "describe your business:\n"));
    const typed = line("", "“"); term.append(typed);
    const cur = document.createElement("span"); cur.className = "cur"; term.append(cur);
    for (const ch of s.prompt) { if (!alive()) return; typed.textContent += ch; await sleep(28 + Math.random() * 40); }
    typed.textContent += "”\n";
    const steps = [["ok", `✓ brand voice ...... ${s.voice}\n`], ["ok", `✓ palette .......... ${s.pal}\n`], ["ok", `✓ type ............. ${s.type}\n`], ["ok", "✓ copy + images .... generated\n"]];
    for (const [c, t] of steps) { await sleep(420); if (!alive()) return; term.insertBefore(line(c, t), cur); }
    await sleep(300); if (!alive()) return;
    applySite(s); mini.classList.remove("booting");
    const dep = line("or", "↻ deploying to edge . 0/330\n"); term.insertBefore(dep, cur);
    for (let n = 0; n <= 330; n += 11) { if (!alive()) return; dep.textContent = `↻ deploying to edge . ${n}/330\n`; setText("depCount", `${n} / 330`); await sleep(28); }
    dep.className = "ok"; dep.textContent = "✓ deployed ......... 330/330 edge cities\n";
    setText("depCount", "330 / 330");
    badge.className = "badge ok"; badge.textContent = "Deployed";
    term.insertBefore(line("bl", "✴︎ "), cur);
    cycleTimer = setTimeout(() => { if (p2pVisible && alive()) { scenIdx = (scenIdx + 1) % SCEN.length; run(scenIdx); } }, 6000);
  };
  applySite(SCEN[0]);
  $$(".pchip").forEach((b) => b.addEventListener("click", () => { scenIdx = +b.dataset.i; run(scenIdx); }));
  let p2pStarted = false;
  whenVisible($(".p2p"), () => { p2pVisible = true; if (!p2pStarted) { p2pStarted = true; run(0); } }, () => { p2pVisible = false; });
})();
