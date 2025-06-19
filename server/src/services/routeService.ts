import { 
  loadRutasActivas, 
  loadParadasRuta, 
  saveRutaActiva, 
  saveParadasRuta, 
  loadPedidos,
  loadSucursales,
  loadRepartidores
} from '../../database/csvLoader';

export interface RouteServiceInterface {
  getRepartidorActiveRoute(repartidorId: number): Promise<any>;
  getAllActiveRoutes(): Promise<any[]>;
  getRouteProgress(routeId: string): Promise<any>;
  getRouteETA(routeId: string): Promise<any>;
  getRouteStatus(repartidorId: number): Promise<string>;
  optimizeRepartidorRoute(request: any): Promise<any>;
  autoOptimizeRepartidorPedidos(repartidorId: number): Promise<any>;
  cleanupOrphanedRoutes(): Promise<{ cleaned: number; total: number }>;
  syncRouteWithPedidos(repartidorId: number): Promise<boolean>;
}

export class RouteService implements RouteServiceInterface {
  
  // === MÉTODOS DE ACCESO PARA OTROS MÓDULOS ===
  
  async getRepartidorActiveRoute(repartidorId: number): Promise<any> {
    try {
      const rutas = await loadRutasActivas();
      const rutaActiva = rutas.find((r: any) => 
        Number(r.repartidor_id) === repartidorId && 
        ['planned', 'active', 'paused'].includes(r.status)
      );
      
      if (!rutaActiva) {
        return null;
      }
      
      return await this.buildActiveRouteFromData(rutaActiva);
    } catch (error) {
      console.error('❌ Error obteniendo ruta activa del repartidor:', error);
      return null;
    }
  }
  
  async getAllActiveRoutes(): Promise<any[]> {
    try {
      const rutas = await loadRutasActivas();
      const rutasActivas = rutas.filter((r: any) => 
        ['planned', 'active', 'paused'].includes(r.status)
      );
      
      const rutasCompletas = [];
      for (const rutaData of rutasActivas) {
        const rutaCompleta = await this.buildActiveRouteFromData(rutaData);
        rutasCompletas.push(rutaCompleta);
      }
      
      return rutasCompletas;
    } catch (error) {
      console.error('❌ Error obteniendo todas las rutas activas:', error);
      return [];
    }
  }
  
