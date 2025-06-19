// Configuración del cliente para componentes React
export const CLIENT_CONFIG = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  API_PORT: import.meta.env.VITE_API_PORT || 4000,
  
  // Google Maps Configuration
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBbqyucvWlUgQIT8iB9fhORgBZAt4HllU0',
  
  // Real-time Tracking Configuration
  TRACKING_UPDATE_INTERVAL: parseInt(import.meta.env.VITE_TRACKING_UPDATE_INTERVAL || '5000'),
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:4001',
  
  // Application Settings
  APP_NAME: 'Embler 3.0',
  APP_VERSION: '3.0.0',
  
  // Google Maps Settings
  DEFAULT_CENTER: { lat: 19.4326, lng: -99.1332 }, // Ciudad de México
  DEFAULT_ZOOM: 11,
  
  // Map Markers Colors
  MARKER_COLORS: {
    REPARTIDOR_DISPONIBLE: '#4ade80', // verde
    REPARTIDOR_EN_RUTA: '#f59e0b',    // amarillo
    REPARTIDOR_ENTREGANDO: '#ef4444', // rojo
    SUCURSAL: '#3b82f6',              // azul
    CLIENTE: '#8b5cf6',               // púrpura
  },
} as const;

// Función para validar que la configuración esté completa
export function validateConfig() {
  const requiredVars = [
    'GOOGLE_MAPS_API_KEY',
    'API_BASE_URL',
  ];
  
  const missing: string[] = [];
  
  if (!CLIENT_CONFIG.GOOGLE_MAPS_API_KEY || CLIENT_CONFIG.GOOGLE_MAPS_API_KEY.includes('your_google_maps_api_key_here')) {
    missing.push('VITE_GOOGLE_MAPS_API_KEY');
  }
  
  if (!CLIENT_CONFIG.API_BASE_URL) {
    missing.push('VITE_API_BASE_URL');
  }
  
  if (missing.length > 0) {
    console.warn('⚠️ Configuración incompleta. Variables faltantes:', missing);
    console.warn('📝 Usando valores por defecto para desarrollo');
  } else {
    console.log('✅ Configuración del cliente cargada correctamente');
    console.log(`🗺️  Google Maps API configurada (key termina en: ...${CLIENT_CONFIG.GOOGLE_MAPS_API_KEY.slice(-4)})`);
  }
  
  return missing.length === 0;
}

// Exportar solo la API key para fácil acceso
export const GOOGLE_MAPS_API_KEY = CLIENT_CONFIG.GOOGLE_MAPS_API_KEY; 