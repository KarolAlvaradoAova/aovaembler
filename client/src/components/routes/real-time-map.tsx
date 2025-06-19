import { useEffect, useState, useRef, useMemo } from 'react';
import { 
  fetchAllRepartidoresTracking, 
  fetchPedidos, 
  fetchSucursales,
  fetchRepartidorActiveRoute,
  fetchAllRepartidoresLive
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { MapPin, Truck, Navigation, Activity, Users, Loader2, RefreshCw, Filter, Route } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleMapsContainer, GoogleMapsHandle } from '../google-maps-container';
import { googleRoutesService, createRouteFromRutaActual } from '@/lib/google-routes';

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
}

const API_BASE_URL = 'http://localhost:4000';

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

    // Agregar nuevos marcadores solo para repartidores filtrados
    repartidoresFiltrados.forEach(repartidor => {
      const marker = new (window as any).google.maps.Marker({
        position: {
          lat: repartidor.location.lat,
          lng: repartidor.location.lng
        },
        map: mapInstanceRef.current,
        title: `${repartidor.nombre} - ${repartidor.location.status}`,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: getStatusColor(repartidor.location.status),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      // Info window para el marcador
      const infoWindow = new (window as any).google.maps.InfoWindow({
        content: `
          <div style="color: black; padding: 8px; min-width: 150px;">
            <h4 style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
              ${repartidor.nombre}
            </h4>
            <div style="margin-bottom: 4px; font-size: 12px;">
              <strong>🚗</strong> ${repartidor.tipo_vehiculo}
            </div>
            <div style="margin-bottom: 4px; font-size: 12px;">
              <strong>📍</strong> 
              <span style="color: ${getStatusColor(repartidor.location.status)}; font-weight: bold;">
                ${repartidor.location.status.replace('_', ' ')}
              </span>
            </div>
            <div style="font-size: 11px; color: #6b7280;">
              ⚡ ${repartidor.location.speed} km/h
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
        setSelectedRepartidor(repartidor.repartidorId);
      });

      markersRef.current.set(repartidor.repartidorId, marker);
    });
  }, [repartidoresFiltrados, isMapLoaded]);

  // Cargar datos iniciales (NUEVO)
  useEffect(() => {
    Promise.all([
      fetchPedidos(),
      fetchSucursales()
    ]).then(([pedidosData, sucursalesData]) => {
      setPedidos(pedidosData);
      setSucursales(sucursalesData);
    }).catch(error => {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de pedidos y sucursales',
        variant: 'destructive'
      });
    });
  }, [toast]);

  // Helper functions para la tabla (NUEVAS)
  const getSucursalNombre = (sucursal: string) => {
    if (!sucursal) return '';
    const found = sucursales.find((s: any) => s.nombre?.toLowerCase() === sucursal.toLowerCase());
    return found ? found.nombre.charAt(0).toUpperCase() + found.nombre.slice(1) : sucursal;
  };

  const getRepartidorId = (id: any) => String(id).padStart(3, '0');

  const traducirEstado = (estado: string) => {
    if (estado === 'en_ruta') return 'En reparto';
    if (estado === 'entregado') return 'Entregado';
    if (estado === 'pendiente') return 'En recolección';
    if (estado === 'surtido') return 'Surtido';
    return estado;
  };

  // Filtro de pedidos según periodo y sucursal (NUEVO)
  const pedidosFiltrados = pedidos.filter((p) => {
    // Filtro por sucursal
    const sucursalOk = sucursalFiltro === 'todas' || (p.sucursal_asignada && p.sucursal_asignada.toLowerCase() === sucursalFiltro.toLowerCase());
    // Filtro por periodo (simulación)
    let periodoOk = true;
    if (periodo === 'semanal') {
      periodoOk = p.estado === 'entregado' || p.estado === 'en_ruta';
    } else if (periodo === 'mensual') {
      periodoOk = p.estado === 'entregado';
    }
    return sucursalOk && periodoOk;
  });

  // Función para reset completo del estado
  const resetMapState = () => {
    console.log('🧹 RESET COMPLETO del estado del mapa');
    
    // Limpiar estados
    setIsMapLoaded(false);
    setLoading(false);
    setMapError(null);
    setTrackingData([]);
    setSelectedRepartidor(null);
    setAutoRefresh(false);
    setLastUpdate('Nunca');
    
    // Limpiar referencias
    mapInstanceRef.current = null;
    markersRef.current.clear();
    
    // Limpiar interval si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Limpiar scripts existentes
    const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    scripts.forEach(script => {
      console.log('🧹 Eliminando script:', script.getAttribute('src'));
      script.remove();
    });
    
    // Limpiar callbacks globales
    Object.keys(window).forEach(key => {
      if (key.startsWith('initGoogleMaps')) {
        console.log('🧹 Eliminando callback global:', key);
        delete (window as any)[key];
      }
    });
    
    console.log('✅ Reset completo terminado');
  };

  // Función para inicializar Google Maps usando el nuevo contenedor
  const initializeMap = async () => {
    const attemptNumber = Date.now(); // Identificador único para este intento
    console.log(`🚀 INTENTO ${attemptNumber}: Iniciando initializeMap`);
    console.log(`📊 Estado inicial:`, {
      isMapLoaded,
      loading,
      mapError,
      googleMapsRefExists: !!googleMapsRef.current,
      mapInstanceExists: !!mapInstanceRef.current,
      windowGoogle: !!(window as any).google,
      windowGoogleMaps: !!(window as any).google?.maps,
      existingScripts: document.querySelectorAll('script[src*="maps.googleapis.com"]').length
    });

    if (isMapLoaded) {
      console.log(`✅ INTENTO ${attemptNumber}: Mapa ya inicializado`);
      toast({
        title: 'ℹ️ Información',
        description: 'El mapa ya está inicializado',
      });
      return;
    }

    if (!googleMapsRef.current) {
      console.error(`❌ INTENTO ${attemptNumber}: Referencia de Google Maps no disponible`);
      return;
    }

    try {
      setLoading(true);
      setMapError(null);
      console.log(`🔄 INTENTO ${attemptNumber}: Inicializando Google Maps...`);
      
      await googleMapsRef.current.initializeMap();
      console.log(`✅ INTENTO ${attemptNumber}: initializeMap completado exitosamente`);
      
    } catch (error) {
      console.error(`❌ INTENTO ${attemptNumber}: Error inicializando mapa:`, error);
      setLoading(false);
      setMapError(error as string);
      toast({
        title: 'Error',
        description: `Error inicializando mapa: ${error}`,
        variant: 'destructive'
      });
    }
  };

  // Callback cuando el mapa está listo
  const handleMapReady = (map: any) => {
    console.log('✅ Mapa listo para usar');
    mapInstanceRef.current = map;
    
    toast({
      title: '🗺️ Mapa inicializado',
      description: 'Google Maps está listo para usar',
    });
    
    // Actualizar estado de forma síncrona y luego cargar datos
    setIsMapLoaded(true);
    setLoading(false);
    
    // Cargar datos inmediatamente después de que el estado se actualice
    console.log('🔄 Cargando repartidores automáticamente...');
    setTimeout(() => {
      console.log('📍 Ejecutando loadRepartidoresLive automáticamente...');
      console.log('🗺️ Estado del mapa:', !!mapInstanceRef.current);
      
      // Llamar directamente sin verificar isMapLoaded ya que sabemos que está listo
      if (mapInstanceRef.current) {
        loadRepartidoresLive();
      } else {
        console.error('❌ mapInstanceRef.current es null');
      }
    }, 500);
  };

  // Callback para errores del mapa
  const handleMapError = (error: string) => {
    console.error('❌ Error en Google Maps:', error);
    setLoading(false);
    setMapError(error);
    toast({
      title: 'Error de mapa',
      description: error,
      variant: 'destructive'
    });
  };

  // Reemplazar la función de carga de tracking y rutas
  const loadRepartidoresLive = async () => {
    setLoading(true);
    try {
      const repartidoresLive = await fetchAllRepartidoresLive();
      console.log('🟢 Datos recibidos de /api/repartidores/live:', repartidoresLive);
      setTrackingData(repartidoresLive.map((r: any) => ({
        repartidorId: Number(r.id),
        nombre: r.nombre,
        tipo_vehiculo: r.tipo_vehiculo,
        location: {
          lat: r.ubicacion_actual.lat,
          lng: r.ubicacion_actual.lng,
          lastUpdate: r.ubicacion_actual.timestamp,
          status: r.ubicacion_actual.status,
          speed: 0 // Si tienes velocidad, agrégala aquí
        },
        isOnline: true // O usa un campo real si lo tienes
      })));
      setRoutesData(new Map(repartidoresLive.map((r: any) => [Number(r.id), r.ruta_actual])));
      loadRoutesForRepartidores(repartidoresLive);
    } catch (error) {
      console.error('❌ Error cargando repartidores live:', error);
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

    // Agregar nuevos marcadores para todos los repartidores (online y offline)
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
          <div style="color: black; padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">
              ${repartidor.nombre}
            </h3>
            <div style="margin-bottom: 8px;">
              <strong>🚲 Vehículo:</strong> ${repartidor.tipo_vehiculo}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>📍 Estado:</strong> 
              <span style="color: ${getStatusColor(repartidor.location.status)}; font-weight: bold;">
                ${statusText}
              </span>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>⚡ Velocidad:</strong> ${repartidor.location.speed} km/h
            </div>
            <div style="margin-bottom: 8px;">
              <strong>📶 Estado:</strong> 
              <span style="color: ${repartidor.isOnline ? '#10b981' : '#ef4444'};">
                ${repartidor.isOnline ? 'En línea' : 'Desconectado'}
              </span>
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 8px;">
              📅 Actualizado: ${new Date(repartidor.location.lastUpdate).toLocaleTimeString()}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        // Cerrar otros info windows
        markersRef.current.forEach((otherMarker, id) => {
          if (otherMarker.infoWindow) {
            otherMarker.infoWindow.close();
          }
        });
        
        infoWindow.open(mapInstanceRef.current, marker);
        setSelectedRepartidor(repartidor.repartidorId);
        
        // Centrar mapa en el marcador
        mapInstanceRef.current.setCenter(marker.getPosition());
        mapInstanceRef.current.setZoom(15);
      });

      // Guardar referencia del infoWindow en el marker
      marker.infoWindow = infoWindow;
      markersRef.current.set(repartidor.repartidorId, marker);
    });

    console.log(`✅ ${data.length} marcadores agregados al mapa`);
  };

  // Función para cargar rutas trazadas de repartidores
  const loadRoutesForRepartidores = async (repartidores: any[]) => {
    if (!showRoutes || !mapInstanceRef.current) {
      console.log('🛣️ Rutas deshabilitadas o mapa no disponible');
      return;
    }
    setLoadingRoutes(true);
    try {
      const routesPromises = repartidores.map(async (repartidor: any) => {
        try {
          // Usar el vector ruta_actual para crear la ruta
          if (repartidor.ruta_actual && repartidor.ruta_actual.length > 1) {
            await createRouteFromRutaActual(
              repartidor.repartidorId || repartidor.id,
              repartidor.nombre,
              repartidor.ruta_actual,
              mapInstanceRef.current
            );
          }
        } catch (error) {
          console.error(`❌ Error creando ruta para ${repartidor.nombre}:`, error);
        }
      });
      await Promise.all(routesPromises);
      setLoadingRoutes(false);
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

  // Función para obtener color por estado
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'en_ruta': return '#f59e0b';      // Amarillo/naranja - en movimiento
      case 'entregando': return '#10b981';   // Verde - entregando
      case 'disponible': return '#3b82f6';   // Azul - disponible
      case 'regresando': return '#8b5cf6';   // Púrpura - regresando
      case 'descanso': return '#ef4444';     // Rojo - en descanso
      default: return '#6b7280';             // Gris - estado desconocido
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

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      console.log('🧹 Limpiando RealTimeMap...');
      
      try {
        // Limpiar interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Limpiar marcadores
        if (markersRef.current) {
          markersRef.current.forEach(marker => {
            if (marker && marker.setMap) {
              marker.setMap(null);
            }
          });
          markersRef.current.clear();
        }
        
        // Limpiar referencia del mapa
        if (mapInstanceRef.current) {
          mapInstanceRef.current = null;
        }
        
        console.log('✅ Cleanup de RealTimeMap completado');
        
      } catch (error) {
        console.error('❌ Error durante cleanup:', error);
      }
    };
  }, []);

  const onlineCount = trackingData.filter(r => r.isOnline).length;

  // Llama loadRepartidoresLive en el useEffect principal y en los refrescos
  useEffect(() => {
    loadRepartidoresLive();
  }, []);

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
        <div className="bg-zinc-900 border-b border-zinc-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Estado
              </label>
              <Select 
                value={filtros.estado} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border border-zinc-700">
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="en_ruta">En ruta</SelectItem>
                  <SelectItem value="entregando">Entregando</SelectItem>
                  <SelectItem value="regresando">Regresando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tipo de Vehículo
              </label>
              <Select 
                value={filtros.tipoVehiculo} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, tipoVehiculo: value }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border border-zinc-700">
                  <SelectItem value="todos">Todos los vehículos</SelectItem>
                  <SelectItem value="Motocicleta">Motocicleta</SelectItem>
                  <SelectItem value="Automóvil">Automóvil</SelectItem>
                  <SelectItem value="Bicicleta">Bicicleta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={filtros.soloEnLinea ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltros(prev => ({ ...prev, soloEnLinea: !prev.soloEnLinea }))}
                className="w-full"
              >
                <Activity className={`w-4 h-4 mr-2 ${filtros.soloEnLinea ? 'animate-pulse' : ''}`} />
                {filtros.soloEnLinea ? 'Solo en línea' : 'Mostrar todos'}
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
          <Card className="h-full border-0 rounded-none bg-transparent">
            <CardContent className="p-0 h-full">
              <div className="relative w-full h-full">
                {/* Overlay de carga */}
                {loading && (
                  <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-yellow-400 text-sm">Cargando mapa...</p>
                    </div>
                  </div>
                )}

                {/* Contenedor del mapa */}
                <GoogleMapsContainer
                  ref={googleMapsRef}
                  onMapReady={handleMapReady}
                  onError={handleMapError}
                  className="w-full h-full"
                />

                {/* Controles del mapa */}
                {isMapLoaded && (
                  <div className="absolute top-4 left-4 z-20 space-y-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={loadRepartidoresLive}
                      className="bg-zinc-800/90 hover:bg-zinc-700/90 backdrop-blur"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Actualizar
                    </Button>
                  </div>
                )}

                {/* Indicador de filtros activos */}
                {isMapLoaded && (filtros.estado !== 'todos' || filtros.tipoVehiculo !== 'todos' || filtros.soloEnLinea) && (
                  <div className="absolute top-4 right-4 z-20 bg-zinc-800/90 backdrop-blur rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2 text-sm text-white">
                      <Filter className="w-4 h-4 text-yellow-400" />
                      <span>Filtros activos</span>
                      <Badge variant="outline" className="ml-1">
                        {repartidoresFiltrados.length} visibles
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de repartidores */}
        <div className="h-64 bg-zinc-900 border-t border-zinc-800 overflow-y-auto">
          <div className="p-4">
            <Card className="bg-zinc-900 border-yellow-400/20">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center text-white text-lg">
                  <Users className="w-5 h-5 mr-2 text-yellow-400" />
                  Repartidores Activos
                  {trackingData.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {repartidoresFiltrados.length} de {trackingData.length} visibles
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trackingData.length === 0 ? (
                  <p className="text-center text-muted">No hay datos de tracking disponibles</p>
                ) : repartidoresFiltrados.length === 0 ? (
                  <p className="text-center text-muted">No hay repartidores que coincidan con los filtros</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {repartidoresFiltrados.map((repartidor) => (
                      <div 
                        key={repartidor.repartidorId}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedRepartidor === repartidor.repartidorId
                            ? 'border-yellow-400 bg-yellow-400/10'
                            : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700'
                        }`}
                        onClick={() => selectRepartidor(repartidor.repartidorId)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Truck className="w-4 h-4 text-yellow-400" />
                            <span className="font-medium text-white truncate">{repartidor.nombre}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div 
                              className={`w-2 h-2 rounded-full ${
                                repartidor.isOnline ? 'bg-green-400' : 'bg-gray-500'
                              }`}
                            />
                            <Badge variant={getStatusBadgeVariant(repartidor.location.status)} className="text-xs">
                              {repartidor.location.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                          <span className="truncate">🚗 {repartidor.tipo_vehiculo}</span>
                          <span>⚡ {repartidor.location.speed} km/h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 