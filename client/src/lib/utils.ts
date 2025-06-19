import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_CONFIG, apiGet, apiPatch, apiPost, buildApiUrl } from '@/config/api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fetchPedidos() {
  return await apiGet(API_CONFIG.ENDPOINTS.PEDIDOS);
}

export async function fetchRepartidores() {
  return await apiGet(API_CONFIG.ENDPOINTS.REPARTIDORES);
}

export async function fetchSucursales() {
  return await apiGet(API_CONFIG.ENDPOINTS.SUCURSALES);
}

export async function fetchAlmacenistas() {
  return await apiGet(API_CONFIG.ENDPOINTS.ALMACENISTAS);
}

export async function fetchClientes() {
  return await apiGet(API_CONFIG.ENDPOINTS.CLIENTES);
}

export async function fetchIncidencias() {
  return await apiGet(API_CONFIG.ENDPOINTS.INCIDENCIAS);
}

// Nueva función para actualizar estado de pedido
export async function updatePedidoStatus(pedidoId: string | number, newStatus: string) {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.PEDIDOS}/${pedidoId}`;
    const result = await apiPatch(endpoint, { estado: newStatus });
    console.log('✅ Pedido actualizado en backend:', result);
    return result;
  } catch (error) {
    console.error('❌ Error actualizando pedido:', error);
    throw error;
  }
}

// === NUEVAS FUNCIONES PARA GOOGLE MAPS Y TRACKING ===

// Función para obtener ubicación en tiempo real de un repartidor
export async function fetchRepartidorLocation(repartidorId: string | number) {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.REPARTIDORES}/${repartidorId}/location`;
    return await apiGet(endpoint);
  } catch (error) {
    console.error('❌ Error obteniendo ubicación del repartidor:', error);
    throw error;
  }
}

// Función para obtener tracking de todos los repartidores
export async function fetchAllRepartidoresTracking() {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.REPARTIDORES}/tracking/all`;
    return await apiGet(endpoint);
  } catch (error) {
    console.error('❌ Error obteniendo tracking de repartidores:', error);
    throw error;
  }
}

// Función para actualizar ubicación de repartidor (simulación desde frontend)
export async function updateRepartidorLocation(
  repartidorId: string | number,
  location: { lat: number; lng: number; status?: string; speed?: number }
) {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.REPARTIDORES}/${repartidorId}/location`;
    return await apiPost(endpoint, location);
  } catch (error) {
    console.error('❌ Error actualizando ubicación:', error);
    throw error;
  }
}

// === FUNCIONES NUEVAS PARA RUTAS PERSISTENTES ===

// Función para obtener la ruta activa de un repartidor
export async function fetchRepartidorActiveRoute(repartidorId: string | number) {
  try {
    const endpoint = buildApiUrl('routes/active', repartidorId);
    return await apiGet(endpoint);
  } catch (error) {
    console.error('❌ Error obteniendo ruta activa:', error);
    throw error;
  }
}

// Función para obtener todas las rutas activas
export async function fetchAllActiveRoutes() {
  try {
    const endpoint = buildApiUrl('routes/all-active');
    return await apiGet(endpoint);
  } catch (error) {
    console.error('❌ Error obteniendo todas las rutas activas:', error);
    throw error;
  }
}

// Función para obtener el estado de ruta de un repartidor
export async function fetchRepartidorRouteStatus(repartidorId: string | number) {
  try {
    const endpoint = buildApiUrl('routes/status', repartidorId);
    return await apiGet(endpoint);
  } catch (error) {
    console.error('❌ Error obteniendo estado de ruta:', error);
    throw error;
  }
}

// Función para auto-optimizar pedidos de un repartidor
export async function autoOptimizeRepartidorPedidos(repartidorId: string | number) {
  try {
    const endpoint = buildApiUrl('routes/auto-optimize', repartidorId);
    return await apiPost(endpoint, {});
  } catch (error) {
    console.error('❌ Error en auto-optimización:', error);
    throw error;
  }
}

// Función para optimizar ruta de entrega (mejorada con persistencia)
export async function optimizeDeliveryRoute(
  repartidorId: string,
  sucursalOrigen: string,
  pedidosIds: string[],
  vehicleType: string = 'car'
) {
  try {
    const endpoint = buildApiUrl('routes/optimize');
    return await apiPost(endpoint, {
      repartidorId,
      sucursalOrigen,
      pedidosIds,
      vehicleType
    });
  } catch (error) {
    console.error('❌ Error optimizando ruta:', error);
    throw error;
  }
}

// Función para obtener ruta activa de un repartidor (mantenida para compatibilidad)
export async function fetchActiveRoute(repartidorId: string | number) {
  try {
    const endpoint = buildApiUrl('routes/active', repartidorId);
    return await apiGet(endpoint);
  } catch (error) {
    console.error('❌ Error obteniendo ruta activa:', error);
    throw error;
  }
}

