# Design System — visit_theme_next

Referencia visual/técnica del diseño que se portó del prototipo v3
(`visitbogota3-theme`) al subtema `visit_theme_next`: header, home,
categoría/subcategoría, fichas (atractivo, evento, hotel, experiencia, ruta,
establecimiento), listados (agenda, guías, archivo de atractivos/hoteles/
restaurantes), buscador, breadcrumb y galería/imágenes.

**Esto es una foto del código a 2026-09-16**, documentada a mano leyendo
`scss/*.scss`. No está importado por el build (`scss/overrides.scss` no lo
toca) — es material de consulta/handoff, no una fuente de verdad que el
tema compile. Si el CSS del tema cambia, esta carpeta no se actualiza sola.

Contenido:
- `index.html` — **style guide visual**: abrí este archivo directo en el navegador (doble clic, o `file://.../design-system/index.html`) para ver la paleta, tipografía y todos los componentes renderizados con su CSS real. Autocontenido, no depende del build del tema.
- `tokens.scss` — copia comentada de los custom properties `--vn-*` reales (`scss/_header.scss`).
- `components.md` — inventario de componentes reutilizables (botones, cards, hero, breadcrumb, modal, pager, carrusel, filtros, sidebar, tags, colapsable) con su CSS real.
- Este README — paleta, tipografía, espaciado/layout y breakpoints.

---

## Paleta de colores

| Token | Hex | Uso |
|---|---|---|
| `--vn-rojo-principal` | `#FF3108` | Acento de marca: botones primarios, hover de marca, estado activo/focus, bullets, bordes de acento |
| `--vn-rojo-principal-h` | `#E22B07` | Hover/oscurecido de `--vn-rojo-principal` |
| `--vn-amarillo` | `#FBB018` | Acento secundario: `focus-visible`, kicker de fecha en hero de evento, texto sobre fondo oscuro |
| `--vn-azul-marino` | `#1A2B4A` | Declarado, sin uso activo detectado (reservado) |
| `--vn-negro` | `#222222` | Declarado, sin uso activo detectado fuera de `--vn-gris-oscuro` |
| `--vn-blanco` | `#FFFFFF` | Fondos claros, texto sobre fondo oscuro/rojo |
| `--vn-tinta` | `#1C1F26` | Texto de cuerpo sobre fondo claro |
| `--vn-gris-oscuro` | `#1D1D1D` | Títulos, fondo de fallback en heros mientras carga la imagen |
| `--vn-gris-10` | `#F5F6F8` | Fondos sutiles: filtros, franja inferior de `.card-evento`, hover de filas/menú |
| `--vn-gris-30` | `#D8DCE3` | Bordes por defecto en casi todos los componentes |
| `--vn-gris-60` | `#6B7280` | Texto secundario, labels, placeholders |
| `--vn-sombra-menu` | `0 12px 32px rgba(16,27,48,.18)` | Única sombra tokenizada; usada en dropdowns/menú |

**Colores sin tokenizar** (hex crudo en el código, ver detalle en `tokens.scss`): `#cbbba0` (fondo de la fila "Dirección" del sidebar de ficha), `#111`/`#000` (texto sobre esa fila), `#706F6F`/`#707070` (separadores del megamenú), `#142140` (hover del botón TransMilenio sobre el mapa).

Nota: `--vn-radio: 6px` está declarado como token "oficial" de radio, pero en la práctica casi ningún componente lo usa — los radios reales que aparecen en el sitio son `8px`, `10px`, `12px`, `16px` y `999px` (pill), fijados a mano por componente. Ver `components.md`.

---

## Tipografía

**Familia:** Lato (400/600/700), importada por `@import` de Google Fonts en `_header.scss`. El tema base (`visit_theme`) fuerza `*{font-family:"Poppins"}` con un selector universal; el subtema repite el mismo selector universal (`*, ::before, ::after`) para ganar por orden de cascada y forzar Lato en todo el sitio. Las utilidades `.poppins-*` del tema base (mayor especificidad) siguen ganando donde se usen a propósito.

```css
*, ::before, ::after {
  font-family: 'Lato', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
```

**Escala tipográfica** (no hay un `html{font-size}` base ni escala con variables — cada componente fija su tamaño; la tabla agrupa por rol):

