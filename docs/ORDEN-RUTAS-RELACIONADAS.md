# Orden personalizado de "Rutas relacionadas" (sidebar de categoría)

La franja **"Rutas relacionadas"** que sale a la derecha del texto en la página de
**categoría grande** (`taxonomy-term--categorias-2026.html.twig`, sección
`.rutas-sidebar`, muestra 3) se llena por defecto con
`getNodesTeaserByCategory('rutas', $tid, 6)` — el orden lo decide ese método del
`ContentLoader` (normalmente por fecha), **no se puede curar a mano**.

Para poder ordenarlas manualmente por categoría, el subtema ya soporta un campo
opcional en el término de categoría: si existe y tiene valores, se usa **en el
orden en que el editor las puso**; si no existe o está vacío, sigue funcionando
igual que antes (fallback automático). No hay que tocar código para activarlo,
solo crear el campo.

## Crear el campo (`/admin/structure/taxonomy/manage/categorias_2026/overview` → editar un término, o el vocabulario)

- Ir a **Structure → Taxonomy → Categorías 2026 → Manage fields**
  (`/admin/structure/taxonomy/manage/categorias_2026/fields`).
- **Add field → Reference → Content** (entity reference a nodos).
- **Label:** `Rutas destacadas` → machine name **`field_rutas_destacadas`**
  (importante: el `.theme` busca este nombre exacto).
- **Allowed number of values:** Unlimited.
- **Reference type:** restringir a **Content type: Rutas** (bundle `rutas`).
- **Widget:** el de autocompletar por defecto (`Autocomplete` / `Autocomplete
  (Tags style)`) ya permite **arrastrar las filas para reordenarlas** — ese es el
  orden que se respeta en el sidebar.

## Usarlo

En cada término de `categorias_2026` (`/admin/structure/taxonomy/manage/categorias_2026/overview`
→ editar el término), en el nuevo campo **"Rutas destacadas"** el editor:

1. Busca y agrega las rutas que quiere mostrar (en cualquier orden inicial).
2. Las **arrastra** por el ícono de agarre hasta dejarlas en el orden deseado.
3. Guarda el término.

El sidebar de esa categoría mostrará esas rutas **en ese orden exacto** (las 3
primeras; si agrega más de 3 solo se ven las 3 primeras, así que hay que dejar
las que importan al principio). Si el campo se deja vacío, la categoría sigue
mostrando rutas automáticamente como antes — no rompe nada por no llenarlo.

## Cómo funciona (`visit_theme_next_preprocess_taxonomy_term()`)

```php
if ($term->hasField('field_rutas_destacadas') && !$term->get('field_rutas_destacadas')->isEmpty()) {
  $variables['rutas'] = $content_loader->getTeasersFromEntities(
    $term->get('field_rutas_destacadas')->referencedEntities()
  );
}
else {
  $variables['rutas'] = $content_loader->getNodesTeaserByCategory('rutas', $tid, 6);
}
```

`referencedEntities()` devuelve los nodos **en el orden del campo** (los deltas
del widget), y `getTeasersFromEntities()` es el mismo helper del `ContentLoader`
que ya arma las tarjetas (`title`, `url`, `image`, `image_full`) a partir de
entidades ya cargadas — mismo patrón que usa `field_atractivo_asociado` en la
ficha de itinerario (`node--itinerarios--full.html.twig`) para curar "Atractivos
en este itinerario".

## Exportar

Igual que las vistas: crea el campo en staging y exporta su config a
`config/deploy/` para que no se pierda en un refresh de contenido:

```bash
docker exec -w /var/www/vhosts/localhost/html staging_visitbogota_co \
  vendor/bin/drush config:get field.storage.taxonomy_term.field_rutas_destacadas --format=yaml > /tmp/f1.yml
docker exec -w /var/www/vhosts/localhost/html staging_visitbogota_co \
  vendor/bin/drush config:get field.field.taxonomy_term.categorias_2026.field_rutas_destacadas --format=yaml > /tmp/f2.yml

scp useridt@10.216.153.78:/tmp/f1.yml config/deploy/field.storage.taxonomy_term.field_rutas_destacadas.yml
scp useridt@10.216.153.78:/tmp/f2.yml config/deploy/field.field.taxonomy_term.categorias_2026.field_rutas_destacadas.yml
git add config/deploy/ && git commit -m "config: campo field_rutas_destacadas en categorias_2026" && git push
```

También conviene exportar la configuración del **form display** (widget) y del
**view display** del campo si el editor debe verlo bien en el formulario de
edición (`core.entity_form_display.taxonomy_term.categorias_2026.default`), y
ocultar el campo del **view display** por defecto del término (no se usa para
pintar nada por sí solo, la plantilla lo lee directo del `$term`).

## ¿Quieres lo mismo en subcategoría?

Hoy la página de **subcategoría** no muestra "Rutas relacionadas" en absoluto
(esa franja es exclusiva de la categoría grande). Si más adelante se necesita
ahí también, se repite el mismo patrón con el campo en `subcategorias_2026` y
se ajusta el `if ($term->bundle() === 'categorias_2026')` en el `.theme`.
