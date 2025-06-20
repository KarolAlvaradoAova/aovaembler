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
    const payload = { estado: newStatus };
    
    console.log('🔄 Actualizando pedido:', {
      pedidoId,
      newStatus,
      endpoint,
      payload
    });
    
    const result = await apiPatch(endpoint, payload);
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
    try {
      const route = await this.getRepartidorRoute(repartidorId);
      if (!route || route.stops.length === 0) {
        return null;
      }
      
      // Buscar la primera parada pendiente
      const pendingStop = route.stops.find((stop: any) => 
        stop.tipo === 'parada' && stop.status === 'pendiente'
      );
      
      return pendingStop || null;
    } catch (error) {
      console.error('❌ Error obteniendo siguiente parada:', error);
      return null;
    }
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

// === FUNCIONES PARA CARGAR DATOS DESDE CSV ===

// Función auxiliar para parsear una línea de CSV respetando las comillas
function parseCSVLine(line: string) {
  const values = [];
  let currentValue = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  values.push(currentValue.trim());
  return values.map(value => value.replace(/^"|"$/g, '').trim());
}

// Función para cargar pedidos desde pedidosdb.csv
export async function fetchPedidosFromCSV() {
  try {
    const response = await fetch('/data/csv dbs/pedidosdb.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    const pedidos = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = parseCSVLine(line);
        const pedido: any = {};
        headers.forEach((header, index) => {
          pedido[header.trim()] = values[index] || '';
        });
        return pedido;
      });
    
    return pedidos;
  } catch (error) {
    console.error('❌ Error cargando pedidos desde CSV:', error);
    return [];
  }
}

// Función para cargar usuarios desde users.csv
export async function fetchUsersFromCSV() {
  try {
    const response = await fetch('/data/csv dbs/users.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const users = lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(value => value.replace(/"/g, ''));
      const user: any = {};
      headers.forEach((header, index) => {
        user[header.trim()] = values[index]?.trim() || '';
      });
      return user;
    });
    
    return users;
  } catch (error) {
    console.error('❌ Error cargando usuarios desde CSV:', error);
    return [];
  }
}

// Función para cargar incidencias desde incidenciasdb.csv
export async function fetchIncidenciasFromCSV() {
  try {
    const response = await fetch('/data/csv dbs/incidenciasdb.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const incidencias = lines.slice(1).filter(line => line.trim()).map(line => {
      const values = parseCSVLine(line);
      const incidencia: any = {};
      headers.forEach((header, index) => {
        incidencia[header.trim()] = values[index] || '';
      });
      return incidencia;
    });
    
    return incidencias;
  } catch (error) {
    console.error('❌ Error cargando incidencias desde CSV:', error);
    return [];
  }
}

// === FUNCIONES PARA GPS TRACKING HÍBRIDO (6.2 + 7.6) ===

// Función para validar y corregir coordenadas
function validateAndFixCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  // Validar rangos de coordenadas válidas
  const isValidLat = lat >= -90 && lat <= 90;
  const isValidLng = lng >= -180 && lng <= 180;
  
  // Si ambas coordenadas están en rangos válidos, están correctas
  if (isValidLat && isValidLng) {
    return { lat, lng };
  }
  
  // Si están invertidas, intercambiarlas
  if (!isValidLat && !isValidLng) {
    return { lat: lng, lng: lat };
  }
  
  // Si solo una está en rango válido, asumir que están invertidas
  if (isValidLat && !isValidLng) {
    return { lat: lng, lng: lat };
  }
  
  if (!isValidLat && isValidLng) {
    return { lat: lng, lng: lat };
  }
  
  // Fallback: devolver las originales
  return { lat, lng };
}

