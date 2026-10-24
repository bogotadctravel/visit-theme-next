#!/usr/bin/env bash
# =============================================================================
# deploy-theme-prod.sh — Publica en PRODUCCION (visitbogota.co) el commit del
# subtema visit_theme_next que ya esta probado en staging. Es el script de
# actualizaciones del dia a dia despues del lanzamiento (launch-theme-next.sh).
#
#   Flujo:  pre-chequeo (no toca nada)  ->  confirmacion  ->  respaldo de la
#           config que se va a tocar  ->  checkout del commit de staging en
#           prod  ->  config/deploy cambiada  ->  en.po (si cambio)  ->  cr  ->
#           validacion.  Si algo falla: vuelve solo al commit y la config previos.
#
#   Sin modo mantenimiento: solo cambia archivos del subtema + config puntual.
#   SOLO LEE de staging.
#
#   Uso:  sudo /data/backups/bin/pull-theme.sh                  # 1. staging
#         (revisar https://staging.visitbogota.co)
#         sudo /data/backups/bin/deploy-theme-prod.sh --check   # 2. ver que sale
#         sudo /data/backups/bin/deploy-theme-prod.sh           # 3. publicar
#         sudo /data/backups/bin/deploy-theme-prod.sh --rollback  # deshacer el ultimo
#
#   Variables:  REF=<commit>        otro commit del checkout de staging
#               ALL_CONFIG=1        reimportar TODO config/deploy (no solo lo cambiado)
#               LOCALE=1            reimportar en.po aunque no haya cambiado
#               URLS="/es /en ..."  rutas a validar
#               DEPLOY=<dir>        (con --rollback) otro despliegue que deshacer
#
#   Instalacion (fuente versionada en el repo, docs/server/):
#     sudo install -m 755 /data/visitbogota.co_proxy/staging.visitbogota.co/web/themes/custom/visit-theme-next/docs/server/deploy-theme-prod.sh /data/backups/bin/
# =============================================================================
set -Eeuo pipefail

MODE=deploy; YES=0
for a in "$@"; do case "$a" in --check) MODE=check;; --rollback) MODE=rollback;; --yes) YES=1;;
  *) echo "uso: $0 [--check|--rollback] [--yes]"; exit 2;; esac; done

# mismo lock que launch/rollback-theme-next: nunca dos a la vez
exec 9>/var/lock/launch-theme-next.lock
flock -n 9 || { echo "Ya hay un despliegue/lanzamiento/rollback en curso. Aborto."; exit 1; }
# refresh-staging no debe correr a la vez (leemos el checkout de staging)
exec 8>/var/lock/refresh-staging.lock
flock -n 8 || { echo "Hay un refresh-staging en curso. Aborto."; exit 1; }

PROXY=/data/visitbogota.co_proxy
PROD_ROOT="${PROD_ROOT:-$PROXY/devnuevo.visitbogota.co}"
STG_ROOT="$PROXY/staging.visitbogota.co"
PROD=visitbogota_co               # comparte codigo y BD con devnuevo_visitbogota_co
STG=staging_visitbogota_co
DR=/var/www/vhosts/localhost/html
DB=dbvisit2
SUB=visit_theme_next
REL_TDIR=web/themes/custom/visit-theme-next
PROD_TDIR="$PROD_ROOT/$REL_TDIR"
STG_TDIR="$STG_ROOT/$REL_TDIR"
CHOWN=1000:1000
URLS="${URLS:-/es /en}"
BK=/data/backups
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$BK/logs/deploy-theme-prod-$TS.log"
TMPCFG="$PROD_ROOT/_deploy_cfg"   # visible en el contenedor como $DR/_deploy_cfg

mkdir -p "$BK/logs" "$BK/deploy-theme"
exec > >(tee -a "$LOG") 2>&1
echo "==================== deploy-theme-prod  $TS  ($MODE) ===================="

FILTER='PHP Warning|odbc\.so|shmop\.so|mariadb\.cnf|includerecursion'
dp(){ local out rc
      out=$(docker exec -w "$DR" "$PROD" vendor/bin/drush "$@" 2>&1) && rc=0 || rc=$?
      printf '%s\n' "$out" | grep -vE "$FILTER" || true; return $rc; }
