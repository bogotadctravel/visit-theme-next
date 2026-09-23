# Componentes — visit_theme_next

Inventario de patrones de UI reutilizables, con las clases CSS reales y sus
valores. Snapshot a 2026-09-16 — ver `README.md` para contexto y alcance.

La mayoría de estos componentes **no viven en un solo archivo**: se
redeclaran (casi idénticos) en varios `scss/_*.scss` porque cada franja del
sitio está scopeada bajo su propio namespace (`.vn-home`, `.vn-cat`,
`.vn-place`, `.vn-listing`, `.vn-archive`). Donde hay diferencias entre
copias, se anota.

---

## Botones — `.btn`, `.btn--primary`, `.btn--outline`, `.btn--ghost`

Base, igual en `_place.scss`, `_home.scss`, `_listing.scss`, `_archive.scss`:

```scss
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 14px 30px;
  border-radius: 8px;
  font-size: 15px; font-weight: 600;
  text-decoration: none; cursor: pointer;
  transition: transform var(--vn-transicion), background var(--vn-transicion), box-shadow var(--vn-transicion);
}
```

`.btn--primary`:
```scss
background: var(--vn-rojo-principal);
color: var(--vn-blanco);
box-shadow: 0 6px 22px rgba(255, 49, 49, .35);
&:hover { transform: translateY(-2px); background: var(--vn-rojo-principal-h); }
```

`.btn--outline` (solo en `_home.scss`):
```scss
background: var(--vn-blanco);
color: var(--vn-rojo-principal);
border: 1px solid var(--vn-rojo-principal);
&:hover { transform: translateY(-2px); background: var(--vn-rojo-principal); color: var(--vn-blanco); }
```

`.btn--ghost` (solo en `_archive.scss`):
```scss
background: transparent;
color: var(--vn-rojo-principal);
border: 1px solid var(--vn-rojo-principal);
padding: 12px 26px;
&:hover { background: rgba(255, 49, 8, .08); }
```

`.place-sidebar__btn--secondary` es otra variante "ghost" con el mismo look, scopeada al sidebar de ficha.

---

## Cards

### `.card-imperdible` — card vertical con imagen + título centrado

```scss
.card-imperdible {
  display: flex; flex-direction: column; gap: 12px;
  &__media {
    aspect-ratio: 3/4; border-radius: 16px; overflow: hidden;
    border: 1px solid var(--vn-gris-30);
    box-shadow: 0 10px 24px rgba(16, 27, 48, .12);
  }
  &__img { object-fit: cover; transition: transform 420ms cubic-bezier(.25,.8,.25,1); }
  &__title { text-align: center; font-size: 17px; font-weight: 600; color: var(--vn-gris-oscuro); }
  &:hover, &:focus-visible {
    transform: translateY(-6px);
    .card-imperdible__img { transform: scale(1.05); }
    .card-imperdible__media { border-color: var(--vn-rojo-principal); }
    .card-imperdible__title { color: var(--vn-rojo-principal); }
  }
}
```
- En `_home.scss` el título es `19px` (en vez de `17px`).
- `.card-ruta`/`.card-blog-post` comparten esta misma base pero con `aspect-ratio: 4/3; border-radius: 8px` en la media.
- `_general-list.scss` fuerza `aspect-ratio: 4/3` para cards horizontales.

### `.card-evento` — card con franja roja + footer oscuro de fecha

```scss
.card-evento {
  &__media { aspect-ratio: 3/4; border-radius: 8px; border: 1px solid var(--vn-gris-30); box-shadow: 0 10px 24px rgba(16,27,48,.12); }
  &__banner { background: var(--vn-rojo-principal); color: var(--vn-blanco); border-radius: 8px; padding: 12px 14px; margin-bottom: -10px; text-align: center; }
  &__title { color: var(--vn-blanco); font-size: 15px; font-weight: 600; }
  &__info { background: rgba(0,0,0,.9); color: var(--vn-blanco); margin: 0 -14px -14px; padding: 18px 14px 12px; display: flex; justify-content: space-between; }
  &__info-day { font-size: 26px; font-weight: 700; }
  &__info-month { font-size: 15px; font-weight: 600; color: rgba(255,255,255,.8); }
  &:hover, &:focus-visible {
    transform: translateY(-6px);
    .card-evento__media { border-color: var(--vn-rojo-principal); }
    .card-evento__img { transform: scale(1.08); }
    .card-evento__banner { background: var(--vn-rojo-principal-h); }
  }
}
```
Definida idéntica en `_place.scss`, `_home.scss`, `_listing.scss`.

