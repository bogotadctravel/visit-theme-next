<?php

/**
 * @file
 * Contenido de accesibilidad para medios (WCAG 1.1.1, 1.2.1–1.2.3).
 *
 * Requiere los campos de scripts/a11y_media_fields.php. Carga:
 *   - field_transcripcion de los videos de experiencias (descripción de lo que
 *     se ve; en los que tienen voz, también la transcripción).
 *   - field_subtitulos (.vtt de scripts/a11y-media/) del único video con voz.
 *   - alt de dos imágenes insertadas en artículos del blog que no lo tenían.
 *
 * Son borradores generados con Whisper y revisión de fotogramas: el equipo de
 * contenido puede ajustarlos luego desde la edición de cada nodo.
 *
 * Idempotente (no toca lo que ya tenga valor). Ejecutar desde el docroot:
 *   drush php:script themes/custom/visit-theme-next/scripts/a11y_media_content.php
 */

// Solo por drush: la carpeta del tema es accesible por web.
if (PHP_SAPI !== 'cli') {
  exit;
}

use Drupal\file\Entity\File;
use Drupal\node\Entity\Node;

$dir = __DIR__ . '/a11y-media';

$ghost_es = 'Video sin narración, con música de fondo. Aparece el texto «AE Colombia Travel presenta». De noche se recorren calles coloniales de La Candelaria con faroles, puertas antiguas y fachadas iluminadas; una joven de cabello rojo mira a la cámara frente a una ventana enrejada. Cierra con los logos del Museo de la Chicha, La Bruja Restaurante Bar y Bogotá.';
$ghost_en = 'Video without narration, with background music. The text "AE Colombia Travel presents" appears. At night, the camera walks through colonial streets of La Candelaria with street lamps, old doors and lit façades; a young red-haired woman looks at the camera in front of a barred window. It ends with the logos of Museo de la Chicha, La Bruja Restaurante Bar and Bogotá.';

$transcripts = [
  118 => ['es' => $ghost_es, 'en' => $ghost_en],
  119 => ['es' => $ghost_es, 'en' => $ghost_en],
  196 => [
    'es' => 'Video sin narración, con música de fondo. De noche, un actor con sombrero y traje de época y una actriz caracterizada con flores rojas en el cabello cuentan historias a un grupo de visitantes frente a una reja y un edificio antiguo. Al final aparece una figura con capa roja que sostiene una vela encendida en la oscuridad.',
    'en' => 'Video without narration, with background music. At night, an actor in a hat and period suit and an actress made up with red flowers in her hair tell stories to a group of visitors in front of an iron fence and an old building. At the end, a figure in a red cloak holds a lit candle in the dark.',
  ],
  198 => [
    'es' => 'Video sin narración, con música de fondo. En un local de paredes de ladrillo, un guía habla a un grupo sentado en mesas de madera. Un bartender sirve chicha en vasos pequeños sobre una bandeja; se ven de cerca los vasos y una vasija de barro de la que se sirve la bebida. Una visitante prueba la chicha.',
    'en' => 'Video without narration, with background music. In a brick-walled venue, a guide talks to a group seated at wooden tables. A bartender pours chicha into small glasses on a tray; there are close-ups of the glasses and of the clay jug it is poured from. A visitor tastes the chicha.',
  ],
  402 => [
    'es' => 'Video sin narración, con música de fondo. Recorre un bar decorado con plantas y luces colgantes donde un grupo participa en una cata y taller de gin. Textos en pantalla: «También es un taller de destilación», «Aprende a destilar», «Conoce gente entusiasta de las gins» y «Crea tu propia ginebra». Se ven un alambique de cobre, copas de gin tonic con uchuvas y hielo, y asistentes que brindan y ríen.',
    'en' => 'Video without narration, with background music. It tours a bar decorated with plants and hanging lights where a group takes part in a gin tasting and workshop. On-screen text (in Spanish): "It is also a distilling workshop", "Learn to distil", "Meet people who love gin" and "Create your own gin". It shows a copper still, gin and tonic glasses with goldenberries and ice, and guests toasting and laughing.',
  ],
];