// === FUNCIONES PARA ACCESO MODULAR ===

// Interface para que otros módulos accedan a información de rutas
export const RouteAccess = {
  // Obtener ruta activa de un repartidor
  async getRepartidorRoute(repartidorId: number) {
    return await fetchRepartidorActiveRoute(repartidorId);
  },
  
  // Obtener todas las rutas activas
  async getAllRoutes() {
    return await fetchAllActiveRoutes();
  },
  
  // Obtener progreso de una ruta específica
  async getRouteProgress(repartidorId: number) {
    const routeData = await fetchRepartidorActiveRoute(repartidorId);
    if (!routeData || !routeData.route) return null;
    return routeData.progress;
  },
  
  // Obtener ETA de una ruta
  async getRouteETA(repartidorId: number) {
    const routeData = await fetchRepartidorActiveRoute(repartidorId);
    if (!routeData || !routeData.route) return null;
    return routeData.eta;
  },
  
  // Obtener estado de ruta
  async getRouteStatus(repartidorId: number) {
    const statusData = await fetchRepartidorRouteStatus(repartidorId);
    return statusData ? statusData.status : 'no_route';
  },
  
  // Verificar si un repartidor tiene ruta activa
  async hasActiveRoute(repartidorId: number) {
    const status = await this.getRouteStatus(repartidorId);
    return ['planned', 'active', 'paused'].includes(status);
  },
  
  // Obtener próxima parada de un repartidor
  async getNextStop(repartidorId: number) {
    const routeData = await fetchRepartidorActiveRoute(repartidorId);
    if (!routeData || !routeData.route) return null;
    
    const route = routeData.route;
    const nextStopIndex = route.current_stop_index;
    return route.stops[nextStopIndex] || null;
  },
  
  // Trigger auto-optimización para un repartidor
  async triggerAutoOptimization(repartidorId: number) {
    return await autoOptimizeRepartidorPedidos(repartidorId);
  }
};

// Utilidades para Google Maps

export function formatCoordinatesForMaps(lat: number, lng: number): string {
  return `${lat},${lng}`;
}

export function generateGoogleMapsDirectionsUrl(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: { lat: number; lng: number }[]
): string {
  const baseUrl = 'https://www.google.com/maps/dir/';
  let url = `${baseUrl}${formatCoordinatesForMaps(origin.lat, origin.lng)}/`;
  
  if (waypoints && waypoints.length > 0) {
    const waypointStr = waypoints
      .map(wp => formatCoordinatesForMaps(wp.lat, wp.lng))
      .join('/');
    url += `${waypointStr}/`;
  }
  
  url += formatCoordinatesForMaps(destination.lat, destination.lng);
  return url;
}

export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${Math.round(remainingMinutes)}min`;
}

// === NUEVAS FUNCIONES PARA RUTAS DINÁMICAS ===

// Obtener info y ruta actual de un repartidor
export async function fetchRepartidorLive(repartidorId: string | number) {
  try {
    const endpoint = `/api/repartidores/${repartidorId}/live`;
    return await apiGet(endpoint);
  } catch (error) {
    console.error('❌ Error obteniendo live de repartidor:', error);
    throw error;
  }
}

// Obtener info y rutas actuales de todos los repartidores
export async function fetchAllRepartidoresLive() {
  try {
    const endpoint = `/api/repartidores/live`;
    return await apiGet(endpoint);
  } catch (error) {
    console.error('❌ Error obteniendo live de todos los repartidores:', error);
    throw error;
  }
}

// Función para completar entrega y actualizar ruta
export async function completeDelivery(repartidorId: string | number, pedidoId: string | number, deliveryEvidence?: string) {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.REPARTIDORES}/${repartidorId}/complete-delivery`;
    return await apiPost(endpoint, {
      pedidoId,
      deliveryEvidence
    });
  } catch (error) {
    console.error('❌ Error completando entrega:', error);
    throw error;
  }
}

// Función para vaciar ruta del repartidor
export async function clearRepartidorRoute(repartidorId: string | number) {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.REPARTIDORES}/${repartidorId}/clear-route`;
    return await apiPost(endpoint, {});
  } catch (error) {
    console.error('❌ Error vaciando ruta:', error);
    throw error;
  }
}

// Función para actualizar estado de parada en ruta
export async function updateStopStatus(
  repartidorId: string | number, 
  pedidoId: string | number, 
  stopStatus: string, 
  deliveryEvidence?: string
) {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.REPARTIDORES}/${repartidorId}/update-stop-status`;
    return await apiPost(endpoint, {
      pedidoId,
      stopStatus,
      deliveryEvidence
    });
  } catch (error) {
    console.error('❌ Error actualizando estado de parada:', error);
    throw error;
  }
}
