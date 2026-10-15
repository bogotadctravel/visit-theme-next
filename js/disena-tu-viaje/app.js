/* Diseña tu viaje — HTML + CSS + JS + ArcGIS Maps SDK, con datos de la API de visitbogota.co.
   Portado del repo disena-tu-viaje (js/app.js) al subtema; se carga solo en el nodo 3003
   (librería visit_theme_next/disena-tu-viaje). Cambios respecto al original:
   · clases renombradas con prefijo dtv- donde chocaban con el tema base (.result-card, .tag);
   · ArcGIS se inyecta al final (ver loadArcgis) en vez de ir como <script> de la librería. */
(function () {
  'use strict';

  if (!document.getElementById('dtvPlanner')) return;

  const CATS = window.CATEGORIES;
  const CONFIG = window.DTV_CONFIG;
  const places = new Map();          // registro de lugares cargados: id → lugar
  const byId = id => places.get(id);

  const state = {
    cats: new Set(),                                            // categorías activas
    filters: Object.fromEntries(Object.keys(CATS).map(c => [c, {}])),  // { cat: { key: Set(ids) } }
    defs: {},                                                   // filtros de la API: { cat: { status, groups } }
    openDD: null,                                               // desplegable abierto: "cat|key"
    results: {},                                                // { imperdibles|cat: { status, qs, ids, total } }
    tripLoading: false,                                         // resolviendo un itinerario compartido
    selected: null,                                             // id del lugar destacado
    trip: []                                                    // ids en "Mi viaje"
  };

  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (cat, cls = 'ico') =>
    `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${CATS[cat].glyph}</svg>`;

  /* ---------- Datos visibles ---------- */

  // Listados que alimentan la vista actual: imperdibles o las categorías activas.
  const visibleKeys = () => (state.cats.size ? [...state.cats] : ['imperdibles']);

  function visiblePlaces() {
    const seen = new Set(), list = [];
    visibleKeys().forEach(k => ((state.results[k] && state.results[k].ids) || []).forEach(id => {
      if (!seen.has(id)) { seen.add(id); list.push(byId(id)); }
    }));
    return list;
  }

  function visibleStatus() {
    const st = visibleKeys().map(k => (state.results[k] ? state.results[k].status : 'loading'));
    return st.includes('error') ? 'error' : st.includes('loading') ? 'loading' : 'ok';
  }

  function clearFilters(cat) {
    (cat ? [cat] : Object.keys(CATS)).forEach(c => { state.filters[c] = {}; });
  }

  function selection(cat, key) {
    return state.filters[cat][key] || (state.filters[cat][key] = new Set());
  }

  /* ---------- Filtros de la API ---------- */

  const apiUrl = path => `${CONFIG.apiBase}/${path}`;

  function loadFilters(cat) {
    const def = state.defs[cat];
    if (def && def.status !== 'error') return;
    state.defs[cat] = { status: 'loading', groups: [] };
    fetch(apiUrl(`listado/${CONFIG.endpoints[cat]}/filtros`), { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => {
        const groups = ((json.data && json.data.groups) || [])
          .filter(g => g.key && g.options && g.options.length)
          .map(g => ({
            key: g.key,
            label: g.label || g.key,
            options: g.options.map(o => ({ id: String(o.id), title: o.title, count: o.count }))
          }));
        state.defs[cat] = { status: 'ok', groups, total: json.meta && json.meta.total };
        pruneSelection(cat);
      })
      .catch(err => {
        console.warn(`[Diseña tu viaje] No se pudieron cargar los filtros de ${cat}:`, err);
        state.defs[cat] = { status: 'error', groups: [] };
      })
      .then(() => {
        renderFilters();
        if (state.cats.has(cat)) refreshData(false);
      });
  }

  // Descarta selecciones (p. ej. de un enlace compartido) que ya no existen en la API.
  function pruneSelection(cat) {
    const valid = Object.fromEntries(state.defs[cat].groups.map(g => [g.key, new Set(g.options.map(o => o.id))]));
    Object.keys(state.filters[cat]).forEach(key => {
      if (!valid[key]) return delete state.filters[cat][key];
      state.filters[cat][key].forEach(id => { if (!valid[key].has(id)) state.filters[cat][key].delete(id); });
    });
  }

  /* ---------- Listados de la API ---------- */

  // Tipo de contenido de la API → categoría del mapa
  const BUNDLE_CAT = { atractivos: 'atractivos', hoteles: 'hoteles', establecimientos: 'restaurantes', experiencias: 'ofertas' };

  // field_latlong llega como ["lat", "lng"] o como ["lat, lng"]; algunos registros no lo tienen.
  function parseLatLng(v) {
    if (!v) return null;
    if (!Array.isArray(v) && typeof v === 'object') v = [v.lat, v.lng != null ? v.lng : v.lon];
    const [lat, lng] = (Array.isArray(v) ? v.join(',') : String(v)).split(',').map(parseFloat);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  }

  function termTitle(fields, ...keys) {
    for (const k of keys) {
      const v = fields[k];
      const t = Array.isArray(v) ? v[0] : v;
      if (t && t.title) return t.title;
    }
    return '';
  }

  function toPlace(raw, fallbackCat) {
    const f = raw.fields || {};
    const id = String(raw.id);
    const geo = parseLatLng(f.field_latlong);
    const discount = parseInt(f.field_porcentaje_de_descuento, 10);
    const p = places.get(id) || { id, imperdible: null };
    Object.assign(p, {
      cat: BUNDLE_CAT[raw.bundle] || fallbackCat,
      name: String(raw.title || '').trim(),
      zone: termTitle(f, 'field_turdistr', 'field_zonagast', 'field_turzone'),
      lat: geo ? geo.lat : null,
      lng: geo ? geo.lng : null,
      hasGeo: !!geo,
      img: raw.image || raw.image_full || raw.image_thumb || '',
      thumb: raw.image_thumb || raw.image || '',
      url: raw.url,
      discount: discount > 0 ? discount : null
    });
    places.set(id, p);
    return p;
  }

  // Trae todas las páginas de un listado. Se cachea por consulta.
  const listingCache = new Map();

  function fetchListing(endpoint, qs) {
    const base = apiUrl(`listado/${endpoint}`);
    const key = `${base}?${qs}`;
    if (!listingCache.has(key)) {
      const getPage = page =>
        fetch(`${base}?${qs ? qs + '&' : ''}limit=${CONFIG.pageSize}&page=${page}`, { headers: { Accept: 'application/json' } })
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
      const req = getPage(0).then(first => {
        const pages = Math.min((first.meta && first.meta.pages) || 1, CONFIG.maxPages);
        const rest = [];
        for (let i = 1; i < pages; i++) rest.push(getPage(i));
        return Promise.all(rest).then(more => ({
          items: [first, ...more].flatMap(j => j.data || []),
          total: (first.meta && first.meta.total) || 0
        }));
      });
      listingCache.set(key, req);
      req.catch(() => listingCache.delete(key));
    }
    return listingCache.get(key);
  }

  // Consulta de filtros para el listado: key=id,id&key=id (OR dentro del grupo, AND entre grupos)
  function filterQs(cat) {
    return Object.entries(state.filters[cat])
      .filter(([, ids]) => ids.size)
      .map(([key, ids]) => `${encodeURIComponent(key)}=${[...ids].map(encodeURIComponent).join(',')}`)
      .join('&');
  }

  function apiQuery(cat) {
    const qs = filterQs(cat);
    return apiUrl(`listado/${CONFIG.endpoints[cat]}`) + (qs ? `?${qs}` : '');
  }

  // Carga (o recarga si cambiaron los filtros) el listado de una categoría.
  // Un listado con error no se reintenta solo (evita bucles); lo hace el botón "Reintentar".
  function loadResults(key, retry) {
    const isImp = key === 'imperdibles';
    const qs = isImp ? '' : filterQs(key);
    const cur = state.results[key];
    if (cur && cur.qs === qs && (cur.status !== 'error' || !retry)) return;
    const token = {};
    // Mientras carga se mantienen los resultados anteriores para no vaciar la vista.
    state.results[key] = { status: 'loading', qs, ids: cur ? cur.ids : [], total: cur ? cur.total : null, token };
    fetchListing(isImp ? CONFIG.imperdibles : CONFIG.endpoints[key], qs)
      .then(({ items, total }) => {
        if (state.results[key].token !== token) return;
        const list = items.map(raw => toPlace(raw, isImp ? 'atractivos' : key));
        if (isImp) list.forEach((p, i) => { p.imperdible = i + 1; });
        state.results[key] = { status: 'ok', qs, ids: list.map(p => p.id), total };
        refreshData(true);
      }, err => {
        if (state.results[key].token !== token) return;
        console.warn(`[Diseña tu viaje] No se pudo cargar el listado de ${key}:`, err);
        state.results[key] = { status: 'error', qs, ids: [], total: null };
        refreshData(false);
      });
  }

  function ensureData(retry) {
    visibleKeys().forEach(k => loadResults(k, retry));
  }

  const debugMode = new URLSearchParams(location.search).has('debug');

  function renderApiDebug() {
    const box = $('#apiDebug');
    const cats = [...state.cats];
    if (!debugMode || !cats.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<strong>Consultas a la API</strong>` + cats.map(c => {
      const r = state.results[c];
      const info = !r || r.status === 'loading' ? 'cargando…' : r.status === 'error' ? 'error'
        : `${r.total} resultados · ${r.ids.filter(id => byId(id).hasGeo).length} con ubicación`;
      return `<div class="api-line"><code>GET ${esc(apiQuery(c))}</code><span>→ ${info}</span></div>`;
    }).join('');
  }

  /* ---------- Filtros ---------- */

  function renderFilters() {
    const main = $('#filtersMain');
    const all = state.cats.size === 0;
    main.innerHTML =
      `<button class="chip chip-imperdible ${all ? 'is-active' : ''}" data-cat="__all" aria-pressed="${all}">
         <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>
         Imperdibles
       </button>` +
      Object.entries(CATS).map(([key, c]) => {
        const on = state.cats.has(key);
        const def = state.defs[key];
        const n = def && def.total != null ? def.total : '';
        return `<button class="chip ${on ? 'is-active' : ''}" data-cat="${key}" aria-pressed="${on}" style="--c:${c.color}">
                  <span class="chip-dot">${icon(key)}</span>${esc(c.label)}${n !== '' ? `<span class="chip-n">${n}</span>` : ''}
                </button>`;
      }).join('');

    const sub = $('#filtersSub');
    if (state.cats.size === 0) { sub.hidden = true; sub.innerHTML = ''; return; }
    sub.hidden = false;
    sub.innerHTML = [...state.cats].map(key => {
      const c = CATS[key], def = state.defs[key];
      let body;
      if (!def || def.status === 'loading') {
        body = `<span class="sub-status"><span class="spinner spinner-dark" aria-hidden="true"></span>Cargando filtros…</span>`;
      } else if (def.status === 'error') {
        body = `<span class="sub-status is-error">No se pudieron cargar los filtros.</span>
                <button class="link-btn" data-retry="${key}">Reintentar</button>`;
      } else if (!def.groups.length) {
        body = `<span class="sub-status">Sin filtros disponibles</span>`;
      } else {
        body = def.groups.map(g => dropdownHtml(key, g)).join('');
      }
      return `<div class="sub-group" style="--c:${c.color}">
                <span class="sub-label">${icon(key)}${esc(c.label)}</span>${body}
              </div>`;
    }).join('') + `<button class="link-btn" id="clearFilters">Limpiar filtros</button>`;
  }

  const caret = '<svg class="dd-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  function ddButtonInner(label, n) {
    return `${esc(label)}${n ? `<span class="dd-n">${n}</span>` : ''}${caret}`;
  }

  function dropdownHtml(cat, g) {
    const id = `${cat}|${g.key}`;
    const open = state.openDD === id;
    const sel = state.filters[cat][g.key] || new Set();
    return `<div class="dd ${open ? 'is-open' : ''}" data-dd="${id}">
      <button type="button" class="chip chip-sm dd-btn ${sel.size ? 'is-active' : ''}" aria-expanded="${open}" aria-haspopup="true">
        ${ddButtonInner(g.label, sel.size)}
      </button>
      <div class="dd-pop" role="group" aria-label="${esc(g.label)}" ${open ? '' : 'hidden'}>
        ${g.options.length > 8 ? `<input type="search" class="dd-search" placeholder="Buscar en ${esc(g.label.toLowerCase())}…" aria-label="Buscar">` : ''}
        <ul class="dd-list">
          ${g.options.map(o => `<li data-title="${esc(normalize(o.title))}">
            <label class="dd-opt">
              <input type="checkbox" value="${esc(o.id)}" ${sel.has(o.id) ? 'checked' : ''}>
              <span>${esc(o.title)}</span>
              ${o.count != null ? `<small>${o.count}</small>` : ''}
            </label>
          </li>`).join('')}
        </ul>
        <div class="dd-empty" hidden>Sin coincidencias</div>
        <div class="dd-foot">
          <button type="button" class="link-btn" data-dd-clear>Limpiar</button>
          <button type="button" class="btn btn-primary btn-sm" data-dd-close>Listo</button>
        </div>
      </div>
    </div>`;
  }

  const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function ddParts(el) {
    const dd = el.closest('.dd');
    const [cat, key] = dd.dataset.dd.split('|');
    return { dd, cat, key };
  }

  function updateDDButton(dd, cat, key) {
    const g = state.defs[cat].groups.find(x => x.key === key);
    const n = (state.filters[cat][key] || new Set()).size;
    const btn = dd.querySelector('.dd-btn');
    btn.classList.toggle('is-active', n > 0);
    btn.innerHTML = ddButtonInner(g.label, n);
  }

  function closeDropdowns(except) {
    document.querySelectorAll('.dd.is-open').forEach(dd => {
      if (dd === except) return;
      dd.classList.remove('is-open');
      dd.querySelector('.dd-pop').hidden = true;
      dd.querySelector('.dd-btn').setAttribute('aria-expanded', 'false');
    });
    if (!except) state.openDD = null;
  }

  $('#filtersMain').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    const cat = btn.dataset.cat;
    state.openDD = null;
    if (cat === '__all') {
      state.cats.clear();
      clearFilters();
    } else if (state.cats.has(cat)) {
      state.cats.delete(cat);
      clearFilters(cat);
    } else {
      state.cats.add(cat);
      loadFilters(cat);
    }
    refresh(true);
  });

  const filtersSub = $('#filtersSub');

  filtersSub.addEventListener('click', e => {
    if (e.target.id === 'clearFilters') {
      state.cats.clear();
      state.openDD = null;
      clearFilters();
      return refresh(true);
    }
    const retry = e.target.closest('[data-retry]');
    if (retry) { loadFilters(retry.dataset.retry); return renderFilters(); }

    const btn = e.target.closest('.dd-btn');
    if (btn) {
      const { dd } = ddParts(btn);
      const opening = !dd.classList.contains('is-open');
      closeDropdowns(dd);
      dd.classList.toggle('is-open', opening);
      dd.querySelector('.dd-pop').hidden = !opening;
      btn.setAttribute('aria-expanded', String(opening));
      state.openDD = opening ? dd.dataset.dd : null;
      if (opening) {
        const first = dd.querySelector('.dd-search') || dd.querySelector('.dd-opt input');
        if (first) first.focus();
      }
      return;
    }
    if (e.target.closest('[data-dd-close]')) {
      const { dd } = ddParts(e.target);
      closeDropdowns();
      dd.querySelector('.dd-btn').focus();
      return;
    }
    if (e.target.closest('[data-dd-clear]')) {
      const { dd, cat, key } = ddParts(e.target);
      selection(cat, key).clear();
      dd.querySelectorAll('.dd-opt input').forEach(i => { i.checked = false; });
      updateDDButton(dd, cat, key);
      refreshData(true);
    }
  });

  filtersSub.addEventListener('change', e => {
    if (!e.target.matches('.dd-opt input')) return;
    const { dd, cat, key } = ddParts(e.target);
    const set = selection(cat, key);
    e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
    updateDDButton(dd, cat, key);
    refreshData(true);
  });

  filtersSub.addEventListener('input', e => {
    if (!e.target.matches('.dd-search')) return;
    const { dd } = ddParts(e.target);
    const q = normalize(e.target.value.trim());
    let shown = 0;
    dd.querySelectorAll('.dd-list li').forEach(li => {
      const hit = !q || li.dataset.title.includes(q);
      li.hidden = !hit;
      if (hit) shown++;
    });
    dd.querySelector('.dd-empty').hidden = shown > 0;
  });

  document.addEventListener('click', e => {
    if (state.openDD && !e.target.closest('.dd')) closeDropdowns();
  });

  /* ---------- Sidebar izquierdo ---------- */

  function tagFor(p) {
    if (state.cats.size === 0) return `Imperdible ${p.imperdible}`;
    return p.discount ? `${CATS[p.cat].short} · ${p.discount}% dto.` : CATS[p.cat].short;
  }

  const spinnerDark = '<span class="spinner spinner-dark" aria-hidden="true"></span>';

  function renderResults(list) {
    const status = visibleStatus();
    $('#resultsTitle').textContent = state.cats.size === 0 ? 'Imperdibles' : 'Resultados';
    $('#resultsCount').textContent = status === 'loading' && !list.length ? '…' : list.length;
    $('.panel-results').classList.toggle('is-updating', status === 'loading' && list.length > 0);
    const ul = $('#resultsList');
    if (!list.length) {
      ul.innerHTML = status === 'loading'
        ? `<li class="results-empty">${spinnerDark}Cargando lugares…</li>`
        : status === 'error'
          ? `<li class="results-empty">No se pudieron cargar los lugares.<br><button class="link-btn" data-retry-results>Reintentar</button></li>`
          : `<li class="results-empty">No hay lugares con estos filtros.<br>Prueba quitando alguno.</li>`;
      return;
    }
    ul.innerHTML = list.map(p => {
      const inTrip = state.trip.includes(p.id);
      return `<li>
        <div class="dtv-result-card ${p.id === state.selected ? 'is-selected' : ''}" data-id="${p.id}" role="button" tabindex="0" style="--c:${CATS[p.cat].color}">
          <img class="result-thumb" src="${esc(p.thumb)}" alt="" loading="lazy">
          <div class="result-body">
            <span class="dtv-tag ${state.cats.size === 0 ? 'dtv-tag-imperdible' : ''}">${icon(p.cat)}${esc(tagFor(p))}</span>
            <h3>${esc(p.name)}</h3>
            <p class="muted">${esc(p.zone)}${p.hasGeo ? '' : `${p.zone ? ' · ' : ''}<span class="no-geo">Sin ubicación en el mapa</span>`}</p>
          </div>
          <button class="add-mini ${inTrip ? 'is-added' : ''}" data-add="${p.id}"
                  aria-label="${inTrip ? 'Quitar de' : 'Agregar a'} mi viaje" title="${inTrip ? 'En mi viaje' : 'Agregar a mi viaje'}">
            ${inTrip ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'}
          </button>
        </div>
      </li>`;
    }).join('');
  }

  $('#resultsList').addEventListener('click', e => {
    if (e.target.closest('[data-retry-results]')) { ensureData(true); return refreshData(false); }
    const add = e.target.closest('[data-add]');
    if (add) { toggleTrip(add.dataset.add); return; }
    const card = e.target.closest('.dtv-result-card');
    if (card) select(card.dataset.id, { pan: true });
  });
  $('#resultsList').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('dtv-result-card')) {
      e.preventDefault();
      select(e.target.dataset.id, { pan: true });
    }
  });

  /* ---------- Mapa (ArcGIS) ---------- */

  const map = { view: null, layer: null, haloLayer: null, Graphic: null, graphics: {}, pt: null };

  function pinUri(cat, big) {
    const c = CATS[cat];
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
        <path d="M20 48c-1-3.5-15-17-15-28a15 15 0 0 1 30 0c0 11-14 24.5-15 28z" fill="${c.color}" stroke="#fff" stroke-width="${big ? 3 : 2.5}"/>
        <g transform="translate(11 11) scale(.75)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${c.glyph}</g>
      </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function pinSymbol(cat, big) {
    return {
      type: 'picture-marker',
      url: pinUri(cat, big),
      width: big ? '44px' : '30px',
      height: big ? '55px' : '37.5px',
      yoffset: big ? '27px' : '18px'
    };
  }

  function renderMarkers(list, fit) {
    if (!map.view) return;
    map.layer.removeAll();
    map.graphics = {};
    const ordered = list.filter(p => p.hasGeo).sort((a, b) => (a.id === state.selected) - (b.id === state.selected));
    ordered.forEach(p => {
      const g = new map.Graphic({
        geometry: map.pt(p),
        symbol: pinSymbol(p.cat, p.id === state.selected),
        attributes: { id: p.id }
      });
      map.graphics[p.id] = g;
      map.layer.add(g);
    });
    renderHalo();
    if (fit) fitTo(ordered);
  }

  function fitTo(list) {
    const geo = list.filter(p => p && p.hasGeo);
    if (!map.view || !geo.length) return;
    const pts = geo.map(map.pt);
    map.view.goTo(pts.length === 1 ? { target: pts[0], zoom: 15 } : pts, { duration: 700 })
      .then(() => { if (map.view.zoom > 15) map.view.zoom = 15; })
      .catch(() => {});
  }

  function renderHalo() {
    if (!map.view) return;
    map.haloLayer.removeAll();
    const p = state.selected && byId(state.selected);
    if (!p || !map.graphics[p.id]) return;
    const pt = map.pt(p);
    map.haloLayer.addMany([
      new map.Graphic({ geometry: pt, symbol: { type: 'simple-marker', size: 42, color: hexA(CATS[p.cat].color, 0.22), outline: { color: hexA(CATS[p.cat].color, 0.7), width: 2 } } }),
      new map.Graphic({ geometry: pt, symbol: { type: 'simple-marker', size: 8, color: '#fff', outline: { color: CATS[p.cat].color, width: 2 } } })
    ]);
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255, a];
  }

  // El loader AMD de ArcGIS define globales `require`/`define`: si se cargara
  // como <script> de la librería, las librerías UMD que Drupal inserte después
  // (fancybox, swiper…) se registrarían como módulos AMD y dejarían de exponer
  // su global. Por eso se inyecta aquí, cuando ya corrió todo lo demás.
  const ARCGIS_JS = 'https://js.arcgis.com/4.30/';

  function loadArcgis(done) {
    if (typeof window.require === 'function' && window.require.on) return done();
    const s = document.createElement('script');
    s.src = ARCGIS_JS;
    s.async = true;
    s.onload = done;
    s.onerror = () => { $('#mapLoading').textContent = 'No se pudo cargar ArcGIS. Revisa tu conexión.'; };
    document.head.appendChild(s);
  }

  function initMap() {
    if (typeof window.require !== 'function') {
      $('#mapLoading').textContent = 'No se pudo cargar ArcGIS. Revisa tu conexión.';
      return;
    }
    window.require([
      'esri/Map', 'esri/views/MapView', 'esri/layers/GraphicsLayer', 'esri/Graphic', 'esri/core/reactiveUtils',
      'esri/geometry/Point', 'esri/geometry/support/webMercatorUtils'
    ], (EsriMap, MapView, GraphicsLayer, Graphic, reactiveUtils, Point, wmUtils) => {
      map.Graphic = Graphic;
      // Puntos en Web Mercator (misma referencia espacial del basemap)
      map.pt = p => wmUtils.geographicToWebMercator(new Point({ longitude: p.lng, latitude: p.lat }));
      map.haloLayer = new GraphicsLayer();
      map.layer = new GraphicsLayer();
      const esriMap = new EsriMap({ basemap: 'gray-vector', layers: [map.haloLayer, map.layer] });

      map.view = new MapView({
        container: 'map',
        map: esriMap,
        center: [-74.07, 4.64],
        zoom: 12,
        constraints: { minZoom: 10, maxZoom: 18, rotationEnabled: false },
        popupEnabled: false,
        ui: { components: ['zoom', 'attribution'] }
      });
      map.view.ui.move('zoom', 'bottom-right');

      map.view.when(() => {
        $('#mapLoading').hidden = true;
        renderMarkers(visiblePlaces(), !sharedTrip);
        if (sharedTrip && !state.tripLoading) fitTo(state.trip.map(byId));
      }, () => { $('#mapLoading').textContent = 'No se pudo cargar el mapa.'; });

      map.view.on('click', e => {
        map.view.hitTest(e, { include: [map.layer] }).then(r => {
          const hit = r.results.find(x => x.graphic && x.graphic.attributes);
          hit ? select(hit.graphic.attributes.id, { pan: false, fromMap: true }) : closeCard();
        });
      });

      let moveTick = 0;
      map.view.on('pointer-move', e => {
        const t = ++moveTick;
        map.view.hitTest(e, { include: [map.layer] }).then(r => {
          if (t !== moveTick) return;
          map.view.container.style.cursor = r.results.length ? 'pointer' : '';
        });
      });

      reactiveUtils.watch(() => [map.view.extent, map.view.width, map.view.height], positionCard);
    });
  }

  /* ---------- Selección + card flotante ---------- */

  function select(id, { pan = false, fromMap = false } = {}) {
    const prev = state.selected;
    state.selected = id;
    const p = byId(id);

    if (map.view) {
      if (prev && map.graphics[prev]) map.graphics[prev].symbol = pinSymbol(byId(prev).cat, false);
      const g = map.graphics[id];
      if (g) {
        g.symbol = pinSymbol(p.cat, true);
        map.layer.remove(g); map.layer.add(g); // al frente
      }
      renderHalo();
      if (pan && p.hasGeo) {
        map.view.goTo({ center: map.pt(p), zoom: Math.max(map.view.zoom, 14) }, { duration: 600 }).catch(() => {});
      }
    }

    document.querySelectorAll('.dtv-result-card').forEach(el => el.classList.toggle('is-selected', el.dataset.id === id));
    if (fromMap) {
      const el = document.querySelector(`.dtv-result-card[data-id="${id}"]`);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    openCard(p);
  }

  function openCard(p) {
    const card = $('#floatCard');
    card.style.setProperty('--c', CATS[p.cat].color);
    $('#floatImg').src = p.img;
    $('#floatImg').alt = p.name;
    const extra = p.imperdible ? ` · Imperdible ${p.imperdible}` : p.discount ? ` · ${p.discount}% dto.` : '';
    $('#floatTag').innerHTML = icon(p.cat) + esc(CATS[p.cat].short + extra);
    $('#floatTitle').textContent = p.name;
    $('#floatZone').textContent = p.hasGeo ? p.zone : [p.zone, 'Sin ubicación en el mapa'].filter(Boolean).join(' · ');
    $('#floatMore').href = p.url;
    updateCardAddBtn();
    card.hidden = false;
    positionCard();
  }

  function updateCardAddBtn() {
    if (!state.selected) return;
    const inTrip = state.trip.includes(state.selected);
    const btn = $('#floatAdd');
    btn.textContent = inTrip ? '✓ En mi viaje' : 'Agregar a mi viaje';
    btn.classList.toggle('is-added', inTrip);
    btn.title = inTrip ? 'Clic para quitar de mi viaje' : '';
  }

  function positionCard() {
    const card = $('#floatCard');
    if (card.hidden || !map.view || !state.selected) return;
    const p = byId(state.selected);
    // Sin coordenadas o en pantallas angostas la card se acomoda abajo del mapa.
    if (!p.hasGeo || window.matchMedia('(max-width: 640px)').matches) {
      card.classList.add('is-docked');
      card.classList.remove('is-offmap');
      card.style.left = card.style.top = '';
      return;
    }
    card.classList.remove('is-docked');
    const sp = map.view.toScreen(map.pt(p));
    if (!sp) return;
    const W = map.view.width, H = map.view.height;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const pinH = 60, gap = 12;
    const offMap = sp.x < 0 || sp.y < 0 || sp.x > W || sp.y > H;
    card.classList.toggle('is-offmap', offMap);

    let top = sp.y - pinH - ch;
    let below = false;
    if (top < gap) { top = sp.y + 16; below = true; }
    top = Math.min(Math.max(top, gap), H - ch - gap);
    let left = sp.x - cw / 2;
    left = Math.min(Math.max(left, gap), W - cw - gap);

    card.classList.toggle('is-below', below);
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.setProperty('--arrow-x', Math.min(Math.max(sp.x - left, 20), cw - 20) + 'px');
  }

  function closeCard() {
    const prev = state.selected;
    state.selected = null;
    $('#floatCard').hidden = true;
    if (map.view && prev && map.graphics[prev]) map.graphics[prev].symbol = pinSymbol(byId(prev).cat, false);
    renderHalo();
    document.querySelectorAll('.dtv-result-card.is-selected').forEach(el => el.classList.remove('is-selected'));
  }

  $('#floatClose').addEventListener('click', closeCard);
  $('#floatAdd').addEventListener('click', () => state.selected && toggleTrip(state.selected));
  window.addEventListener('resize', positionCard);

  /* ---------- Mi viaje ---------- */

  function toggleTrip(id) {
    const i = state.trip.indexOf(id);
    if (i === -1) {
      state.trip.push(id);
      if (state.selected === id) closeCard();
      toast(`«${byId(id).name}» agregado a tu viaje`);
    } else {
      state.trip.splice(i, 1);
      toast(`«${byId(id).name}» quitado de tu viaje`);
    }
    renderTrip();
    renderResults(visiblePlaces());
    updateCardAddBtn();
  }

  function renderTrip() {
    const n = state.trip.length;
    $('#tripCount').textContent = state.tripLoading ? '…' : n;
    $('#tripEmpty').hidden = n > 0 || state.tripLoading;
    $('#tripLoading').hidden = !state.tripLoading;
    $('#tripList').innerHTML = state.tripLoading ? '' : state.trip.map((id, i) => {
      const p = byId(id);
      return `<li class="trip-item" style="--c:${CATS[p.cat].color}">
        <span class="trip-num">${i + 1}</span>
        <img src="${esc(p.thumb)}" alt="" loading="lazy">
        <button class="trip-body" data-go="${p.id}" title="Ver en el mapa">
          <strong>${esc(p.name)}</strong>
          <span class="dtv-tag">${icon(p.cat)}${esc(CATS[p.cat].short)}</span>
        </button>
        <button class="trip-remove" data-remove="${p.id}" aria-label="Quitar ${esc(p.name)}">&times;</button>
      </li>`;
    }).join('');
    if (!state.tripLoading) syncUrl();
    $('#saveTrip').disabled = n < 2 || state.tripLoading;
    $('#tripHint').textContent = n < 2
      ? `Agrega ${n === 0 ? 'al menos 2 lugares' : '1 lugar más'} para guardar tu itinerario.`
      : `Tu itinerario tiene ${n} lugares.`;
  }

  $('#tripList').addEventListener('click', e => {
    const rm = e.target.closest('[data-remove]');
    if (rm) return toggleTrip(rm.dataset.remove);
    const go = e.target.closest('[data-go]');
    if (go) {
      const p = byId(go.dataset.go);
      if (!p.hasGeo) toast('Este lugar no tiene ubicación en el mapa');
      // si el lugar no está visible con los filtros actuales, activamos su categoría
      if (!visiblePlaces().some(v => v.id === p.id)) {
        state.cats.add(p.cat);
        clearFilters(p.cat);
        loadFilters(p.cat);
        refresh(false);
      }
      select(p.id, { pan: true, fromMap: true });
    }
  });

  /* ---------- Modal: compartir itinerario ---------- */

  const modal = $('#modal');
  let lastFocus = null;

  // El QR solo se muestra en escritorio: en el celular se comparte directo con el enlace.
  const isDesktop = () => window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 821px)').matches;

  function renderQr(url) {
    const box = $('#qrBox');
    box.innerHTML = '';
    try {
      const qr = window.qrcode(0, 'M'); // tamaño automático, corrección de errores media
      qr.addData(url);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      return true;
    } catch (err) {
      console.warn('[Diseña tu viaje] No se pudo generar el QR:', err);
      return false;
    }
  }

  function openModal() {
    if (state.trip.length < 2) return;
    lastFocus = document.activeElement;
    const url = shareUrl();
    $('#modalCount').textContent = state.trip.length;
    $('#modalSummary').innerHTML = state.trip.map((id, i) =>
      `<li><span style="--c:${CATS[byId(id).cat].color}">${i + 1}</span>${esc(byId(id).name)}</li>`).join('');
    $('#shareUrl').value = url;
    $('#shareCopy').textContent = 'Copiar';
    $('#shareQr').hidden = !(isDesktop() && window.qrcode && renderQr(url));
    $('#shareNative').hidden = !navigator.share;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    $('#shareCopy').focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }

  $('#saveTrip').addEventListener('click', openModal);
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  $('#shareUrl').addEventListener('focus', e => e.target.select());

  $('#shareCopy').addEventListener('click', () => {
    const input = $('#shareUrl');
    const done = ok => {
      const btn = $('#shareCopy');
      btn.textContent = ok ? '¡Copiado!' : 'Copia manual';
      toast(ok ? 'Enlace del itinerario copiado' : 'No se pudo copiar: selecciona el enlace y cópialo');
      setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
    };
    const fallback = () => {
      input.focus();
      input.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      done(ok);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(input.value).then(() => done(true), fallback);
    } else {
      fallback();
    }
  });

  $('#shareNative').addEventListener('click', () => {
    navigator.share({ title: 'Mi itinerario por Bogotá', text: `Mi itinerario por Bogotá (${state.trip.length} lugares)`, url: $('#shareUrl').value })
      .catch(() => {}); // el usuario canceló
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (state.openDD) {
      const dd = document.querySelector('.dd.is-open');
      closeDropdowns();
      if (dd) dd.querySelector('.dd-btn').focus();
    } else if (!modal.hidden) closeModal();
    else if (!$('#floatCard').hidden) closeCard();
  });

  /* ---------- Toast ---------- */

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2200);
  }

  /* ---------- Estado en la URL ---------- */
  // ?viaje=atractivos.2770,hoteles.288&cat=hoteles,ofertas&f=hoteles.zona.74,hoteles.zona.72,ofertas.categoria.5
  // viaje: categoría.id del lugar en la API (la categoría indica qué listado consultar para reconstruirlo).
  // cat=imperdibles representa la vista inicial (sin categorías activas).

  let tripRefs = []; // [{ cat, id }] leídos de la URL, pendientes de resolver contra la API

  function readUrl() {
    const q = new URLSearchParams(location.search);
    const list = key => (q.get(key) || '').split(',').map(v => v.trim()).filter(Boolean);

    const seen = new Set();
    tripRefs = list('viaje').map(entry => {
      const [cat, id] = entry.split('.');
      return { cat, id };
    }).filter(r => CATS[r.cat] && /^\d+$/.test(r.id || '') && !seen.has(r.id) && seen.add(r.id));
    list('cat').forEach(c => { if (CATS[c]) state.cats.add(c); });
    // Las opciones se validan contra la API cuando cargan los filtros (pruneSelection).
    list('f').forEach(entry => {
      const [c, key, id] = entry.split('.');
      if (state.cats.has(c) && key && id) selection(c, key).add(id);
    });

    // Enlace armado a mano sin "cat": activamos las categorías del itinerario
    // para que todos sus lugares se vean en el mapa.
    if (!q.has('cat')) tripRefs.forEach(r => state.cats.add(r.cat));
    return tripRefs.length > 0;
  }

  // Reconstruye el itinerario compartido consultando solo los listados que necesita.
  function resolveTrip() {
    state.tripLoading = true;
    renderTrip();
    const cats = [...new Set(tripRefs.map(r => r.cat))];
    return Promise.allSettled(cats.map(cat =>
      fetchListing(CONFIG.endpoints[cat], '').then(({ items }) => items.forEach(raw => toPlace(raw, cat)))))
      .then(() => {
        state.trip = tripRefs.map(r => r.id).filter(id => byId(id));
        state.tripLoading = false;
        const missing = tripRefs.length - state.trip.length;
        renderTrip();
        renderResults(visiblePlaces());
        fitTo(state.trip.map(byId));
        const n = state.trip.length;
        toast(n
          ? `Itinerario compartido cargado · ${n} ${n === 1 ? 'lugar' : 'lugares'}${missing ? ` (${missing} ya no disponible${missing > 1 ? 's' : ''})` : ''}`
          : 'No se pudo cargar el itinerario compartido');
        const panel = $('.panel-trip');
        panel.classList.add('is-flash');
        setTimeout(() => panel.classList.remove('is-flash'), 2400);
      });
  }

  function stateQuery(withDebug) {
    const parts = [];
    if (state.trip.length) parts.push('viaje=' + state.trip.map(id => `${byId(id).cat}.${id}`).join(','));
    if (state.trip.length || state.cats.size) {
      parts.push('cat=' + (state.cats.size ? [...state.cats].join(',') : 'imperdibles'));
    }
    const f = [...state.cats].flatMap(c => Object.entries(state.filters[c])
      .flatMap(([key, ids]) => [...ids].map(id => `${c}.${encodeURIComponent(key)}.${encodeURIComponent(id)}`)));
    if (f.length) parts.push('f=' + f.join(','));
    if (withDebug && debugMode) parts.push('debug=1');
    return parts.length ? '?' + parts.join('&') : '';
  }

  function shareUrl() {
    return location.origin + location.pathname + stateQuery();
  }

  function syncUrl() {
    history.replaceState(null, '', location.pathname + stateQuery(true) + location.hash);
  }

  /* ---------- Ciclo principal ---------- */

  function refresh(fit) {
    renderFilters();
    refreshData(fit);
  }

  // Resultados, mapa y URL (sin redibujar la barra de filtros, para no cerrar desplegables)
  function refreshData(fit) {
    ensureData();
    const list = visiblePlaces();
    const loading = visibleStatus() === 'loading';
    // Mientras carga no se cierra la card ni se reencuadra: se hace al llegar los datos.
    if (!loading && state.selected && !list.some(p => p.id === state.selected)) closeCard();
    renderResults(list);
    renderMarkers(list, fit && !loading);
    if (!state.tripLoading) syncUrl();
    renderApiDebug();
  }

  const sharedTrip = readUrl();
  Object.keys(CATS).forEach(loadFilters); // se precargan: son pocas KB
  refresh(false);
  renderTrip();
  loadArcgis(initMap);
  if (sharedTrip) resolveTrip();
})();
