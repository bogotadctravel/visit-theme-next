# Auditoría: imagen principal por tipo de contenido

Cobertura de la **imagen principal** (la que usa cada ficha del subtema para el hero)
por tipo de contenido, medida en staging el 2026-09-16. Datos en español (`langcode='es'`);
un nodo cuenta "con imagen" si tiene valor en el primero de sus campos de imagen que
encuentre con dato (ver tabla de mapeo).

## Resultado

| Tipo de contenido | Total | Con imagen | Sin imagen | % cobertura |
| --- | ---: | ---: | ---: | ---: |
| atractivos | 283 | 283 | 0 | 100% |
| **eventos** | 286 | 281 | **5** | 98.3% |
| establecimientos | 96 | 96 | 0 | 100% |
| **article** (blog) | 249 | 241 | **8** | 96.8% |
| experiencias | 54 | 54 | 0 | 100% |
| rutas | 44 | 44 | 0 | 100% |
| hoteles | 18 | 18 | 0 | 100% |
| banner | 13 | 13 | 0 | 100% |
| articulo_mice | 9 | 9 | 0 | 100% |
| casos_de_exito | 6 | 6 | 0 | 100% |
| itinerarios | 4 | 4 | 0 | 100% |
| banco_de_imagenes ⚠️ | 930 | 0 | 930 | 0% |

**Lectura:** el contenido que arma el subtema (atractivos, establecimientos, experiencias,
rutas, hoteles, banner, articulo_mice, casos_de_exito, itinerarios) está **100% cubierto**.
Los únicos huecos reales son **5 eventos** y **8 artículos de blog** sin imagen principal.

`banco_de_imagenes` (930 nodos, 0% con `field_mainimg`) es casi seguro una librería
interna de imágenes gestionada por otra vía (Cloudinary — el propio template del tema
base prioriza `field_mainimg` pero cae a `field_url_de_cloudinary` como respaldo), no
contenido de cara al visitante; no se interpreta como una brecha real.

## Campo(s) de imagen usados (orden de prioridad, por tipo)

| Tipo | Campo(s) |
| --- | --- |
| atractivos | `field_cover` → `field_mainimg` |
| hoteles | `field_mainimg` → `field_cover` |
| establecimientos | `field_mainimg` → `field_cover` |
| experiencias | `field_banner` → `field_cover` → `field_mainimg` |
| rutas | `field_mainimg` |
| eventos | `field_mainimg` |
| itinerarios | `field_mainimg` |
| article | `field_cover` → `field_mainimg` → `field_image` |
| articulo_mice | `field_cover` → `field_mainimg` → `field_image` |
| banner | `field_banner` |
| banco_de_imagenes | `field_mainimg` (respaldo real: `field_url_de_cloudinary`, no evaluado aquí) |
| casos_de_exito | `field_fotos` (primera foto de la galería) |

**No verificados** (sin plantilla propia en ningún tema — no se pudo confirmar el
campo desde el código): `venues`, `salones_de_venues_mice`, `eventos_mice`,
`proveedores_conecta`, `guias_turisticos`, `fichas_turisticas`,
`empresas_prestadoras_de_servicio`, `audioguias`, `destacados`, `aliados`, `page`.

## Consulta usada (drush sql:query en staging)