### `.card-categoria` (grid "Descubre Bogotá" en home)
`aspect-ratio: 4/3; border-radius: 8px;` sombra `0 8px 20px rgba(16,27,48,.1)`; título `18px/600`.

### `.card-video` (reel de Instagram en subcategoría)
`aspect-ratio: 9/16; border-radius: 8px; border: 1px solid var(--vn-gris-30);` hover: `border-color: var(--vn-rojo-principal); transform: translateY(-4px);`. Ícono play: círculo `30px` blanco translúcido con sombra.

### `.blog-card` (mosaico de blog en home)
Sin borde ni sombra; caption overlay `background: rgba(242,234,223,.6); padding: 13px 15px; font-size: 13px; font-weight: 700;`. Variantes de `aspect-ratio` por posición en el mosaico: `--a` 3/4, `--b` 1/1, `--c` 4/5, `--d` 16/9, `--e` 9/16.

### Card sin BEM (`.archive__grid > li.card`)
Markup directo (`<a><span class="image"><img>`) que replica visualmente `.card-imperdible` en los archivos de hoteles/restaurantes (561/562).

---

## Hero / banner — `.cat-hero`, `.place-hero`, `.hero` (home)

Los tres comparten la decisión de diseño **sin overlay oscura** (`&::after { display: none; }`, port del commit `d377a61` del prototipo): el contraste lo da el cajón de color sobre el título, no un scrim sobre la imagen.

`.cat-hero` (categoría/subcategoría, ficha, listado, archivo) — `min-height` varía por contexto (`min(48vh,460px)` en categoría/ficha/archivo, `min(28vh,240px)` por defecto en listado con modificador `--tall` para subir a `460px`).

```scss
.cat-hero__banner {
  background: rgba(255, 49, 8, .65); // cajón rojo, default
  padding: 20px var(--vn-pad);
  text-align: center;
}
```

Variante clara — `.cat-hero--light .cat-hero__banner` (usada en categoría con el modificador, y sin modificador en fichas de atractivo):
```scss
background: rgba(255, 255, 255, .65);
text-align: left;
// + .cat-hero__title { color: var(--vn-gris-oscuro); }
```

`.place-hero` (hero oscuro de evento, componente distinto — sigue vivo aunque el prototipo migró la ficha de evento a `.cat-hero` en la iteración 6):
```scss
min-height: min(48vh, 420px);
color: var(--vn-blanco);
// __kicker: 14px/600, color amarillo
// __title: clamp(30px,5vw,50px)/700
// __date: clamp(18px,2.2vw,23px)/700, color amarillo
// __address: 14px, blanco 85%
```

`.hero` (slider de home) — `min-height: min(108vh,600px)`; slides con cross-fade (`opacity`/`visibility`, 600ms) y zoom lento de fondo: `animation: vn-hero-zoom 18s cubic-bezier(.25,.1,.25,1) forwards` (`scale(1)` → `scale(1.12)`).

---

## Breadcrumb — `.breadcrumb`

```scss
.breadcrumb li {
  font-size: 13px; color: rgba(255, 255, 255, .75);
  & + li::before { content: '/'; color: rgba(255,255,255,.45); }
  &[aria-current='page'] { color: var(--vn-blanco); font-weight: 600; }
}
.breadcrumb a:hover { color: var(--vn-blanco); text-decoration: underline; }
```
Pensado para ir **sobre imagen** (texto blanco translúcido). Variante `.breadcrumb--dark` (solo en blog, sobre fondo blanco): grises en vez de blancos, hover rojo.

