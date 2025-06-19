// Servicio para manejar rutas de Google Maps usando Directions API
// Para mostrar rutas trazadas en el mapa de GPS tracking

export interface RouteWaypoint {
  lat: number;
  lng: number;
  address?: string;
  pedido_id?: number;
  order?: number;
}

export interface GoogleRoute {
  repartidorId: number;
  repartidorNombre: string;
  origen: RouteWaypoint;
  waypoints: RouteWaypoint[];
  destino: RouteWaypoint;
  directionsRenderer?: any;
  polyline?: any;
}

export class GoogleRoutesService {
  public routes: Map<number, GoogleRoute> = new Map();
  private directionsService: any = null;

  constructor() {
    // Inicializar el servicio cuando Google Maps esté disponible
    this.initializeDirectionsService();
  }

  private initializeDirectionsService() {
    if ((window as any).google && (window as any).google.maps) {
      this.directionsService = new (window as any).google.maps.DirectionsService();
      console.log('✅ Google Directions Service inicializado');
    } else {
      // Reintentar en 1 segundo si Google Maps no está listo
      setTimeout(() => this.initializeDirectionsService(), 1000);
    }
  }

  // Crear ruta para un repartidor basada en su ruta activa
  async createRouteForRepartidor(
    repartidorId: number, 
    repartidorNombre: string,
    routeData: any,
    currentLocation: { lat: number; lng: number },
    map: any
  ): Promise<GoogleRoute | null> {
    if (!this.directionsService || !routeData || !routeData.stops) {
      console.log('⚠️ Directions service no disponible o datos de ruta incompletos');
      return null;
    }

    try {
      // Limpiar ruta existente si existe
      this.clearRouteForRepartidor(repartidorId);

      // Obtener paradas pendientes (desde la parada actual)
      const currentStopIndex = routeData.current_stop_index || 0;
      const pendingStops = routeData.stops.slice(currentStopIndex);

      if (pendingStops.length === 0) {
        console.log(`ℹ️ No hay paradas pendientes para el repartidor ${repartidorId}`);
        return null;
      }

      // Determinar origen (ubicación actual del repartidor)
      const origen: RouteWaypoint = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        address: 'Ubicación actual'
      };

      // Convertir paradas a waypoints
      const waypoints: RouteWaypoint[] = pendingStops.slice(0, -1).map((stop: any) => ({
        lat: stop.coordinates.lat,
        lng: stop.coordinates.lng,
        address: stop.address,
        pedido_id: stop.pedido_id,
        order: stop.order
      }));

      // Último destino
      const lastStop = pendingStops[pendingStops.length - 1];
      const destino: RouteWaypoint = {
        lat: lastStop.coordinates.lat,
        lng: lastStop.coordinates.lng,
        address: lastStop.address,
        pedido_id: lastStop.pedido_id,
        order: lastStop.order
      };

      // Crear DirectionsRenderer
      const directionsRenderer = new (window as any).google.maps.DirectionsRenderer({
        suppressMarkers: false, // Mostrar marcadores A, B, C, etc.
        polylineOptions: {
          strokeColor: this.getRouteColor(repartidorId),
          strokeWeight: 4,
          strokeOpacity: 0.8
        },
        markerOptions: {
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: this.getRouteColor(repartidorId),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        }
      });

      directionsRenderer.setMap(map);

      // Preparar request para Directions API
      const request: any = {
        origin: origen,
        destination: destino,
        travelMode: this.getTravelMode(routeData.vehicle_type),
        optimizeWaypoints: false, // Mantener el orden de la ruta optimizada
        avoidHighways: routeData.vehicle_type === 'bicycle',
        avoidTolls: routeData.vehicle_type === 'bicycle'
      };

      // Agregar waypoints si hay paradas intermedias
      if (waypoints.length > 0) {
        request.waypoints = waypoints.map(wp => ({
          location: new (window as any).google.maps.LatLng(wp.lat, wp.lng),
          stopover: true
        }));
      }

      // Calcular y mostrar la ruta
      const result = await this.calculateRoute(request);
      directionsRenderer.setDirections(result);

      const googleRoute: GoogleRoute = {
        repartidorId,
        repartidorNombre,
        origen,
        waypoints,
        destino,
        directionsRenderer
      };

      this.routes.set(repartidorId, googleRoute);
      
      console.log(`✅ Ruta creada para ${repartidorNombre} con ${waypoints.length + 1} paradas`);
      return googleRoute;

    } catch (error) {
      console.error(`❌ Error creando ruta para repartidor ${repartidorId}:`, error);
      return null;
    }
  }

  // Limpiar ruta de un repartidor específico
  clearRouteForRepartidor(repartidorId: number) {
    const existingRoute = this.routes.get(repartidorId);
    if (existingRoute && existingRoute.directionsRenderer) {
      existingRoute.directionsRenderer.setMap(null);
      this.routes.delete(repartidorId);
      console.log(`🧹 Ruta limpiada para repartidor ${repartidorId}`);
    }
  }

  // Limpiar todas las rutas
  clearAllRoutes() {
    this.routes.forEach((route, repartidorId) => {
      if (route.directionsRenderer) {
        route.directionsRenderer.setMap(null);
      }
    });
    this.routes.clear();
    console.log('🧹 Todas las rutas limpiadas');
  }

  // Obtener ruta de un repartidor
  getRouteForRepartidor(repartidorId: number): GoogleRoute | undefined {
    return this.routes.get(repartidorId);
  }

  // Obtener todas las rutas activas
  getAllRoutes(): GoogleRoute[] {
    return Array.from(this.routes.values());
  }

  // Métodos auxiliares privados
  public async calculateRoute(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const directionsService = new (window as any).google.maps.DirectionsService();
      directionsService.route(request, (result: any, status: any) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(status);
        }
      });
    });
  }

  public getRouteColor(repartidorId: number): string {
    // Colores diferentes para cada repartidor
    const colors = [
      '#3B82F6', // Azul
      '#EF4444', // Rojo  
      '#10B981', // Verde
      '#F59E0B', // Amarillo
      '#8B5CF6', // Púrpura
      '#EC4899', // Rosa
      '#14B8A6', // Teal
      '#F97316'  // Naranja
    ];
    return colors[repartidorId % colors.length];
  }

  private getTravelMode(vehicleType?: string): any {
    const google = (window as any).google;
    if (!google || !google.maps) return null;

    switch (vehicleType) {
      case 'bicycle':
        return google.maps.TravelMode.BICYCLING;
      case 'motorcycle':
      case 'car':
      case 'van':
      default:
        return google.maps.TravelMode.DRIVING;
    }
  }

  // Verificar si un repartidor tiene ruta activa
  hasActiveRoute(repartidorId: number): boolean {
    return this.routes.has(repartidorId);
  }

  // Actualizar ruta existente con nueva ubicación del repartidor
  async updateRepartidorLocation(
    repartidorId: number, 
    newLocation: { lat: number; lng: number },
    map: any
  ): Promise<boolean> {
    const route = this.routes.get(repartidorId);
    if (!route) return false;

    // Recalcular ruta desde la nueva ubicación
    try {
      const request: any = {
        origin: newLocation,
        destination: route.destino,
        travelMode: this.getTravelMode(),
        optimizeWaypoints: false
      };

      if (route.waypoints.length > 0) {
        request.waypoints = route.waypoints.map(wp => ({
          location: new (window as any).google.maps.LatLng(wp.lat, wp.lng),
          stopover: true
        }));
      }

      const result = await this.calculateRoute(request);
      route.directionsRenderer.setDirections(result);
      
      // Actualizar origen
      route.origen = { ...newLocation, address: 'Ubicación actual' };
      
      console.log(`🔄 Ruta actualizada para repartidor ${repartidorId}`);
      return true;

    } catch (error) {
      console.error(`❌ Error actualizando ruta para repartidor ${repartidorId}:`, error);
      return false;
    }
  }
}