// El video con voz: descripción + transcripción y subtítulos por idioma.
$transcripts[141] = [
  'es' => file_get_contents("$dir/141.es.txt"),
  'en' => file_get_contents("$dir/141.en.txt"),
];
$subtitles = [
  141 => ['es' => '141.es.vtt', 'en' => '141.en.vtt'],
];

$updated = 0;
foreach ($transcripts as $nid => $by_lang) {
  $node = Node::load($nid);
  if (!$node || !$node->hasField('field_transcripcion')) {
    echo "Nodo $nid sin el campo (¿se corrió a11y_media_fields.php?)\n";
    continue;
  }
  foreach ($by_lang as $lang => $text) {
    if (!$node->hasTranslation($lang) || !trim((string) $text)) {
      continue;
    }
    $t = $node->getTranslation($lang);
    $changed = FALSE;
    if ($t->get('field_transcripcion')->isEmpty()) {
      $html = implode('', array_map(fn($p) => '<p>' . htmlspecialchars(trim($p)) . '</p>', array_filter(preg_split('/\n\s*\n/', trim($text)))));
      $t->set('field_transcripcion', ['value' => $html, 'format' => 'basic_html']);
      $changed = TRUE;
    }
    if (isset($subtitles[$nid][$lang]) && $t->hasField('field_subtitulos') && $t->get('field_subtitulos')->isEmpty()) {
      $name = $subtitles[$nid][$lang];
      $dest = 'public://subtitulos';
      \Drupal::service('file_system')->prepareDirectory($dest, \Drupal\Core\File\FileSystemInterface::CREATE_DIRECTORY);
      $uri = \Drupal::service('file_system')->copy("$dir/$name", "$dest/$name", \Drupal\Core\File\FileExists::Replace);
      $file = File::create(['uri' => $uri, 'status' => 1]);
      $file->save();
      $t->set('field_subtitulos', ['target_id' => $file->id()]);
      $changed = TRUE;
    }
    if ($changed) {
      $t->setNewRevision(TRUE);
      $t->setRevisionLogMessage('Accesibilidad: transcripción/subtítulos del video (WCAG 1.2).');
      $t->save();
      $updated++;
      echo "Nodo $nid ($lang) actualizado\n";
    }
  }
}

// Imágenes insertadas en el cuerpo de artículos sin alt (WCAG 1.1.1).
$alts = [
  [446, 'en', 'a845b527-33b2-4928-b3aa-f479fc782c70', 'Aerial view of Simón Bolívar Park in Bogotá, with its lake surrounded by trees and the city and the Eastern Hills in the background.'],
  [1269, 'en', 'cf268a35-81df-4c0b-bff8-b95a72b49dac', 'Participants of the LGBTIQ+ march in southern Bogotá dancing on a parade float among colorful hanging streamers; one of them wears a rainbow skirt.'],
];
foreach ($alts as [$nid, $lang, $uuid, $alt]) {
  $node = Node::load($nid);
  if (!$node || !$node->hasTranslation($lang)) {
    continue;
  }
  $t = $node->getTranslation($lang);
  $body = $t->get('body')->value;
  $re = '/<img(?![^>]*\balt=)([^>]*data-entity-uuid="' . preg_quote($uuid, '/') . '"[^>]*)>/';
  $new = preg_replace($re, '<img alt="' . htmlspecialchars($alt) . '"$1>', $body, 1, $count);
  if ($count) {
    $t->get('body')->value = $new;
    $t->setNewRevision(TRUE);
    $t->setRevisionLogMessage('Accesibilidad: texto alternativo de imagen (WCAG 1.1.1).');
    $t->save();
    $updated++;
    echo "Alt agregado en nodo $nid ($lang)\n";
  }
}

echo "Listo: $updated cambios\n";