// Función para cargar repartidores con rutas desde archivos JSON (compatible con 7.6)
export async function fetchRepartidoresWithRoutes() {
  try {
    // 1. Cargar usuarios repartidores desde CSV
    const users = await fetchUsersFromCSV();
    const repartidores = users.filter((u: any) => u.type_u === 'repartidor');
    
    // 2. Cargar pedidos para obtener estados actuales
    const pedidosAll = await fetchPedidosFromCSV();
    
    // 3. Para cada repartidor, cargar su ruta desde archivo JSON
    const repartidoresWithRoutes = await Promise.all(repartidores.map(async (repartidor: any) => {
      // Usar ubicación real del CSV si está disponible, sino usar ubicación por defecto
      let baseLocation;
      if (repartidor.lat && repartidor.lon) {
        baseLocation = { 
          lat: parseFloat(repartidor.lat), 
          lng: parseFloat(repartidor.lon) 
        };
      } else {
        // Ubicación por defecto en Ciudad de México si no hay datos
        baseLocation = { lat: 19.4326, lng: -99.1332 };
      }
      
      // Agregar pequeña variación aleatoria para simular movimiento
      const variation = 0.001;
      const ubicacion = {
        lat: baseLocation.lat + (Math.random() - 0.5) * variation,
        lng: baseLocation.lng + (Math.random() - 0.5) * variation,
        status: repartidor.sta_u || 'disponible',
        timestamp: new Date().toISOString()
      };

      // 4. Cargar ruta desde archivo JSON
      let ruta_actual = [];
      try {
        const routeRes = await fetch(`/data/routes/route_${repartidor.id_u}.json`);
        if (routeRes.ok) {
          const routeData = await routeRes.json();
          if (routeData.stops && routeData.stops.length > 0) {
            // Convertir stops del JSON a formato ruta_actual (compatible con 6.2)
            ruta_actual = routeData.stops.map((stop: any) => {
              // Validar y corregir coordenadas
              const fixedCoords = validateAndFixCoordinates(stop.lat, stop.lng);
              
              if (stop.type === 'origin') {
                return {
                  tipo: 'origen',
                  lat: fixedCoords.lat,
                  lng: fixedCoords.lng,
                  label: stop.address || 'Ubicación actual',
                  status: ubicacion.status,
                  timestamp: ubicacion.timestamp
                };
              } else if (stop.type === 'delivery') {
                // Buscar pedido correspondiente para obtener estado actual
                const pedido = pedidosAll.find((p: any) => String(p.id_p) === String(stop.pedido_id));
                return {
                  tipo: 'parada',
                  pedido_id: stop.pedido_id,
                  lat: fixedCoords.lat,
                  lng: fixedCoords.lng,
                  label: stop.address,
                  status: pedido ? pedido.sta_p : 'pendiente'
                };
              }
              return null;
            }).filter(Boolean);
            
            console.log(`✅ Ruta cargada para ${repartidor.name_u} con ${ruta_actual.length} paradas`);
          }
        }
      } catch (error) {
        console.error(`Error cargando ruta para ${repartidor.name_u}:`, error);
      }

      return {
        id: repartidor.id_u,
        nombre: repartidor.name_u,
        tipo_vehiculo: repartidor.vehi_u,
        ubicacion_actual: ubicacion,
        ruta_actual
      };
    }));

    return repartidoresWithRoutes;
  } catch (error) {
    console.error('❌ Error cargando repartidores con rutas:', error);
    throw error;
  }
}

// Función para obtener datos de tracking en formato compatible con 6.2
export async function fetchRepartidoresLive() {
  try {
    const repartidoresWithRoutes = await fetchRepartidoresWithRoutes();
    
    // Convertir a formato compatible con el tracking de 6.2
    const trackingData = repartidoresWithRoutes.map((r: any) => {
      const status = r.ubicacion_actual.status;
      let speed = 0;

      if (status === 'en_ruta' || status === 'entregando' || status === 'regresando') {
        speed = Math.floor(Math.random() * 40) + 20; // Velocidad simulada de 20 a 60 km/h
      }

      return {
        repartidorId: Number(r.id),
        nombre: r.nombre,
        tipo_vehiculo: r.tipo_vehiculo,
        location: {
          lat: r.ubicacion_actual.lat,
          lng: r.ubicacion_actual.lng,
          lastUpdate: r.ubicacion_actual.timestamp,
          status: status,
          speed: speed // Velocidad simulada más realista
        },
        isOnline: true,
        ruta_actual: r.ruta_actual
      };
    });

    return trackingData;
  } catch (error) {
    console.error('❌ Error obteniendo datos de tracking:', error);
    throw error;
  }
}

