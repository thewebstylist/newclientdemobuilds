(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header state + mobile CTA ---------- */
  var header = document.querySelector('.site-header');
  var mobileCta = document.querySelector('.mobile-cta');
  var hero = document.querySelector('.hero');

  function onScrollState() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (mobileCta && hero) {
      mobileCta.classList.toggle('is-visible', y > hero.offsetHeight * 0.6);
    }
  }

  /* ---------- Parallax (transform-based, works on iOS) ----------
     Each layer eases toward its target position, so the background drifts
     and settles softly instead of tracking the scroll wheel rigidly. */
  var layers = Array.prototype.slice.call(document.querySelectorAll('.parallax-media')).map(function (el) {
    return { el: el, speed: parseFloat(el.getAttribute('data-speed')) || 0.3, current: 0, target: 0 };
  });
  var parallaxRunning = false;

  function measureParallax() {
    var vh = window.innerHeight;
    layers.forEach(function (layer) {
      var rect = layer.el.parentElement.getBoundingClientRect();
      if (rect.bottom < -vh * 0.5 || rect.top > vh * 1.5) return;
      var center = rect.top + rect.height / 2 - vh / 2;
      var max = rect.height * 0.17;
      layer.target = Math.max(-max, Math.min(max, -center * layer.speed * 0.35));
    });
  }

  function stepParallax() {
    var moving = false;
    layers.forEach(function (layer) {
      var diff = layer.target - layer.current;
      if (Math.abs(diff) > 0.05) {
        layer.current += diff * 0.075;
        moving = true;
      } else {
        layer.current = layer.target;
      }
      layer.el.style.transform = 'translate3d(0,' + layer.current.toFixed(2) + 'px,0)';
    });
    if (moving) requestAnimationFrame(stepParallax);
    else parallaxRunning = false;
  }

  function updateParallax() {
    if (reduceMotion || !layers.length) return;
    measureParallax();
    if (!parallaxRunning) {
      parallaxRunning = true;
      requestAnimationFrame(stepParallax);
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollState();
      updateParallax();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScrollState();
  if (!reduceMotion) {
    measureParallax();
    layers.forEach(function (layer) { layer.current = layer.target; });
    stepParallax();
  }

  /* ---------- Slow, eased in-page scrolling ---------- */
  function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  var scrollAnim = null;

  function cancelScrollAnim() {
    if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = null; }
  }
  ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, cancelScrollAnim, { passive: true });
  });

  function glideTo(targetY) {
    cancelScrollAnim();
    var startY = window.scrollY;
    var distance = targetY - startY;
    if (reduceMotion || Math.abs(distance) < 2) { window.scrollTo(0, targetY); return; }
    var duration = Math.min(2200, Math.max(1000, 800 + Math.abs(distance) * 0.22));
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      window.scrollTo(0, startY + distance * easeInOutSine(t));
      scrollAnim = t < 1 ? requestAnimationFrame(frame) : null;
    }
    scrollAnim = requestAnimationFrame(frame);
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var offset = id === '#top' ? 0 : 76;
    var y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - offset;
    glideTo(Math.max(0, y));
    if (history.replaceState) history.replaceState(null, '', id);
    if (id !== '#top' && id !== '#main') {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');
  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
  }
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('is-open', !open);
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Active nav link ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-menu a[href^="#"]:not(.btn)'));
  if ('IntersectionObserver' in window) {
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) sectionObs.observe(target);
    });
  }

  /* ---------- Reveal on scroll (with gentle stagger) ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    // stagger siblings that share a parent
    reveals.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains('reveal'); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i * 0.14, 0.7) + 's');
    });
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revealObs.observe(el); });
  }

  /* ---------- Soft height animation shared by the bio and FAQ ---------- */
  var CALM = 'cubic-bezier(.45, .05, .2, 1)';

  function animateHeight(el, from, to, duration, done) {
    if (el._anim) el._anim.cancel();
    if (reduceMotion || !el.animate) { done && done(); return; }
    el.style.overflow = 'hidden';
    var anim = el.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: duration, easing: CALM });
    el._anim = anim;
    anim.onfinish = function () {
      el._anim = null;
      el.style.overflow = '';
      done && done();
    };
  }

  /* ---------- Bio expand ---------- */
  var bioBtn = document.querySelector('[data-bio-toggle]');
  var bio = document.getElementById('bio-more');
  if (bioBtn && bio) {
    Array.prototype.forEach.call(bio.children, function (p, i) { p.style.setProperty('--i', i); });

    bioBtn.addEventListener('click', function () {
      var collapsed = bio.getAttribute('data-collapsed') === 'true';
      var from = bio.getBoundingClientRect().height;
      if (collapsed) {
        bio.classList.remove('is-closing');
        bio.setAttribute('data-collapsed', 'false');
        var full = bio.scrollHeight;
        bioBtn.setAttribute('aria-expanded', 'true');
        bioBtn.textContent = 'Show less';
        animateHeight(bio, from, full, 1400);
      } else {
        bio.classList.add('is-closing');
        bioBtn.setAttribute('aria-expanded', 'false');
        bioBtn.textContent = 'Read Nicole’s full story';
        bio.setAttribute('data-collapsed', 'true');
        animateHeight(bio, from, 0, 1100, function () { bio.classList.remove('is-closing'); });
      }
    });
  }

  /* ---------- FAQ: gentle open/close ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.faq-list details'), function (item) {
    var summary = item.querySelector('summary');
    if (item.open) item.classList.add('is-expanded');

    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var closedH = summary.offsetHeight;
      var from = item.getBoundingClientRect().height;

      if (!item.classList.contains('is-expanded')) {
        item.open = true;
        item.classList.add('is-expanded');
        var full = item.scrollHeight;
        animateHeight(item, from, full, 1000);
      } else {
        item.classList.remove('is-expanded');
        animateHeight(item, from, closedH, 850, function () {
          if (!item.classList.contains('is-expanded')) item.open = false;
        });
      }
    });
  });

  /* ---------- Open now / today (Pacific time) ---------- */
  try {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    var mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
    var schedule = { 1: [540, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [600, 960] };

    document.querySelectorAll('.hours [data-days]').forEach(function (row) {
      if (row.getAttribute('data-days').split(',').indexOf(String(day)) !== -1) row.classList.add('is-today');
    });

    var status = document.querySelector('[data-open-status]');
    if (status && day !== -1) {
      var today = schedule[day];
      var open = today && mins >= today[0] && mins < today[1];
      status.textContent = open ? 'Open now' : 'Closed now';
      status.classList.toggle('is-open', !!open);
      status.hidden = false;
    }
  } catch (e) { /* non-essential */ }

  /* ---------- Year ---------- */
  var yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
