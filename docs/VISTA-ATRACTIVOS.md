# Vista: listado de atractivos por categoría (`archive-places`)

El botón **"Explorar todo {Categoría}"** de la franja *Atractivos* (en las páginas de
categoría / subcategoría) apunta a **`/atractivos/{ID_DEL_TÉRMINO}`**. Esa ruta la
sirve una **vista de Drupal** que hay que crear una vez. El subtema ya trae las
plantillas y los estilos; solo falta la vista.

> Al crearla en staging, exporta su config a `config/deploy/` para que sobreviva a
> los refresh de contenido (ver `DESARROLLO.md` §5):
> `drush @staging config:get views.view.atractivos_por_categoria --format=yaml > config/deploy/views.view.atractivos_por_categoria.yml`

## Crear la vista (`/admin/structure/views/add`)

- **Nombre administrativo:** `Atractivos por categoría`
  → machine name **`atractivos_por_categoria`** (importante: las plantillas dependen de este nombre).
- **View settings:** Show **Content** of type **Atractivos**, sorted by **Título (asc)**.
- **Create a page:** sí.
  - **Page title:** `Atractivos`
  - **Path:** `atractivos/%`
  - **Display format:** *Unformatted list* of **fields**.
  - **Items to display:** 24, **Use a pager** (Full).

## Ajustes del display de página

### Contextual filters (argumentos)
- Añadir **`Content: Categorías turísticas (field_turcat)`** — el campo de referencia a
  taxonomía que usan los atractivos (si el machine name real es otro, usar ese).
  - *When the filter value is NOT available:* **Display "Page not found"** (o "Hide view").
  - *When the filter value IS available:* **Specify validation criteria → Taxonomy term**,
    vocabularios: `categorias_2026` y `subcategorias_2026`, *Filter value type:* **Term ID**.
  - *Especificar cómo se transforma:* dejar por defecto (el `%` de la ruta = el TID).

### Fields
Añadir los dos con **"Exclude from display"** activado (se pintan desde la plantilla
de fila, `views-view-fields--atractivos-por-categoria.html.twig`):

1. **Content: Título** — *machine name* `title` — **sin** "Link to content"
   (la plantilla ya envuelve la tarjeta en un `<a>`).
2. **Content: Imagen** — el campo de imagen del atractivo (`field_cover` o
   `field_mainimg`) — *Formatter:* **Image**, *Image style:* **— Ninguno (imagen
   original) —**. Deja el *machine name* como `field_cover` / `field_mainimg` /
   `field_image` (la plantilla prueba los tres en ese orden).

   > Por ahora las imágenes van en su tamaño original en todo el subtema (se veían
   > pixeladas con los derivados pequeños); por eso aquí también sin *image style*.

### Advanced
- **CSS class:** `vn-archive`  ← esto activa los estilos del prototipo.

## Plantillas que ya trae el subtema

| Archivo | Rol |
|---|---|
| `templates/views-view--atractivos-por-categoria.html.twig` | Hero + layout `.archive` |
| `templates/views-view-unformatted--atractivos-por-categoria.html.twig` | `<ul class="archive__grid">` |
| `templates/views-view-fields--atractivos-por-categoria.html.twig` | Una tarjeta `.card-imperdible` |
| `visit_theme_next.theme` → `visit_theme_next_preprocess_views_view()` | Carga el término del argumento para el hero (nombre, URL, imagen) |

## Filtros de la barra lateral

El prototipo (`archive-places.html`) muestra una barra de filtros a la izquierda con
casillas. En esta primera versión la vista se entrega **sin** esos filtros (solo el
listado). Para añadirlos: exponer filtros de la vista (por subcategoría, zona, etc.)
como *exposed filters* y renderizarlos dentro de `.archive__filters` en
`views-view--atractivos-por-categoria.html.twig` (`{{ exposed }}`).

## Enlace desde las categorías

`taxonomy-term--categorias-2026.html.twig` y `taxonomy-term--subcategorias-2026.html.twig`
ya generan el botón cuando hay **más de 8** atractivos:

```twig
<a class="btn btn--ghost" href="/atractivos/{{ term.id() }}">Explorar todo {{ term.name.value }}</a>
```

Si cambias el `Path` de la vista, actualiza ese `href` en las dos plantillas.
