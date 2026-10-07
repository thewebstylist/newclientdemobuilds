(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vh = window.innerHeight;
  var vw = window.innerWidth;

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Page-load entrance ---------- */
  function markLoaded() {
    requestAnimationFrame(function () { doc.classList.add('is-loaded'); });
  }
  if (document.readyState === 'complete') markLoaded();
  else window.addEventListener('load', markLoaded);
  // Don't hold the entrance hostage to slow images.
  setTimeout(markLoaded, 1400);

  /* ---------- Header: solid on scroll, hides going down, returns going up ---------- */
  var header = document.querySelector('.site-header');
  var progress = document.querySelector('.scroll-progress');
  var lastY = window.scrollY;
  var menuOpen = false;

  function updateHeader() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 30);
    if (!menuOpen) {
      if (y > 320 && y > lastY + 4) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 320) header.classList.remove('is-hidden');
    }
    lastY = y;
    if (progress) {
      var max = document.documentElement.scrollHeight - vh;
      progress.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
    }
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var overlay = document.querySelector('.menu-overlay');

  function setMenu(open) {
    menuOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    overlay.classList.toggle('is-open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    header.classList.toggle('menu-open', open);
    header.classList.remove('is-hidden');
    document.body.classList.toggle('is-locked', open);
    if (open) {
      var first = overlay.querySelector('a');
      if (first) setTimeout(function () { first.focus(); }, 350);
    }
  }

  if (toggle && overlay) {
    toggle.addEventListener('click', function () { setMenu(!menuOpen); });
    $all('a', overlay).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); toggle.focus(); }
    });
  }

  /* ---------- Split headings into masked words ---------- */
  function splitInto(node, counter) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var parts = child.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var outer = document.createElement('span');
          outer.className = 'split-word';
          var inner = document.createElement('span');
          inner.className = 'split-word__inner';
          inner.style.setProperty('--i', counter.i++);
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        splitInto(child, counter);
      }
    });
  }

  $all('[data-split]').forEach(function (el) {
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    splitInto(el, { i: 0 });
    $all('.split-word', el).forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
  });

  /* ---------- Delays and staggers ---------- */
  $all('[data-delay]').forEach(function (el) {
    el.style.setProperty('--d', el.getAttribute('data-delay') + 's');
  });
  $all('[data-stagger]').forEach(function (group) {
    var step = parseFloat(group.getAttribute('data-stagger')) || 0.12;
    $all('[data-reveal]', group).forEach(function (el, i) {
      el.style.setProperty('--d', (i * step).toFixed(2) + 's');
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealTargets = $all('[data-reveal], [data-split], [data-observe]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    // A fully clipped element never counts as intersecting, so clip reveals
    // watch their parent and are switched on through this map.
    var watched = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        (watched.get(entry.target) || []).forEach(function (el) { el.classList.add('is-in'); });
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    revealTargets.forEach(function (el) {
      var clip = /^clip/.test(el.getAttribute('data-reveal') || '');
      var target = clip ? el.parentElement : el;
      if (!watched.has(target)) watched.set(target, []);
      watched.get(target).push(el);
      io.observe(target);
    });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Count-up numbers ---------- */
  $all('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduceMotion || !('IntersectionObserver' in window)) { el.textContent = target; return; }
    el.textContent = '0';
    var cio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      cio.disconnect();
      var start = null;
      var dur = 1800;
      function tick(t) {
        if (!start) start = t;
        var p = clamp((t - start) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    cio.observe(el);
  });

  /* ---------- Scroll-scrubbed statement text ---------- */
  var scrubs = $all('[data-scrub]').map(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = '';
    var spans = words.map(function (w, i) {
      var s = document.createElement('span');
      s.className = 'scrub-word';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    return { el: el, words: spans };
  });

  function updateScrubs() {
    scrubs.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      var p = reduceMotion ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      var lit = Math.round(p * s.words.length);
      s.words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
    });
  }

  /* ---------- Parallax (transform-based, eased) ---------- */
  var layers = $all('[data-parallax]').map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.15, cur: 0, target: 0 };
  });

  function measureParallax() {
    layers.forEach(function (l) {
      var ref = l.el.classList.contains('parallax-img') ? l.el.parentElement : l.el;
      var r = ref.getBoundingClientRect();
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
      var offset = r.top + r.height / 2 - vh / 2;
      l.target = -offset * l.speed;
      if (l.el.classList.contains('parallax-img')) {
        var max = r.height * 0.11;
        l.target = clamp(l.target, -max, max);
      }
    });
  }

  function stepParallax() {
    var moving = false;
    layers.forEach(function (l) {
      var d = l.target - l.cur;
      if (Math.abs(d) > 0.1) { l.cur += d * 0.12; moving = true; } else { l.cur = l.target; }
      l.el.style.transform = 'translate3d(0,' + l.cur.toFixed(2) + 'px,0)';
    });
    return moving;
  }

  /* ---------- Expanding image section ---------- */
  var expands = $all('.expand');
  function updateExpands() {
    expands.forEach(function (sec) {
      var r = sec.getBoundingClientRect();
      var span = r.height - vh;
      var p = span > 0 ? clamp(-r.top / span, 0, 1) : 1;
      var grow = clamp(p / 0.65, 0, 1);
      var e = 1 - Math.pow(1 - grow, 3);
      var narrow = vw < 860;
      sec.style.setProperty('--inset-y', ((narrow ? 14 : 18) * (1 - e)).toFixed(2) + '%');
      sec.style.setProperty('--inset-x', ((narrow ? 8 : 22) * (1 - e)).toFixed(2) + '%');
      sec.style.setProperty('--inset-r', (24 * (1 - e)).toFixed(1) + 'px');
      sec.style.setProperty('--img-scale', (1.15 - 0.15 * e).toFixed(3));
      sec.style.setProperty('--cap-o', clamp((p - 0.5) / 0.3, 0, 1).toFixed(3));
    });
  }

  /* ---------- Pinned horizontal journey ---------- */
  var hj = document.querySelector('.hjourney');
  var hjTrack = hj && hj.querySelector('.hjourney__track');
  var hjCards = hj ? $all('.journey-card', hj) : [];
  var hjNow = hj && hj.querySelector('[data-hj-now]');
  var hjBar = hj && hj.querySelector('.hjourney__bar');
  var hjDistance = 0;

  function setupJourney() {
    if (!hj) return;
    var pin = !reduceMotion && vw >= 900;
    hj.classList.toggle('is-pinned', pin);
    if (pin) {
      hjTrack.style.transform = '';
      hjDistance = Math.max(0, hjTrack.scrollWidth - vw);
      hj.style.height = (hjDistance + vh) + 'px';
    } else {
      hj.style.height = '';
      hjTrack.style.transform = '';
      hjDistance = 0;
    }
  }

  function setJourneyProgress(p) {
    if (hjBar) hjBar.style.setProperty('--p', p.toFixed(3));
    if (hjNow) {
      var idx = clamp(Math.round(p * (hjCards.length - 1)) + 1, 1, hjCards.length);
      hjNow.textContent = (idx < 10 ? '0' : '') + idx;
    }
  }

  function updateJourney() {
    if (!hj || !hj.classList.contains('is-pinned')) return;
    var r = hj.getBoundingClientRect();
    var span = r.height - vh;
    var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    hjTrack.style.transform = 'translate3d(' + (-p * hjDistance).toFixed(1) + 'px,0,0)';
    setJourneyProgress(p);
  }

  if (hjTrack) {
    hjTrack.addEventListener('scroll', function () {
      if (hj.classList.contains('is-pinned')) return;
      var max = hjTrack.scrollWidth - hjTrack.clientWidth;
      setJourneyProgress(max > 0 ? hjTrack.scrollLeft / max : 0);
    }, { passive: true });
  }

  /* ---------- Scroll loop ---------- */
  var ticking = false;
  var animating = false;

  function frame() {
    ticking = false;
    updateHeader();
    updateScrubs();
    if (!reduceMotion) {
      updateExpands();
      updateJourney();
      measureParallax();
      if (!animating) { animating = true; requestAnimationFrame(animateLoop); }
    }
  }

  function animateLoop() {
    if (stepParallax()) requestAnimationFrame(animateLoop);
    else animating = false;
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    vh = window.innerHeight;
    vw = window.innerWidth;
    setupJourney();
    onScroll();
  });
  window.addEventListener('load', function () { setupJourney(); onScroll(); });

  setupJourney();
  frame();

  /* ---------- Lightbox (images + video) ---------- */
  var icons = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg>'
  };

  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image viewer');
  lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML =
    '<div class="lightbox__top"><span class="lightbox__count"></span>' +
    '<button class="icon-btn lightbox__close" type="button" aria-label="Close">' + icons.close + '</button></div>' +
    '<div class="lightbox__stage">' +
    '<button class="icon-btn lightbox__prev" type="button" aria-label="Previous image">' + icons.prev + '</button>' +
    '<button class="icon-btn lightbox__next" type="button" aria-label="Next image">' + icons.next + '</button></div>' +
    '<div class="lightbox__caption" aria-live="polite"></div>';
  document.body.appendChild(lb);

  var lbStage = lb.querySelector('.lightbox__stage');
  var lbCount = lb.querySelector('.lightbox__count');
  var lbCaption = lb.querySelector('.lightbox__caption');
  var lbPrev = lb.querySelector('.lightbox__prev');
  var lbNext = lb.querySelector('.lightbox__next');
  var lbClose = lb.querySelector('.lightbox__close');
  var lbItems = [];
  var lbIndex = 0;
  var lbReturn = null;

  function clearStage() {
    $all('img, video', lbStage).forEach(function (m) {
      if (m.tagName === 'VIDEO') m.pause();
      m.remove();
    });
  }

  function showImage(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var item = lbItems[lbIndex];
    clearStage();
    var img = new Image();
    img.alt = item.getAttribute('data-alt') || '';
    img.onload = function () { img.classList.add('is-ready'); };
    img.src = item.getAttribute('data-src');
    lbStage.insertBefore(img, lbPrev);
    if (img.complete) img.classList.add('is-ready');
    var title = item.getAttribute('data-title');
    var cap = item.getAttribute('data-caption') || '';
    lbCaption.innerHTML = (title ? '<strong>' + title + '</strong> ' : '') + cap;
    lbCount.textContent = (lbIndex + 1 < 10 ? '0' : '') + (lbIndex + 1) + ' / ' + (lbItems.length < 10 ? '0' : '') + lbItems.length;
  }

  function openLightbox() {
    lbReturn = document.activeElement;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    setTimeout(function () { lbClose.focus(); }, 50);
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    setTimeout(clearStage, 500);
    if (lbReturn) lbReturn.focus();
  }

  $all('[data-lightbox]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var group = el.getAttribute('data-lightbox');
      lbItems = $all('[data-lightbox="' + group + '"]');
      var multi = lbItems.length > 1;
      lbPrev.hidden = !multi;
      lbNext.hidden = !multi;
      lb.setAttribute('aria-label', 'Image viewer');
      showImage(lbItems.indexOf(el));
      openLightbox();
    });
  });

  $all('[data-video]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      clearStage();
      lbItems = [];
      lbPrev.hidden = true;
      lbNext.hidden = true;
      var video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      el.getAttribute('data-video').split('|').forEach(function (src) {
        var s = document.createElement('source');
        s.src = src;
        s.type = 'video/mp4';
        video.appendChild(s);
      });
      lbStage.insertBefore(video, lbPrev);
      lbCount.textContent = '';
      lbCaption.textContent = el.getAttribute('data-title') || '';
      lb.setAttribute('aria-label', 'Video player');
      openLightbox();
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', function () { showImage(lbIndex - 1); });
  lbNext.addEventListener('click', function () { showImage(lbIndex + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lbStage) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (lbItems.length > 1 && e.key === 'ArrowLeft') showImage(lbIndex - 1);
    if (lbItems.length > 1 && e.key === 'ArrowRight') showImage(lbIndex + 1);
    if (e.key === 'Tab') {
      var focusables = $all('button:not([hidden]), video', lb);
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Contact form (design preview: nothing is sent yet) ---------- */
  var form = document.querySelector('[data-preview-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form__note');
      note.classList.add('is-visible');
      note.focus();
    });
  }
})();
