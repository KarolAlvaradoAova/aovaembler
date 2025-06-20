// Servicio para manejo de rutas de Google Maps
// Adaptado de Embler 6.2 para trabajar con archivos JSON de Embler 7.6

interface RouteStop {
  tipo: 'origen' | 'parada' | 'destino';
  lat: number;
  lng: number;
  label: string;
  status?: string;
  timestamp?: string;
  pedido_id?: string;
}

interface RouteData {
  repartidorId: number;
  repartidorName: string;
  stops: RouteStop[];
  polyline?: any;
  markers?: any[];
}

class GoogleRoutesService {
  private routes: Map<number, RouteData> = new Map();
  private mapInstance: any = null;

  setMap(map: any) {
    this.mapInstance = map;
  }

  // Función principal para crear ruta desde ruta_actual (compatible con 6.2)
  async createRouteFromRutaActual(
    repartidorId: number,
    repartidorName: string,
    ruta_actual: RouteStop[],
    map: any
  ): Promise<void> {
    if (!map || !ruta_actual || ruta_actual.length < 2) {
      console.log(`⚠️ Ruta insuficiente para ${repartidorName}`);
      return;
    }

    try {
      console.log(`🗺️ Creando ruta para ${repartidorName} con ${ruta_actual.length} paradas`);

      // Limpiar ruta anterior si existe
      this.clearRoute(repartidorId);

      // Crear waypoints para Google Directions API
      const waypoints = ruta_actual.slice(1, -1).map(stop => ({
        location: { lat: stop.lat, lng: stop.lng },
        stopover: true
      }));

      const origin = ruta_actual[0];
      const destination = ruta_actual[ruta_actual.length - 1];

      // Configurar solicitud de ruta
      const directionsService = new (window as any).google.maps.DirectionsService();
      const directionsRenderer = new (window as any).google.maps.DirectionsRenderer({
        suppressMarkers: true, // No mostrar marcadores automáticos
        polylineOptions: {
          strokeColor: this.getRouteColor(repartidorId),
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });

      const request = {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints: waypoints,
        optimizeWaypoints: false, // Mantener orden original
        travelMode: (window as any).google.maps.TravelMode.DRIVING
      };

      // Obtener ruta de Google
      const result = await new Promise<any>((resolve, reject) => {
        directionsService.route(request, (result: any, status: any) => {
          if (status === 'OK') {
            resolve(result);
          } else {
            reject(new Error(`Error obteniendo ruta: ${status}`));
          }
        });
      });

      // Renderizar ruta en el mapa
      directionsRenderer.setMap(map);
      directionsRenderer.setDirections(result);

      // Crear marcadores personalizados para cada parada
      const markers = this.createRouteMarkers(ruta_actual, repartidorName, map);

      // Guardar datos de la ruta
      const routeData: RouteData = {
        repartidorId,
        repartidorName,
        stops: ruta_actual,
        polyline: directionsRenderer,
        markers
      };

      this.routes.set(repartidorId, routeData);

      console.log(`✅ Ruta creada para ${repartidorName}`);
    } catch (error) {
      console.error(`❌ Error creando ruta para ${repartidorName}:`, error);
    }
  }

  // Crear marcadores personalizados para cada parada
  private createRouteMarkers(stops: RouteStop[], repartidorName: string, map: any): any[] {
    const markers: any[] = [];

    stops.forEach((stop, index) => {
      // Icono según el tipo de parada
      let iconConfig;
      let title;

      if (stop.tipo === 'origen') {
        iconConfig = {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        };
        title = `Inicio - ${repartidorName}`;
      } else if (stop.tipo === 'destino') {
        iconConfig = {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        };
        title = `Destino - ${repartidorName}`;
      } else {
        // Parada de entrega
        const statusColor = this.getStatusColor(stop.status || 'pendiente');
        iconConfig = {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: statusColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1
        };
        title = `Entrega ${index} - ${stop.label}`;
      }

      const marker = new (window as any).google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map,
        title,
        icon: iconConfig,
        label: {
          text: String(index + 1),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      });

      // InfoWindow con detalles de la parada
      const infoWindow = new (window as any).google.maps.InfoWindow({
        content: this.createStopInfoWindow(stop, index, repartidorName)
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markers.push(marker);
    });

    return markers;
  }

  // Crear contenido del InfoWindow para cada parada
  private createStopInfoWindow(stop: RouteStop, index: number, repartidorName: string): string {
    const statusText = this.getStatusText(stop.status || 'pendiente');
    const statusColor = this.getStatusColor(stop.status || 'pendiente');

    return `
      <div style="padding: 12px; min-width: 200px; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: bold;">
          ${stop.tipo === 'origen' ? '🏁 Inicio' : stop.tipo === 'destino' ? '🎯 Destino' : `📦 Entrega ${index}`}
        </h3>
        <div style="margin-bottom: 8px;">
          <span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
            ${statusText}
          </span>
        </div>
        <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">
          <div><strong>Ubicación:</strong> ${stop.label}</div>
          ${stop.pedido_id ? `<div><strong>Pedido ID:</strong> ${stop.pedido_id}</div>` : ''}
          ${stop.timestamp ? `<div><strong>Hora:</strong> ${new Date(stop.timestamp).toLocaleTimeString()}</div>` : ''}
          <div><strong>Repartidor:</strong> ${repartidorName}</div>
        </div>
      </div>
    `;
  }

  // Obtener color de ruta basado en ID del repartidor
  private getRouteColor(repartidorId: number): string {
    const colors = [
      '#3b82f6', // Azul
      '#10b981', // Verde
      '#f59e0b', // Amarillo
      '#ef4444', // Rojo
      '#8b5cf6', // Púrpura
      '#06b6d4', // Cyan
      '#f97316', // Naranja
      '#84cc16'  // Lima
    ];
    return colors[repartidorId % colors.length];
  }

  // Obtener color según el estado
  private getStatusColor(status: string): string {
    switch (status) {
      case 'entregado': return '#10b981';
      case 'en_camino': return '#f59e0b';
      case 'pendiente': return '#6b7280';
      case 'cancelado': return '#ef4444';
      case 'retrasado': return '#f97316';
      default: return '#6b7280';
    }
  }

  // Obtener texto descriptivo del estado
  private getStatusText(status: string): string {
    switch (status) {
      case 'entregado': return 'Entregado';
      case 'en_camino': return 'En camino';
      case 'pendiente': return 'Pendiente';
      case 'cancelado': return 'Cancelado';
      case 'retrasado': return 'Retrasado';
      default: return status;
    }
  }

  // Limpiar ruta específica
  clearRoute(repartidorId: number): void {
    const route = this.routes.get(repartidorId);
    if (route) {
      // Limpiar polyline
      if (route.polyline) {
        route.polyline.setMap(null);
      }
      // Limpiar marcadores
      if (route.markers) {
        route.markers.forEach(marker => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
      }
      this.routes.delete(repartidorId);
      console.log(`🗑️ Ruta limpiada para repartidor ${repartidorId}`);
    }
  }

  // Limpiar todas las rutas
  clearAllRoutes(): void {
    this.routes.forEach((route, repartidorId) => {
      this.clearRoute(repartidorId);
    });
    console.log('🗑️ Todas las rutas limpiadas');
  }

  // Obtener ruta específica
  getRoute(repartidorId: number): RouteData | undefined {
    return this.routes.get(repartidorId);
  }

  // Obtener todas las rutas
  getAllRoutes(): Map<number, RouteData> {
    return this.routes;
  }

  // Actualizar estado de una parada específica
  updateStopStatus(repartidorId: number, stopIndex: number, newStatus: string): void {
    const route = this.routes.get(repartidorId);
    if (route && route.stops[stopIndex]) {
      route.stops[stopIndex].status = newStatus;
      
      // Actualizar marcador si existe
      if (route.markers && route.markers[stopIndex]) {
        const marker = route.markers[stopIndex];
        const newColor = this.getStatusColor(newStatus);
        
        marker.setIcon({
          ...marker.getIcon(),
          fillColor: newColor
        });
      }
      
      console.log(`✅ Estado actualizado para parada ${stopIndex} del repartidor ${repartidorId}`);
    }
  }
}

// Instancia global del servicio
export const googleRoutesService = new GoogleRoutesService();

// Función de conveniencia para crear ruta desde ruta_actual
export const createRouteFromRutaActual = async (
  repartidorId: number,
  repartidorName: string,
  ruta_actual: RouteStop[],
  map: any
): Promise<void> => {
  return googleRoutesService.createRouteFromRutaActual(repartidorId, repartidorName, ruta_actual, map);
};

// Función para cargar rutas desde archivos JSON (compatible con Embler 7.6)
export const loadRoutesFromJSON = async (
  repartidorId: number,
  repartidorName: string,
  map: any
): Promise<void> => {
  try {
    // Cargar archivo de ruta JSON
    const response = await fetch(`/data/routes/route_${repartidorId}.json`);
    if (!response.ok) {
      throw new Error(`No se encontró ruta para repartidor ${repartidorId}`);
    }

    const routeData = await response.json();
    
    // Convertir formato JSON a formato ruta_actual
    const ruta_actual: RouteStop[] = [];
    
    if (routeData.stops && routeData.stops.length > 0) {
      routeData.stops.forEach((stop: any, index: number) => {
        if (stop.type === 'origin') {
          ruta_actual.push({
            tipo: 'origen',
            lat: stop.lat,
            lng: stop.lng,
            label: stop.address || 'Ubicación actual',
            status: 'disponible',
            timestamp: new Date().toISOString()
          });
        } else if (stop.type === 'delivery') {
          ruta_actual.push({
            tipo: 'parada',
            lat: stop.lat,
            lng: stop.lng,
            label: stop.address,
            status: stop.status || 'pendiente',
            pedido_id: stop.pedido_id
          });
        }
      });
    }

    // Crear ruta en el mapa
    await createRouteFromRutaActual(repartidorId, repartidorName, ruta_actual, map);
    
  } catch (error) {
    console.error(`❌ Error cargando ruta JSON para ${repartidorName}:`, error);
  }
};

// Función para actualizar ubicación de repartidor en tiempo real
export const updateRepartidorLocation = (
  repartidorId: number,
  newLat: number,
  newLng: number,
  status: string
): void => {
  const route = googleRoutesService.getRoute(repartidorId);
  if (route && route.stops.length > 0) {
    // Actualizar ubicación del origen (primera parada)
    route.stops[0].lat = newLat;
    route.stops[0].lng = newLng;
    route.stops[0].status = status;
    route.stops[0].timestamp = new Date().toISOString();
    
    console.log(`📍 Ubicación actualizada para repartidor ${repartidorId}`);
  }
};

export default googleRoutesService; 