// Instancia singleton del servicio
export const googleRoutesService = new GoogleRoutesService();

// Crear ruta para un repartidor usando el vector ruta_actual
export async function createRouteFromRutaActual(
  repartidorId: number,
  repartidorNombre: string,
  rutaActual: any[],
  map: any
): Promise<GoogleRoute | null> {
  if (!window.google?.maps || !rutaActual || rutaActual.length < 2) {
    console.log('⚠️ Datos insuficientes para crear ruta');
    return null;
  }

  try {
    // Limpiar ruta existente si existe
    googleRoutesService.clearRouteForRepartidor(repartidorId);

    // Origen, waypoints y destino
    const origin = {
      lat: rutaActual[0].lat,
      lng: rutaActual[0].lng,
      address: rutaActual[0].label || 'Ubicación actual'
    };
    const destination = {
      lat: rutaActual[rutaActual.length - 1].lat,
      lng: rutaActual[rutaActual.length - 1].lng,
      address: rutaActual[rutaActual.length - 1].label || 'Destino'
    };
    const waypoints = rutaActual.slice(1, -1).map((p: any) => ({
      lat: p.lat,
      lng: p.lng,
      address: p.label || '',
      pedido_id: p.pedido_id
    }));

    // Crear DirectionsRenderer
    const directionsRenderer = new (window as any).google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: googleRoutesService.getRouteColor(repartidorId),
        strokeWeight: 4,
        strokeOpacity: 0.8
      },
      markerOptions: {
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: googleRoutesService.getRouteColor(repartidorId),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      }
    });
    directionsRenderer.setMap(map);

    // Preparar request para Directions API
    const request: any = {
      origin,
      destination,
      travelMode: 'DRIVING',
      optimizeWaypoints: false
    };
    if (waypoints.length > 0) {
      request.waypoints = waypoints.map(wp => ({
        location: new (window as any).google.maps.LatLng(wp.lat, wp.lng),
        stopover: true
      }));
    }

    // Calcular y mostrar la ruta
    const result = await googleRoutesService.calculateRoute(request);
    directionsRenderer.setDirections(result);

    const googleRoute: GoogleRoute = {
      repartidorId,
      repartidorNombre,
      origen: origin,
      waypoints,
      destino: destination,
      directionsRenderer
    };
    googleRoutesService.routes.set(repartidorId, googleRoute);
    return googleRoute;
  } catch (error) {
    console.error(`❌ Error creando ruta para repartidor ${repartidorId}:`, error);
    return null;
  }
} 