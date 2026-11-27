/**
 * Header del subtema visit_theme_next — interacciones del prototipo v3.
 * Portado de visitbogota3-theme/js/main.js (solo la parte del header):
 *   · dropdowns / mega menú (hover + click, con cierre retardado)
 *   · cambio de categoría dentro del mega menú "Descubre Bogotá"
 *   · alto de las imágenes de subcategoría igualado a la columna de categorías
 *   · panel móvil en acordeón: el JS mueve buscador, idioma y los paneles del
 *     megamenú a su sitio dentro del panel y los devuelve en escritorio.
 * Búsqueda en vivo: initLiveSearch() (.js-live-search), propia del subtema.
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
      mega.querySelectorAll('.megamenu__cat').forEach(function (c) { c.setAttribute('aria-expanded', 'false'); });
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

      // Al salir por teclado del último elemento operable del desplegable
      // (o de cualquier punto dentro de él), cerrarlo en vez de dejarlo
      // visualmente abierto mientras el foco sigue avanzando por la página.
      dd.addEventListener('focusout', function (e) {
        if (!dd.contains(e.relatedTarget)) hideMenu(dd);
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
        cats.forEach(function (c) { c.setAttribute('aria-expanded', String(c.dataset.cat === slug)); });
        allPanels().forEach(function (p) { p.hidden = p.dataset.panel !== slug; });
      };
      var closeCats = function () {
        cats.forEach(function (c) { c.setAttribute('aria-expanded', 'false'); });
        allPanels().forEach(function (p) { p.hidden = true; });
      };

      // Enlaces visibles del panel abierto en este momento (si hay uno).
      var openPanelLinks = function () {
        var panel = allPanels().filter(function (p) { return !p.hidden; })[0];
        return panel ? [].slice.call(panel.querySelectorAll('a[href]')) : [];
      };
      var openCatIndex = function () {
        return cats.findIndex(function (c) { return c.getAttribute('aria-expanded') === 'true'; });
      };

      cats.forEach(function (cat) {
        cat.addEventListener('mouseenter', function () {
          if (!window.matchMedia(HOVER_QUERY).matches) return;
          showCat(cat.dataset.cat);
        });
        cat.addEventListener('click', function (e) {
          // Escritorio con hover: el panel ya está abierto por mouseenter y el
          // clic sigue el enlace a la página de la categoría.
          if (window.matchMedia(HOVER_QUERY).matches) return;
          // Táctil / móvil: el toque despliega o recoge las subcategorías (el
          // panel incluye "Ver toda la categoría" para entrar a ella).
          e.preventDefault();
          e.stopPropagation();
          if (cat.getAttribute('aria-expanded') === 'true') closeCats();
          else showCat(cat.dataset.cat);
        });
        cat.addEventListener('focus', function () { showCat(cat.dataset.cat); });

        // .megamenu__cats (todas las categorías) termina en el DOM antes de
        // que empiece .megamenu__panels (todos los paneles): sin esto, Tab
        // saltaba de categoría en categoría sin entrar nunca a las
        // subcategorías del panel que el foco acababa de abrir. Al tabular
        // hacia adelante desde una categoría, se entra directo a los
        // enlaces de su propio panel.
        cat.addEventListener('keydown', function (e) {
          if (e.key !== 'Tab' || e.shiftKey) return;
          var links = openPanelLinks();
          if (links.length) { e.preventDefault(); links[0].focus(); }
        });
      });

      // Al salir del panel abierto: hacia adelante, seguir con la próxima
      // categoría (vuelve a entrar al flujo normal si no hay una siguiente);
      // hacia atrás desde su primer enlace, volver a la categoría que lo abrió.
      var panelsWrap = mega.querySelector('.megamenu__panels');
      if (panelsWrap) {
        panelsWrap.addEventListener('keydown', function (e) {
          if (e.key !== 'Tab') return;
          var links = openPanelLinks();
          var idx = links.indexOf(e.target);
          if (idx === -1) return;
          var catIdx = openCatIndex();
          if (!e.shiftKey && idx === links.length - 1 && cats[catIdx + 1]) {
            e.preventDefault();
            cats[catIdx + 1].focus();
          } else if (e.shiftKey && idx === 0 && catIdx !== -1) {
            e.preventDefault();
            cats[catIdx].focus();
          }
        });
      }
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

    // El buscador del header es un .js-live-search más (ver initLiveSearch).
  }

  // =========================================================
  //  BÚSQUEDA EN VIVO (.js-live-search)
  //  Header y buscador grande de la 404. Antes la hacía el behavior
  //  "idt-search-toggle" del tema base (busca #search-input dentro de
  //  .search-comp); el campo ya no lleva ese id, así que el base no lo toca.
  //  Marcado esperado dentro del contenedor:
  //    [data-search-input]   <input type="search">
  //    [data-search-results] <ul>
  //    [data-search-status]  <p role="status"> (opcional)
  //  Los atractivos salen siempre primero, con estrella.
  // =========================================================
  // Los mismos 12 más relevantes de siempre; solo cambia el orden. (Pedir más
  // y luego subir los atractivos llenaba la lista de atractivos poco
  // relevantes y sacaba, p. ej., el hotel o el artículo que se buscaba.)
  var SEARCH_FETCH = 12;

  function searchEsc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Sin tildes ni mayúsculas, carácter a carácter (mismo largo que el texto).
  function searchNorm(s) {
    return Array.from(s, function (ch) {
      return ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] || ch;
    }).join('');
  }

  // Raíz singular, como el servidor: "restaurantes" resalta "restaurante".
  function searchStem(w) {
    if (w.length < 5) return w;
    if (/[^aeiou]es$/.test(w)) return w.slice(0, -2);
    return w.endsWith('s') ? w.slice(0, -1) : w;
  }

  // Texto escapado con lo buscado dentro de <mark>.
  function searchMark(text, words) {
    text = text || '';
    var chars = Array.from(text);
    var normal = searchNorm(text);
    if (text.length !== chars.length || normal.length !== chars.length) return searchEsc(text);
    var hit = chars.map(function () { return false; });
    words.forEach(function (word) {
      for (var at = normal.indexOf(word); at !== -1; at = normal.indexOf(word, at + word.length)) {
        for (var i = at; i < at + word.length; i++) hit[i] = true;
      }
    });
    return chars.map(function (ch, i) {
      return (hit[i] && !hit[i - 1] ? '<mark>' : '') + searchEsc(ch) + (hit[i] && !hit[i + 1] ? '</mark>' : '');
    }).join('');
  }

  // Atractivos primero (orden estable: dentro de cada grupo manda la relevancia).
  function searchRank(data) {
    var first = data.filter(function (r) { return r.bundle === 'atractivos'; });
    var rest = data.filter(function (r) { return r.bundle !== 'atractivos'; });
    return first.concat(rest);
  }

  function initLiveSearch(comp) {
    if (!comp || comp.dataset.vnSearchInit) return;
    var input = comp.querySelector('[data-search-input]');
    var results = comp.querySelector('[data-search-results]');
    var status = comp.querySelector('[data-search-status]');
    if (!input || !results) return;
    comp.dataset.vnSearchInit = '1';

    var t = function (s) { return (window.Drupal && Drupal.t) ? Drupal.t(s) : s; };
    var lang = (window.drupalSettings && drupalSettings.path && drupalSettings.path.currentLanguage) || 'es';
    var controller = null;
    var timer = null;

    var open = function () { comp.classList.add('is-open'); };
    var close = function () { comp.classList.remove('is-open'); };
    var announce = function (msg) { if (status) status.textContent = msg; };

    function render(data, query) {
      var words = searchNorm(query).split(/[^\p{L}\p{N}]+/u)
        .filter(function (w) { return w.length >= 2; }).map(searchStem);
      if (!data.length) {
        results.innerHTML = '<li class="no-results">' + searchEsc(t('No se encontraron resultados')) + '</li>';
        announce(t('No se encontraron resultados'));
        return;
      }
      results.innerHTML = searchRank(data).map(function (r) {
        var img = r.image_thumb || r.image || '';
        var star = r.bundle === 'atractivos';
        return '<li class="' + (star ? 'is-atractivo' : '') + '" title="' + searchEsc(r.title || '') + '">'
          + '<a href="' + searchEsc(r.url || '#') + '">'
          + (img ? '<img src="' + searchEsc(img) + '" alt="">' : '<div class="no-img"></div>')
          + '<div class="info">'
          + '<p>' + searchMark(r.title, words) + '</p>'
          + (r.snippet ? '<small>' + searchMark(r.snippet, words) + '</small>' : '')
          + '<span class="search-results__type">'
          + (star ? '<span class="search-results__star" aria-hidden="true">★</span>' : '')
          + searchEsc(r.type_label || '') + '</span>'
          + '</div></a></li>';
      }).join('');
      var n = results.querySelectorAll('li a[href]').length;
      announce(Drupal.formatPlural(n, '1 resultado. Usa flecha abajo para recorrerlo.', '@count resultados. Usa flecha abajo para recorrerlos.'));
    }

    function search(query) {
      if (controller) controller.abort();
      if (!query) { results.innerHTML = ''; announce(''); return; }
      controller = new AbortController();
      fetch('/' + lang + '/api/v3/buscar?q=' + encodeURIComponent(query) + '&limit=' + SEARCH_FETCH, { signal: controller.signal })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (json) { render((json && json.data) || [], query); })
        .catch(function (e) { if (e.name !== 'AbortError' && window.console) console.error('Search error:', e.message); });
    }

    // Siguiente/anterior elemento enfocable fuera del buscador, para que las
    // flechas nunca dejen el foco atrapado en el campo (hallazgo 10 SANDI).
    function focusOutside(dir) {
      var all = [].slice.call(document.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(function (el) { return el.offsetParent !== null && !comp.contains(el); });
      var before = all.filter(function (el) { return comp.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING; });
      var target = dir > 0 ? all[before.length] : before[before.length - 1];
      if (target) { close(); target.focus(); }
    }

    input.addEventListener('focus', open);
    input.addEventListener('input', function () {
      open();
      clearTimeout(timer);
      var q = input.value.trim();
      timer = setTimeout(function () { search(q); }, 200);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); input.blur(); return; }
      if (e.key === 'Enter') {
        var firstLink = results.querySelector('li a[href]');
        if (firstLink) { e.preventDefault(); window.location.href = firstLink.getAttribute('href'); }
        else e.preventDefault();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        var first = results.querySelector('li a[href]');
        e.preventDefault();
        if (e.key === 'ArrowDown' && first) first.focus();
        else focusOutside(e.key === 'ArrowDown' ? 1 : -1);
      }
    });
    // Flechas arriba/abajo recorren los resultados; arriba desde el primero
    // devuelve el foco al campo.
    results.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var links = [].slice.call(results.querySelectorAll('li a[href]'));
      var at = links.indexOf(document.activeElement);
      if (at === -1) return;
      e.preventDefault();
      if (e.key === 'ArrowDown') { if (links[at + 1]) links[at + 1].focus(); else focusOutside(1); }
      else if (at === 0) input.focus();
      else links[at - 1].focus();
    });
    document.addEventListener('click', function (e) { if (!comp.contains(e.target)) close(); });
    comp.addEventListener('focusout', function (e) { if (!comp.contains(e.relatedTarget)) close(); });
    // Formulario (404): Enter/botón sin resultados aún → buscar ya.
    var form = input.form;
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstLink = results.querySelector('li a[href]');
      if (firstLink) window.location.href = firstLink.getAttribute('href');
      else search(input.value.trim());
    });
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
    var dots = [];
    var picked = -1;

    var itemName = function (item) {
      var el = item.querySelector('[class*="__title"], [class*="__name"], h2, h3, h4');
      var text = el ? el.textContent : '';
      if (!text.trim()) { var img = item.querySelector('img[alt]'); text = img ? img.getAttribute('alt') : ''; }
      return text.replace(/\s+/g, ' ').trim();
    };
    var scrollToItem = function (i) {
      var max = track.scrollWidth - track.clientWidth;
      track.scrollTo({ left: Math.min(max, items[i].offsetLeft - items[0].offsetLeft), behavior: 'smooth' });
    };

    // Hallazgo 8 SANDI: antes había un punto por posición de scroll (5 ítems
    // podían dar 3 puntos) con una etiqueta fija en español ("Ir a la
    // subcategoría 1") que se leía igual en la versión en inglés. Ahora hay
    // un punto por ítem, con el nombre del ítem y traducido con Drupal.t().
    var buildDots = function () {
      if (!dotsWrap || dots.length) return;
      dotsWrap.textContent = '';
      items.forEach(function (item, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        var args = { '@n': i + 1, '@total': items.length, '@nombre': itemName(item) };
        dot.setAttribute('aria-label', opts.dotLabel ? opts.dotLabel(args) : Drupal.t('Elemento @n de @total: @nombre', args));
        dot.addEventListener('click', function (e) {
          picked = i;
          scrollToItem(i);
          // Activado con teclado (Enter/Espacio dan detail === 0): llevar el
          // foco al enlace del ítem, así el lector lo anuncia y Enter lo abre.
          // Se difiere: si el foco cambia dentro del mismo evento de teclado,
          // el navegador entrega ese Enter al enlace y lo abre.
          if (e.detail === 0) {
            var link = item.querySelector('a[href]');
            if (link) setTimeout(function () { link.focus({ preventScroll: true }); }, 0);
          }
        });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
      dotsWrap.style.display = items.length <= 1 ? 'none' : '';
    };
    buildDots();

    var update = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (arrows[0]) arrows[0].disabled = track.scrollLeft <= 0;
      if (arrows[1]) arrows[1].disabled = track.scrollLeft >= max;
      if (dots.length) {
        var index = Math.min(dots.length - 1, Math.round(track.scrollLeft / step()));
        // Con varias tarjetas visibles, el scroll se topa antes del último
        // ítem: si se eligió uno de esos, se respeta la elección.
        if (track.scrollLeft >= max && picked > index) index = picked;
        dots.forEach(function (d, i) {
          d.classList.toggle('is-active', i === index);
          if (i === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
        });
      }
    };
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { buildDots(); update(); });
    window.addEventListener('load', function () { buildDots(); update(); });
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
        var current = 0;
        var dotEls = [];
        var goTo = function (i, focus) {
          current = (i + slides.length) % slides.length;
          slides.forEach(function (s, j) {
            s.classList.toggle('is-active', current === j);
            if (current === j) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
          });
          dotEls.forEach(function (d, j) {
            d.classList.toggle('is-active', current === j);
            d.setAttribute('aria-selected', current === j ? 'true' : 'false');
            d.tabIndex = current === j ? 0 : -1;
          });
          if (focus) dotEls[current].focus();
        };
        // Hallazgos 3 y 11 SANDI: cada bolita anuncia qué imagen muestra (el
        // alt cargado en el CMS) y su posición, no solo "Ir al slide N".
        slides.forEach(function (slide, i) {
          var img = slide.querySelector('img');
          var desc = img ? (img.getAttribute('alt') || '').trim() : '';
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.id = 'hero-dot-' + (i + 1);
          dot.className = 'hero__dot' + (i === 0 ? ' is-active' : '');
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
          if (slide.id) dot.setAttribute('aria-controls', slide.id);
          dot.tabIndex = i === 0 ? 0 : -1;
          var args = { '@n': i + 1, '@total': slides.length, '@desc': desc };
          dot.setAttribute('aria-label', desc
            ? Drupal.t('Imagen @n de @total: @desc', args)
            : Drupal.t('Imagen @n de @total', args));
          dot.addEventListener('click', function () { goTo(i); });
          heroDots.appendChild(dot);
          dotEls.push(dot);
        });
        // Patrón de pestañas WAI-ARIA: una sola bolita en el orden de Tab y
        // las flechas recorren las demás.
        heroDots.addEventListener('keydown', function (e) {
          var keys = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: slides.length - 1 };
          if (!(e.key in keys)) return;
          e.preventDefault();
          goTo(keys[e.key], true);
        });

        // Swipe horizontal con el dedo (las diapositivas están apiladas, no
        // hay scroll nativo que aprovechar).
        var touchX = null, touchY = 0;
        heroTrack.addEventListener('touchstart', function (e) {
          touchX = e.touches[0].clientX;
          touchY = e.touches[0].clientY;
        }, { passive: true });
        heroTrack.addEventListener('touchend', function (e) {
          if (touchX === null) return;
          var dx = e.changedTouches[0].clientX - touchX;
          var dy = e.changedTouches[0].clientY - touchY;
          touchX = null;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goTo(current + (dx < 0 ? 1 : -1));
        }, { passive: true });
      }
    }

    try {
      initTrack({
        trackId: 'imperdiblesTrack',
        arrowSelector: '.vn-home .imperdibles__arrow',
        itemSelector: '.imperdibles__item',
      });
      initTrack({
        trackId: 'eventosTrack',
        dotsId: 'eventosDots',
        arrowSelector: '.vn-home .eventos__arrow',
        itemSelector: '.eventos__item',
        dotLabel: function (a) { return Drupal.t('Evento @n de @total: @nombre', a); },
      });
    } catch (err) {
      if (window.console) console.warn('[vn-home] carrusel:', err);
    }
  }

  // Texto colapsable ("Leer más") — .cat-intro__body--collapsible + su toggle.
  function initCollapsible(root) {
    var body = root.querySelector('.cat-intro__body--collapsible');
    var toggle = root.querySelector('.cat-intro__toggle');
    if (!body || !toggle || toggle.dataset.vnInit) return;
    toggle.dataset.vnInit = '1';

    var label = toggle.querySelector('.cat-intro__toggle-label');
    // Si el texto ya cabe en la altura colapsada, no hace falta el botón.
    if (body.scrollHeight <= body.clientHeight + 4) {
      body.classList.add('cat-intro__body--fits');
      toggle.hidden = true;
      return;
    }
    toggle.addEventListener('click', function () {
      var expanded = body.classList.toggle('is-expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      if (label) label.textContent = expanded ? Drupal.t('Leer menos') : Drupal.t('Leer más');

      // Analytics (GTM): el botón trae `hasAnalytics` + `data-event="leer_mas_*"`
      // y GTM registra el evento en cada clic. Solo la expansión significa que
      // el usuario "vio más contenido"; al colapsar no debe contar. La clase se
      // quita tras expandir y se repone al colapsar. Va en un setTimeout para
      // cambiarla DESPUÉS de que termine este clic, así el resultado no depende
      // de en qué fase del clic GTM lea el elemento.
      if (toggle.dataset.event) {
        setTimeout(function () {
          toggle.classList.toggle('hasAnalytics', !expanded);
        }, 0);
      }
    });
  }

  // Foco de un modal .vn-modal: al abrir va al botón de cerrar y Tab no sale
  // del diálogo; al cerrar vuelve al elemento que lo abrió (WCAG 2.1.2 y 2.4.3).
  function modalFocus(modal) {
    var trigger = null;
    var dialog = modal.querySelector('[role="dialog"]') || modal;
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || modal.hidden) return;
      var f = [].slice.call(dialog.querySelectorAll('a[href], button, iframe, [tabindex]:not([tabindex="-1"])'));
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    return {
      opened: function () {
        trigger = document.activeElement;
        var close = dialog.querySelector('[data-modal-close]');
        if (close) close.focus();
      },
      closed: function () {
        if (trigger && trigger.focus) trigger.focus();
        trigger = null;
      },
    };
  }

  // Modal de imagen (galería de la ficha de atractivo).
  function initGalleryModal() {
    var modal = document.getElementById('galleryModal');
    if (!modal || modal.dataset.vnInit) return;
    modal.dataset.vnInit = '1';

    var img = document.getElementById('galleryModalImg');
    var focus = modalFocus(modal);
    var open = function (src, alt) {
      if (!img) return;
      img.src = src;
      img.alt = alt || '';
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      focus.opened();
    };
    var close = function () {
      modal.hidden = true;
      if (img) img.src = '';
      document.body.style.overflow = '';
      focus.closed();
    };

    document.querySelectorAll('.place-gallery__item[data-gallery-src]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = btn.querySelector('img');
        open(btn.dataset.gallerySrc, el ? el.alt : '');
      });
    });
    modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) close();
    });
  }

  // Modal del post de Instagram embebido (reels de la página de subcategoría).
  function initInstagramModal() {
    var modal = document.getElementById('instagramModal');
    if (!modal || modal.dataset.vnInit) return;
    modal.dataset.vnInit = '1';

    var body = document.getElementById('instagramModalBody');
    var focus = modalFocus(modal);
    var open = function (url) {
      if (!body) return;
      var embedSrc = url.replace(/\/?$/, '/') + 'embed';
      var frame = document.createElement('iframe');
      frame.src = embedSrc;
      frame.title = Drupal.t('Publicación de Instagram');
      frame.loading = 'lazy';
      frame.setAttribute('allowtransparency', 'true');
      body.textContent = '';
      body.appendChild(frame);
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      focus.opened();
    };
    var close = function () {
      modal.hidden = true;
      if (body) body.innerHTML = '';
      document.body.style.overflow = '';
      focus.closed();
    };

    document.querySelectorAll('.card-video[data-instagram-url]').forEach(function (card) {
      card.addEventListener('click', function () {
        if (card.dataset.instagramUrl) open(card.dataset.instagramUrl);
      });
    });
    modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) close();
    });
  }

  // =========================================================
  //  CATEGORÍA / SUBCATEGORÍA (prototipo v3)
  // =========================================================
  function initCat() {
    var cat = document.querySelector('.vn-cat');
    if (!cat || cat.dataset.vnCatInit) return;
    cat.dataset.vnCatInit = '1';

    try {
      initTrack({
        trackId: 'catSubcatsTrack',
        dotsId: 'catSubcatsDots',
        arrowSelector: '.vn-cat .cat-subcats__arrow',
        itemSelector: '.cat-subcats__item',
        dotLabel: function (a) { return Drupal.t('Subcategoría @n de @total: @nombre', a); },
      });
    } catch (err) {
      if (window.console) console.warn('[vn-cat] carrusel:', err);
    }

    initCollapsible(cat);
    initInstagramModal();
  }

  // =========================================================
  //  FICHA DE ATRACTIVO / EVENTO (prototipo v3)
  // =========================================================
  function initPlace() {
    var place = document.querySelector('.vn-place');
    if (!place || place.dataset.vnPlaceInit) return;
    place.dataset.vnPlaceInit = '1';

    initCollapsible(place);
    initGalleryModal();
    initPlaceMap();
  }

  // Mapa embebido (ArcGIS, lab.visitbogota.co/iframeMap): pesa varios MB en
  // JS/WASM, así que se difiere con IntersectionObserver en vez de cargarlo
  // en el render inicial (el `loading="lazy"` nativo no basta porque el
  // bloque suele quedar cerca del viewport inicial).
  function initPlaceMap() {
    var frames = [].slice.call(document.querySelectorAll('.place-map--embed iframe[data-src]'));
    if (!frames.length) return;

    var load = function (iframe) {
      if (iframe.dataset.loaded) return;
      iframe.dataset.loaded = '1';
      iframe.src = iframe.dataset.src;
    };

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries, o) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          load(entry.target);
          o.unobserve(entry.target);
        });
      }, { rootMargin: '300px 0px' });
      frames.forEach(function (f) { obs.observe(f); });
    } else {
      frames.forEach(load);
    }
  }

  // =========================================================
  //  DIRECTORIO DE GUÍAS — filtro por idioma / sector (client-side)
  // =========================================================
  function initGuias() {
    var cards = document.getElementById('guias-cards');
    if (!cards || cards.dataset.vnInit) return;
    cards.dataset.vnInit = '1';

    var fLang = document.getElementById('f-idioma');
    var fSector = document.getElementById('f-sector');
    var count = document.getElementById('guias-count');
    var rows = [].slice.call(cards.querySelectorAll('.guias-row'));
    if (!fLang || !fSector || !rows.length) return;

    // Orden aleatorio en cada visita (Fisher-Yates); en Twig quedaría fijo por la caché de página.
    for (var i = rows.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = rows[i]; rows[i] = rows[j]; rows[j] = tmp;
    }
    rows.forEach(function (row) { cards.appendChild(row); });

    var countTpl = count ? count.textContent.replace(/^\d+\s*/, '') : '';

    var apply = function () {
      var l = fLang.value;
      var s = fSector.value;
      var visible = 0;
      rows.forEach(function (row) {
        var langs = (row.dataset.languages || '').split(' ').filter(Boolean);
        var secs = (row.dataset.sector || '').split(' ').filter(Boolean);
        var match = (!l || langs.indexOf(l) !== -1) && (!s || secs.indexOf(s) !== -1);
        row.classList.toggle('is-hidden', !match);
        if (match) visible++;
      });
      if (count) count.textContent = visible + ' ' + countTpl;
    };

    fLang.addEventListener('change', apply);
    fSector.addEventListener('change', apply);
  }

  // =========================================================
  //  AGENDA — filtros plegables en móvil (el CSS los oculta sin .is-open)
  // =========================================================
  function initEventsFilters() {
    var toggle = document.querySelector('.events-filters__toggle');
    if (!toggle || toggle.dataset.vnInit) return;
    toggle.dataset.vnInit = '1';

    var wrap = toggle.closest('.events-filters-wrap');
    toggle.addEventListener('click', function () {
      var open = wrap.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // =========================================================
  //  MIGA DE PAN → schema.org BreadcrumbList (JSON-LD)
  //  Las migas están escritas a mano en cada plantilla; se arma el JSON-LD
  //  desde el DOM en un solo sitio. Google procesa el JSON-LD inyectado por JS.
  // =========================================================
  function initBreadcrumbSchema() {
    var list = document.querySelector('nav.breadcrumb ol');
    if (!list || document.getElementById('vn-breadcrumb-ld')) return;

    var items = [].slice.call(list.querySelectorAll(':scope > li')).map(function (li, i, all) {
      var link = li.querySelector('a[href]');
      var name = (li.textContent || '').trim();
      if (!name) return null;
      var url = link ? link.href : (i === all.length - 1 ? window.location.href.split('#')[0] : null);
      var entry = { '@type': 'ListItem', position: i + 1, name: name };
      if (url) entry.item = url;
      return entry;
    }).filter(Boolean);
    if (items.length < 2) return;

    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'vn-breadcrumb-ld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    });
    document.head.appendChild(script);
  }

  function init() {
    initHeader();
    document.querySelectorAll('.js-live-search').forEach(initLiveSearch);
    initHome();
    initCat();
    initPlace();
    initGuias();
    initEventsFilters();
    initBreadcrumbSchema();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * "Mi viaje" fuera del planificador: botones "Agregar a mi viaje" de las
 * fichas (atractivos, hoteles, restaurantes, ofertas) y "Agrega este
 * itinerario a tu viaje" de los itinerarios.
 *
 * El viaje se guarda en localStorage ('vn-dtv-trip') como referencias
 * "categoría.nid" con las mismas categorías del mapa de Diseña tu viaje
 * (atractivos | hoteles | restaurantes | ofertas). El planificador
 * (js/disena-tu-viaje/app.js) lee y escribe la misma clave mediante
 * window.VNTrip. Si el navegador bloquea localStorage, el enlace "Ver mi
 * viaje" lleva igual el viaje en la URL (?viaje=…).
 *
 * Marcado del botón:
 *   <button class="js-trip-add" data-trip-refs="atractivos.12,atractivos.40"
 *     data-planner="/es/disena-tu-viaje"
 *     data-label-add="…" data-label-added="…">
 */
(function () {
  'use strict';

  var KEY = 'vn-dtv-trip';
  var CATS = ['atractivos', 'hoteles', 'restaurantes', 'ofertas'];
  var memory = [];
  var valid = function (ref) {
    var parts = String(ref).split('.');
    return parts.length === 2 && CATS.indexOf(parts[0]) !== -1 && /^\d+$/.test(parts[1]);
  };
  var t = function (s, args) { return (window.Drupal && Drupal.t) ? Drupal.t(s, args) : s; };

  var VNTrip = {
    KEY: KEY,
    get: function () {
      try {
        var v = JSON.parse(window.localStorage.getItem(KEY) || '[]');
        return Array.isArray(v) ? v.filter(valid) : [];
      } catch (e) {
        return memory.slice();
      }
    },
    set: function (refs) {
      var seen = {};
      memory = (refs || []).filter(function (r) { return valid(r) && !seen[r] && (seen[r] = true); });
      try { window.localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* sin almacenamiento */ }
      return memory;
    },
    has: function (ref) { return VNTrip.get().indexOf(ref) !== -1; },
    // Agrega sin duplicar. Devuelve cuántas referencias eran nuevas.
    add: function (refs) {
      var cur = VNTrip.get();
      var added = refs.filter(function (r) { return valid(r) && cur.indexOf(r) === -1; });
      VNTrip.set(cur.concat(added));
      return added.length;
    },
    remove: function (ref) { VNTrip.set(VNTrip.get().filter(function (r) { return r !== ref; })); },
    // Enlace al planificador con el viaje y la vista "solo mi itinerario".
    url: function (planner) {
      var refs = VNTrip.get();
      return planner + (refs.length ? '?viaje=' + refs.join(',') + '&ver=viaje' : '');
    }
  };
  window.VNTrip = VNTrip;

  // ── Aviso flotante "Ver mi viaje" ──
  var float = null;
  var floatTimer = null;
  function showFloat(msg, planner) {
    if (!float) {
      float = document.createElement('div');
      float.className = 'vn-trip-float';
      float.innerHTML = '<p class="vn-trip-float__msg" role="status"></p>'
        + '<a class="vn-trip-float__btn" href="#"></a>'
        + '<button type="button" class="vn-trip-float__close" aria-label="' + t('Cerrar') + '">&times;</button>';
      float.querySelector('.vn-trip-float__close').addEventListener('click', function () {
        float.classList.remove('is-visible');
      });
      document.body.appendChild(float);
    }
    var n = VNTrip.get().length;
    float.querySelector('.vn-trip-float__msg').textContent = msg;
    var btn = float.querySelector('.vn-trip-float__btn');
    btn.textContent = t('Ver mi viaje') + ' (' + n + ')';
    btn.href = VNTrip.url(planner);
    btn.hidden = n === 0;
    // Doble frame: la transición arranca aunque el elemento sea nuevo.
    requestAnimationFrame(function () { requestAnimationFrame(function () { float.classList.add('is-visible'); }); });
    clearTimeout(floatTimer);
    // Se queda a la vista; solo se oculta solo si el viaje quedó vacío.
    if (!n) floatTimer = setTimeout(function () { float.classList.remove('is-visible'); }, 3000);
  }

  function refsOf(btn) {
    return (btn.getAttribute('data-trip-refs') || '').split(',').map(function (r) { return r.trim(); }).filter(valid);
  }

  function paint(btn) {
    var refs = refsOf(btn);
    var cur = VNTrip.get();
    var all = refs.length && refs.every(function (r) { return cur.indexOf(r) !== -1; });
    btn.classList.toggle('is-added', !!all);
    btn.setAttribute('aria-pressed', all ? 'true' : 'false');
    var label = btn.querySelector('.js-trip-label') || btn;
    label.textContent = all ? btn.getAttribute('data-label-added') : btn.getAttribute('data-label-add');
  }

  function init() {
    var buttons = [].slice.call(document.querySelectorAll('.js-trip-add'));
    buttons.forEach(function (btn) {
      if (btn.dataset.vnTripInit) return;
      btn.dataset.vnTripInit = '1';
      paint(btn);
      btn.addEventListener('click', function () {
        var refs = refsOf(btn);
        if (!refs.length) return;
        var planner = btn.getAttribute('data-planner') || '/';
        var name = btn.getAttribute('data-name') || '';
        var msg;
        if (refs.length === 1 && VNTrip.has(refs[0])) {
          // Ficha: segundo clic quita el lugar.
          VNTrip.remove(refs[0]);
          msg = t('«!nombre» quitado de tu viaje', { '!nombre': name });
        } else {
          var added = VNTrip.add(refs);
          if (refs.length === 1) msg = t('«!nombre» agregado a tu viaje', { '!nombre': name });
          else if (added) msg = Drupal.formatPlural(added, 'Se agregó 1 lugar a tu viaje', 'Se agregaron @count lugares a tu viaje');
          else msg = t('Este itinerario ya está en tu viaje');
        }
        buttons.forEach(paint);
        showFloat(msg, planner);
      });
    });
  }

  // Otra pestaña cambió el viaje: repintar.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) document.querySelectorAll('.js-trip-add').forEach(paint);
  });
  // Volver con el botón "atrás" (bfcache): el viaje pudo cambiar en el mapa.
  window.addEventListener('pageshow', function () {
    document.querySelectorAll('.js-trip-add').forEach(paint);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * Filtros de los listados: el estado vive en la URL (al abrir una ficha y
 * volver con "atrás" se conservan), botón "Limpiar filtros" y, en móvil,
 * "Compartir esta búsqueda" (enlace ya filtrado con las apps del teléfono).
 *
 *   · Checkboxes .filters + #cardsList (hoteles, restaurantes, rutas, ofertas,
 *     experiencias, atractivos por categoría…). El filtrado lo hace el
 *     behavior "idt-gastro-filter" del tema base; aquí solo se marcan las
 *     casillas desde ?filtros=tid,tid y se dispara "change".
 *   · Guías (#guias-filters): selects → ?idioma=…&sector=….
 *   · Agenda (#events-filters-form): ya filtra por GET; solo se añaden los
 *     botones.
 */
(function () {
  'use strict';

  var t = function (s) { return (window.Drupal && Drupal.t) ? Drupal.t(s) : s; };

  function setParams(params) {
    var url = new URL(window.location.href);
    Object.keys(params).forEach(function (k) {
      if (params[k]) url.searchParams.set(k, params[k]);
      else url.searchParams.delete(k);
    });
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }

  function toast(msg) {
    var el = document.querySelector('.vn-filter-toast');
    if (!el) {
      el = document.createElement('p');
      el.className = 'vn-filter-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 2200);
  }

  function share() {
    var url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url: url }).catch(function () { /* cancelado */ });
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { toast(t('Enlace copiado')); });
    } else {
      window.prompt(t('Copia este enlace'), url);
    }
  }

  // Barra con los dos botones. update(active) muestra/oculta según haya filtros.
  function toolbar(onClear) {
    var bar = document.createElement('div');
    bar.className = 'vn-filter-tools';
    bar.innerHTML = '<button type="button" class="vn-filter-tools__btn vn-filter-tools__clear">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>'
      + '<span>' + t('Limpiar filtros') + '</span></button>'
      + '<button type="button" class="vn-filter-tools__btn vn-filter-tools__share">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>'
      + '<span>' + t('Compartir esta búsqueda') + '</span></button>';
    bar.querySelector('.vn-filter-tools__clear').addEventListener('click', onClear);
    bar.querySelector('.vn-filter-tools__share').addEventListener('click', share);
    bar.update = function (active) { bar.hidden = !active; };
    return bar;
  }

  // ── Checkboxes del tema base ──
  function initCheckboxes(panel) {
    if (panel.dataset.vnFilterTools) return;
    var list = document.getElementById('cardsList');
    var boxes = [].slice.call(panel.querySelectorAll('input[type="checkbox"]'));
    if (!list || !boxes.length) return;
    panel.dataset.vnFilterTools = '1';

    var checked = function () {
      return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    };
    var bar = toolbar(function () {
      boxes.forEach(function (b) { b.checked = false; });
      boxes[0].dispatchEvent(new Event('change'));
      sync();
      var toggle = document.querySelector('.filter-toggle-btn');
      (toggle && toggle.offsetParent ? toggle : boxes[0]).focus();
    });
    var sync = function () {
      var vals = checked();
      setParams({ filtros: vals.join(',') });
      bar.update(vals.length > 0);
    };

    var head = document.querySelector('.archive__results-head');
    if (head) head.appendChild(bar);
    else list.parentNode.insertBefore(bar, list);

    // Restaurar desde la URL.
    var wanted = (new URLSearchParams(window.location.search).get('filtros') || '').split(',').filter(Boolean);
    if (wanted.length) {
      boxes.forEach(function (b) { b.checked = wanted.indexOf(b.value) !== -1; });
      boxes[0].dispatchEvent(new Event('change'));
      // En móvil el panel arranca plegado: abrirlo para que se vea qué está aplicado.
      var toggleBtn = document.querySelector('.filter-toggle-btn[aria-controls="' + panel.id + '"]');
      if (toggleBtn) { toggleBtn.setAttribute('aria-expanded', 'true'); panel.classList.add('is-open'); }
    }
    panel.addEventListener('change', function (e) {
      if (e.target.matches('input[type="checkbox"]')) sync();
    });
    sync();
  }

  // ── Guías: selects ──
  function initGuiasTools() {
    var form = document.getElementById('guias-filters');
    var lang = document.getElementById('f-idioma');
    var sector = document.getElementById('f-sector');
    if (!form || !lang || !sector || form.dataset.vnFilterTools) return;
    form.dataset.vnFilterTools = '1';

    var bar = toolbar(function () {
      lang.value = '';
      sector.value = '';
      lang.dispatchEvent(new Event('change'));
      sync();
      lang.focus();
    });
    var sync = function () {
      setParams({ idioma: lang.value, sector: sector.value });
      bar.update(!!(lang.value || sector.value));
    };
    form.appendChild(bar);

    var q = new URLSearchParams(window.location.search);
    var restored = false;
    [[lang, 'idioma'], [sector, 'sector']].forEach(function (pair) {
      var v = q.get(pair[1]);
      if (v && pair[0].querySelector('option[value="' + CSS.escape(v) + '"]')) { pair[0].value = v; restored = true; }
    });
    if (restored) lang.dispatchEvent(new Event('change'));
    lang.addEventListener('change', sync);
    sector.addEventListener('change', sync);
    sync();
  }

  // ── Agenda: GET ──
  function initAgendaTools() {
    var form = document.getElementById('events-filters-form');
    if (!form || form.dataset.vnFilterTools) return;
    form.dataset.vnFilterTools = '1';
    var keys = ['filtro_mes', 'categoria', 'tipo', 'fecha_desde', 'fecha_hasta', 'rango'];
    var q = new URLSearchParams(window.location.search);
    var active = keys.some(function (k) { return q.get(k); });
    var bar = toolbar(function () { window.location.href = window.location.pathname; });
    bar.update(active);
    form.appendChild(bar);
  }

  function init() {
    document.querySelectorAll('.filters').forEach(initCheckboxes);
    initGuiasTools();
    initAgendaTools();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
