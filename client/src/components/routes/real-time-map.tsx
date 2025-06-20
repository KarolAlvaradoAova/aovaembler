import { useEffect, useState, useRef, useMemo } from 'react';
import { 
  fetchPedidosFromCSV,
  fetchUsersFromCSV,
  fetchRepartidoresLive
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { MapPin, Truck, Navigation, Activity, Users, Loader2, RefreshCw, Filter, Route } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleMapsContainer, GoogleMapsHandle } from '../google-maps-container';
import { googleRoutesService } from '@/lib/google-routes';

interface RepartidorTracking {
  repartidorId: number;
  nombre: string;
  tipo_vehiculo: string;
  location: {
    lat: number;
    lng: number;
    lastUpdate: string;
    status: string;
    speed: number;
  };
  isOnline: boolean;
  ruta_actual?: any[];
}

const API_BASE_URL = 'http://localhost:4000';

// Función personalizada para crear rutas sin etiquetas de números (basada en la lógica del dashboard)
const createRouteFromRutaActualWithoutLabels = async (
  repartidorId: number,
  repartidorName: string,
  ruta_actual: any[],
  map: any
): Promise<void> => {
  if (!map || !ruta_actual || ruta_actual.length < 2) {
    console.log(`⚠️ Ruta insuficiente para ${repartidorName}`);
    return;
  }

  try {
    console.log(`🗺️ Creando ruta para ${repartidorName} con ${ruta_actual.length} paradas (sin etiquetas)`);

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
        strokeColor: getRouteColor(repartidorId),
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

    // Crear marcadores personalizados para cada parada (SIN etiquetas de números)
    const markers = createRouteMarkersWithoutLabels(ruta_actual, repartidorName, map);

    console.log(`✅ Ruta creada para ${repartidorName} (sin etiquetas)`);
  } catch (error) {
    console.error(`❌ Error creando ruta para ${repartidorName}:`, error);
  }
};

// Función para crear marcadores sin etiquetas de números
const createRouteMarkersWithoutLabels = (stops: any[], repartidorName: string, map: any): any[] => {
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
      const statusColor = getStatusColor(stop.status || 'pendiente');
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
      icon: iconConfig
      // NOTA: No se incluye la propiedad 'label' para evitar las etiquetas de números
    });

    // InfoWindow con detalles de la parada
    const infoWindow = new (window as any).google.maps.InfoWindow({
      content: createStopInfoWindow(stop, index, repartidorName)
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    markers.push(marker);
  });

  return markers;
};

// Función para crear contenido del InfoWindow
const createStopInfoWindow = (stop: any, index: number, repartidorName: string): string => {
  const statusText = getStatusText(stop.status || 'pendiente');
  const statusColor = getStatusColor(stop.status || 'pendiente');

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
};

// Función para obtener color de ruta basado en ID del repartidor
const getRouteColor = (repartidorId: number): string => {
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
};

// Función para obtener color según el estado
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'entregado': return '#10b981';
    case 'en_camino': return '#f59e0b';
    case 'pendiente': return '#6b7280';
    case 'cancelado': return '#ef4444';
    case 'retrasado': return '#f97316';
    default: return '#6b7280';
  }
};

// Función para obtener texto descriptivo del estado
const getStatusText = (status: string): string => {
  switch (status) {
    case 'entregado': return 'Entregado';
    case 'en_camino': return 'En camino';
    case 'pendiente': return 'Pendiente';
    case 'cancelado': return 'Cancelado';
    case 'retrasado': return 'Retrasado';
    default: return status;
  }
};

