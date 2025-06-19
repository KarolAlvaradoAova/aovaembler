// Constantes compartidas entre frontend y backend

export const API_ENDPOINTS = {
  // Pedidos
  PEDIDOS: '/api/pedidos',
  PEDIDO_BY_ID: (id: number) => `/api/pedidos/${id}`,
  PEDIDO_PRODUCTOS: (id: number) => `/api/pedidos/${id}/productos`,
  PEDIDO_COMPLETO: (id: number) => `/api/pedidos/${id}/completo`,

  // Repartidores
  REPARTIDORES: '/api/repartidores',
  REPARTIDOR_BY_ID: (id: number) => `/api/repartidores/${id}`,
  REPARTIDOR_LOCATION: (id: number) => `/api/repartidores/${id}/location`,
  TRACKING_ALL: '/api/repartidores/tracking/all',

  // Rutas
  ROUTES_OPTIMIZE: '/api/routes/optimize',
  ROUTES_ACTIVE: (id: number) => `/api/routes/active/${id}`,

  // Sucursales
  SUCURSALES: '/api/sucursales',

  // Clientes
  CLIENTES: '/api/clientes',

  // Almacenistas
  ALMACENISTAS: '/api/almacenistas',

  // Incidencias
  INCIDENCIAS: '/api/incidencias',
} as const;

export const SUCURSALES = {
  SATELITE: 'Satélite',
  METEPEC: 'Metepec',
  LINDAVISTA: 'Lindavista',
} as const;

export const ESTADOS_PEDIDO = {
  PENDIENTE: 'pendiente',
  PREPARANDO: 'preparando',
  EN_RUTA: 'en_ruta',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
} as const;

export const ESTADOS_REPARTIDOR = {
  DISPONIBLE: 'disponible',
  EN_RUTA: 'en_ruta',
  ENTREGANDO: 'entregando',
} as const;

export const TIPOS_INCIDENCIA = {
  RETRASO: 'retraso',
  DIRECCION_INCORRECTA: 'direccion_incorrecta',
  CLIENTE_AUSENTE: 'cliente_ausente',
  PRODUCTO_DANADO: 'producto_dañado',
  OTRO: 'otro',
} as const;

export const TIPOS_USUARIO = {
  ADMIN: 'admin',
  REPARTIDOR: 'repartidor',
  ALMACENISTA: 'almacenista',
} as const;

// Configuración de la aplicación
export const APP_CONFIG = {
  NAME: 'Embler 2.0',
  VERSION: '2.0.0',
  DESCRIPTION: 'Sistema de gestión logística',
  
  // Puertos por defecto
  FRONTEND_PORT: 5173,
  BACKEND_PORT: 4000,
  WS_PORT: 4001,

  // Intervalos de actualización (ms)
  TRACKING_UPDATE_INTERVAL: 5000,
  MAP_UPDATE_INTERVAL: 3000,
  METRICS_UPDATE_INTERVAL: 30000,

  // Límites
  MAX_PEDIDOS_POR_RUTA: 15,
  MAX_DISTANCIA_ENTREGA_KM: 50,
  TIMEOUT_API_MS: 10000,
} as const;

// Usuarios de demostración
export const DEMO_USERS = {
  ADMIN: [
    { username: 'admin', password: 'admin123', nombre: 'Administrador' },
  ],
  ALMACENISTAS: [
    { username: 'pedro', password: 'almacen1', nombre: 'Pedro García' },
    { username: 'lucia', password: 'almacen2', nombre: 'Lucía Fernández' },
    { username: 'roberto', password: 'almacen3', nombre: 'Roberto Díaz' },
  ],
  REPARTIDORES: [
    { username: 'juan', password: 'reparto1', nombre: 'Juan Pérez' },
    { username: 'ana', password: 'reparto2', nombre: 'Ana López' },
    { username: 'carlos', password: 'reparto3', nombre: 'Carlos Ruiz' },
    { username: 'maria', password: 'reparto4', nombre: 'María Torres' },
  ],
} as const;

// Coordenadas de las sucursales
export const SUCURSALES_COORDENADAS = {
  [SUCURSALES.SATELITE]: { lat: 19.5092, lng: -99.2386 },
  [SUCURSALES.METEPEC]: { lat: 19.2664, lng: -99.6074 },
  [SUCURSALES.LINDAVISTA]: { lat: 19.4882, lng: -99.1276 },
} as const;

// Configuración de Google Maps
export const GOOGLE_MAPS_CONFIG = {
  DEFAULT_CENTER: { lat: 19.4326, lng: -99.1332 }, // Ciudad de México
  DEFAULT_ZOOM: 11,
  MARKER_COLORS: {
    REPARTIDOR_DISPONIBLE: '#4ade80', // verde
    REPARTIDOR_EN_RUTA: '#f59e0b',    // amarillo
    REPARTIDOR_ENTREGANDO: '#ef4444', // rojo
    SUCURSAL: '#3b82f6',              // azul
    CLIENTE: '#8b5cf6',               // púrpura
  },
} as const;

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.',
  UNAUTHORIZED: 'No tienes autorización para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  VALIDATION_ERROR: 'Los datos ingresados no son válidos.',
  SERVER_ERROR: 'Error interno del servidor. Intenta nuevamente.',
  TIMEOUT: 'La operación tardó demasiado. Intenta nuevamente.',
} as const;

// Patrones de validación
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+52|52)?[\s\-]?(\d{2})[\s\-]?(\d{4})[\s\-]?(\d{4})$/,
  POSTAL_CODE: /^\d{5}$/,
  COORDINATES: {
    LAT: /^-?([1-8]?\d(\.\d+)?|90(\.0+)?)$/,
    LNG: /^-?((1[0-7]\d)|([1-9]?\d))(\.\d+)?$/,
  },
} as const; 