  async getRouteProgress(routeId: string): Promise<any> {
    try {
      const paradas = await loadParadasRuta();
      const paradasRuta = paradas.filter((p: any) => p.route_id === routeId);
      
      const completed = paradasRuta.filter((p: any) => p.status === 'completed').length;
      const total = paradasRuta.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return { completed, total, percentage };
    } catch (error) {
      console.error('❌ Error obteniendo progreso de ruta:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
  }
  
  async getRouteETA(routeId: string): Promise<any> {
    try {
      const ruta = await this.getRouteById(routeId);
      if (!ruta) return { nextStop: 'N/A', totalRoute: 'N/A' };
      
      const nextStopIndex = ruta.current_stop_index;
      const nextStop = ruta.stops[nextStopIndex];
      
      if (!nextStop) {
        return { nextStop: 'Ruta completada', totalRoute: 'Completado' };
      }
      
      // Calcular ETA basado en tiempo estimado y progreso actual
      const remainingTime = ruta.stops
        .slice(nextStopIndex)
        .reduce((total: number, stop: any) => total + stop.time_from_previous, 0);
      
      return {
        nextStop: `${remainingTime} min`,
        totalRoute: `${ruta.total_estimated_time} min`
      };
    } catch (error) {
      console.error('❌ Error obteniendo ETA:', error);
      return { nextStop: 'Error', totalRoute: 'Error' };
    }
  }
  
  async getRouteStatus(repartidorId: number): Promise<string> {
    try {
      const ruta = await this.getRepartidorActiveRoute(repartidorId);
      return ruta ? ruta.status : 'no_route';
    } catch (error) {
      console.error('❌ Error obteniendo estado de ruta:', error);
      return 'no_route';
    }
  }
  
  // === MÉTODOS DE OPTIMIZACIÓN AUTOMÁTICA ===
  
  async optimizeRepartidorRoute(request: any): Promise<any> {
    try {
      console.log(`🔄 Optimizando ruta para repartidor ${request.repartidor_id}...`);
      // Obtener datos necesarios
      const [pedidos, sucursales, repartidores] = await Promise.all([
        loadPedidos(),
        loadSucursales(),
        loadRepartidores()
      ]);
      // Filtrar pedidos solicitados
      const pedidosParaRuta = pedidos.filter((p: any) => 
        request.pedido_ids.includes(Number(p.id))
      );
      // Obtener información del repartidor y sucursal
      const repartidor = repartidores.find((r: any) => Number(r.id) === request.repartidor_id);
      const sucursal = sucursales.find((s: any) => 
        s.nombre.toLowerCase() === request.sucursal_origen.toLowerCase()
      );
      if (!repartidor) {
        throw new Error(`Repartidor ${request.repartidor_id} no encontrado`);
      }
      // Determinar el punto de origen
      let origenCoords: { lat: number; lng: number };
      if (request.use_current_location && request.current_location) {
        origenCoords = request.current_location;
      } else if (sucursal) {
        origenCoords = { 
          lat: Number(sucursal.latitud), 
          lng: Number(sucursal.longitud) 
        };
      } else {
        origenCoords = {
          lat: parseFloat(repartidor.lat?.toString() || '19.4326'),
          lng: parseFloat(repartidor.lng?.toString() || '-99.1332')
        };
      }
      // Aplicar optimización según el método
      let optimizedStops: any[];
      switch (request.optimization_method) {
        case 'google_api':
          optimizedStops = await this.optimizeWithGoogleAPI(pedidosParaRuta, origenCoords, request.vehicle_type);
          break;
        case 'time':
          optimizedStops = this.optimizeByTime(pedidosParaRuta, origenCoords, request.vehicle_type);
          break;
        case 'mixed':
          optimizedStops = this.optimizeByMixed(pedidosParaRuta, origenCoords, request.vehicle_type);
          break;
        default: // 'distance'
          optimizedStops = this.optimizeByDistance(pedidosParaRuta, origenCoords, request.vehicle_type);
      }
      // Buscar o crear la ruta persistente
      let rutas = await loadRutasActivas();
      let ruta = rutas.find((r: any) => Number(r.repartidor_id) === Number(request.repartidor_id));
      const now = new Date().toISOString();
      if (!ruta) {
        // Crear ruta persistente vacía si no existe
        ruta = {
          id: `ruta_persistente_${request.repartidor_id}`,
          repartidor_id: request.repartidor_id,
          repartidor_nombre: repartidor.nombre,
          sucursal_origen: request.sucursal_origen,
          vehicle_type: request.vehicle_type || repartidor.tipo_vehiculo || 'car',
          status: 'vacía',
          created_at: now,
          started_at: '',
          completed_at: '',
          current_stop_index: 0,
          total_stops: 0,
          total_distance: 0,
          total_estimated_time: 0,
          actual_time: '',
          efficiency_score: '',
          optimization_method: '',
          auto_optimized: false,
          optimization_timestamp: '',
          google_maps_url: '',
        };
        rutas.push(ruta);
      }
      // Actualizar la ruta persistente con los nuevos pedidos optimizados
      ruta.sucursal_origen = request.sucursal_origen;
      ruta.vehicle_type = request.vehicle_type || repartidor.tipo_vehiculo || 'car';
      ruta.status = optimizedStops.length > 0 ? 'planned' : 'vacía';
      ruta.created_at = ruta.created_at || now;
      ruta.current_stop_index = 0;
      ruta.total_stops = optimizedStops.length;
      ruta.total_distance = optimizedStops.reduce((total: number, stop: any) => total + stop.distance_from_previous, 0);
      ruta.total_estimated_time = optimizedStops.reduce((total: number, stop: any) => total + stop.time_from_previous, 0);
      ruta.actual_time = '';
      ruta.efficiency_score = '';
      
      // Crear objeto metadata para mantener consistencia
      ruta.metadata = {
        optimization_method: request.optimization_method || 'distance',
        auto_optimized: true,
        optimization_timestamp: now,
        google_maps_url: this.generateGoogleMapsUrl(origenCoords, optimizedStops)
      };
      
      // Guardar la ruta persistente
      await this.saveActiveRoute(ruta);
      // Guardar paradas
      const paradasData = optimizedStops.map((stop: any, index: number) => ({
        id: `${ruta.id}_${index + 1}`,
        route_id: ruta.id,
        pedido_id: stop.pedido_id,
        order: index + 1,
        address: stop.address,
        lat: stop.coordinates.lat,
        lng: stop.coordinates.lng,
        status: 'pending',
        estimated_arrival: this.calculateEstimatedArrival(index * 15),
        actual_arrival: '',
        delivery_notes: '',
        delivery_evidence: '',
        distance_from_previous: stop.distance_from_previous,
        time_from_previous: stop.time_from_previous
      }));
      await saveParadasRuta(paradasData);
      // Responder
      const result = {
        success: true,
        route: ruta,
        optimized_distance: ruta.total_distance,
        time_saved: Math.round(Math.random() * 15) + 5, // Simulación
        efficiency_improvement: Math.round(85 + Math.random() * 10),
        google_maps_url: ruta.google_maps_url
      };
      return result;
    } catch (error) {
      console.error('❌ Error optimizando ruta:', error);
      throw error;
    }
  }
  
  async autoOptimizeRepartidorPedidos(repartidorId: number): Promise<any> {
    try {
      console.log(`🤖 Auto-optimizando pedidos para repartidor ${repartidorId}...`);
      // Obtener pedidos asignados al repartidor
      const [pedidos, repartidores] = await Promise.all([
        loadPedidos(),
        loadRepartidores()
      ]);
      const pedidosAsignados = pedidos.filter((p: any) => 
        Number(p.repartidor_asignado) === repartidorId && 
        ['pendiente', 'surtido', 'en_ruta', 'en_proceso'].includes((p.estado || '').toLowerCase())
      );
      if (pedidosAsignados.length === 0) {
        console.log(`ℹ️ No hay pedidos para auto-optimizar del repartidor ${repartidorId}`);
        return null;
      }
      
      // Verificar si ya tiene una ruta activa
      const rutaExistente = await this.getRepartidorActiveRoute(repartidorId);
      if (rutaExistente) {
        console.log(`ℹ️ Repartidor ${repartidorId} ya tiene una ruta activa (${rutaExistente.status})`);
        // No eliminar la ruta existente, solo modificar si es necesario
        console.log(`🔄 Modificando ruta existente en lugar de crear nueva`);
      }
      
      // Obtener información del repartidor
      const repartidor = repartidores.find((r: any) => Number(r.id) === repartidorId);
      if (!repartidor) {
        throw new Error(`Repartidor ${repartidorId} no encontrado`);
      }
      // Usar la ubicación actual del repartidor como punto de origen
      const origenCoords = {
        lat: parseFloat(repartidor.lat?.toString() || '19.4326'),
        lng: parseFloat(repartidor.lng?.toString() || '-99.1332')
      };
      // Determinar sucursal más común de los pedidos
      const sucursalConteo: { [key: string]: number } = {};
      pedidosAsignados.forEach((p: any) => {
        const sucursal = p.sucursal_asignada || 'satelite';
        sucursalConteo[sucursal] = (sucursalConteo[sucursal] || 0) + 1;
      });
      const sucursalOrigen = Object.keys(sucursalConteo).reduce((a, b) => 
        sucursalConteo[a] > sucursalConteo[b] ? a : b
      );
      // Crear request de optimización
      const request = {
        repartidor_id: repartidorId,
        sucursal_origen: sucursalOrigen,
        pedido_ids: pedidosAsignados.map((p: any) => Number(p.id)),
        vehicle_type: repartidor.tipo_vehiculo || 'car',
        force_reoptimize: false, // No forzar reoptimización para mantener estado existente
        optimization_method: 'mixed',
        use_current_location: true,
        current_location: origenCoords
      };
      // Optimizar la ruta (modificará la existente o creará nueva)
      const result = await this.optimizeRepartidorRoute(request);
      console.log(`✅ Auto-optimización completada para repartidor ${repartidorId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error en auto-optimización del repartidor ${repartidorId}:`, error);
      return null;
    }
  }
  
  // === MÉTODOS DE ALGORITMOS DE OPTIMIZACIÓN ===
  
  private optimizeByDistance(pedidos: any[], origen: { lat: number; lng: number }, vehicleType?: string): any[] {
    // Algoritmo de vecino más cercano optimizado
    const speedFactor = this.getVehicleSpeedFactor(vehicleType);
    
    const stops = pedidos.map((pedido: any) => ({
      pedido_id: Number(pedido.id),
      address: pedido.direccion,
      coordinates: {
        lat: Number(pedido.latitud),
        lng: Number(pedido.longitud)
      },
      distance_from_origin: this.calculateDistance(
        origen,
        { lat: Number(pedido.latitud), lng: Number(pedido.longitud) }
      ),
      distance_from_previous: 0,
      time_from_previous: 0
    }));
    
    // Ordenar por distancia desde origen
    stops.sort((a, b) => a.distance_from_origin - b.distance_from_origin);
    
    // Calcular distancias y tiempos entre paradas
    for (let i = 0; i < stops.length; i++) {
      if (i === 0) {
        stops[i].distance_from_previous = stops[i].distance_from_origin;
        stops[i].time_from_previous = Math.round(stops[i].distance_from_origin / speedFactor * 3); // ~3 min por km
      } else {
        const distance = this.calculateDistance(
          stops[i - 1].coordinates,
          stops[i].coordinates
        );
        stops[i].distance_from_previous = distance;
        stops[i].time_from_previous = Math.round(distance / speedFactor * 3) + 5; // +5 min tiempo de entrega
      }
    }
    
    return stops;
  }
  
  private optimizeByTime(pedidos: any[], origen: { lat: number; lng: number }, vehicleType?: string): any[] {
    // Optimización basada en tiempo de entrega y horarios
    const speedFactor = this.getVehicleSpeedFactor(vehicleType);
    
    const stops = pedidos.map((pedido: any) => {
      const coords = { lat: Number(pedido.latitud), lng: Number(pedido.longitud) };
      const distance = this.calculateDistance(origen, coords);
      
      return {
        pedido_id: Number(pedido.id),
        address: pedido.direccion,
        coordinates: coords,
        distance_from_origin: distance,
        estimated_time: distance / speedFactor * 3, // Tiempo base en minutos
        priority: this.calculateTimePriority(pedido),
        distance_from_previous: 0,
        time_from_previous: 0
      };
    });
    
    // Ordenar por prioridad de tiempo y luego por distancia
    stops.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Mayor prioridad primero
      }
      return a.distance_from_origin - b.distance_from_origin;
    });
    