// Función para actualizar estado de una parada específica
export async function updateStopStatusInRoute(
  repartidorId: number,
  stopIndex: number,
  newStatus: string
) {
  try {
    // Importar el servicio de rutas
    const { googleRoutesService } = await import('./google-routes');
    
    // Actualizar estado en el servicio de rutas
    googleRoutesService.updateStopStatus(repartidorId, stopIndex, newStatus);
    
    // También actualizar en el CSV de pedidos si es necesario
    const pedidos = await fetchPedidosFromCSV();
    const route = googleRoutesService.getRoute(repartidorId);
    
    if (route && route.stops[stopIndex] && route.stops[stopIndex].pedido_id) {
      const pedidoId = route.stops[stopIndex].pedido_id;
      await updatePedidoStatus(pedidoId, newStatus);
    }
    
    console.log(`✅ Estado actualizado para parada ${stopIndex} del repartidor ${repartidorId}`);
  } catch (error) {
    console.error('❌ Error actualizando estado de parada:', error);
    throw error;
  }
}

// Función para obtener ruta específica de un repartidor
export async function getRepartidorRoute(repartidorId: number) {
  try {
    const { googleRoutesService } = await import('./google-routes');
    return googleRoutesService.getRoute(repartidorId);
  } catch (error) {
    console.error('❌ Error obteniendo ruta del repartidor:', error);
    return null;
  }
}

// Función para limpiar todas las rutas del mapa
export async function clearAllRoutes() {
  try {
    const { googleRoutesService } = await import('./google-routes');
    googleRoutesService.clearAllRoutes();
  } catch (error) {
    console.error('❌ Error limpiando rutas:', error);
  }
}

// Función para simular movimiento de repartidor
export function simulateRepartidorMovement(
  repartidorId: number,
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  steps: number = 10
) {
  const latStep = (targetLat - currentLat) / steps;
  const lngStep = (targetLng - currentLng) / steps;
  
  const positions = [];
  for (let i = 0; i <= steps; i++) {
    positions.push({
      lat: currentLat + (latStep * i),
      lng: currentLng + (lngStep * i),
      timestamp: new Date(Date.now() + (i * 1000)).toISOString()
    });
  }
  
  return positions;
}