---

## Modal — `.vn-modal` (galería + Instagram)

Un solo componente reutilizado para el lightbox de galería y el embed de Instagram, montado al final del `<body>` (fuera de `.vn-place`):

```scss
.vn-modal {
  position: fixed; inset: 0; z-index: 200;
  display: grid; place-items: center;
  &[hidden] { display: none; }
  &__backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.75); }
  &__dialog { max-width: 400px; border-radius: 12px; background: var(--vn-blanco);
    &--image { width: auto; max-width: min(92vw, 1100px); background: none; border-radius: 0; }
  }
  &__close {
    position: fixed; top: 16px; right: 16px; z-index: 3;
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(0,0,0,.55); color: var(--vn-blanco);
    &:hover { background: var(--vn-rojo-principal); transform: scale(1.05); }
  }
  &__image { max-width: min(92vw, 1100px); max-height: 88vh; border-radius: 8px; }
}
```
`&__dialog--image` + `&__image` → lightbox de fotos (`.place-gallery__item`). `&__dialog` default (400px) + `&__body iframe` → modal de Instagram (`#instagramModal`, disparado desde `.card-video`).

---

## Pager — mixin `pager.base` (`_pager.scss`)

```scss
@mixin base {
  .pager__item > a, .pager__item > span:not(.visually-hidden) {
    min-width: 40px; height: 40px; border-radius: 6px;
    background: var(--vn-blanco); border: 1px solid var(--vn-gris-30);
    color: var(--vn-gris-oscuro); font-size: 14px; font-weight: 600;
  }
  .pager__item > a:hover { background: var(--vn-gris-10); border-color: var(--vn-gris-60); }
  .pager__item.is-active > a { background: var(--vn-rojo-principal); border-color: var(--vn-rojo-principal); color: var(--vn-blanco); }
}
```
Único componente ya compartido vía `@use`/`@include` (no duplicado a mano): lo consumen `.archive__pager`, `.events-pagination`, `.blog-grid__pager`, `.general-list__pager`.

---

## Carrusel / track (dots + flechas)

Patrón repetido en "Imperdibles"/"Eventos esta semana" (home), subcategorías (categoría), "Rutas relacionadas"/"Eventos relacionados" (mobile, ficha).

**Track** (scroll-snap + drag):
```scss
overflow-x: auto; overscroll-behavior-x: contain;
scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
scrollbar-width: none; &::-webkit-scrollbar { display: none; }
cursor: grab; &.is-dragging { cursor: grabbing; scroll-snap-type: none; }
```

**Flechas** (círculo blanco sólido, patrón por defecto):
```scss
width: 40px; height: 40px; border-radius: 50%;
background: rgba(255,255,255,.9); box-shadow: 0 6px 16px rgba(16,27,48,.2);
&:hover { background: var(--vn-rojo-principal); color: var(--vn-blanco); }
&:disabled { opacity: .4; pointer-events: none; }
```
Variante outline (solo `.imperdibles__arrow` en home): `44px`, fondo transparente, borde rojo `2px`, se rellena de rojo en hover.

**Dots**:
```scss
width: 9px; height: 9px; border-radius: 50%;
background: var(--vn-blanco); border: 1.5px solid var(--vn-rojo-principal);
&.is-active { background: var(--vn-rojo-principal); transform: scale(1.3); }
```

Ítems por vista (desktop → según breakpoint): subcategorías 3-up → 2-up (900px) → 1 tarjeta ~72vw (640px); imperdibles 4-up → 2-up (960px) → 1 tarjeta ~72vw (640px); eventos 3-up → full-width (640px, sin flechas).

---

## Filtros / formularios