export function RealTimeMap() {
  const googleMapsRef = useRef<GoogleMapsHandle>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [trackingData, setTrackingData] = useState<RepartidorTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepartidor, setSelectedRepartidor] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('Nunca');
  const [mapError, setMapError] = useState<string | null>(null);
  
  // NUEVOS ESTADOS AGREGADOS para filtros y tabla
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState('diario');
  const [sucursalFiltro, setSucursalFiltro] = useState('todas');
  const [showFilters, setShowFilters] = useState(false);
  
  // NUEVOS ESTADOS para rutas trazadas
  const [showRoutes, setShowRoutes] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routesData, setRoutesData] = useState<Map<number, any>>(new Map());
  
  const { toast } = useToast();

  const [filtros, setFiltros] = useState({
    estado: 'todos',
    tipoVehiculo: 'todos',
    soloEnLinea: true
  });

  // Filtrar repartidores según los criterios seleccionados
  const repartidoresFiltrados = useMemo(() => {
    return trackingData.filter(repartidor => {
      // Filtro de estado
      if (filtros.estado !== 'todos' && repartidor.location.status !== filtros.estado) {
        return false;
      }
      // Filtro de tipo de vehículo
      if (filtros.tipoVehiculo !== 'todos' && repartidor.tipo_vehiculo !== filtros.tipoVehiculo) {
        return false;
      }
      // Filtro de estado en línea
      if (filtros.soloEnLinea && !repartidor.isOnline) {
        return false;
      }
      return true;
    });
  }, [trackingData, filtros]);

  // Actualizar marcadores en el mapa cuando cambian los filtros
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) return;

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current.clear();

    // Actualizar marcadores con los datos filtrados
    updateMapMarkers(repartidoresFiltrados);
  }, [repartidoresFiltrados, isMapLoaded]);

  // Función para obtener color según el estado
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'en_ruta': return '#f59e0b';
      case 'entregando': return '#10b981';
      case 'disponible': return '#3b82f6';
      case 'regresando': return '#8b5cf6';
      case 'descanso': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Función para obtener texto descriptivo del estado
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'en_ruta': return 'En ruta';
      case 'entregando': return 'Entregando';
      case 'disponible': return 'Disponible';
      case 'regresando': return 'Regresando';
      case 'descanso': return 'En descanso';
      default: return status;
    }
  };

  // Función para obtener variante de badge
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'en_ruta': return 'default';      // Amarillo
      case 'entregando': return 'default';   // Verde
      case 'disponible': return 'secondary'; // Azul
      case 'regresando': return 'secondary'; // Púrpura
      case 'descanso': return 'destructive'; // Rojo
      default: return 'outline';             // Gris
    }
  };

  // Función para centrar mapa en repartidor
  const selectRepartidor = (repartidorId: number) => {
    setSelectedRepartidor(repartidorId);
    
    if (mapInstanceRef.current && markersRef.current.has(repartidorId)) {
      const marker = markersRef.current.get(repartidorId);
      mapInstanceRef.current.setCenter(marker.getPosition());
      mapInstanceRef.current.setZoom(15);
    }
  };

  // Auto refresh simplificado
  const startAutoRefresh = () => {
    if (intervalRef.current) {
      return; // Ya está activo
    }

    intervalRef.current = setInterval(() => {
      if (isMapLoaded) {
        loadRepartidoresLive();
      }
    }, 5000);

    console.log('🔄 Auto-actualización iniciada');
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ Auto-actualización detenida');
    }
  };

  // NUEVA FUNCIÓN: Cargar repartidores con rutas desde archivos JSON
  const loadRepartidoresLive = async () => {
    setLoading(true);
    try {
      // Usar la función híbrida de utils.ts que ya maneja los datos reales del CSV
      const trackingDataFormatted = await fetchRepartidoresLive();
      
      setTrackingData(trackingDataFormatted);
      setRoutesData(new Map(trackingDataFormatted.map((r: any) => [r.repartidorId, r.ruta_actual])));
      
      // Cargar rutas en el mapa si está habilitado
      if (showRoutes) {
        loadRoutesForRepartidores(trackingDataFormatted);
      }

      setLastUpdate(new Date().toLocaleTimeString());
      console.log(`✅ ${trackingDataFormatted.length} repartidores actualizados`);
      
    } catch (error) {
      console.error('❌ Error cargando repartidores live:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de tracking',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar marcadores en el mapa
  const updateMapMarkers = (data: RepartidorTracking[]) => {
    if (!mapInstanceRef.current || !(window as any).google) {
      console.log('⚠️ Mapa no disponible para marcadores');
      return;
    }

    console.log('🗺️ Actualizando marcadores en el mapa...');

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current.clear();

    // Agregar nuevos marcadores para todos los repartidores
    data.forEach(repartidor => {
      const marker = new (window as any).google.maps.Marker({
        position: {
          lat: repartidor.location.lat,
          lng: repartidor.location.lng
        },
        map: mapInstanceRef.current,
        title: `${repartidor.nombre} - ${repartidor.location.status}`,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: repartidor.isOnline ? 12 : 8,
          fillColor: getStatusColor(repartidor.location.status),
          fillOpacity: repartidor.isOnline ? 1 : 0.5,
          strokeColor: repartidor.isOnline ? '#ffffff' : '#999999',
          strokeWeight: repartidor.isOnline ? 3 : 1
        }
      });

      // Información más detallada en el popup
      const statusText = getStatusText(repartidor.location.status);
      const infoWindow = new (window as any).google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
              ${repartidor.nombre}
            </h3>
            <div style="margin-bottom: 8px;">
              <span style="background-color: ${getStatusColor(repartidor.location.status)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${statusText}
              </span>
            </div>
            <div style="font-size: 12px; color: #6b7280;">
              <div><strong>Vehículo:</strong> ${repartidor.tipo_vehiculo}</div>
              <div><strong>Última actualización:</strong> ${new Date(repartidor.location.lastUpdate).toLocaleTimeString()}</div>
              <div><strong>Velocidad:</strong> ${repartidor.location.speed} km/h</div>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
        selectRepartidor(repartidor.repartidorId);
      });

      markersRef.current.set(repartidor.repartidorId, marker);
    });

    console.log(`✅ ${data.length} marcadores agregados al mapa`);
  };

  // Función para cargar rutas trazadas de repartidores (SIN etiquetas de números)
  const loadRoutesForRepartidores = async (repartidores: any[]) => {
    if (!showRoutes || !mapInstanceRef.current) {
      console.log('🛣️ Rutas deshabilitadas o mapa no disponible');
      return;
    }
    setLoadingRoutes(true);
    try {
      const routesPromises = repartidores.map(async (repartidor: any) => {
        try {
          // Usar el vector ruta_actual para crear la ruta (SIN etiquetas de números)
          if (repartidor.ruta_actual && repartidor.ruta_actual.length > 1) {
            console.log(`🗺️ Creando ruta para ${repartidor.nombre} con ${repartidor.ruta_actual.length} paradas (sin etiquetas)`);
            await createRouteFromRutaActualWithoutLabels(
              repartidor.repartidorId || repartidor.id, // Usar repartidorId si está disponible
              repartidor.nombre,
              repartidor.ruta_actual,
              mapInstanceRef.current
            );
          } else {
            console.log(`⚠️ No hay ruta válida para ${repartidor.nombre}`);
          }
        } catch (error) {
          console.error(`❌ Error creando ruta para ${repartidor.nombre}:`, error);
        }
      });
      await Promise.all(routesPromises);
      setLoadingRoutes(false);
      console.log('✅ Rutas cargadas en el mapa (sin etiquetas)');
    } catch (error) {
      console.error('❌ Error cargando rutas:', error);
      setLoadingRoutes(false);
    }
  };

  // Función para alternar mostrar/ocultar rutas
  const toggleRoutes = () => {
    if (showRoutes) {
      // Ocultar rutas
      googleRoutesService.clearAllRoutes();
      setRoutesData(new Map());
      setShowRoutes(false);
      console.log('🚫 Rutas ocultadas');
    } else {
      // Mostrar rutas
      setShowRoutes(true);
      if (trackingData.length > 0) {
        loadRoutesForRepartidores(trackingData);
      }
      console.log('✅ Rutas habilitadas');
    }
  };

  // Función para inicializar el mapa
  const initializeMap = async () => {
    if (isMapLoaded) {
      console.log('🗺️ Mapa ya inicializado');
      return;
    }

    setLoading(true);
    setMapError(null);

    try {
      if (googleMapsRef.current) {
        await googleMapsRef.current.initializeMap();
        setIsMapLoaded(true);
        setLoading(false);
        
        // Cargar datos inmediatamente
        await loadRepartidoresLive();
        
        // Iniciar auto-refresh si está habilitado
        if (autoRefresh) {
          startAutoRefresh();
        }
        
        toast({
          title: '✅ Mapa inicializado',
          description: 'GPS tracking activo',
        });
      }
    } catch (error) {
      console.error('❌ Error inicializando mapa:', error);
      setMapError('Error al cargar Google Maps');
      setLoading(false);
      
      toast({
        title: '❌ Error',
        description: 'No se pudo inicializar el mapa',
        variant: 'destructive'
      });
    }
  };

  // Auto-inicializar cuando el componente se monta
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeMap();
    }, 500);

    return () => {
      clearTimeout(timer);
      stopAutoRefresh();
    };
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      markersRef.current.clear();
      googleRoutesService.clearAllRoutes();
    };
  }, []);

  const getVehicleIcon = (vehicleType: string): string => {
    switch (vehicleType) {
      case 'moto': return '🏍️';
      case 'car': return '🚗';
      case 'van': return '🚐';
      case 'bicycle': return '🚲';
      default: return '🚚';
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header con controles */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Tracking GPS en Tiempo Real</h2>
          <p className="text-muted">Monitoreo de repartidores con Google Maps API</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-yellow-400 hover:text-yellow-300"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleRoutes}
            disabled={loadingRoutes}
            className={showRoutes ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {loadingRoutes ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cargando rutas...
              </>
            ) : showRoutes ? (
              <>
                <Route className="w-4 h-4 mr-2" />
                Rutas Visibles
              </>
            ) : (
              <>
                <Route className="w-4 h-4 mr-2" />
                Mostrar Rutas
              </>
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={initializeMap}
            disabled={loading}
            className={isMapLoaded ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : isMapLoaded ? (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Mapa Activo
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Inicializar Mapa
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="p-4 bg-zinc-800 border-b border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Estado</label>
              <Select value={filtros.estado} onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}>
                <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-700 border-zinc-600">
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="en_ruta">En ruta</SelectItem>
                  <SelectItem value="entregando">Entregando</SelectItem>
                  <SelectItem value="descanso">En descanso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">Tipo de Vehículo</label>
              <Select value={filtros.tipoVehiculo} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipoVehiculo: value }))}>
                <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-700 border-zinc-600">
                  <SelectItem value="todos">Todos los vehículos</SelectItem>
                  <SelectItem value="moto">Motocicleta</SelectItem>
                  <SelectItem value="car">Automóvil</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="bicycle">Bicicleta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltros(prev => ({ ...prev, soloEnLinea: !prev.soloEnLinea }))}
                className={`${filtros.soloEnLinea ? 'bg-green-600 hover:bg-green-700' : ''} w-full`}
              >
                <Activity className="w-4 h-4 mr-2" />
                {filtros.soloEnLinea ? 'Solo en línea' : 'Mostrar todos'}
              </Button>
            </div>
            
            <div className="flex items-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`${autoRefresh ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadRepartidoresLive}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>
              Mostrando {repartidoresFiltrados.length} de {trackingData.length} repartidores
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltros({
                estado: 'todos',
                tipoVehiculo: 'todos',
                soloEnLinea: true
              })}
              className="text-yellow-400 hover:text-yellow-300"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mapa */}
        <div className="flex-1 relative min-h-[60vh]">
          {mapError && (
            <div className="absolute inset-0 bg-red-900/20 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <p className="text-red-400 text-lg font-semibold mb-2">Error de Mapa</p>
                <p className="text-red-300 text-sm">{mapError}</p>
                <Button
                  onClick={initializeMap}
                  className="mt-4 bg-red-600 hover:bg-red-700"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}
          
          <GoogleMapsContainer
            ref={googleMapsRef}
            className="w-full h-full"
            onMapReady={(map) => {
              mapInstanceRef.current = map;
              setIsMapLoaded(true);
              setLoading(false);
              setMapError(null);
            }}
          />
        </div>

        {/* Panel lateral con lista de repartidores */}
        <div className="h-64 bg-zinc-900 border-t border-zinc-800">
          <Card className="h-full rounded-none border-0 bg-zinc-900">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between text-white">
                <span>Repartidores Activos</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted">Última actualización: {lastUpdate}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-full">
              <div className="h-full overflow-y-auto">
                {repartidoresFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted">
                    <Users className="w-8 h-8 mb-2" />
                    <p>No hay repartidores que coincidan con los filtros</p>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {repartidoresFiltrados.map((repartidor) => (
                      <div
                        key={repartidor.repartidorId}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedRepartidor === repartidor.repartidorId
                            ? 'border-yellow-400 bg-yellow-400/10 shadow-lg'
                            : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700/60'
                        }`}
                        onClick={() => selectRepartidor(repartidor.repartidorId)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white truncate">{repartidor.nombre}</h3>
                          <Badge variant={getStatusBadgeVariant(repartidor.location.status)} className="text-xs flex-shrink-0">
                            {getStatusText(repartidor.location.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span className="truncate flex items-center gap-2">
                            {getVehicleIcon(repartidor.tipo_vehiculo)} {repartidor.tipo_vehiculo}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3 text-yellow-400" /> {repartidor.location.speed} km/h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 