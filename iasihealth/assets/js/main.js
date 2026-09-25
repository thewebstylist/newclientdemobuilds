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

  /* ---------- Parallax (transform-based, works on iOS) ---------- */
  var layers = Array.prototype.slice.call(document.querySelectorAll('.parallax-media'));

  function updateParallax() {
    if (reduceMotion) return;
    var vh = window.innerHeight;
    layers.forEach(function (layer) {
      var section = layer.parentElement;
      var rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      var speed = parseFloat(layer.getAttribute('data-speed')) || 0.3;
      // progress: -1 (section below viewport) .. 1 (section above viewport)
      var center = rect.top + rect.height / 2 - vh / 2;
      var shift = -center * speed * 0.35;
      var max = rect.height * 0.17;
      shift = Math.max(-max, Math.min(max, shift));
      layer.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
    });
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
  updateParallax();

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
      if (i > 0) el.style.setProperty('--d', Math.min(i * 0.09, 0.45) + 's');
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

  /* ---------- Bio expand ---------- */
  var bioBtn = document.querySelector('[data-bio-toggle]');
  var bio = document.getElementById('bio-more');
  if (bioBtn && bio) {
    bioBtn.addEventListener('click', function () {
      var collapsed = bio.getAttribute('data-collapsed') === 'true';
      if (collapsed) {
        bio.style.maxHeight = bio.scrollHeight + 'px';
        setTimeout(function () { if (bio.getAttribute('data-collapsed') === 'false') bio.style.maxHeight = 'none'; }, 750);
        bio.setAttribute('data-collapsed', 'false');
        bioBtn.setAttribute('aria-expanded', 'true');
        bioBtn.textContent = 'Show less';
      } else {
        bio.style.maxHeight = bio.scrollHeight + 'px';
        bio.offsetHeight; // reflow so the collapse animates
        bio.style.maxHeight = '0px';
        bio.setAttribute('data-collapsed', 'true');
        bioBtn.setAttribute('aria-expanded', 'false');
        bioBtn.textContent = 'Read Nicole’s full story';
      }
    });
  }

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