### `.events-filters` (agenda/guías — barra horizontal)
```scss
padding: 24px; border-radius: 10px; background: var(--vn-gris-10);
select, input { height: 44px; border-radius: 6px; border: 1px solid var(--vn-gris-30); font-size: 14px;
  &:focus { outline: 2px solid var(--vn-rojo-principal); outline-offset: 1px; } }
label { font-size: 12.5px; font-weight: 600; color: var(--vn-gris-60); }
```
Mobile (≤640px): columna, inputs a `40px`, botón submit `100%`.

### `.archive__filters` / `.filters` (archivo de hoteles/atractivos/restaurantes — sidebar de checkboxes)
```scss
position: sticky; top: calc(var(--vn-bar2-h) + 24px);
border: 1px solid var(--vn-gris-30); border-radius: 12px; padding: 24px;
label { display: flex; gap: 10px; font-size: 14.5px;
  input { accent-color: var(--vn-rojo-principal); width: 17px; height: 17px; } }
```
En mobile (≤960px) se colapsa detrás de un botón `.filter-toggle-btn` con chevron que rota 180° al abrir.

---

## Sidebar — `.place-sidebar`, `.rutas-sidebar`

`.place-sidebar` (ficha de atractivo/evento/hotel/experiencia/ruta/establecimiento):
```scss
position: sticky; top: calc(var(--vn-bar2-h) + 24px);
&__row { padding: 18px 20px; border: 1px solid var(--vn-gris-30); border-radius: 10px;
  &--address { background: #cbbba0; border-color: #cbbba0; color/label/value: #000/#111; } }
&__label { font-size: 15px; font-weight: 700; color: var(--vn-gris-60); }
&__value { font-size: 16px; font-weight: 500; color: #111; }
```

`.rutas-sidebar` (categoría — "Rutas relacionadas"):
```scss
position: sticky; top: calc(var(--vn-bar2-h) + 24px); padding: 0 24px 24px;
&__title { background: var(--vn-gris-10); border-radius: 12px 12px 0 0; padding: 9px 20px;
  font-size: clamp(17px,1.8vw,19px); font-weight: 700; text-align: center; }
```

Ambos sidebars dejan de ser sticky (`position: static`) en breakpoints chicos (≤960px categoría, ≤900px ficha).

---

## Tags / badges

`.place-tag` (pill genérica, sidebar de ficha):
```scss
padding: 4px 12px; border-radius: 999px;
background: var(--vn-gris-10); border: 1px solid var(--vn-gris-30);
font-size: 12.5px; font-weight: 600; color: var(--vn-gris-oscuro);
&:hover { border-color: var(--vn-rojo-principal); color: var(--vn-rojo-principal); }
```
Variante en tags de blog: sin `background`, padding mayor (`6px 14px`), `13px`, color gris.

`.place-sidebar__badge` (descuento en experiencias):
```scss
padding: 6px 14px; border-radius: 8px;
background: var(--vn-rojo-principal); color: var(--vn-blanco);
font-size: 14px; font-weight: 700;
```

`.guias-table__tag` reusa el mismo lenguaje visual: pill gris `999px`, `12px/600`.

---

## Patrón colapsable / "Leer más" — `.cat-intro__body--collapsible`

Usado en la intro de categoría/subcategoría y en el cuerpo de ficha:

```scss
.cat-intro__body--collapsible {
  max-height: 460px; overflow: hidden;
  &::after { // degradé de fade al blanco, 110px de alto
    content: ''; position: absolute; inset: auto 0 0 0; height: 110px;
    background: linear-gradient(to bottom, rgba(255,255,255,0), var(--vn-blanco));
  }
  &.is-expanded { max-height: none; &::after { display: none; } }
  &.cat-intro__body--fits::after { display: none; } // texto corto: nunca se corta
}
.cat-intro__toggle {
  border: 1px solid var(--vn-gris-30); border-radius: 999px; padding: 11px 22px;
  color: var(--vn-rojo-principal); font-size: 14px; font-weight: 700;
  &:hover { background: var(--vn-gris-10); border-color: var(--vn-rojo-principal); }
  svg { transition: transform var(--vn-transicion); } // flecha, rota 180° si aria-expanded=true
}
```
