// Configuración compartida para Google Maps
export const GOOGLE_MAPS_SHARED_CONFIG = {
  // API Key (se establecerá desde el entorno correspondiente)
  API_KEY: 'AIzaSyBbqyucvWlUgQIT8iB9fhORgBZAt4HllU0',
  
  // Configuración del mapa
  DEFAULT_CENTER: { lat: 19.4326, lng: -99.1332 }, // Ciudad de México
  DEFAULT_ZOOM: 11,
  MAX_ZOOM: 18,
  MIN_ZOOM: 8,
  
  // Estilos del mapa
  MAP_STYLES: {
    // Estilo oscuro para combinar con el tema de la aplicación
    DARK: [
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#263c3f' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9a76' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#38414e' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#212a37' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca5b3' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#746855' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1f2835' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f3d19c' }]
      },
      {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }]
      },
      {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#17263c' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#515c6d' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#17263c' }]
      }
    ]
  },
  
  // Configuración de marcadores
  MARKERS: {
    // Colores de los marcadores
    COLORS: {
      REPARTIDOR_DISPONIBLE: '#4ade80', // verde
      REPARTIDOR_EN_RUTA: '#f59e0b',    // amarillo
      REPARTIDOR_ENTREGANDO: '#ef4444', // rojo
      SUCURSAL: '#3b82f6',              // azul
      CLIENTE: '#8b5cf6',               // púrpura
      ORIGEN: '#10b981',                // verde esmeralda
      DESTINO: '#dc2626',               // rojo
    },
    
    // Tamaños de los marcadores
    SIZES: {
      SMALL: { width: 24, height: 24 },
      MEDIUM: { width: 32, height: 32 },
      LARGE: { width: 48, height: 48 },
    },
    
    // Iconos SVG para marcadores personalizados
    ICONS: {
      TRUCK: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zM9 6c0-1.7 1.3-3 3-3s3 1.3 3 3v2H9V6zm9 12H6v-8h12v8z"/>
      </svg>`,
      
      LOCATION: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>`,
      
      WAREHOUSE: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 10 5.16-.05 9-4.45 9-10V7l-10-5z"/>
      </svg>`
    }
  },
  
  // Configuración de rutas
  ROUTES: {
    STROKE_COLORS: {
      ACTIVE: '#3b82f6',     // azul
      COMPLETED: '#10b981',  // verde
      PENDING: '#6b7280',    // gris
      OPTIMIZED: '#f59e0b',  // amarillo
    },
    STROKE_WEIGHT: 4,
    STROKE_OPACITY: 0.8,
  },
  
  // Configuración para servicios de Google Maps
  SERVICES: {
    // Geocodificación
    GEOCODING: {
      REGION: 'mx',
      LANGUAGE: 'es',
      BOUNDS: {
        // Limitar búsquedas a México
        northeast: { lat: 32.7187629, lng: -86.5887108 },
        southwest: { lat: 14.3886243, lng: -118.4662622 }
      }
    },
    
    // Direcciones y rutas
    DIRECTIONS: {
      REGION: 'mx',
      LANGUAGE: 'es',
      UNITS: 'metric' as const,
      AVOID: ['tolls'] as const,
      TRAVEL_MODE: 'DRIVING' as const,
      TRAFFIC_MODEL: 'best_guess' as const,
    },
    
    // Optimización de rutas
    ROUTE_OPTIMIZATION: {
      OPTIMIZE_WAYPOINTS: true,
      PROVIDE_ROUTE_ALTERNATIVES: false,
      MAX_WAYPOINTS: 23, // Límite de Google Maps API
    },
    
    // Places API
    PLACES: {
      RADIUS: 50000, // 50km
      TYPES: ['establishment', 'geocode'],
    }
  },
  
  // Límites y configuraciones de la aplicación
  LIMITS: {
    MAX_MARKERS_PER_MAP: 100,
    MAX_ROUTES_PER_MAP: 10,
    UPDATE_INTERVAL: 5000, // 5 segundos
    GEOCODING_CACHE_TIME: 3600000, // 1 hora en ms
  }
} as const;

// Coordenadas específicas de las sucursales de Embler
export const SUCURSALES_COORDS = {
  'Satélite': { lat: 19.5092, lng: -99.2386 },
  'Metepec': { lat: 19.2664, lng: -99.6074 },
  'Lindavista': { lat: 19.4882, lng: -99.1276 },
} as const;

// Función utilitaria para crear marcadores consistentes
export function createMarkerConfig(type: keyof typeof GOOGLE_MAPS_SHARED_CONFIG.MARKERS.COLORS, size: keyof typeof GOOGLE_MAPS_SHARED_CONFIG.MARKERS.SIZES = 'MEDIUM') {
  return {
    color: GOOGLE_MAPS_SHARED_CONFIG.MARKERS.COLORS[type],
    size: GOOGLE_MAPS_SHARED_CONFIG.MARKERS.SIZES[size],
  };
}

// Función para validar API key
export function isValidApiKey(apiKey: string): boolean {
  return Boolean(apiKey) && 
         apiKey.length > 20 && 
         apiKey.startsWith('AIza') && 
         !apiKey.includes('your_google_maps_api_key_here');
} 