<?php

/**
 * @file
 * Campos de accesibilidad para video (WCAG 1.2.1, 1.2.2 y 1.2.3).
 *
 * Crea, si no existen, en experiencias (el único tipo cuyo video se publica):
 *   - field_subtitulos: archivo .vtt de subtítulos (traducible: uno por idioma).
 *   - field_transcripcion: texto con la transcripción y la descripción de lo
 *     que se ve (alternativa al medio).
 * y los agrega a los formularios de edición. Las plantillas los usan como
 * <track kind="captions"> y como un bloque "Transcripción" bajo el video.
 *
 * Idempotente. Ejecutar desde el docroot:
 *   drush php:script themes/custom/visit-theme-next/scripts/a11y_media_fields.php
 */

// Solo por drush: la carpeta del tema es accesible por web.
if (PHP_SAPI !== 'cli') {
  exit;
}

use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;

$bundles = ['experiencias'];

$storages = [
  'field_subtitulos' => [
    'type' => 'file',
    'settings' => ['uri_scheme' => 'public', 'target_type' => 'file'],
  ],
  'field_transcripcion' => [
    'type' => 'text_long',
    'settings' => [],
  ],
];

$instances = [
  'field_subtitulos' => [
    'label' => 'Subtítulos del video (.vtt)',
    'description' => 'Archivo WebVTT con los subtítulos del video en el idioma de esta traducción. Obligatorio si el video tiene voz (WCAG 1.2.2).',
    'settings' => [
      'file_extensions' => 'vtt',
      'file_directory' => 'subtitulos/[date:custom:Y]-[date:custom:m]',
      'max_filesize' => '2 MB',
      'description_field' => FALSE,
    ],
    'widget' => 'file_generic',
  ],
  'field_transcripcion' => [
    'label' => 'Transcripción del video',
    'description' => 'Texto completo de lo que se dice en el video y descripción de lo que se ve (WCAG 1.2.1 y 1.2.3).',
    'settings' => [],
    'widget' => 'text_textarea',
  ],
];

$display_repository = \Drupal::service('entity_display.repository');

foreach ($storages as $name => $def) {
  if (!FieldStorageConfig::loadByName('node', $name)) {
    FieldStorageConfig::create([
      'field_name' => $name,
      'entity_type' => 'node',
      'type' => $def['type'],
      'cardinality' => 1,
      'translatable' => TRUE,
      'settings' => $def['settings'],
    ])->save();
    echo "Creado almacenamiento $name\n";
  }
}

$node_types = \Drupal::entityTypeManager()->getStorage('node_type')->loadMultiple();
foreach ($bundles as $bundle) {
  if (!isset($node_types[$bundle])) {
    echo "Tipo $bundle no existe, se omite\n";
    continue;
  }
  foreach ($instances as $name => $def) {
    if (!FieldConfig::loadByName('node', $bundle, $name)) {
      FieldConfig::create([
        'field_name' => $name,
        'entity_type' => 'node',
        'bundle' => $bundle,
        'label' => $def['label'],
        'description' => $def['description'],
        'translatable' => TRUE,
        'settings' => $def['settings'],
      ])->save();
      echo "Creado $name en $bundle\n";
    }
    $form = $display_repository->getFormDisplay('node', $bundle, 'default');
    if (!$form->getComponent($name)) {
      $form->setComponent($name, ['type' => $def['widget'], 'weight' => 50])->save();
      echo "Agregado $name al formulario de $bundle\n";
    }
  }
}

// Que el campo sea traducible en la configuración de idioma de contenido.
if (\Drupal::moduleHandler()->moduleExists('content_translation')) {
  $manager = \Drupal::service('content_translation.manager');
  foreach ($bundles as $bundle) {
    if (isset($node_types[$bundle]) && $manager->isEnabled('node', $bundle)) {
      foreach (array_keys($instances) as $name) {
        $field = FieldConfig::loadByName('node', $bundle, $name);
        if ($field && !$field->isTranslatable()) {
          $field->setTranslatable(TRUE)->save();
        }
      }
    }
  }
}

echo "Listo\n";
