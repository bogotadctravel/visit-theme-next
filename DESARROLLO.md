# Desarrollo del subtema `visit_theme_next`

Guía para modificar el theme y ver los cambios en
**https://staging.visitbogota.co**.

---

## 1. Qué es y qué NO es

- Es un **subtema** de `visit_theme` (Visit Bogotá 2.0). Hereda plantillas,
  regiones y estilos del tema base; aquí solo va **lo que cambia**.
- Se activa **únicamente en staging**. Producción sigue con `visit_theme` y
  **nunca** debe cambiarse desde este flujo.
- El nombre de máquina es `visit_theme_next`. No renombrarlo (romper eso obliga
  a rehacer la configuración en la base de datos).

## 2. Dónde va cada cosa

| Carpeta / archivo | Contenido |
|---|---|
| `templates/` | Plantillas Twig que sobrescriben las del tema base (`node--articulo.html.twig`, `page.html.twig`, …) |
| `scss/` | Fuentes SCSS (si trabajas con SCSS) |
| `css/` | **CSS ya compilado** — es lo que carga Drupal. Se commitea. |
| `js/` | JavaScript del subtema |
| `visit_theme_next.libraries.yml` | Declaración de librerías (CSS/JS y sus dependencias) |
| `visit_theme_next.info.yml` | Metadatos del theme, regiones, librería global |
| `visit_theme_next.theme` | Funciones PHP del theme (preprocess, suggestions, …) |
| `config/deploy/` | Configuración de Drupal que el subtema necesita (ver §5) |

> **El servidor no compila SCSS.** Compila en tu máquina con la misma
> herramienta que usa el tema base y **commitea el resultado** en `css/`.

## 3. Ciclo de trabajo

```bash
# 1. Editar (rama de trabajo recomendada)
git switch -c mi-cambio          # o trabaja directo en main si el equipo lo prefiere
#    ...editar templates/ scss/ js/ ...
#    ...compilar SCSS -> css/ ...

# 2. Publicar
git add -A
git commit -m "Descripción del cambio"
git push -u origin mi-cambio     # (o: git push, si vas por main)
#    -> si usaste rama: abrir PR y hacer merge a main en GitHub
```

Staging sigue la rama **`main`**. Lo que no esté en `main` no se ve en staging.

## 4. Ver los cambios en staging

Conéctate al servidor: `ssh useridt@10.216.153.78`

### Opción A — solo cambios de theme (rápido, ~10 s)

```bash
sudo /data/backups/bin/pull-theme.sh
```

Hace `git pull` del subtema en staging y `drush cr` (limpia cachés). Úsalo
mientras iteras en CSS/Twig/JS.

### Opción B — además traer contenido nuevo de producción (~5 min)

```bash
sudo /data/backups/bin/refresh-staging.sh
```

Copia el contenido actual de `visitbogota.co` a staging (con copia de seguridad
previa y reversión automática si algo falla), hace `git pull` del subtema,
reaplica `config/deploy/` y reactiva `visit_theme_next`. Úsalo cuando el equipo
de contenido haya cargado material nuevo que quieras ver en el theme.

### Acceso a staging

- **Aviso del navegador (Traefik):** usuario `adminvisit` · contraseña `Visit2025`
- **Login de Drupal:** usuario `apps@idt.gov.co` · contraseña: pídela al equipo
  (está en `/root/.staging_admin_pw` del servidor). Una vez dentro puedes
  cambiarla en *Personas*.

## 5. Configuración que el subtema necesita (regiones, bloques, ajustes)

Los cambios de **plantillas, CSS y JS** viajan solos en este repo. Pero si el
theme necesita **regiones nuevas, otra colocación de bloques, ajustes de theme,
image styles nuevos, view modes…** eso vive en la **base de datos de Drupal** y
un refresh de contenido lo sobrescribiría.

### Cómo se ejecuta `drush` en staging

Staging corre en un contenedor Docker. No hay alias `@staging`; drush vive
**dentro del contenedor**:

```bash
# contenedor y docroot (los usa /data/backups/bin/pull-theme.sh)
STG=staging_visitbogota_co
DR=/var/www/vhosts/localhost/html

drush() { docker exec -w "$DR" "$STG" vendor/bin/drush "$@"; }   # helper para la sesión
```

### Exportar un objeto de config a este repo

```bash
# 1. Haz el cambio en staging por la UI (/admin/...) o con `drush`.
# 2. En el servidor: vuelca el YAML a /tmp (el `>` corre en el host).
ssh useridt@10.216.153.78
docker exec -w /var/www/vhosts/localhost/html staging_visitbogota_co \
  vendor/bin/drush config:get views.view.MI_VISTA --format=yaml > /tmp/MI_VISTA.yml

# 3. Desde tu máquina: baja el archivo a config/deploy/ y commitea.
scp useridt@10.216.153.78:/tmp/MI_VISTA.yml \
  config/deploy/views.view.MI_VISTA.yml
git add config/deploy/ && git commit -m "config: MI_VISTA" && git push
```

> Alternativa sin `scp`: corre el `config:get` sin `>`, copia el YAML del
> terminal y pégalo en el archivo dentro de `config/deploy/` en tu máquina.
>
> No commitees desde el checkout del servidor: `pull-theme.sh` hace
> `git pull --ff-only` y un commit local lo rompería.

`pull-theme.sh` y `refresh-staging.sh` reaplican todo `config/deploy/*.yml` con
`drush config:import --partial` en cada actualización.

> Nombres de config útiles: `block.block.*` (bloques), `system.theme` (no tocar),
> `visit_theme_next.settings` (ajustes del theme), `image.style.*`,
> `core.entity_view_display.node.<tipo>.<view_mode>` (formateadores de campos).

## 6. Sincronizar contenido de producción a staging

Cuando suban contenido nuevo a `visitbogota.co` y quieras verlo en el theme:

```bash
ssh useridt@10.216.153.78
sudo /data/backups/bin/refresh-staging.sh
```

Qué hace, en orden:

1. Copia de seguridad de la base de datos de staging (para poder revertir).
2. Pone staging en modo mantenimiento.
2b. **Vuelca los ítems de menú propios de staging** (`menu_link_content*`) a
   `$PRE/staging-menu.sql` — son *contenido*, no config, así que el restore los
   pisaría.
3. Respaldo fresco de producción + restaura ese contenido en la BD de staging.
3b. **Recarga los ítems de menú de staging** desde el volcado del paso 2b.
4. `rsync` de los archivos subidos.
5. `drush cr` / `updb`.
5-bis. **Reconstruye `menu_tree`** (tabla derivada): borra las filas
   `menu_link_content:%` (quedan huérfanas de prod), re-guarda cada entity de
   menú y llama a `menu.link->rebuild()`. Sin esto → 500 en todas las páginas.
5a. `git pull` del subtema + reaplica `config/deploy/`.
5b/5c. Reactiva `visit_theme_next` + sanea la BD.
6. Quita el modo mantenimiento y valida (staging responde, producción intacta).
   Si `/es` no da 200, guarda evidencia en `$PRE/` antes del rollback.
7. Si algún paso falla → **revierte** staging a la copia del paso 1.

**Nunca escribe en producción.** Solo lee.

> Los pasos 2b/3b/5-bis hacen que **todos** los menús de staging queden
> congelados a su estado actual (submenús incluidos): los cambios de menú que
> haga el equipo en producción ya no llegan a staging. Para volver a
> sincronizar el menú desde producción, comentar esos tres pasos en
> `/data/backups/bin/refresh-staging.sh` (hay `.bak-*` al lado) para una corrida.

## 7. Reglas

- No cambiar el theme activo de **producción**.
- Compilar y commitear el CSS/JS; el servidor no tiene toolchain de front.
- La rama que ve staging es `main`.
- Config de theme (bloques/regiones/ajustes) → `config/deploy/` en este repo,
  no solo en la base de datos de staging.