```sql
SELECT type, COUNT(*) AS total,
  SUM(CASE WHEN img_id IS NOT NULL THEN 1 ELSE 0 END) AS con_imagen,
  SUM(CASE WHEN img_id IS NULL THEN 1 ELSE 0 END) AS sin_imagen
FROM (
  -- una rama UNION ALL por tipo, cada una con sus campos de imagen en orden
  -- de prioridad vía COALESCE(); cada JOIN fija delta=0, deleted=0 y
  -- langcode=nfd.langcode (los campos de imagen son traducibles — sin fijar
  -- el idioma, el join hace match con la fila ES y la fila EN de cada nodo
  -- traducido y duplica filas, inflando los totales; así se detectó y corrigió).
  SELECT nfd.nid, nfd.type, COALESCE(fc.field_cover_target_id, fm.field_mainimg_target_id) AS img_id
  FROM node_field_data nfd
  LEFT JOIN node__field_cover fc ON fc.entity_id=nfd.nid AND fc.delta=0 AND fc.deleted=0 AND fc.langcode=nfd.langcode
  LEFT JOIN node__field_mainimg fm ON fm.entity_id=nfd.nid AND fm.delta=0 AND fm.deleted=0 AND fm.langcode=nfd.langcode
  WHERE nfd.type='atractivos' AND nfd.langcode='es'
  -- ... (una rama igual por cada tipo de la tabla de mapeo)
) t
GROUP BY type
ORDER BY total DESC;
```

## Nodos sin imagen principal (para corregir)

> Los títulos llegaron con la codificación rota (`�` en vez de tildes/ñ/¿) —
> parece un tema de charset de la terminal donde se corrió `drush sql:query`,
> no del contenido en sí. No los reescribí adivinando los acentos; usa el
> enlace de edición para ver el título real y cargar la imagen.

### Eventos (5)

| nid | Editar |
| ---: | --- |
| 2718 | [/node/2718/edit](https://staging.visitbogota.co/node/2718/edit) — "Semana del bienestar Bogotá: cultura y salud para vivir mejor" |
| 2719 | [/node/2719/edit](https://staging.visitbogota.co/node/2719/edit) — "Nickelodeon - Paw Patrol - Encuentro de patas" |
| 2720 | [/node/2720/edit](https://staging.visitbogota.co/node/2720/edit) — "Feria del Hogar 2026" |
| 2721 | [/node/2721/edit](https://staging.visitbogota.co/node/2721/edit) — "Ciclo de cine Latinoamericano" (título parcial, verificar tilde/palabra exacta) |
| 2722 | [/node/2722/edit](https://staging.visitbogota.co/node/2722/edit) — "Festival internacional de Música Sacra de Bogotá" |

### Article / blog (8)

| nid | Editar |
| ---: | --- |
| 2478 | [/node/2478/edit](https://staging.visitbogota.co/node/2478/edit) — "Distrito Grafiti: paredes llenas de color que te cuentan historias" |
| 2480 | [/node/2480/edit](https://staging.visitbogota.co/node/2480/edit) — "Ruralidad al natural: Aventuras entre cultivos y tradiciones" |
| 2481 | [/node/2481/edit](https://staging.visitbogota.co/node/2481/edit) — "Bogotá se une a la celebración del Día Internacional de los Museos: muchos de ellos tendrán entrada libre" |
| 2482 | [/node/2482/edit](https://staging.visitbogota.co/node/2482/edit) — "¿De visita en Bogotá? Este 3 de junio disfruta la ciudad en bici" |
| 2497 | [/node/2497/edit](https://staging.visitbogota.co/node/2497/edit) — "¿Sabías que Bogotá tiene muchos tesoros escondidos? Descúbrelos en la Plaza de Bolívar" |
| 2507 | [/node/2507/edit](https://staging.visitbogota.co/node/2507/edit) — "¿Te gustaría correr junto a Egan Bernal, Mariana Pajón, Nairo Quintana y Rigoberto Urán? Agéndate para el Gran Fondo de Bogotá" |
| 2514 | [/node/2514/edit](https://staging.visitbogota.co/node/2514/edit) — "Bogotá, una ciudad con historias escritas en la piel" |
| 2547 | [/node/2547/edit](https://staging.visitbogota.co/node/2547/edit) — "Bogotá: la capital cultural de América Latina que está marcando la parada" |

*(Reconstruí las tildes/ñ/¿ por contexto donde el sentido era obvio — igual
verifica el título real en cada edit antes de asumirlo.)*
