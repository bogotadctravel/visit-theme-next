# visit_theme_next

Subtema de `visit_theme` (Visit Bogotá 2.0). **Se activa solo en staging.**
Producción sigue con `visit_theme`.

- **Staging:** https://staging.visitbogota.co
- **Cómo trabajar y ver los cambios:** [DESARROLLO.md](DESARROLLO.md)

## TL;DR

```bash
# editar templates/ scss/ js/  ->  compilar SCSS a css/  ->  commitear
git add -A && git commit -m "..." && git push        # staging sigue main

# en el servidor (ssh useridt@10.216.153.78):
sudo /data/backups/bin/pull-theme.sh        # solo theme (~10s)
sudo /data/backups/bin/refresh-staging.sh   # + contenido nuevo de producción (~5min)
```