// Función para calcular distancia entre dos puntos
export function calculateDistanceBetweenPoints(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Función para obtener el estado de un pedido desde CSV
export async function getPedidoStatus(pedidoId: string): Promise<string> {
  try {
    const pedidos = await fetchPedidosFromCSV();
    const pedido = pedidos.find((p: any) => String(p.id_p) === String(pedidoId));
    return pedido ? pedido.sta_p : 'pendiente';
  } catch (error) {
    console.error('❌ Error obteniendo estado del pedido:', error);
    return 'pendiente';
  }
}

// Función para actualizar estado de pedido en CSV (simulación)
export async function updatePedidoStatusInCSV(pedidoId: string, newStatus: string) {
  try {
    // En un sistema real, esto actualizaría el archivo CSV
    // Por ahora, solo simulamos la actualización
    console.log(`🔄 Simulando actualización de pedido ${pedidoId} a estado: ${newStatus}`);
    
    // También actualizar en el backend si está disponible
    await updatePedidoStatus(pedidoId, newStatus);
    
    return true;
  } catch (error) {
    console.error('❌ Error actualizando estado del pedido:', error);
    return false;
  }
}

// Función para obtener información completa de un repartidor
export async function getRepartidorInfo(repartidorId: number) {
  try {
    const users = await fetchUsersFromCSV();
    const repartidor = users.find((u: any) => u.id_u === repartidorId && u.type_u === 'repartidor');
    
    if (!repartidor) {
      throw new Error(`Repartidor ${repartidorId} no encontrado`);
    }
    
    // Obtener ruta activa
    const route = await getRepartidorRoute(repartidorId);
    
    return {
      ...repartidor,
      ruta_actual: route?.stops || []
    };
  } catch (error) {
    console.error('❌ Error obteniendo información del repartidor:', error);
    throw error;
  }
}

// Función para validar si un repartidor tiene ruta activa
export async function hasActiveRoute(repartidorId: number): Promise<boolean> {
  try {
    const route = await getRepartidorRoute(repartidorId);
    return !!(route !== null && route?.stops && route.stops.length > 0);
  } catch (error) {
    console.error('❌ Error validando ruta activa:', error);
    return false;
  }
}

// Función para marcar una parada como completada
export async function completeStop(
  repartidorId: number,
  stopIndex: number,
  deliveryEvidence?: string
) {
  try {
    // Actualizar estado de la parada
    await updateStopStatusInRoute(repartidorId, stopIndex, 'entregado');
    
    // Si hay evidencia de entrega, guardarla
    if (deliveryEvidence) {
      console.log(`📸 Evidencia de entrega guardada: ${deliveryEvidence}`);
    }
    
    console.log(`✅ Parada ${stopIndex} marcada como completada para repartidor ${repartidorId}`);
    return true;
  } catch (error) {
    console.error('❌ Error completando parada:', error);
    return false;
  }
}

// ✅ NUEVAS FUNCIONES PARA SERVICIO DE ESTADOS

// Función para obtener estados de todos los repartidores
export async function getRepartidoresStatus() {
  try {
    const endpoint = `${API_CONFIG.BASE_URL}/api/status/repartidores`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Error obteniendo estados');
    return await response.json();
  } catch (error) {
    console.error('❌ Error obteniendo estados de repartidores:', error);
    throw error;
  }
}

// Función para actualizar estado de todos los repartidores automáticamente
export async function updateAllRepartidorStatus() {
  try {
    const endpoint = `${API_CONFIG.BASE_URL}/api/status/repartidores/update-all`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error actualizando estados');
    return await response.json();
  } catch (error) {
    console.error('❌ Error actualizando estados de repartidores:', error);
    throw error;
  }
}

// Función para actualizar estado de un repartidor específico
export async function updateRepartidorStatus(repartidorId: string | number) {
  try {
    const endpoint = `${API_CONFIG.BASE_URL}/api/status/repartidores/${repartidorId}/update`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error actualizando estado del repartidor');
    return await response.json();
  } catch (error) {
    console.error('❌ Error actualizando estado del repartidor:', error);
    throw error;
  }
}

// Función para notificar entrega completada
export async function notifyDeliveryCompleted(repartidorId: string | number, pedidoId: string | number) {
  try {
    const endpoint = `${API_CONFIG.BASE_URL}/api/status/repartidores/${repartidorId}/delivery-completed`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidoId })
    });
    if (!response.ok) throw new Error('Error notificando entrega completada');
    return await response.json();
  } catch (error) {
    console.error('❌ Error notificando entrega completada:', error);
    throw error;
  }
}

// Función para notificar inicio de ruta
export async function notifyRouteStarted(repartidorId: string | number) {
  try {
    const endpoint = `${API_CONFIG.BASE_URL}/api/status/repartidores/${repartidorId}/route-started`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error notificando inicio de ruta');
    return await response.json();
  } catch (error) {
    console.error('❌ Error notificando inicio de ruta:', error);
    throw error;
  }
}
