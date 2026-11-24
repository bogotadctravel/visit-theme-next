# Auditoría de accesibilidad SANDI — estado al 2026-11-24

Ajustes en `visit-theme` (tema base) y `visit-theme-next` (subtema, que es el que
sirve el header, el home, las fichas y los listados de **visitbogota.co**) para:

- el diagnóstico WCAG 2.1 AA / Resolución 1519-2020 de SANDI
  (`SANDI-Topics-VisitBogota-v2.xlsx`): 50 criterios, 24 cumplían, 22 no, 4 no
  aplicaban → **56%**;
- los 8 videos de hallazgos que SANDI envió después.

## Cómo se verificó

Entorno local (`B:\repos\visitbogota-local`, copia de staging con los dos temas
montados), Chrome real vía Playwright, **con el script de SANDI bloqueado** para
medir el comportamiento nativo del sitio. Ojo: SANDI descarga un script de
corrección por hallazgo (`.../fixes/hallazgo-01-menu.js`, `-02-idiomas.js`,
`-11-hero.js`, …); si no se bloquea, cualquier prueba mide su arreglo y no el
nuestro.

- **85/85 pruebas automáticas OK**: navegación con Tab/Shift+Tab/flechas/Escape
  en menú, idiomas, hero, carruseles y buscador; mensajes de error; foco en
  modales; subtítulos y transcripciones; `autocomplete`.
- **axe-core (WCAG 2.1 A/AA) sin violaciones en 31 páginas**: home ES/EN,
  categoría, subcategoría, todas las fichas (atractivo, establecimiento,
  evento, experiencia, hotel, ruta), listados, agenda, blog, Conecta,
  contacto, Diseña tu viaje y 404. La única violación restante en todo el
  sitio es el botón del widget de Candelaria (ver pendientes).

**Desplegado y verificado en producción el 2026-11-24** (subtema `2e6ad2e`, tema
base `47e6dc7`): 85/85 pruebas contra visitbogota.co y staging.visitbogota.co.

**Hay que pedirle a SANDI que apague sus scripts de corrección**
(`hallazgo-01-menu.js`, `-02-idiomas.js`, `-08-carruseles-en.js`,
`-09-contraste.js`, `-10-buscador.js`, `-11-hero.js`, `-12-fechas.js`,
`-14-resultados.js`): con SANDI activo pisan los arreglos nativos y los
empeoran — p. ej. las bolitas del hero vuelven a "Ir a la imagen 1 de 5" (sin
la descripción de la imagen) y el selector de idiomas vuelve a anunciar un
menú (`aria-haspopup="menu"`).

## Cumplimiento

**De los 22 criterios que no cumplían, 22 quedan resueltos en código** (en tres
de ellos con contenido en borrador que el equipo editorial debe revisar, marcado
abajo). Cumplimiento estimado: **100% de los 46 criterios aplicables** (los 4 N/A
siguen igual). Pendiente de confirmación por re-evaluación de SANDI.

## Los 8 hallazgos del informe de video

| # | Hallazgo | Causa real | Arreglo |
|---|---|---|---|
| 1 | Menú principal no navegable | En -next, las 8 categorías y sus 8 paneles están en bloques separados del DOM: Tab nunca entraba a las subcategorías. En el tema base, el mega-menú solo abría con el mouse. | Tab categoría → su panel → siguiente categoría; Shift+Tab inverso; cierre al salir del menú (`overrides.js`). `focusin`/`focusout` en el tema base (`main.js`). |
| 2 | Selector de idiomas | Se abría solo al llegar con Tab (`:focus-within`), Espacio no hacía nada y las flechas hacían scroll; `aria-haspopup` anunciaba un menú inexistente. | Abre con Espacio/Enter, flechas/Inicio/Fin recorren, Escape cierra y devuelve el foco (`main.js`); cada idioma con `lang` y nombre completo ("English (EN)"). |
| 3 y 11 | Banner del home sin descripción ni estado | Las imágenes del slider tenían `alt=""` aunque el CMS ya tenía el texto alternativo. | `alt` real en cada imagen; cada bolita anuncia "Imagen 2 de 5: …" con `aria-selected`, `aria-controls` y flechas (patrón de pestañas). En `/en` la descripción, que solo existe en español, se marca `lang="es"`. |
| 8 | Carruseles leen español en la versión en inglés | Etiquetas fijas ("Ir a la subcategoría 1") y un punto por posición de scroll (5 ítems → 3 puntos). | Un punto por ítem con su nombre ("Subcategory 1 of 5: …"), traducido con `Drupal.t()`; Enter en un punto lleva al ítem. |
| 9 | Contraste | Rojo de marca `#FF3108` = 3.7:1. | `#C62400` (5.75:1) en -next; footer en blanco pleno; `--vn-gris-60` → `#5B6170`; acento azul y 404 del tema base corregidos. |
| 10 | Trampa de foco en el buscador | `role="combobox"` con `aria-expanded="true"` sin resultados: el lector entraba en modo formulario y las flechas no hacían nada. | Campo de búsqueda simple con instrucciones (`aria-describedby`), anuncio de cantidad de resultados (`role="status"`) y flechas que nunca dejan atrapado el foco. Se quitó el manejo duplicado del tema base (saltaba de a dos resultados). |
| 12 | Error de fecha no anunciado | El globo nativo de `<input type="date">` no lo leen los lectores. | `novalidate` + mensaje propio con `role="alert"`, `aria-invalid` y foco en el campo (agenda de ambos temas). |
| 14 | Lectura duplicada en "Diseña tu viaje" | La tarjeta era `role="button"` con otro botón dentro (control anidado). | Botón real "ver en el mapa" y "Agregar … a mi viaje" como hermano. |