dpq(){ docker exec -w "$DR" "$PROD" vendor/bin/drush "$@" 2>/dev/null | tr -d '\r'; }
gitu(){ sudo -u useridt git "$@"; }
fail(){ echo "ABORTA: $*"; exit 1; }
ok(){ echo "    ok  $*"; }

# valida $URLS contra prod; guarda el HTML en $1. Devuelve 1 si alguna falla.
validate(){ local bad=0 u f c
  for u in $URLS; do
    f="$1/check$(echo "$u" | tr '/' '_').html"
    c=$(curl -sk -o "$f" -w '%{http_code}' --resolve visitbogota.co:443:127.0.0.1 "https://visitbogota.co$u" --max-time 60 || echo 000)
    if [ "$c" != 200 ] || grep -q "unexpected error" "$f"; then echo "    FALLA $u -> $c"; bad=1; else echo "    ok    $u -> $c"; fi
  done
  return $bad; }

# importa los .yml de $TMPCFG conservando el uuid de prod (si no, el import falla)
import_cfg(){ local f name u
  for f in "$TMPCFG"/*.yml; do
    name="$(basename "$f" .yml)"
    u="$(dpq config:get "$name" uuid --format=string || true)"
    if [[ "$u" =~ ^[0-9a-f-]{36}$ ]] && grep -q '^uuid:' "$f"; then sed -i "s/^uuid: .*/uuid: $u/" "$f"; fi
  done
  chown -R "$CHOWN" "$TMPCFG"
  dp config:import --partial --source="$DR/_deploy_cfg" -y; }

