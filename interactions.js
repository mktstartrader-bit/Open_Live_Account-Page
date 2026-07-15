/* ============================================================
   STARTRADER — Open Live Account · interactions
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- reveal on load / scroll ---------- */
  var revealEls = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.01, rootMargin: '0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- method toggle: sliding pill + icon/label swap ---------- */
  var card     = $('.card');
  var glider   = $('.method__glider');
  var tabs      = $$('.mtab');
  var identity  = $('#identity');
  var idLabel   = identity ? identity.parentNode.querySelector('.field__label') : null;

  function moveGlider(tab) {
    if (!glider || !tab) return;
    glider.style.width  = tab.offsetWidth + 'px';
    glider.style.height = tab.offsetHeight + 'px';
    glider.style.setProperty('--gx', tab.offsetLeft + 'px');
    glider.style.setProperty('--gy', tab.offsetTop + 'px');
    glider.classList.add('ready');
  }
  function activeTab() { return $('.mtab.is-active') || tabs[0]; }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      moveGlider(tab);

      var phone = tab.dataset.method === 'phone';
      if (card) card.setAttribute('data-method', phone ? 'phone' : 'email');
      if (identity) { identity.type = phone ? 'tel' : 'email'; identity.value = ''; identity.parentNode.classList.remove('filled'); }
      if (idLabel) idLabel.innerHTML = (phone ? 'Enter your Phone Number' : 'Enter your Email') + '<i>*</i>';
    });
  });

  function syncGlider() { moveGlider(activeTab()); }
  requestAnimationFrame(syncGlider);
  window.addEventListener('resize', syncGlider);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncGlider);
  setTimeout(syncGlider, 400);
  setTimeout(syncGlider, 900);

  /* ---------- select "filled" state (so the placeholder-label hides) ---------- */
  $$('.field select').forEach(function (sel) {
    sel.addEventListener('change', function () {
      sel.parentNode.classList.toggle('filled', !!sel.value);
    });
  });

  /* ---------- password reveal ---------- */
  var eye = $('.field__eye');
  var pass = $('#password');
  if (eye && pass) {
    eye.addEventListener('click', function () {
      var show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      eye.classList.toggle('is-on', show);
      eye.setAttribute('aria-pressed', String(show));
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  /* ---------- individual / company mutually exclusive ---------- */
  $$('input[name="entity"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      if (cb.checked) $$('input[name="entity"]').forEach(function (o) { if (o !== cb) o.checked = false; });
    });
  });

  /* ---------- carousel: dots switch the brand-panel slides ---------- */
  var dots   = $$('.cdot');
  var track  = $('.track');
  var slides = $$('.slide');
  if (dots.length && track) {
    var current = 0, timer = null, resumeT = null;
    var AUTO = 5000;      /* advance every 5 seconds */
    var RESUME = 8000;    /* after interacting, resume once idle this long */

    function show(i) {
      current = (i + dots.length) % dots.length;
      track.style.setProperty('--i', current);
      dots.forEach(function (d, n) {
        var on = n === current;
        d.classList.toggle('is-active', on);
        d.setAttribute('aria-selected', String(on));
      });
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === current); });
    }
    function play() { if (reduceMotion) return; stop(); timer = setInterval(function () { show(current + 1); }, AUTO); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    /* stop now; resume automatically once the visitor has been idle a while */
    function pauseIdle() { stop(); clearTimeout(resumeT); resumeT = setTimeout(play, RESUME); }

    dots.forEach(function (d, n) {
      d.addEventListener('click', function () { show(n); pauseIdle(); });
      d.addEventListener('focus', function () { show(n); });
    });

    // ----- swipe / drag anywhere on the blue panel to slide -----
    var panel = $('.left');
    var slidesEl = $('.slides');
    var dragging = false, startX = 0, startY = 0, dx = 0, slideW = 1, decided = false;

    function onDown(e) {
      if (e.button && e.button !== 0) return;      /* primary button / touch only */
      dragging = true; decided = false;
      startX = e.clientX; startY = e.clientY; dx = 0;
      slideW = (slidesEl || panel).getBoundingClientRect().width || 1;
      stop(); clearTimeout(resumeT);               /* pause while interacting */
    }
    function onMove(e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      // decide horizontal vs vertical once, so vertical page-scroll isn't hijacked
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(e.clientY - startY) < 6) return;
        decided = true;
        if (Math.abs(e.clientY - startY) > Math.abs(dx)) { dragging = false; return; }
        panel.classList.add('dragging'); track.classList.add('dragging');
      }
      var d = dx;
      if ((current === 0 && d > 0) || (current === dots.length - 1 && d < 0)) d *= 0.32; /* rubber-band at ends */
      track.style.setProperty('--drag', d + 'px');
    }
    function onUp() {
      if (!dragging) { panel.classList.remove('dragging'); track.classList.remove('dragging'); return; }
      dragging = false;
      panel.classList.remove('dragging'); track.classList.remove('dragging');
      track.style.setProperty('--drag', '0px');
      if (Math.abs(dx) > slideW * 0.15) {          /* moved far enough -> change slide */
        var t = Math.max(0, Math.min(dots.length - 1, current + (dx < 0 ? 1 : -1)));
        show(t);
      }
      pauseIdle();
      dx = 0;
    }
    if (panel) {
      panel.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }
    // desktop nicety: pause while reading the slide content, resume on leave
    if (slidesEl) {
      slidesEl.addEventListener('mouseenter', stop);
      slidesEl.addEventListener('mouseleave', function () { if (!dragging) { clearTimeout(resumeT); play(); } });
    }

    var forced = new URLSearchParams(location.search).get('s');
    if (forced !== null) { show(parseInt(forced, 10) || 0); }
    else { show(0); play(); }
  }

  /* ---------- stats: white highlight slides to the hovered row ---------- */
  var stats = $('.stats');
  var statPill = $('.stats__hl');
  var rows = $$('.stat');
  if (stats && statPill && rows.length) {
    var defaultRow = 1;          /* middle row highlighted by default */
    var activeRow = defaultRow;
    function placeHl(i) {
      activeRow = i;
      var r = rows[i];
      statPill.style.height = r.offsetHeight + 'px';
      statPill.style.transform = 'translateY(' + r.offsetTop + 'px)';
      statPill.classList.add('ready');
      rows.forEach(function (x, n) { x.classList.toggle('is-hl', n === i); });
    }
    rows.forEach(function (r, i) {
      r.addEventListener('mouseenter', function () { placeHl(i); });
    });
    stats.addEventListener('mouseleave', function () { placeHl(defaultRow); });

    var syncHl = function () { placeHl(activeRow); };
    requestAnimationFrame(syncHl);
    window.addEventListener('resize', syncHl);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHl);
    setTimeout(syncHl, 400);
    setTimeout(syncHl, 900);
  }

  /* ---------- create button: ripple + submit flow ---------- */
  var submit = $('.submit');
  var label  = $('.submit__label');
  var form   = $('.card');

  if (submit) {
    submit.addEventListener('pointerdown', function (e) {
      if (reduceMotion) return;
      var r = submit.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top  = (e.clientY - r.top  - size / 2) + 'px';
      submit.appendChild(span);
      span.addEventListener('animationend', function () { span.remove(); });
    });
  }

  if (form && submit) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submit.classList.contains('is-loading') || submit.classList.contains('is-success')) return;
      if (reduceMotion) { window.alert('Account request submitted (demo).'); return; }

      var original = label ? label.textContent : '';
      submit.classList.add('is-loading');
      setTimeout(function () {
        submit.classList.remove('is-loading');
        submit.classList.add('is-success');
        if (label) label.textContent = 'Account Created';
        setTimeout(function () {
          submit.classList.remove('is-success');
          if (label) label.textContent = original;
        }, 1900);
      }, 1400);
    });
  }
})();
