<?php

/**
 * @file
 * 301 de las páginas viejas de "Planifica tu viaje" a "Diseña tu viaje".
 *
 *   /planifica-tu-viaje       (nodo 549) → nodo 3003
 *   /planifica-tu-viaje-form  (nodo 671) → nodo 3003
 *
 * Los redirects son entidades del módulo Redirect (contenido, no config), así
 * que no viajan con config/deploy: hay que correr este script en cada entorno.
 * Es idempotente (no duplica si ya existen).
 *
 * Uso (staging):
 *   docker exec -w /var/www/vhosts/localhost/html staging_visitbogota_co \
 *     vendor/bin/drush php:script themes/custom/visit-theme-next/docs/server/redirects-disena-tu-viaje.php
 * Local:
 *   docker compose exec web drush php:script \
 *     web/themes/custom/visit-theme-next/docs/server/redirects-disena-tu-viaje.php
 *
 * Con idioma "und" el redirect vale para /es y /en, y el destino sale
 * en el idioma de la petición (/es/disena-tu-viaje, /en/design-your-trip).
 */

use Drupal\redirect\Entity\Redirect;

// El módulo Redirect resuelve el alias a la ruta interna antes de buscar, así
// que la fuente es node/549 y no "planifica-tu-viaje": con el alias como
// fuente el redirect nunca se dispara.
$sources = ['node/549', 'node/671'];
$legacy = ['planifica-tu-viaje', 'planifica-tu-viaje-form'];
$target = 'internal:/node/3003';

$storage = \Drupal::entityTypeManager()->getStorage('redirect');

// Limpia los de una corrida anterior que usaban el alias como fuente.
foreach ($legacy as $old) {
  foreach ($storage->loadByProperties(['redirect_source__path' => $old]) as $r) {
    $r->delete();
    echo "borrado (fuente vieja): /$old\n";
  }
}

foreach ($sources as $source) {
  $existing = $storage->loadByProperties(['redirect_source__path' => $source]);
  if ($existing) {
    $redirect = reset($existing);
    $redirect->setRedirect('/node/3003');
    $redirect->setStatusCode(301);
    $redirect->setLanguage('und');
    $redirect->save();
    echo "actualizado: /$source → node/3003 (rid {$redirect->id()})\n";
    continue;
  }
  $redirect = Redirect::create([
    'redirect_source' => ['path' => $source, 'query' => []],
    'redirect_redirect' => ['uri' => $target],
    'status_code' => 301,
    'language' => 'und',
  ]);
  $redirect->save();
  echo "creado: /$source → node/3003 (rid {$redirect->id()})\n";
}
