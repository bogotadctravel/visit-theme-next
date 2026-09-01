# visit_theme_next

Subtema de `visit_theme` (Visit Bogota 2.0). **Solo se activa en staging.**

## Trabajar

1. En tu maquina: rama de trabajo en este repo, editar SCSS/Twig/CSS.
2. Compilar el CSS localmente y commitear el resultado (el servidor no tiene toolchain).
3. `git push`.
4. En staging: `sudo -u useridt git -C <ruta> pull`  ->  `drush cr` (contenedor staging).

## Config que necesita el subtema (regiones, bloques, ajustes)

Exportar SOLO esos objetos a `config/deploy/*.yml` y commitearlos:

```
drush @staging config:get block.block.mi_bloque --format=yaml > config/deploy/block.block.mi_bloque.yml
```

`refresh-staging.sh` reaplica `config/deploy/` con `config:import --partial`
despues de cada refresh de contenido desde produccion.
