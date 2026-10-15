/* Configuración de la API de visitbogota.co */
window.DTV_CONFIG = {
  // Dentro de visitbogota.co la API va en el mismo dominio (sin CORS).
  // (En el repo disena-tu-viaje, server.py la reenvía desde /api.)
  apiBase: '/es/api/v3',

  // Listado de la vista inicial (sin filtros)
  imperdibles: 'imperdibles',

  // Listado de la API para cada categoría del mapa:
  //   filtros → {apiBase}/listado/{endpoint}/filtros
  //   lugares → {apiBase}/listado/{endpoint}?{key}={id},{id}&{key}={id}
  endpoints: {
    atractivos: 'atractivos',
    hoteles: 'hoteles',
    ofertas: 'ofertas',
    restaurantes: 'restaurantes'
  },

  // Paginación de los listados: la API acepta hasta 100 por página
  pageSize: 100,
  maxPages: 10
};
