# Vista: listado de establecimientos por categoría (`archive-places`)

El botón **"Explorar todo {Categoría}"** de la franja *Dónde comer* (en las páginas
de categoría / subcategoría) apunta a **`/establecimientos/{ID_DEL_TÉRMINO}`**. Esa
ruta la sirve una **vista de Drupal** que hay que crear una vez, igual que
`atractivos_por_categoria` (ver `docs/VISTA-ATRACTIVOS.md`). El subtema ya trae las
plantillas y los estilos; solo falta la vista.

> Al crearla en staging, **exporta su config a `config/deploy/`** para que sobreviva a
> los refresh de contenido. Drush vive dentro del contenedor Docker (ver
> `DESARROLLO.md` §5 para el detalle):
>
> ```bash
> # en el servidor (ssh useridt@10.216.153.78)
> docker exec -w /var/www/vhosts/localhost/html staging_visitbogota_co \
>   vendor/bin/drush config:get views.view.establecimientos_por_categoria --format=yaml > /tmp/vista.yml
>
> # en tu máquina
> scp useridt@10.216.153.78:/tmp/vista.yml config/deploy/views.view.establecimientos_por_categoria.yml
> git add config/deploy/ && git commit -m "config: vista establecimientos_por_categoria" && git push
> ```

## Crear la vista (`/admin/structure/views/add`)

- **Nombre administrativo:** `Establecimientos por categoría`
  → machine name **`establecimientos_por_categoria`** (importante: las plantillas
  dependen de este nombre).
- **View settings:** Show **Content** of type **Establecimientos**, sorted por
  **Título (asc)**.
- **Create a page:** sí.
  - **Page title:** `Dónde comer`
  - **Path:** `establecimientos/%`
  - **Display format:** *Unformatted list* of **fields**.
  - **Items to display:** 24, **Use a pager** (Full).

## Ajustes del display de página

### Contextual filters (argumentos)

- Añadir **`Content: Has taxonomy term ID (with depth)`** — **no** el filtro atado
  a un campo específico. Motivo (el mismo bug que tuvo `atractivos_por_categoria`,
  ver `docs/VISTA-ATRACTIVOS.md`): el botón "Explorar todo" se pinta tanto en
  categoría como en subcategoría, y cada una pasa el TID de ESE término
  (`field_turcat` para categoría, `field_tursubcat` para subcategoría — dos campos
  distintos en el nodo). "Has taxonomy term ID" no está atado a un campo: usa
  `taxonomy_index`, que Drupal llena automáticamente para cualquier campo de
  referencia a término del nodo, así que el mismo argumento funciona venga de
  categoría o de subcategoría.
  - **Depth:** `0` (coincidencia exacta, sin arrastrar hijos/nietos del término).
  - *When the filter value is NOT available:* **Display "Page not found"** (o "Hide view").
  - *When the filter value IS available:* **Specify validation criteria → Taxonomy term**,
    vocabularios: `categorias_2026` y `subcategorias_2026`, *Filter value type:* **Term ID**.
  - *Especificar cómo se transforma:* dejar por defecto (el `%` de la ruta = el TID).

### Fields

Añadir los dos con **"Exclude from display"** activado (se pintan desde la plantilla
de fila, `views-view-fields--establecimientos-por-categoria.html.twig`):

1. **Content: Título** — *machine name* `title` — **sin** "Link to content"
   (la plantilla ya envuelve la tarjeta en un `<a>`).
2. **Content: Imagen** — el campo de imagen del establecimiento (`field_mainimg` o
   `field_cover`) — *Formatter:* **Image**, *Image style:* **— Ninguno (imagen
   original) —**. Deja el *machine name* como `field_mainimg` / `field_cover` /
   `field_image` (la plantilla prueba los tres en ese orden, igual que la de
   atractivos).

   > Imágenes en tamaño original (sin *image style*), igual que en el resto del
   > subtema — con derivados chicos se veían pixeladas.

### Advanced

- **CSS class:** `vn-archive`  ← esto activa los estilos del prototipo (reusa el
  mismo `.vn-archive` que atractivos y que `node--561/562--full`).

## Plantillas que ya trae el subtema

| Archivo | Rol |
| --- | --- |
| `templates/views-view--establecimientos-por-categoria.html.twig` | Hero + layout `.archive` (breadcrumb Inicio / Dónde comer (enlaza al nodo 562) / categoría) |
| `templates/views-view-unformatted--establecimientos-por-categoria.html.twig` | `<ul class="archive__grid">` |
| `templates/views-view-fields--establecimientos-por-categoria.html.twig` | Una tarjeta `.card-imperdible` |
| `visit_theme_next.theme` → `visit_theme_next_preprocess_views_view()` | Carga el término del argumento para el hero (nombre, URL, imagen) — compartida con `atractivos_por_categoria` |

## Enlace desde las categorías

`taxonomy-term--categorias-2026.html.twig` y `taxonomy-term--subcategorias-2026.html.twig`
ya generan el botón cuando hay **más de 8** establecimientos:

```twig
<a class="btn btn--ghost" href="/establecimientos/{{ term.id() }}">Explorar todo {{ term.name.value }}</a>
```

Si cambias el `Path` de la vista, actualiza ese `href` en las dos plantillas.
