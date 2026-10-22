/* Categorías del mapa: etiqueta, color e ícono. Los lugares vienen de la API (ver config.js).
   Las etiquetas pasan por Drupal.t (traducciones en translations/en.po). */

window.CATEGORIES = {
  atractivos:   { label: Drupal.t('Atractivos turísticos'), short: Drupal.t('Atractivo'),   color: '#FF3108',
                  glyph: '<path d="M3 20h18M5 20v-9M19 20v-9M9.7 20v-9M14.3 20v-9M2.5 9 12 4l9.5 5z"/>' },
  hoteles:      { label: Drupal.t('Hoteles'),               short: Drupal.t('Hotel'),       color: '#1F4E9C',
                  glyph: '<path d="M3 19V5M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>' },
  ofertas:      { label: Drupal.t('Ofertas'),               short: Drupal.t('Oferta'),      color: '#E07B00',
                  glyph: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>' },
  restaurantes: { label: Drupal.t('Restaurantes'),          short: Drupal.t('Restaurante'), color: '#8E3FA8',
                  glyph: '<path d="M7 2v20M4 2v6a3 3 0 0 0 6 0V2M18 22V2c-2.8 1.6-4.5 4.4-4.5 8.5V14H18"/>' }
};