## Los 22 criterios del diagnóstico

| Criterio | Estado | Detalle |
|---|---|---|
| 1.1.1 Contenido no textual | ✅ | Imágenes de tarjetas con `alt` vacío cuando el título ya está en el enlace (antes se leía dos veces, 19 casos); `alt` en el popup de Conecta y en 2 imágenes de artículos del blog (script de contenido). |
| 1.2.1 Solo audio/video | ✅ ✍️ | Descripción de lo que se ve en los 6 videos de experiencias (borrador). |
| 1.2.2 Subtítulos | ✅ ✍️ | Campo `field_subtitulos` (.vtt) + `<track kind="captions">`; subtítulos ES/EN del único video con voz (Whisper, borrador). Los otros 5 son solo música. |
| 1.2.3 Audiodescripción o alternativa | ✅ ✍️ | Campo `field_transcripcion` con descripción + transcripción bajo el video. |
| 1.3.1 Información y relaciones | ✅ | Pager sin `<li role="presentation">`; listas/landmarks/encabezados verificados por axe. |
| 1.3.2 Secuencia significativa | ✅ | Orden de foco del mega-menú; sin reordenamiento visual por CSS. |
| 1.3.3 Características sensoriales | ✅ | Sin instrucciones que dependan de forma, color o posición. |
| 1.3.5 Propósito del campo | ✅ | `autocomplete="name"`/`"email"` en formularios de contacto (`hook_form_alter` en -next). |
| 1.4.1 Uso del color | ✅ | Errores con texto + borde; enlaces distinguibles (axe `link-in-text-block`). |
| 1.4.2 Control del audio | ✅ | Ningún audio/video se reproduce solo; todos con controles. |
| 1.4.3 Contraste mínimo | ✅ | Ver hallazgo 9; axe sin fallas de contraste en los temas. |
| 2.1.1 Teclado | ✅ | Hallazgos 1, 2, 8 y 10. |
| 2.1.2 Sin trampas de foco | ✅ | Buscador; modales de galería e Instagram retienen el foco mientras están abiertos, Escape cierra y lo devuelven. |
| 2.4.3 Orden del foco | ✅ | Mega-menú; modales; Enter en puntos de carrusel. |
| 2.4.4 Propósito de los enlaces | ✅ | Enlaces con nombre propio; sin "leer más" genéricos. |
| 2.4.6 Encabezados y etiquetas | ✅ | Etiquetas descriptivas en controles de carrusel, selector e instrucciones del buscador. |
| 3.1.2 Idioma de las partes | ✅ | `lang` en enlaces de idioma y en descripciones en español dentro de `/en`; textos de JS y plantillas traducidos (antes salían en español en inglés). |
| 3.2.2 Al recibir entradas | ✅ | Filtros sin envío automático; el selector de idiomas ya no se abre solo. |
| 3.2.3 Navegación coherente | ✅ | Mismo header y orden en todas las plantillas. |
| 3.2.4 Identificación consistente | ✅ | Mismo patrón de etiqueta en todos los carruseles y modales. |
| 3.3.1 Identificación de errores | ✅ | Hallazgo 12. |
| 4.1.2 Nombre, función, valor | ✅ | Sin controles anidados, `aria-expanded` real en desplegables, pestañas con estado. |

✍️ = contenido en borrador generado automáticamente: **revisar y corregir desde la
edición de cada experiencia** (nombres propios de la transcripción del video
"Fiesta campesina", p. ej. "Pio Casa Colibrí", "El Merojón").

## Despliegue (además del `git pull` de los dos temas)

```bash
drush cr
drush locale:import en themes/custom/visit-theme-next/translations/en.po --type=customized --override=all
drush locale:import en themes/custom/visit-conecta-theme-2.0/translations/en.po --type=customized --override=all
drush php:script themes/custom/visit-theme-next/scripts/a11y_media_fields.php   # crea los 2 campos en experiencias
drush php:script themes/custom/visit-theme-next/scripts/a11y_media_content.php  # carga descripciones, subtítulos y alt
drush cr
```

- Ya **no hace falta purgar Cloudflare**: las librerías ahora tienen versión propia
  (`?v=2026.11.24` en -next, `?v=154.x` en el base). Hay que **subir ese valor**
  en cada cambio futuro de CSS/JS.
- `visit-theme/js/main.js` no se carga directo: tras editarlo hay que regenerar
  `js/main.min.js` (`npx terser js/main.js --compress --mangle -o js/main.min.js`).
- Los dos scripts son idempotentes: correrlos de nuevo no duplica nada.
- Tras desplegar se puede ir apagando en SANDI el script de cada hallazgo.

## Pendientes fuera de estos repositorios

1. **Widget de Candelaria** (`azurecandelaria`, se despliega copiando archivos):
   el botón flotante usa `#ff3108` con texto blanco (3.68:1). Cambiar
   `--cw-primary` y `--cw-accent` a `#C62400` en `frontend/src/widget/widget.css`.
2. **Contenido**: la experiencia "Tejo, pola y pachanga" (nodo 119) tiene cargado
   el video del "Tour de fantasmas" (es el mismo archivo que el nodo 118).
3. **Audioguías**: 92 atractivos tienen audio (`field_audio`, ~857 MB) pero la
   plantilla de atractivos de -next **no las muestra**. Si se publican, cada una
   necesitará transcripción (WCAG 1.2.1); se puede generar el borrador con el
   mismo Whisper local.
4. Revisar los borradores ✍️ y pedir a SANDI la re-evaluación.
