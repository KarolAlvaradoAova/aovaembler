import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Función para determinar la ruta correcta de la base de datos
function getDatabasePath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  
  // Detectar si estamos ejecutando desde la carpeta server o desde la raíz
  const currentDir = process.cwd();
  const isInServerDir = currentDir.endsWith('server');
  
  if (isInServerDir) {
    return './database/logistica_renovated.db';
  } else {
    return './server/database/logistica_renovated.db';
  }
}

// Configuración del servidor
export const SERVER_CONFIG = {
  // Server Configuration
  PORT: parseInt(process.env.BACKEND_PORT || '4000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  DB_PATH: getDatabasePath(),
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Google Maps Configuration
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBbqyucvWlUgQIT8iB9fhORgBZAt4HllU0',
  
  // WebSocket Configuration
  WS_PORT: parseInt(process.env.WS_PORT || '4001'),
  
  // Tracking Configuration
  TRACKING_UPDATE_INTERVAL: parseInt(process.env.TRACKING_UPDATE_INTERVAL || '5000'),
  
  // Google Maps Services Configuration
  MAPS_CONFIG: {
    // Configuración para Google Maps Services
    TIMEOUT: 10000, // 10 segundos
    RETRIES: 3,
    
    // Configuración de geocodificación
    GEOCODING: {
      REGION: 'mx', // México
      LANGUAGE: 'es', // Español
    },
    
    // Configuración de direcciones
    DIRECTIONS: {
      REGION: 'mx',
      LANGUAGE: 'es',
      UNITS: 'metric' as const,
      AVOID: ['tolls'] as const, // Evitar casetas por defecto
    },
    
    // Configuración de optimización de rutas
    ROUTE_OPTIMIZATION: {
      OPTIMIZE_WAYPOINTS: true,
      ALTERNATIVES: false,
      TRAFFIC_MODEL: 'best_guess' as const,
    },
  },
} as const;

// Función para validar que la configuración esté completa
export function validateServerConfig() {
  const missing: string[] = [];
  
  if (!SERVER_CONFIG.GOOGLE_MAPS_API_KEY || SERVER_CONFIG.GOOGLE_MAPS_API_KEY.includes('your_google_maps_api_key_here')) {
    missing.push('GOOGLE_MAPS_API_KEY');
  }
  
  if (!SERVER_CONFIG.DB_PATH) {
    missing.push('DB_PATH');
  }
  
  if (missing.length > 0) {
    console.warn('⚠️ Configuración del servidor incompleta. Variables faltantes:', missing);
    console.warn('📝 Usando valores por defecto para desarrollo');
  } else {
    console.log('✅ Configuración del servidor cargada correctamente');
    console.log(`🗺️  Google Maps API configurada (key termina en: ...${SERVER_CONFIG.GOOGLE_MAPS_API_KEY.slice(-4)})`);
  }
  
  return missing.length === 0;
}

// Exportar solo la API key para fácil acceso
export const GOOGLE_MAPS_API_KEY = SERVER_CONFIG.GOOGLE_MAPS_API_KEY; 