| Rol | Tamaño | Peso | Ejemplo de selector |
|---|---|---|---|
| Hero / título de página | `clamp(30–32px, 5–5.5vw, 50–56px)` | 700 | `.cat-hero__title`, `.place-hero__title` |
| Título de sección grande | `clamp(26px, 3.5vw, 37px)` | 700 | `.imperdibles__title`, `.eventos__title`, `.cat-related__title` |
| Título de sección media | `clamp(22px, 2.6–3vw, 26–30px)` | 700 | `.cat-subcats__title`, `.place-content__title`, `.place-block__title` |
| H2/H3 en texto enriquecido | `19px` | 700 | `.cat-intro__body h2/h3`, `.place-content__body h3` |
| Lead / bajada | `17–19px` | 600 | `.cat-intro__lead`, `.place-content__lead` |
| Cuerpo de texto | `16px` / `line-height:1.75` | 400 | `.cat-intro__body`, `.place-content__body` |
| Descripción de card grande | `18–19px` | 400 | `.imperdibles__desc`, `.blog-home__desc` |
| Título de card | `15–19px` (**inconsistente**, ver nota) | 600 | `.card-imperdible__title`, `.card-evento__title` |
| Navegación | `18px` (↓15–17px en mobile) | 400 | `.mainnav__link` |
| Botón | `15px` | 600 | `.btn` |

Nota de consistencia: `.card-imperdible__title` es `19px` en home pero `17px` en categoría/ficha/archivo — mismo componente, tamaño distinto según el archivo SCSS donde se redeclaró. `.card-evento__title` sí es consistente en `15px` en todos lados.

---

## Espaciado y layout

**Contenedor estándar**, repetido igual (con distinto prefijo de clase) en prácticamente todas las franjas del sitio:

```scss
max-width: var(--vn-max);   // 1280px
margin: 0 auto;
padding-inline: var(--vn-pad); // clamp(16px, 4vw, 40px)
```

`.vn-cat`, `.vn-place`, `.vn-home`, `.vn-listing`, `.vn-archive` redeclaran `--vn-max`/`--vn-pad` localmente con los mismos valores (probablemente para que el scope no dependa de que `:root` se haya cargado). `.vn-blog` y `.vn-general-list` no los redeclaran y heredan los de `:root`.

**Sidebar sticky**: el offset `top: calc(var(--vn-bar2-h) + 24px)` se repite igual en el sidebar de ficha, "Rutas relacionadas" y los filtros de archivo — todos cuelgan de la altura de la barra de navegación del header.

**Valores que se repiten "a mano" (no tokenizados) en varios componentes:**
- Gap de grillas de cards: `14px` (carruseles) / `32px 24px` (grillas de archivo/listado general)
- Padding vertical de sección: `clamp(40px, 6vw, 64px) 0 clamp(56px, 8vw, 96px)`
- Sombra de media de card: `0 10px 24px rgba(16, 27, 48, .12)`
- Transición de zoom en hover de imagen: `transform 420ms cubic-bezier(.25,.8,.25,1)`, escala a `1.05`–`1.08`
- Recipe de carrusel scrollable: `overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -webkit-overflow-scrolling:touch;`

Ver el detalle componente por componente en `components.md`.

---

## Breakpoints

El sitio es **desktop-first**: todas las media queries son `max-width` (excepto dos `min-width` que forman un par de toggle con su `max-width` correspondiente en el mismo archivo).

| Breakpoint | Apariciones | Rol |
|---|---|---|
| `900px` (+ par `min-width:901px`) | 6 | Tablet → mobile: el más usado, corte principal de grillas 2-col |
| `960px` (+ par `min-width:961px`) | 4 | Igual rol que 900px, en los archivos que lo usan en vez de 900 |
| `640px` | 5 | Mobile: colapsa a 1 columna, activa scroll horizontal en carruseles |
| `560px` | 4 | Ajustes finos de footer y categoría en mobile chico |
| `480px` | 3 | Mobile chico: tipografía/padding mínimo |
| `1024px` | 1 | Header: tamaño de link de nav |
| `860px` | 1 | Header: acordeón de nav mobile |
| `760px` / `720px` / `420px` | 1 c/u | Ajustes puntuales de archive/home/blog |

Los tres cortes de facto que arma la grilla del sitio son **900px → 640px** (desktop → tablet → mobile), con `960px` como variante equivalente a `900px` según el archivo.

---

## Componentes

Ver **[components.md](./components.md)** para el inventario completo (botones, cards, hero/banner, breadcrumb, modal, pager, carrusel, filtros, sidebar, tags/badges, patrón colapsable/leer-más) con clases CSS y valores reales.
