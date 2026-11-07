/* ============================================================
   NEBULA® — main.js
   Vanilla JS only. No libraries.
   ============================================================ */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var d = document;
  var w = window;

  /* ---------- Helpers ---------- */
  function $(sel, ctx) { return (ctx || d).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var reduced = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = w.matchMedia('(pointer: fine)').matches;

  /* ============================================================
     PRELOADER — «NEBULA®» + orbiting dot + % counter
     ============================================================ */
  var preloader = $('#preloader');
  var preCount = $('#preloader-count');
  var preloaderDone = false;

  function finishPreloader() {
    if (preloaderDone) return;
    preloaderDone = true;
    if (preloader) preloader.classList.add('is-done');
    d.body.classList.remove('is-loading');
    d.body.classList.add('is-loaded');
    w.setTimeout(function () {
      if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 900);
    initReveals();
    updateOnScroll();
  }

  (function initPreloader() {
    var winLoaded = (d.readyState === 'complete');
    var counterDone = false;
    var minTimeDone = false;

    w.addEventListener('load', function () {
      winLoaded = true;
      tryHide();
    });

    function tryHide() {
      if (winLoaded && counterDone && minTimeDone) finishPreloader();
    }

    if (reduced || !preCount) {
      counterDone = true;
      if (preCount) preCount.textContent = '100';
    } else {
      var DURATION = 1500;
      var start = null;
      function tick(ts) {
        if (start === null) start = ts;
        var p = clamp((ts - start) / DURATION, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
        preCount.textContent = Math.round(eased * 100);
        if (p < 1) {
          w.requestAnimationFrame(tick);
        } else {
          counterDone = true;
          tryHide();
        }
      }
      w.requestAnimationFrame(tick);
    }

    /* Minimum splash time so the orbit animation is visible */
    w.setTimeout(function () {
      minTimeDone = true;
      tryHide();
    }, reduced ? 100 : 1000);

    /* Safety net: never block the page more than 4s */
    w.setTimeout(finishPreloader, 4000);
  })();

  /* ============================================================
     CUSTOM CURSOR — gradient dot + ring (pointer: fine only)
     ============================================================ */
  (function initCursor() {
    if (!finePointer || reduced) return;
    var dot = $('.cursor-dot');
    var ring = $('.cursor-ring');
    if (!dot || !ring) return;

    var html = d.documentElement;
    html.classList.add('has-cursor');

    var mx = -100, my = -100;
    var dx = -100, dy = -100;
    var rx = -100, ry = -100;
    var shown = false;

    w.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (!shown) {
        shown = true;
        dx = rx = mx;
        dy = ry = my;
      }
    }, { passive: true });

    w.addEventListener('mousedown', function () { html.classList.add('cursor--down'); });
    w.addEventListener('mouseup', function () { html.classList.remove('cursor--down'); });

    d.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (t.closest && t.closest('a, button, input, select, textarea, [data-tilt], .showreel__frame')) {
        html.classList.add('cursor--hover');
      }
    });
    d.addEventListener('mouseout', function (e) {
      var t = e.target;
      if (t.closest && t.closest('a, button, input, select, textarea, [data-tilt], .showreel__frame')) {
        html.classList.remove('cursor--hover');
      }
    });

    (function loop() {
      if (!d.hidden) {
        dx = lerp(dx, mx, 0.42);
        dy = lerp(dy, my, 0.42);
        rx = lerp(rx, mx, 0.17);
        ry = lerp(ry, my, 0.17);
        dot.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
        ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      }
      w.requestAnimationFrame(loop);
    })();
  })();

  /* ============================================================
     SCROLL ENGINE — progress bar, header, back-to-top,
     parallax (data-speed), timeline fill — one rAF-throttled handler
     ============================================================ */
  var header = $('#header');
  var progressFill = $('#progress-fill');
  var toTop = $('#to-top');
  var parallaxEls = $$('[data-speed]');
  var timeline = $('#timeline');
  var timelineFill = $('#timeline-fill');
  var timelineItems = $$('.timeline__item');

  function updateParallax() {
    if (reduced || !parallaxEls.length) return;
    var vh = w.innerHeight;
    for (var i = 0; i < parallaxEls.length; i++) {
      var el = parallaxEls[i];
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue;
      var speed = parseFloat(el.getAttribute('data-speed')) || 0;
      var offset = (rect.top + rect.height / 2 - vh / 2) * speed;
      el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    }
  }

  function updateTimeline() {
    if (!timeline || !timelineFill) return;
    var rect = timeline.getBoundingClientRect();
    var vh = w.innerHeight;
    var trigger = vh * 0.72;
    var p = clamp((trigger - rect.top) / rect.height, 0, 1);
    if (reduced) p = 1;
    var fillH = p * rect.height;
    timelineFill.style.height = fillH.toFixed(1) + 'px';
    for (var i = 0; i < timelineItems.length; i++) {
      var item = timelineItems[i];
      var itemTop = item.offsetTop + 34; /* dot position within .timeline */
      item.classList.toggle('is-active', itemTop <= fillH || p >= 1);
    }
  }

  function updateOnScroll() {
    var y = w.scrollY || w.pageYOffset || 0;
    var docH = d.documentElement.scrollHeight - w.innerHeight;

    if (progressFill) {
      progressFill.style.transform = 'scaleX(' + (docH > 0 ? clamp(y / docH, 0, 1) : 0) + ')';
    }
    if (header) header.classList.toggle('is-scrolled', y > 10);
    if (toTop) toTop.classList.toggle('is-visible', y > 600);

    updateParallax();
    updateTimeline();
  }

  var ticking = false;
  w.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      w.requestAnimationFrame(function () {
        ticking = false;
        updateOnScroll();
      });
    }
  }, { passive: true });

  w.addEventListener('resize', function () {
    updateOnScroll();
  });

  /* Back to top */
  if (toTop) {
    toTop.addEventListener('click', function () {
      w.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ============================================================
     HEADER BURGER + MOBILE MENU (fullscreen light, stagger)
     ============================================================ */
  (function initMenu() {
    var burger = $('#burger');
    var menu = $('#mobile-menu');
    if (!burger || !menu) return;

    function setMenu(open) {
      d.body.classList.toggle('menu-open', open);
      d.body.classList.toggle('no-scroll', open);
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }

    burger.addEventListener('click', function () {
      setMenu(!d.body.classList.contains('menu-open'));
    });

    $$('.mobile-menu__link, .mobile-menu__cta', menu).forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });

    w.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && d.body.classList.contains('menu-open')) setMenu(false);
    });

    /* Expose for anchor handler */
    window.__nebulaCloseMenu = function () { setMenu(false); };
  })();

  /* ============================================================
     SMOOTH ANCHORS (with fixed-header offset)
     ============================================================ */
  d.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var href = link.getAttribute('href');
    if (href === '#') { e.preventDefault(); return; }
    var target = d.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    if (typeof window.__nebulaCloseMenu === 'function') window.__nebulaCloseMenu();
    var headerH = header ? header.getBoundingClientRect().height : 0;
    var top = target.getBoundingClientRect().top + (w.scrollY || 0) - headerH - 8;
    w.scrollTo({ top: Math.max(top, 0), behavior: reduced ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', href);
  });

  /* ============================================================
     REVEALS — IntersectionObserver with stagger
     ============================================================ */
  function initReveals() {
    var els = $$('[data-reveal]');
    if (!els.length) return;

    if (reduced || !('IntersectionObserver' in w)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay'), 10) || 0;
        if (delay > 0) el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-visible');
        io.unobserve(el);

        /* Clear the stagger delay so hover transitions stay snappy */
        w.setTimeout(function () { el.style.transitionDelay = ''; }, delay + 950);
        el.addEventListener('transitionend', function onEnd(e) {
          if (e.propertyName === 'opacity') {
            el.style.transitionDelay = '';
            el.removeEventListener('transitionend', onEnd);
          }
        });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     COUNTERS — 0 → value on scroll into view
     ============================================================ */
  (function initCounters() {
    var counters = $$('[data-count]');
    if (!counters.length) return;

    function format(value, decimals) {
      var parts = value.toFixed(decimals).split('.');
      var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
      return decimals > 0 ? int + ',' + parts[1] : int;
    }

    function animate(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';

      if (reduced) {
        el.textContent = prefix + format(target, decimals) + suffix;
        return;
      }

      var DURATION = 1500;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = clamp((ts - start) / DURATION, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + format(target * eased, decimals) + suffix;
        if (p < 1) w.requestAnimationFrame(step);
      }
      w.requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in w)) {
      counters.forEach(animate);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { io.observe(el); });
  })();

  /* ============================================================
     MAGNETIC BUTTONS
     ============================================================ */
  (function initMagnetic() {
    if (!finePointer || reduced) return;
    $$('[data-magnetic]').forEach(function (el) {
      var strength = 0.28;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = (e.clientX - r.left - r.width / 2) * strength;
        var my = (e.clientY - r.top - r.height / 2) * strength;
        el.style.setProperty('--mx', mx.toFixed(1) + 'px');
        el.style.setProperty('--my', my.toFixed(1) + 'px');
      });
      el.addEventListener('mouseleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  })();

  /* ============================================================
     TILT CARDS — hero mockup + case media
     ============================================================ */
  (function initTilt() {
    if (!finePointer || reduced) return;
    $$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 7;
      el.addEventListener('mouseenter', function () {
        el.style.transition = 'transform .18s ease-out';
      });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        var rx = (-py * max).toFixed(2);
        var ry = (px * max).toFixed(2);
        el.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .55s var(--ease-out)';
        el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
      });
    });
  })();

  /* ============================================================
     SHOWREEL — frame video + fullscreen overlay player
     ============================================================ */
  (function initShowreel() {
    var frame = $('#showreel-frame');
    var frameVideo = frame ? frame.querySelector('video') : null;
    var overlay = $('#reel-overlay');
    var overlayVideo = $('#reel-video');
    var closeBtn = $('#reel-close');
    if (!frame || !overlay || !overlayVideo) return;

    /* Ambient preview in the frame */
    if (frameVideo && !reduced) {
      var pp = frameVideo.play();
      if (pp && pp.catch) pp.catch(function () { /* autoplay blocked — poster stays */ });
    }

    function open() {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      d.body.classList.add('no-scroll');
      if (frameVideo) frameVideo.pause();
      var p = overlayVideo.play();
      if (p && p.catch) p.catch(function () {});
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      d.body.classList.remove('no-scroll');
      overlayVideo.pause();
      if (frameVideo && !reduced) {
        var p2 = frameVideo.play();
        if (p2 && p2.catch) p2.catch(function () {});
      }
    }

    frame.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    w.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });
  })();

  /* ============================================================
     TESTIMONIAL SLIDER — dots / arrows / swipe / autoplay
     ============================================================ */
  (function initSlider() {
    var slider = $('#reviews-slider');
    var viewport = $('#slider-viewport');
    var track = $('#slider-track');
    var dotsWrap = $('#slider-dots');
    var prevBtn = $('#slider-prev');
    var nextBtn = $('#slider-next');
    if (!slider || !viewport || !track) return;

    var slides = $$('.review', track);
    var count = slides.length;
    if (count < 2) return;

    var index = 0;
    var autoplayId = null;
    var AUTOPLAY_MS = 6500;

    /* Dots */
    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var dot = d.createElement('button');
        dot.type = 'button';
        dot.className = 'slider__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Отзыв ' + (i + 1));
        dot.addEventListener('click', function () { goTo(i, true); });
        dotsWrap.appendChild(dot);
      });
    }
    var dots = dotsWrap ? $$('.slider__dot', dotsWrap) : [];

    function render(offsetPx) {
      var base = -index * viewport.clientWidth;
      var x = (typeof offsetPx === 'number') ? base + offsetPx : base;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    }

    function goTo(i, byUser) {
      index = (i + count) % count;
      render();
      dots.forEach(function (dot, di) {
        dot.classList.toggle('is-active', di === index);
      });
      if (byUser) restartAutoplay();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    if (nextBtn) nextBtn.addEventListener('click', function () { next(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); });

    /* Autoplay */
    function startAutoplay() {
      if (reduced || autoplayId) return;
      autoplayId = w.setInterval(next, AUTOPLAY_MS);
    }
    function stopAutoplay() {
      if (autoplayId) { w.clearInterval(autoplayId); autoplayId = null; }
    }
    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);
    d.addEventListener('visibilitychange', function () {
      if (d.hidden) stopAutoplay(); else startAutoplay();
    });

    /* Swipe / drag (pointer events) */
    var startX = 0, startY = 0, deltaX = 0, dragging = false, locked = false;

    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      locked = false;
      startX = e.clientX;
      startY = e.clientY;
      deltaX = 0;
      track.classList.add('is-dragging');
      stopAutoplay();
      if (viewport.setPointerCapture) {
        try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });

    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      deltaX = e.clientX - startX;
      var deltaY = e.clientY - startY;
      if (!locked) {
        if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
          locked = true;
          if (Math.abs(deltaY) > Math.abs(deltaX)) { dragging = false; track.classList.remove('is-dragging'); render(); startAutoplay(); return; }
        } else {
          return;
        }
      }
      var limit = viewport.clientWidth * 0.35;
      render(clamp(deltaX, -limit, limit));
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      if (Math.abs(deltaX) > 60) {
        if (deltaX < 0) next(); else prev();
      } else {
        render();
      }
      startAutoplay();
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    w.addEventListener('resize', function () { render(); });

    /* Keyboard */
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });

    goTo(0);
    startAutoplay();
  })();

  /* ============================================================
     FORM — validation + success
     ============================================================ */
  (function initForm() {
    var form = $('#brief-form');
    if (!form) return;

    var nameInput = $('#f-name');
    var contactInput = $('#f-contact');
    var budgetSelect = $('#f-budget');
    var taskInput = $('#f-task');
    var submitBtn = $('#form-submit');
    var resetBtn = $('#form-reset');

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var PHONE_RE = /^\+?[\d\s\-()]{10,18}$/;

    function fieldOf(el) { return el ? el.closest('.field') : null; }
    function setError(el, hasError) {
      var field = fieldOf(el);
      if (field) field.classList.toggle('is-error', hasError);
      if (el) el.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    }

    [nameInput, contactInput, budgetSelect, taskInput].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', function () { setError(el, false); });
      el.addEventListener('change', function () { setError(el, false); });
    });

    /* Select shows muted placeholder colour until a value is chosen */
    function syncSelectPlaceholder() {
      if (!budgetSelect) return;
      budgetSelect.classList.toggle('is-placeholder', budgetSelect.value === '');
    }
    if (budgetSelect) {
      budgetSelect.addEventListener('change', syncSelectPlaceholder);
      syncSelectPlaceholder();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var okName = nameInput && nameInput.value.trim().length >= 2;
      var rawContact = contactInput ? contactInput.value.trim() : '';
      var okContact = EMAIL_RE.test(rawContact) || PHONE_RE.test(rawContact);
      var okBudget = budgetSelect && budgetSelect.value !== '';
      var okTask = taskInput && taskInput.value.trim().length >= 10;

      setError(nameInput, !okName);
      setError(contactInput, !okContact);
      setError(budgetSelect, !okBudget);
      setError(taskInput, !okTask);

      if (!(okName && okContact && okBudget && okTask)) {
        var firstError = form.querySelector('.field.is-error .field__input');
        if (firstError) firstError.focus();
        return;
      }

      /* Simulated send */
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем…';
      }
      w.setTimeout(function () {
        form.classList.add('is-sent');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Отправить бриф';
        }
      }, 900);
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.classList.remove('is-sent');
        form.reset();
        [nameInput, contactInput, budgetSelect, taskInput].forEach(function (el) {
          if (el) setError(el, false);
        });
        syncSelectPlaceholder();
        if (nameInput) nameInput.focus();
      });
    }
  })();

  /* ---------- Initial paint ---------- */
  updateOnScroll();
})();
