/* ForceSight USA — site behaviour */
(function () {
  'use strict';

  /* ---- scroll reveal ---------------------------------------------- */
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));

  function sweep() {
    var h = window.innerHeight || document.documentElement.clientHeight;
    for (var i = reveals.length - 1; i >= 0; i--) {
      var el = reveals[i];
      var r = el.getBoundingClientRect();
      // reveal anything at or above the fold — covers fast/jumped scrolls the
      // observer's async callback can miss
      if (r.top < h * 0.94 && r.bottom > 0) { el.classList.add('in'); reveals.splice(i, 1); }
      else if (r.bottom <= 0) { el.classList.add('in'); reveals.splice(i, 1); }
    }
    if (!reveals.length) {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    }
  }

  var ticking = false;
  function queue() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; sweep(); });
  }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  queue();

  /* ---- parallax ------------------------------------------------------
     Any [data-parallax] element drifts vertically against the scroll at its
     own rate. Offsets are measured from the element's distance to the centre
     of the viewport, so a layer sits at rest when it is centred and drifts
     symmetrically either side — no jump on entry, no accumulated drift.

     Only elements currently intersecting the viewport are written to, and
     writes happen once per frame inside rAF, so this stays off the layout
     path. --------------------------------------------------------------- */
  (function () {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var layers = [].slice.call(document.querySelectorAll('[data-parallax]'));
    if (!layers.length) return;

    var live = [];
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = live.indexOf(e.target);
        if (e.isIntersecting && i < 0) live.push(e.target);
        else if (!e.isIntersecting && i >= 0) live.splice(i, 1);
      });
    }, { rootMargin: '20% 0px' }) : null;

    layers.forEach(function (el) {
      el.__speed = parseFloat(el.getAttribute('data-parallax')) || 0.06;
      if (io) io.observe(el); else live.push(el);
    });

    function clear() {
      layers.forEach(function (el) { el.style.transform = ''; });
    }
    // no parallax on phones: it costs scroll smoothness on exactly the devices
    // least able to absorb it, and the layers are decorative
    function canRun() { return !reduced.matches && window.innerWidth >= 900; }

    var frame = false;
    var wasRunning = true;
    function paint() {
      frame = false;
      if (!canRun()) { if (wasRunning) { clear(); wasRunning = false; } return; }
      wasRunning = true;
      var mid = (window.innerHeight || 0) / 2;
      for (var i = 0; i < live.length; i++) {
        var el = live[i];
        var r = el.getBoundingClientRect();
        var delta = (r.top + r.height / 2) - mid;
        var y = -delta * el.__speed;
        if (y > 90) y = 90; else if (y < -90) y = -90;   // keep layers tethered
        el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
      }
    }
    function queue() {
      if (frame) return;
      frame = true;
      window.requestAnimationFrame(paint);
    }

    if (!canRun()) clear(); else queue();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    if (reduced.addEventListener) {
      reduced.addEventListener('change', function () { reduced.matches ? clear() : queue(); });
    }
  })();

  /* ---- 45-day plan: release the pinned intro with the final card --------
     position:sticky alone keeps the intro pinned until its container runs
     out, which leaves it stuck while the last day card is already fully in
     view. Once that card's bottom clears the viewport we translate the intro
     up by the same amount, so it travels with the content instead of waiting.
     The offset starts at 0 at the trigger point, so there is no jump. ----- */
  (function () {
    var head = document.querySelector('.tl-left .sec-head');
    var days = document.querySelectorAll('.day');
    if (!head || !days.length) return;
    var last = days[days.length - 1];
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var frame = false;

    function paint() {
      frame = false;
      if (reduced.matches || window.innerWidth < 900) { head.style.transform = ''; return; }
      // negative once the final card's bottom has risen above the fold; 0 while
      // it is still below, which is when the intro should stay pinned
      var slack = last.getBoundingClientRect().bottom - (window.innerHeight - 24);
      head.style.transform = slack < 0 ? 'translate3d(0,' + slack.toFixed(1) + 'px,0)' : '';
    }
    function queue() {
      if (frame) return;
      frame = true;
      window.requestAnimationFrame(paint);
    }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    queue();
  })();

  /* ---- mobile nav -------------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- scrollspy: pill the nav item for the section in view --------- */
  (function () {
    if (!links) return;
    var items = [].slice.call(links.querySelectorAll('a[href^="#"]'))
      .map(function (a) {
        var id = a.getAttribute('href').slice(1);
        return { a: a, el: id ? document.getElementById(id) : null };
      })
      .filter(function (i) { return i.el; });
    if (!items.length) return;

    var nav = document.querySelector('.site-nav');
    var current = null;

    function update() {
      var offset = (nav ? nav.offsetHeight : 80) + 24;
      var active = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].el.getBoundingClientRect().top <= offset) active = items[i];
      }
      // past the last section (footer/contact) — keep the last one lit
      var atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
      if (atBottom) active = items[items.length - 1];
      if (active === current) return;
      if (current) current.a.classList.remove('active');
      if (active) active.a.classList.add('active');
      current = active;
    }

    var pending = false;
    function onScroll() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () { pending = false; update(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ---- agent carousel: pinned stage, vertical scroll drives horizontal ---- */
  (function () {
    var stage = document.getElementById('agcStage');
    var track = document.getElementById('agcTrack');
    var bar = document.getElementById('agcBar');
    if (!stage || !track) return;

    var sticky = stage.querySelector('.agc-sticky');
    var nav = document.querySelector('.site-nav');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var distance = 0;
    var HOLD = 380;   // px of pinned dwell on the final card
    var SPEED = 1.9;  // vertical px per horizontal px — higher = slower travel

    function canPin() {
      return !reduced.matches && window.innerWidth >= 1024;
    }

    function layout() {
      if (!canPin()) {
        stage.classList.add('no-pin');
        stage.style.height = '';
        track.style.transform = '';
        return;
      }
      stage.classList.remove('no-pin');
      track.style.transform = '';                    // measure untranslated
      // measure against the TRACK, not the sticky window: the window now
      // bleeds to the viewport, so only the track's own width represents the
      // content gutter. Travel therefore ends with the last card flush right.
      var travel = track.scrollWidth - track.clientWidth;
      distance = Math.max(0, travel);
      // extra pinned scroll after the last card lands, so the panel dwells on it
      // for a beat before the page carries on
      stage.style.height = (sticky.offsetHeight + distance * SPEED + HOLD) + 'px';
      sticky.style.top = ((nav ? nav.offsetHeight : 80) + 24) + 'px';
      update();
    }

    function update() {
      if (!canPin() || distance <= 0) { if (bar) bar.style.transform = ''; return; }
      var scrolled = -stage.getBoundingClientRect().top;
      // map only the travel portion to 0..1 — the trailing HOLD px keep it pinned
      // at the last card instead of advancing further
      var p = scrolled / (distance * SPEED);
      p = Math.max(0, Math.min(1, p));
      track.style.transform = 'translate3d(' + (-p * distance) + 'px,0,0)';
      if (bar) bar.style.transform = 'translateX(' + (p * 300) + '%)';
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; update(); });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', layout);
    if (reduced.addEventListener) reduced.addEventListener('change', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    window.addEventListener('load', layout);
    layout();
  })();

  /* ---- lead form --------------------------------------------------- */
  var form = document.getElementById('lead');
  var thanks = document.getElementById('thanks');
  if (!form) return;

  // Point this at your CRM / form endpoint to go live.
  var ENDPOINT = '';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    data.source = 'forcesight-usa/index';
    data.page = location.pathname;
    data.submitted_at = new Date().toISOString();

    var done = function () {
      form.style.display = 'none';
      if (thanks) thanks.style.display = 'block';
    };

    if (!ENDPOINT) { console.log('lead', data); done(); return; }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(done).catch(function () {
      window.location.href = 'mailto:hello@forcesight.ai?subject=Discovery%20call%20request';
    });
  });
})();