# vuelve prod al commit y la config de antes del despliegue $1
revert(){ local L=$1
  # shellcheck disable=SC1091
  . "$L/state.env"
  echo "[revert] subtema -> ${PREV:0:7}"
  gitu -C "$PROD_TDIR" checkout --quiet --detach "$PREV"
  chown -R "$CHOWN" "$PROD_TDIR"
  if ls "$L"/config-before/*.yml >/dev/null 2>&1; then
    echo "[revert] config previa: $(ls "$L/config-before" | sed 's/\.yml$//' | tr '\n' ' ')"
    rm -rf "$TMPCFG"; cp -r "$L/config-before" "$TMPCFG"
    import_cfg; rm -rf "$TMPCFG"
  fi
  [ -s "$L/new-config.txt" ] && echo "    aviso: config NUEVA del despliegue que queda en prod (inofensiva): $(tr '\n' ' ' < "$L/new-config.txt")"
  [ "${PO:-0}" = 1 ] && echo "    aviso: las traducciones de en.po importadas no se revierten"
  dp cr
  echo "[revert] HEAD prod: $(gitu -C "$PROD_TDIR" rev-parse --short HEAD)"; }

# =============================================================================
# ROLLBACK manual del ultimo despliegue
# =============================================================================
if [ "$MODE" = rollback ]; then
  L="${DEPLOY:-$BK/deploy-theme/latest}"
  [ -f "$L/state.env" ] || fail "no hay estado de despliegue en $L/state.env"
  # shellcheck disable=SC1091
  . "$L/state.env"
  CUR="$(gitu -C "$PROD_TDIR" rev-parse HEAD)"
  echo "despliegue: $(basename "$(readlink -f "$L")")  ${PREV:0:7} -> ${REF:0:7}"
  echo "prod ahora: ${CUR:0:7}"
  [ "$CUR" = "$REF" ] || echo "    aviso: prod ya no esta en ${REF:0:7} (hubo otro despliegue despues)"
  if [ "$YES" != 1 ]; then
    read -r -p "Escribe ROLLBACK para volver a ${PREV:0:7}: " A </dev/tty
    [ "$A" = ROLLBACK ] || { echo "Cancelado."; exit 1; }
  fi
  revert "$L"
  echo "[v] validacion"
  validate "$BK/logs" || { echo "!! VALIDACION FALLA — revisar a mano (log: $LOG)"; exit 1; }
  echo "==================== rollback OK  $TS ===================="
  exit 0
fi

# =============================================================================
# PRE-CHEQUEO — no modifica nada
# =============================================================================
echo "[pre] pre-chequeo (solo lectura)"
for c in "$PROD" "$STG"; do
  [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" = true ] || fail "contenedor $c no esta corriendo"
done; ok "contenedores arriba"

docker inspect "$PROD" -f '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' | grep -qx "$PROD_ROOT" \
  || fail "$PROD_ROOT no es un volumen de $PROD"
[ "$(dpq status --field=db-name)" = "$DB" ] || fail "drush de $PROD no apunta a $DB"
[ "$(dpq config:get system.theme default --format=string)" = "$SUB" ] || fail "el theme por defecto de prod no es $SUB"
ok "prod: $DB con $SUB activo"

[ -d "$PROD_TDIR/.git" ] || fail "$PROD_TDIR no es un checkout git"
[ -z "$(gitu -C "$PROD_TDIR" status --porcelain)" ] || { gitu -C "$PROD_TDIR" status -s; fail "el subtema de prod tiene cambios a mano (arriba)"; }
[ -d "$STG_TDIR/.git" ] || fail "no hay checkout git del subtema en $STG_TDIR"
[ -z "$(gitu -C "$STG_TDIR" status --porcelain)" ] || fail "el checkout de staging tiene cambios sin commitear"

PREV="$(gitu -C "$PROD_TDIR" rev-parse HEAD)"
REF="$(gitu -C "$STG_TDIR" rev-parse "${REF:-HEAD}")" || fail "commit ${REF:-HEAD} no existe en staging"
echo "    prod   : ${PREV:0:7}  $(gitu -C "$PROD_TDIR" log -1 --pretty=%s)"
echo "    publica: ${REF:0:7}  $(gitu -C "$STG_TDIR" log -1 --pretty=%s "$REF")"

if [ "$PREV" = "$REF" ] && [ "${ALL_CONFIG:-0}" != 1 ] && [ "${LOCALE:-0}" != 1 ]; then
  echo "Prod ya esta en ${REF:0:7}. Nada que publicar (corre pull-theme.sh si esperabas cambios)."
  exit 0
fi
gitu -C "$STG_TDIR" cat-file -e "$PREV^{commit}" 2>/dev/null \
  || fail "el commit de prod ${PREV:0:7} no esta en el checkout de staging"
gitu -C "$STG_TDIR" merge-base --is-ancestor "$PREV" "$REF" \
  || echo "    aviso: ${REF:0:7} NO es posterior a prod — esto VUELVE ATRAS el subtema"

echo "    commits:"
gitu -C "$STG_TDIR" log --oneline "$PREV..$REF" | sed 's/^/      /'
echo "    archivos:"
gitu -C "$STG_TDIR" diff --stat "$PREV" "$REF" | sed 's/^/      /'

CHANGED="$(gitu -C "$STG_TDIR" diff --name-only "$PREV" "$REF")"
# el servidor no compila SCSS: si cambio scss/ y no css/, falto compilar en local
if grep -q '^scss/' <<<"$CHANGED" && ! grep -q '^css/' <<<"$CHANGED"; then
  echo "    aviso: cambia scss/ pero no css/ — ¿se compilo y commiteo css/overrides.css?"
fi

if [ "${ALL_CONFIG:-0}" = 1 ]; then
  CFG="$(gitu -C "$STG_TDIR" ls-tree --name-only "$REF" config/deploy/ | grep '\.yml$' || true)"
else
  CFG="$(gitu -C "$STG_TDIR" diff --name-only --diff-filter=AMR "$PREV" "$REF" -- 'config/deploy/*.yml')"
fi
CFG_NAMES="$(printf '%s\n' "$CFG" | grep . | xargs -r -n1 basename | sed 's/\.yml$//' || true)"
DEL="$(gitu -C "$STG_TDIR" diff --name-only --diff-filter=D "$PREV" "$REF" -- 'config/deploy/*.yml')"
[ -n "$CFG_NAMES" ] && echo "    config a importar: $(tr '\n' ' ' <<<"$CFG_NAMES")" || echo "    config: sin cambios"
[ -n "$DEL" ] && echo "    aviso: se quitaron del repo (en prod NO se borran): $(tr '\n' ' ' <<<"$DEL")"

PO=0
{ [ "${LOCALE:-0}" = 1 ] || grep -qx 'translations/en.po' <<<"$CHANGED"; } && PO=1
[ "$PO" = 1 ] && echo "    en.po: se importa" || echo "    en.po: sin cambios"

mkdir -p "$BK/logs/tmp-$TS"
validate "$BK/logs/tmp-$TS" >/dev/null || { rm -rf "$BK/logs/tmp-$TS"; fail "prod no responde 200 en $URLS ANTES de empezar"; }
rm -rf "$BK/logs/tmp-$TS"
ok "prod responde 200 en $URLS"

echo "[pre] pre-chequeo OK"
if [ "$MODE" = check ]; then echo "(--check) no se modifico nada."; exit 0; fi
if [ "$YES" != 1 ]; then
  echo; echo "Se va a publicar ${REF:0:7} en PRODUCCION (sin mantenimiento, ~30 s)."
  read -r -p "Escribe PUBLICAR para continuar: " A </dev/tty
  [ "$A" = PUBLICAR ] || { echo "Cancelado."; exit 1; }
fi

# =============================================================================
# 0. Estado para rollback + respaldo de la config que se va a tocar
# =============================================================================
L="$BK/deploy-theme/$TS"
mkdir -p "$L/config-before"
cat > "$L/state.env" <<ENV
TS=$TS
PREV=$PREV
REF=$REF
PO=$PO
ENV
: > "$L/new-config.txt"
for name in $CFG_NAMES; do
  y="$(dpq config:get "$name" --format=yaml || true)"
  if [ -n "$y" ] && ! grep -q "does not exist" <<<"$y"; then
    printf '%s\n' "$y" > "$L/config-before/$name.yml"
  else
    echo "$name" >> "$L/new-config.txt"
  fi
done
ln -sfn "$L" "$BK/deploy-theme/latest"
echo "[0] estado de rollback: $L"

on_error(){
  trap - ERR
  echo "!! fallo — volviendo a ${PREV:0:7}"
  dp watchdog:show --count=30 --extended > "$L/watchdog.txt" 2>&1 || true
  revert "$L" || true
  rm -rf "$TMPCFG"
  validate "$L" || echo "!! prod sigue fallando tras revertir — revisar a mano YA (log: $LOG)"
  echo "!! evidencia en $L/"
}
trap 'echo "[error] fallo en la linea $LINENO"; on_error; exit 1' ERR

# =============================================================================
# 1. Codigo del subtema (exactamente el commit de staging)
# =============================================================================
echo "[1] subtema -> ${REF:0:7}"
gitu -C "$PROD_TDIR" fetch --quiet "$STG_TDIR" "$REF"
gitu -C "$PROD_TDIR" checkout --quiet --detach "$REF"
chown -R "$CHOWN" "$PROD_TDIR"
echo "    HEAD prod: $(gitu -C "$PROD_TDIR" rev-parse --short HEAD)"

# =============================================================================
# 2. Config de config/deploy (solo lo cambiado, o todo con ALL_CONFIG=1)
# =============================================================================
if [ -n "$CFG_NAMES" ]; then
  echo "[2] config:import --partial"
  rm -rf "$TMPCFG"; mkdir -p "$TMPCFG"
  for name in $CFG_NAMES; do cp "$PROD_TDIR/config/deploy/$name.yml" "$TMPCFG/"; done
  import_cfg
  cp -r "$TMPCFG" "$L/config-imported"
  rm -rf "$TMPCFG"
fi

# =============================================================================
# 3. Traducciones del subtema
# =============================================================================
if [ "$PO" = 1 ]; then
  echo "[3] locale:import en"
  dp locale:import en "$DR/$REL_TDIR/translations/en.po" --type=customized --override=all
fi

# =============================================================================
# 4. Caches + validacion
# =============================================================================
echo "[4] cr"
dp cr
echo "[5] validacion"
validate "$L" || false

trap - ERR
# retencion: conservar los 30 despliegues mas recientes
ls -1dt "$BK"/deploy-theme/2* 2>/dev/null | tail -n +31 | xargs -r rm -rf
echo "==================== deploy-theme-prod OK  $TS ===================="
echo "Subtema ${REF:0:7} en produccion (antes ${PREV:0:7})."
echo "Deshacer:  sudo $BK/bin/deploy-theme-prod.sh --rollback"
echo "log: $LOG"