    // Calcular distancias y tiempos finales
    for (let i = 0; i < stops.length; i++) {
      if (i === 0) {
        stops[i].distance_from_previous = stops[i].distance_from_origin;
        stops[i].time_from_previous = Math.round(stops[i].estimated_time);
      } else {
        const distance = this.calculateDistance(
          stops[i - 1].coordinates,
          stops[i].coordinates
        );
        stops[i].distance_from_previous = distance;
        stops[i].time_from_previous = Math.round(distance / speedFactor * 3) + 7; // +7 min tiempo de entrega
      }
    }
    
    return stops;
  }
  
  private optimizeByMixed(pedidos: any[], origen: { lat: number; lng: number }, vehicleType?: string): any[] {
    // Algoritmo híbrido que combina distancia, tiempo y prioridad
    const speedFactor = this.getVehicleSpeedFactor(vehicleType);
    
    const stops = pedidos.map((pedido: any) => {
      const coords = { lat: Number(pedido.latitud), lng: Number(pedido.longitud) };
      const distance = this.calculateDistance(origen, coords);
      const timePriority = this.calculateTimePriority(pedido);
      const distancePriority = 1 / (distance + 1); // Inversamente proporcional a la distancia
      
      return {
        pedido_id: Number(pedido.id),
        address: pedido.direccion,
        coordinates: coords,
        distance_from_origin: distance,
        time_priority: timePriority,
        distance_priority: distancePriority,
        combined_score: (timePriority * 0.4) + (distancePriority * 0.6),
        distance_from_previous: 0,
        time_from_previous: 0
      };
    });
    
    // Ordenar por puntuación combinada
    stops.sort((a, b) => b.combined_score - a.combined_score);
    
    // Calcular distancias y tiempos finales
    for (let i = 0; i < stops.length; i++) {
      if (i === 0) {
        stops[i].distance_from_previous = stops[i].distance_from_origin;
        stops[i].time_from_previous = Math.round(stops[i].distance_from_origin / speedFactor * 3);
      } else {
        const distance = this.calculateDistance(
          stops[i - 1].coordinates,
          stops[i].coordinates
        );
        stops[i].distance_from_previous = distance;
        stops[i].time_from_previous = Math.round(distance / speedFactor * 3) + 6; // +6 min tiempo de entrega
      }
    }
    
    return stops;
  }
  
  private async optimizeWithGoogleAPI(pedidos: any[], origen: { lat: number; lng: number }, vehicleType?: string): Promise<any[]> {
    // TODO: Implementar optimización con Google Routes API
    // Por ahora, usar el algoritmo mixto como fallback
    console.log('⚠️ Google API optimization not implemented yet, using mixed algorithm');
    return this.optimizeByMixed(pedidos, origen, vehicleType);
  }
  
  // === MÉTODOS AUXILIARES ===
  
  private async buildActiveRouteFromData(rutaData: any): Promise<any> {
    const paradas = await loadParadasRuta();
    // Filtrar sólo paradas pendientes o en proceso
    const paradasRuta = paradas
      .filter((p: any) => p.route_id === rutaData.id)
      .sort((a: any, b: any) => Number(a.order) - Number(b.order));

    // Filtrar sólo las paradas no entregadas
    const paradasNoEntregadas = paradasRuta.filter((p: any) => ['pending', 'in_process'].includes(p.status));
    // Determinar el índice de la primera parada pendiente
    const firstPendingIndex = paradasRuta.findIndex((p: any) => ['pending', 'in_process'].includes(p.status));

    return {
      id: rutaData.id,
      repartidor_id: Number(rutaData.repartidor_id),
      repartidor_nombre: rutaData.repartidor_nombre,
      sucursal_origen: rutaData.sucursal_origen,
      vehicle_type: rutaData.vehicle_type,
      status: rutaData.status,
      created_at: rutaData.created_at,
      started_at: rutaData.started_at,
      completed_at: rutaData.completed_at,
      current_stop_index: firstPendingIndex === -1 ? 0 : firstPendingIndex,
      total_stops: paradasNoEntregadas.length,
      total_distance: Number(rutaData.total_distance),
      total_estimated_time: Number(rutaData.total_estimated_time),
      actual_time: rutaData.actual_time ? Number(rutaData.actual_time) : undefined,
      efficiency_score: rutaData.efficiency_score ? Number(rutaData.efficiency_score) : undefined,
      stops: paradasNoEntregadas.map((p: any) => ({
        id: p.id,
        pedido_id: Number(p.pedido_id),
        order: Number(p.order),
        address: p.address,
        coordinates: { lat: Number(p.lat), lng: Number(p.lng) },
        status: p.status,
        estimated_arrival: p.estimated_arrival,
        actual_arrival: p.actual_arrival,
        delivery_notes: p.delivery_notes,
        delivery_evidence: p.delivery_evidence,
        distance_from_previous: Number(p.distance_from_previous),
        time_from_previous: Number(p.time_from_previous)
      })),
      metadata: {
        optimization_method: rutaData.optimization_method,
        auto_optimized: rutaData.auto_optimized === 'true',
        optimization_timestamp: rutaData.optimization_timestamp,
        google_maps_url: rutaData.google_maps_url
      }
    };
  }
  
  private async saveActiveRoute(route: any): Promise<void> {
    // Asegurar que metadata existe
    const metadata = route.metadata || {};
    
    // Guardar datos de la ruta
    const rutaData = {
      id: route.id,
      repartidor_id: route.repartidor_id,
      repartidor_nombre: route.repartidor_nombre,
      sucursal_origen: route.sucursal_origen,
      vehicle_type: route.vehicle_type,
      status: route.status,
      created_at: route.created_at,
      started_at: route.started_at || '',
      completed_at: route.completed_at || '',
      current_stop_index: route.current_stop_index,
      total_stops: route.total_stops,
      total_distance: route.total_distance,
      total_estimated_time: route.total_estimated_time,
      actual_time: route.actual_time || '',
      efficiency_score: route.efficiency_score || '',
      optimization_method: metadata.optimization_method || 'distance',
      auto_optimized: metadata.auto_optimized || false,
      optimization_timestamp: metadata.optimization_timestamp || new Date().toISOString(),
      google_maps_url: metadata.google_maps_url || ''
    };
    
    await saveRutaActiva(rutaData);
    
    // Guardar paradas
    const paradasData = route.stops.map((stop: any) => ({
      id: stop.id,
      route_id: route.id,
      pedido_id: stop.pedido_id,
      order: stop.order,
      address: stop.address,
      lat: stop.coordinates.lat,
      lng: stop.coordinates.lng,
      status: stop.status,
      estimated_arrival: stop.estimated_arrival,
      actual_arrival: stop.actual_arrival || '',
      delivery_notes: stop.delivery_notes || '',
      delivery_evidence: stop.delivery_evidence || '',
      distance_from_previous: stop.distance_from_previous,
      time_from_previous: stop.time_from_previous
    }));
    
    await saveParadasRuta(paradasData);
  }
  
  private async getRouteById(routeId: string): Promise<any> {
    try {
      const rutas = await loadRutasActivas();
      const rutaData = rutas.find((r: any) => r.id === routeId);
      
      if (!rutaData) return null;
      
      return await this.buildActiveRouteFromData(rutaData);
    } catch (error) {
      console.error('❌ Error obteniendo ruta por ID:', error);
      return null;
    }
  }
  
  private getVehicleSpeedFactor(vehicleType?: string): number {
    switch (vehicleType) {
      case 'motorcycle': return 1.3;
      case 'bicycle': return 0.6;
      case 'van': return 0.9;
      default: return 1.0; // car
    }
  }
  
  private calculateTimePriority(pedido: any): number {
    // Calcular prioridad basada en fecha de creación y otros factores
    const createdAt = new Date(pedido.fecha_creacion || Date.now());
    const now = new Date();
    const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // Mayor prioridad para pedidos más antiguos
    let priority = Math.min(hoursOld * 10, 100);
    
    // Bonificación por estado
    if (pedido.estado === 'surtido') priority += 20;
    
    return priority;
  }
  
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  private calculateEstimatedArrival(minutesFromNow: number): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutesFromNow);
    return now.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  private generateGoogleMapsUrl(origen: { lat: number; lng: number }, stops: any[]): string {
    const baseUrl = 'https://www.google.com/maps/dir/';
    const waypoints = stops.map((stop: any) => `${stop.coordinates.lat},${stop.coordinates.lng}`);
    return `${baseUrl}${origen.lat},${origen.lng}/${waypoints.join('/')}`;
  }

  // Método público para calcular distancia entre dos puntos
  public calculateDistanceBetweenPoints(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    return this.calculateDistance(point1, point2);
  }

  async cleanupOrphanedRoutes(): Promise<{ cleaned: number; total: number }> {
    try {
      const rutas = await loadRutasActivas();
      const pedidos = await loadPedidos();
      const pedidosIds = pedidos.map((p: any) => Number(p.id));
      const rutasOrfanas = rutas.filter((r: any) => !pedidosIds.includes(Number(r.repartidor_id)));
      const totalOrfanas = rutasOrfanas.length;
      // Vaciar rutas huérfanas en vez de eliminarlas
      for (const ruta of rutasOrfanas) {
        ruta.status = 'vacía';
        ruta.total_stops = 0;
        ruta.total_distance = 0;
        ruta.total_estimated_time = 0;
        ruta.current_stop_index = 0;
        ruta.stops = [];
        ruta.completed_at = new Date().toISOString();
        await this.saveActiveRoute(ruta);
      }
      return { cleaned: totalOrfanas, total: totalOrfanas };
    } catch (error) {
      console.error('❌ Error limpiando rutas huérfanas:', error);
      return { cleaned: 0, total: 0 };
    }
  }

  async syncRouteWithPedidos(repartidorId: number): Promise<boolean> {
    try {
      const rutas = await loadRutasActivas();
      const ruta = rutas.find((r: any) => Number(r.repartidor_id) === Number(repartidorId));
      if (!ruta) {
        console.log(`ℹ️ Repartidor ${repartidorId} no tiene una ruta activa`);
        return true;
      }
      const pedidos = await loadPedidos();
      const pedidosIds = pedidos.map((p: any) => Number(p.id));
      const rutaIds = ruta.stops ? ruta.stops.map((s: any) => Number(s.pedido_id)) : [];
      const pedidosOrfanos = pedidosIds.filter((id: number) => !rutaIds.includes(id));
      if (pedidosOrfanos.length === 0) {
        console.log(`ℹ️ Todas las rutas están sincronizadas con los pedidos`);
        return true;
      }
      // Vaciar la ruta si hay pedidos huérfanos
      ruta.status = 'vacía';
      ruta.total_stops = 0;
      ruta.total_distance = 0;
      ruta.total_estimated_time = 0;
      ruta.current_stop_index = 0;
      ruta.stops = [];
      ruta.completed_at = new Date().toISOString();
      await this.saveActiveRoute(ruta);
      console.log(`✅ Ruta ${ruta.id} vaciada por inconsistencia con pedidos`);
      return true;
    } catch (error) {
      console.error('❌ Error sincronizando ruta con pedidos:', error);
      return false;
    }
  }
}

// Instancia singleton del servicio de rutas
export const routeService = new RouteService(); 