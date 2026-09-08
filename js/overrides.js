/**
 * Header del subtema visit_theme_next — interacciones del prototipo v3.
 * Portado de visitbogota3-theme/js/main.js (solo la parte del header):
 *   · dropdowns / mega menú (hover + click, con cierre retardado)
 *   · cambio de categoría dentro del mega menú "Descubre Bogotá"
 *   · alto de las imágenes de subcategoría igualado a la columna de categorías
 *   · panel móvil en acordeón: el JS mueve buscador, idioma y los paneles del
 *     megamenú a su sitio dentro del panel y los devuelve en escritorio.
 * El buscador (overlay) lo maneja el behavior "idt-search-toggle" del tema base.
 */
(function () {
  'use strict';

  function initHeader() {
    var masthead = document.getElementById('masthead');
    if (!masthead || masthead.dataset.vnHeaderInit) return;
    masthead.dataset.vnHeaderInit = '1';

    var HOVER_QUERY = '(hover: hover) and (min-width: 861px)';
    var dropdowns = [].slice.call(masthead.querySelectorAll('.dropdown'));

    function resetMegamenu(menu) {
      var mega = menu.classList && menu.classList.contains('megamenu') ? menu : menu.querySelector('.megamenu');
      if (!mega) return;
      mega.querySelectorAll('.megamenu__cat').forEach(function (c) { c.removeAttribute('aria-current'); });
      mega.querySelectorAll('.megamenu__panel').forEach(function (p) { p.hidden = true; });
    }

    function menuOf(dd) {
      return dd.querySelector('.dropdown__menu');
    }

    function hideMenu(dd) {
      var btn = dd.querySelector('.dropdown__toggle');
      var menu = menuOf(dd);
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (menu) { menu.hidden = true; resetMegamenu(menu); }
    }

    function closeAll(except) {
      dropdowns.forEach(function (dd) { if (dd !== except) hideMenu(dd); });
    }

    // El alto de las imágenes de subcategoría = alto real de la columna de
    // categorías (cambia con el número de categorías y el wrap de cada texto).
    function syncMegamenuImageHeight(menu) {
      if (!menu || !menu.classList.contains('megamenu')) return;
      var cats = menu.querySelector('.megamenu__cats');
      if (!cats) return;
      requestAnimationFrame(function () {
        var h = cats.getBoundingClientRect().height;
        if (h) menu.style.setProperty('--megamenu-img-h', h + 'px');
      });
    }

    dropdowns.forEach(function (dd) {
      var btn = dd.querySelector('.dropdown__toggle');
      var menu = menuOf(dd);
      if (!btn || !menu) return;
      var closeTimer = null;

      var cancelClose = function () { clearTimeout(closeTimer); };
      var scheduleClose = function () {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(function () { hideMenu(dd); }, 250);
      };

      var open = function () {
        closeAll(dd);
        btn.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
        syncMegamenuImageHeight(menu);
      };

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        cancelClose();
        if (btn.getAttribute('aria-expanded') === 'true') hideMenu(dd);
        else open();
      });

      [dd, menu].forEach(function (el) {
        el.addEventListener('mouseenter', function () {
          if (!window.matchMedia(HOVER_QUERY).matches) return;
          cancelClose();
          open();
        });
        el.addEventListener('mouseleave', function () {
          if (!window.matchMedia(HOVER_QUERY).matches) return;
          scheduleClose();
        });
      });
    });

    window.addEventListener('resize', function () {
      masthead.querySelectorAll('.dropdown__menu.megamenu').forEach(function (menu) {
        if (!menu.hidden) syncMegamenuImageHeight(menu);
      });
    });

    // ── Mega menú "Descubre Bogotá": cambio de categoría ──
    masthead.querySelectorAll('.megamenu').forEach(function (mega) {
      var cats = [].slice.call(mega.querySelectorAll('.megamenu__cat'));
      var allPanels = function () { return [].slice.call(mega.querySelectorAll('.megamenu__panel')); };

      var showCat = function (slug) {
        cats.forEach(function (c) { c.setAttribute('aria-current', String(c.dataset.cat === slug)); });
        allPanels().forEach(function (p) { p.hidden = p.dataset.panel !== slug; });
      };
      var closeCats = function () {
        cats.forEach(function (c) { c.removeAttribute('aria-current'); });
        allPanels().forEach(function (p) { p.hidden = true; });
      };

      cats.forEach(function (cat) {
        cat.addEventListener('mouseenter', function () {
          if (!window.matchMedia(HOVER_QUERY).matches) return;
          showCat(cat.dataset.cat);
        });
        cat.addEventListener('click', function (e) {
          e.stopPropagation();
          if (cat.getAttribute('aria-current') === 'true') closeCats();
          else showCat(cat.dataset.cat);
        });
        cat.addEventListener('focus', function () { showCat(cat.dataset.cat); });
      });
    });

    // Click fuera / Escape cierran los desplegables (salvo navegando el panel móvil abierto).
    document.addEventListener('click', function (e) {
      var nav = document.getElementById('mainnav');
      if (nav && nav.classList.contains('is-open') && nav.contains(e.target)) return;
      if (masthead.contains(e.target)) return;
      closeAll(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });

    // ── Adaptación móvil: reubicar piezas dentro del panel y devolverlas en escritorio ──
    var burger = document.getElementById('burger');
    var mainnav = document.getElementById('mainnav');
    if (burger && mainnav) {
      var bar1Inner = masthead.querySelector('.masthead__bar1-inner');
      var bar2Inner = masthead.querySelector('.masthead__bar2-inner');
      var tools = masthead.querySelector('.masthead__tools');
      var navList = mainnav.querySelector('ul');
      var mega = masthead.querySelector('.megamenu');
      var panelsWrap = mega ? mega.querySelector('.megamenu__panels') : null;
      var panels = mega ? [].slice.call(mega.querySelectorAll('.megamenu__panel')) : [];
      var mobile = window.matchMedia('(max-width: 860px)');

      var closeDrawer = function () {
        mainnav.classList.remove('is-open');
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
        closeAll(null);
      };
      var openDrawer = function () {
        mainnav.classList.add('is-open');
        document.body.classList.add('nav-open');
        burger.setAttribute('aria-expanded', 'true');
      };

      var applyNavMode = function () {
        if (mobile.matches) {
          if (tools && navList && tools.parentElement !== mainnav) mainnav.insertBefore(tools, navList);
          if (burger.parentElement !== bar1Inner) bar1Inner.appendChild(burger);
          panels.forEach(function (panel) {
            var cat = mega.querySelector('.megamenu__cat[data-cat="' + panel.dataset.panel + '"]');
            var li = cat ? cat.closest('li') : null;
            if (li && panel.parentElement !== li) li.appendChild(panel);
          });
        } else {
          if (tools && tools.parentElement !== bar1Inner) bar1Inner.appendChild(tools);
          if (burger.parentElement !== bar2Inner) bar2Inner.appendChild(burger);
          if (panelsWrap) {
            panels.forEach(function (panel) {
              if (panel.parentElement !== panelsWrap) panelsWrap.appendChild(panel);
            });
          }
          closeDrawer();
        }
        closeAll(null);
      };

      mobile.addEventListener('change', applyNavMode);
      applyNavMode();

      burger.addEventListener('click', function (e) {
        e.stopPropagation();
        if (mainnav.classList.contains('is-open')) closeDrawer();
        else openDrawer();
      });

      mainnav.addEventListener('click', function (e) {
        var link = e.target.closest('a[href]');
        if (!link || !mainnav.contains(link)) return;
        if (link.getAttribute('href') === '#') return;
        closeDrawer();
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mainnav.classList.contains('is-open')) closeDrawer();
      });
    }
  }

  // =========================================================
  //  HOME (nodo 1223) — carruseles y animación al hacer scroll
  //  Portado de visitbogota3-theme/js/main.js.
  // =========================================================

  // Carrusel con arrastre (mouse) + swipe nativo (touch) + bullets/flechas.
  function initTrack(opts) {
    var track = document.getElementById(opts.trackId);
    if (!track || track.dataset.vnInit) return;
    track.dataset.vnInit = '1';

    var items = [].slice.call(track.querySelectorAll(opts.itemSelector));
    if (!items.length) return;
    var step = function () {
      return items[1] ? items[1].offsetLeft - items[0].offsetLeft : items[0].offsetWidth;
    };

    var arrows = opts.arrowSelector ? [].slice.call(document.querySelectorAll(opts.arrowSelector)) : [];
    arrows.forEach(function (btn) {
      btn.addEventListener('click', function () {
        track.scrollBy({ left: step() * Number(btn.dataset.dir), behavior: 'smooth' });
      });
    });

    var dotsWrap = opts.dotsId ? document.getElementById(opts.dotsId) : null;
    if (dotsWrap) {
      items.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', (opts.dotLabel || 'Ir a') + ' ' + (i + 1));
        dot.addEventListener('click', function () {
          track.scrollTo({ left: step() * i, behavior: 'smooth' });
        });
        dotsWrap.appendChild(dot);
      });
    }
    var dots = dotsWrap ? [].slice.call(dotsWrap.children) : [];

    var update = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (arrows[0]) arrows[0].disabled = track.scrollLeft <= 0;
      if (arrows[1]) arrows[1].disabled = track.scrollLeft >= max;
      if (dots.length) {
        var index = Math.round(track.scrollLeft / step());
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
      }
    };
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Arrastre con mouse (en táctil deja actuar al scroll nativo).
    var isDown = false, dragged = false, startX = 0, startScroll = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      isDown = true; dragged = false; startX = e.clientX; startScroll = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      var delta = e.clientX - startX;
      if (!dragged && Math.abs(delta) > 4) { dragged = true; track.classList.add('is-dragging'); }
      if (dragged) track.scrollLeft = startScroll - delta;
    });
    var endDrag = function () {
      if (!isDown) return;
      isDown = false;
      track.classList.remove('is-dragging');
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    track.addEventListener('click', function (e) {
      if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
    }, true);
  }

  function initHome() {
    var home = document.querySelector('.vn-home');
    if (!home || home.dataset.vnHomeInit) return;
    home.dataset.vnHomeInit = '1';

    // Animación al hacer scroll — primero, para que un fallo posterior no deje
    // las franjas ocultas (.reveal parte de opacity:0).
    var revealEls = [].slice.call(home.querySelectorAll('.reveal'));
    if (revealEls.length && 'IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries, o) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          o.unobserve(entry.target);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
      revealEls.forEach(function (el) { obs.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    // Hero slider (si hay más de una diapositiva)
    var heroTrack = document.querySelector('.vn-home .hero__track');
    var heroDots = document.getElementById('heroDots');
    if (heroTrack && heroDots) {
      var slides = [].slice.call(heroTrack.querySelectorAll('.hero__slide'));
      if (slides.length > 1) {
        slides.forEach(function (_, i) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'hero__dot' + (i === 0 ? ' is-active' : '');
          dot.setAttribute('aria-label', 'Ir al slide ' + (i + 1));
          dot.addEventListener('click', function () {
            slides.forEach(function (s, j) { s.classList.toggle('is-active', i === j); });
            [].slice.call(heroDots.children).forEach(function (d, j) {
              d.classList.toggle('is-active', i === j);
            });
          });
          heroDots.appendChild(dot);
        });
      }
    }

    try {
      initTrack({
        trackId: 'imperdiblesTrack',
        dotsId: 'imperdiblesDots',
        itemSelector: '.imperdibles__item',
        dotLabel: 'Ir al imperdible',
      });
      initTrack({
        trackId: 'eventosTrack',
        dotsId: 'eventosDots',
        arrowSelector: '.vn-home .eventos__arrow',
        itemSelector: '.eventos__item',
        dotLabel: 'Ir al evento',
      });
    } catch (err) {
      if (window.console) console.warn('[vn-home] carrusel:', err);
    }
  }

  // =========================================================
  //  CATEGORÍA / SUBCATEGORÍA (prototipo v3)
  // =========================================================
  function initCat() {
    var cat = document.querySelector('.vn-cat');
    if (!cat || cat.dataset.vnCatInit) return;
    cat.dataset.vnCatInit = '1';

    // Carrusel de subcategorías
    try {
      initTrack({
        trackId: 'catSubcatsTrack',
        dotsId: 'catSubcatsDots',
        arrowSelector: '.vn-cat .cat-subcats__arrow',
        itemSelector: '.cat-subcats__item',
        dotLabel: 'Ir a la subcategoría',
      });
    } catch (err) {
      if (window.console) console.warn('[vn-cat] carrusel:', err);
    }

    // Texto colapsable ("Leer más")
    var body = cat.querySelector('#catIntroBody');
    var toggle = cat.querySelector('#catIntroToggle');
    if (body && toggle) {
      var label = toggle.querySelector('.cat-intro__toggle-label');
      // Si el texto ya cabe en la altura colapsada, no hace falta el botón.
      if (body.scrollHeight <= body.clientHeight + 4) {
        body.classList.add('cat-intro__body--fits');
        toggle.hidden = true;
      } else {
        toggle.addEventListener('click', function () {
          var expanded = body.classList.toggle('is-expanded');
          toggle.setAttribute('aria-expanded', String(expanded));
          if (label) label.textContent = expanded ? 'Leer menos' : 'Leer más';
        });
      }
    }
  }

  function init() {
    initHeader();
    initHome();
    initCat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
