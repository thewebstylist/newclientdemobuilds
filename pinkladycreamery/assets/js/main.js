(function () {
  'use strict';

  var root = document.getElementById('plc-site');
  if (!root || root.getAttribute('data-ready')) return;
  root.setAttribute('data-ready', '1');
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || root).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- Split headings into words for a staggered rise ---------- */
  $$('.split').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var inner = document.createElement('span');
            inner.style.setProperty('--i', i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    })(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('.reveal, .reveal-mask, .split');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    // Chrome skips targets that are fully hidden by their own clip-path, so a
    // masked element is watched through its parent instead.
    var watchFor = [];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        watchFor.forEach(function (pair) { if (pair[0] === entry.target) pair[1].classList.add('is-in'); });
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) {
      var target = el.classList.contains('reveal-mask') ? el.parentElement : el;
      watchFor.push([target, el]);
      io.observe(target);
    });
  }

  /* ---------- Count-up stats ---------- */
  var counters = $$('[data-count]');
  function runCounter(el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    var start = null;
    var dur = 1800;
    function tick(t) {
      if (start === null) start = t;
      var p = clamp((t - start) / dur, 0, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (!reduceMotion && 'IntersectionObserver' in window) {
    counters.forEach(function (el) { el.textContent = '0'; });
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- Mobile menu ---------- */
  var toggle = $('.nav-toggle');
  var menu = $('#nav-menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- FAQ: eased open / close ---------- */
  $$('.faq-list details').forEach(function (d) {
    var summary = d.querySelector('summary');
    var body = d.querySelector('.faq-body');
    summary.addEventListener('click', function (e) {
      if (reduceMotion || !body.animate) return;
      e.preventDefault();
      if (d.open) {
        var anim = body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 450, easing: 'cubic-bezier(.45,.05,.2,1)' });
        anim.onfinish = function () { d.open = false; };
      } else {
        d.open = true;
        body.animate([{ height: '0px', opacity: 0 }, { height: body.offsetHeight + 'px', opacity: 1 }], { duration: 550, easing: 'cubic-bezier(.19,.72,.26,1)' });
      }
    });
  });

  /* ---------- Booking form -> pre-filled email ---------- */
  var form = $('.book-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('[required]', form).forEach(function (input) {
        var bad = !input.value.trim() || (input.type === 'email' && !/^\S+@\S+\.\S+$/.test(input.value));
        input.classList.toggle('is-invalid', bad);
        if (bad && ok) { input.focus(); ok = false; }
      });
      var note = $('.form-note', form);
      if (!ok) { note.textContent = 'Please add your name and a valid email so we can reply.'; return; }
      var f = form.elements;
      var lines = [
        'Name: ' + f.name.value,
        'Phone: ' + f.phone.value,
        'Email: ' + f.email.value,
        'Event date: ' + f.date.value,
        'Event time: ' + f.time.value,
        'Event location: ' + f.location.value,
        'Number of guests: ' + f.guests.value,
        '',
        f.message.value
      ];
      var subject = 'Event request' + (f.date.value ? ' for ' + f.date.value : '') + ' from ' + f.name.value;
      window.location.href = 'mailto:events@pinkladycreamery.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      note.textContent = 'Thank you! Your email app should open with your request ready to send.';
    });
  }

  var year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* =========================================================
     Scroll-driven motion. Every value eases toward its target,
     so things drift and settle softly rather than snapping.
     ========================================================= */
  var header = $('.site-header');
  var progressBar = $('.scroll-progress span');
  var hero = $('.hero');
  var mobileCta = $('.mobile-cta');
  var book = $('#book');
  var vh = window.innerHeight;
  var vw = window.innerWidth;
  var lastY = window.scrollY;

  var orbs = $$('.hero-visual [data-depth], .hero-visual .sprinkle, .hero-visual .flake').map(function (el, i) {
    var depth = parseFloat(el.getAttribute('data-depth'));
    if (isNaN(depth)) depth = (i % 2 ? 1 : -1) * (0.12 + (i % 4) * 0.07);
    var base = el.classList.contains('sprinkle') ? (getComputedStyle(el).transform === 'none' ? '' : getComputedStyle(el).transform) : '';
    return { el: el, depth: depth, base: base, cur: 0 };
  });
  var seal = $('[data-spin]');
  var sealAngle = 0;

  var tray = $('.tray-window');
  var trayP = 1;

  var marqueeTrack = $('.marquee-track');
  var marqueeX = 0, marqueeVisible = false, marqueeDir = -1, velocity = 0;
  if (marqueeTrack) marqueeTrack.innerHTML += marqueeTrack.innerHTML; // doubled for a seamless loop

  var toppingRows = $$('.topping-row').map(function (el) { return { el: el, dir: parseFloat(el.getAttribute('data-drift')) || 1, cur: 0 }; });

  var parallax = $$('.parallax-media').map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-speed')) || 0.3, cur: 0 };
  });

  var steps = $('.step-list');
  var stepItems = steps ? $$('.step', steps) : [];
  var stepP = 0;

  /* ---- Signature flavors: pinned horizontal scroll on wide screens ---- */
  var hs = $('.hscroll');
  var hsSticky = hs && $('.hscroll-sticky', hs);
  var hsTrack = hs && $('.hscroll-track', hs);
  var hsCards = hs ? $$('.flavor-card', hs) : [];
  var hsCount = hs && $('.hscroll-count b', hs);
  var hsBar = hs && $('.hscroll-bar', hs);
  var hsPinned = false, hsDistance = 0, hsX = 0, hsActive = -1;
  var flavorTotal = hsCards.filter(function (c) { return c.hasAttribute('data-tint'); }).length;

  function setActiveFlavor(i) {
    if (i === hsActive) return;
    hsActive = i;
    var card = hsCards[i];
    var tint = card && card.getAttribute('data-tint');
    hs.style.setProperty('--tint', tint || 'var(--cream)');
    if (hsCount) hsCount.textContent = String(Math.min(i + 1, flavorTotal)).padStart(2, '0');
  }

  function layoutHscroll() {
    if (!hs) return;
    var want = !reduceMotion && vw >= 900 && vh >= 560;
    hs.classList.toggle('is-pinned', want);
    hsPinned = want;
    if (want) {
      hsDistance = Math.max(0, hsTrack.scrollWidth - vw);
      hs.style.height = (hsSticky.offsetHeight + hsDistance) + 'px';
    } else {
      hs.style.height = '';
      hsTrack.style.transform = '';
      hsDistance = 0;
    }
  }

  if (hs && 'IntersectionObserver' in window) {
    // Swipe mode (phones/tablets): tint the section to whichever flavor is centered.
    var tio = new IntersectionObserver(function (entries) {
      if (hsPinned) return;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActiveFlavor(hsCards.indexOf(entry.target));
      });
    }, { root: $('.hscroll-viewport', hs), threshold: 0.6 });
    hsCards.forEach(function (c) { tio.observe(c); });
  }

  if (marqueeTrack && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      marqueeVisible = entries[0].isIntersecting;
      if (marqueeVisible) kick();
    }).observe(marqueeTrack.parentNode);
  }

  function progressOf(el, startAt, endAt) {
    // 0 when el's top reaches startAt*vh, 1 when it reaches endAt*vh
    var r = el.getBoundingClientRect();
    return clamp((startAt * vh - r.top) / ((startAt - endAt) * vh), 0, 1);
  }

  function inView(el, margin) {
    var r = el.getBoundingClientRect();
    return r.bottom > -(margin || 0) && r.top < vh + (margin || 0);
  }

  var running = false;
  function frame() {
    var y = window.scrollY;
    var dy = y - lastY;
    lastY = y;
    velocity = lerp(velocity, dy, 0.12);
    if (Math.abs(dy) > 0.5) marqueeDir = dy > 0 ? -1 : 1;
    var moving = false;
    var docH = document.documentElement.scrollHeight - vh;

    // header + progress
    if (header) {
      header.classList.toggle('is-scrolled', y > 30);
      var menuOpen = menu && menu.classList.contains('is-open');
      if (!menuOpen && Math.abs(dy) > 4) header.classList.toggle('is-hidden', dy > 0 && y > vh * 0.9);
    }
    if (progressBar) progressBar.style.transform = 'scaleX(' + (docH > 0 ? y / docH : 0).toFixed(4) + ')';
    if (mobileCta && hero) {
      var nearBook = book && book.getBoundingClientRect().top < vh * 0.9;
      mobileCta.classList.toggle('is-visible', y > hero.offsetHeight * 0.7 && !nearBook);
    }

    if (!reduceMotion) {
      // hero orbs, sprinkles and the spinning seal
      if (hero && y < hero.offsetHeight + 200) {
        orbs.forEach(function (o) {
          var target = y * o.depth;
          o.cur = lerp(o.cur, target, 0.09);
          if (Math.abs(target - o.cur) > 0.1) moving = true;
          o.el.style.transform = 'translate3d(0,' + o.cur.toFixed(2) + 'px,0) ' + (o.base || 'rotate(' + (o.cur * 0.06).toFixed(2) + 'deg)');
        });
        if (seal) {
          var targetA = y * 0.18;
          sealAngle = lerp(sealAngle, targetA, 0.08);
          if (Math.abs(targetA - sealAngle) > 0.05) moving = true;
          seal.querySelector('svg').style.transform = 'rotate(' + sealAngle.toFixed(2) + 'deg)';
        }
      }

      // tray window opens up as it rises into view
      if (tray && inView(tray, 200)) {
        var tp = progressOf(tray, 1, 0.25);
        trayP = lerp(trayP, tp, 0.1);
        if (Math.abs(tp - trayP) > 0.001) moving = true;
        tray.style.setProperty('--p', trayP.toFixed(4));
      }

      // flavor marquee: drifts on its own, speeds up with scroll, follows scroll direction
      if (marqueeTrack && marqueeVisible) {
        var half = marqueeTrack.scrollWidth / 2;
        marqueeX += (0.45 + Math.min(Math.abs(velocity) * 0.35, 14)) * marqueeDir;
        if (marqueeX <= -half) marqueeX += half;
        if (marqueeX > 0) marqueeX -= half;
        marqueeTrack.style.transform = 'translate3d(' + marqueeX.toFixed(2) + 'px,0,0)';
        moving = true;
      }

      // topping rows slide in opposite directions
      toppingRows.forEach(function (row) {
        if (!inView(row.el.parentNode, 200)) return;
        var r = row.el.parentNode.getBoundingClientRect();
        var p = (vh - r.top) / (vh + r.height); // 0..1 across its pass
        var target = (p - 0.5) * vw * 0.35 * row.dir;
        row.cur = lerp(row.cur, target, 0.08);
        if (Math.abs(target - row.cur) > 0.1) moving = true;
        row.el.style.transform = 'translate3d(' + row.cur.toFixed(2) + 'px,0,0)';
      });

      // background parallax
      parallax.forEach(function (l) {
        var r = l.el.parentElement.getBoundingClientRect();
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
        var center = r.top + r.height / 2 - vh / 2;
        var max = r.height * 0.16;
        var target = clamp(-center * l.speed * 0.4, -max, max);
        l.cur = lerp(l.cur, target, 0.08);
        if (Math.abs(target - l.cur) > 0.05) moving = true;
        l.el.style.transform = 'translate3d(0,' + l.cur.toFixed(2) + 'px,0)';
      });

      // how-it-works line draws as you read down the steps
      if (steps && inView(steps, 100)) {
        var sr = steps.getBoundingClientRect();
        var sp = clamp((vh * 0.6 - sr.top) / sr.height, 0, 1);
        stepP = lerp(stepP, sp, 0.1);
        if (Math.abs(sp - stepP) > 0.001) moving = true;
        steps.style.setProperty('--p', stepP.toFixed(4));
        stepItems.forEach(function (s) { s.classList.toggle('is-lit', s.getBoundingClientRect().top < vh * 0.6); });
      }
    }

    // pinned horizontal flavors
    if (hsPinned && inView(hs, 0)) {
      var hr = hs.getBoundingClientRect();
      var hp = clamp(-hr.top / Math.max(1, hsDistance), 0, 1);
      var targetX = -hp * hsDistance;
      hsX = lerp(hsX, targetX, 0.1);
      if (Math.abs(targetX - hsX) > 0.1) moving = true;
      hsTrack.style.transform = 'translate3d(' + hsX.toFixed(2) + 'px,0,0)';
      if (hsBar) hsBar.style.setProperty('--hp', (-hsX / Math.max(1, hsDistance)).toFixed(4));
      // active = card closest to the viewport center; cards also spin a touch as they travel
      var best = 0, bestD = Infinity;
      hsCards.forEach(function (c, i) {
        var cr = c.getBoundingClientRect();
        var d = cr.left + cr.width / 2 - vw / 2;
        if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
        var img = c.querySelector('.flavor-img img');
        if (img) img.style.setProperty('--spin', (d / vw * -40).toFixed(2) + 'deg');
      });
      setActiveFlavor(best);
    }

    if (moving) requestAnimationFrame(frame);
    else running = false;
  }

  function kick() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () {
    vh = window.innerHeight;
    vw = window.innerWidth;
    layoutHscroll();
    kick();
  });
  window.addEventListener('load', function () { layoutHscroll(); kick(); });
  // Re-measure the flavor track as its photos load (their widths are fixed, but be safe).
  if (hsTrack) $$('img', hsTrack).forEach(function (img) { if (!img.complete) img.addEventListener('load', layoutHscroll, { once: true }); });

  if (!reduceMotion && tray) { trayP = progressOf(tray, 1, 0.25); tray.style.setProperty('--p', trayP); }
  layoutHscroll();
  if (hs) setActiveFlavor(0);
  kick();

  /* ---------- Active nav link ---------- */
  var navLinks = $$('.nav-menu a[href^="#"]:not(.btn)');
  if ('IntersectionObserver' in window && navLinks.length) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var target = root.querySelector(a.getAttribute('href'));
      if (target) nio.observe(target);
    });
  }
})();
