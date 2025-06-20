import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GoogleMapsContainer, GoogleMapsHandle } from './google-maps-container';
import { fetchRepartidoresLive } from '@/lib/utils';

// Definir tipo para la instancia de Google Maps
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        LatLng: any;
        DirectionsService: any;
        DirectionsRenderer: any;
        TravelMode: any;
        SymbolPath: any;
        Marker: any;
        InfoWindow: any;
      };
    };
  }
}

// Extender el tipo Marker para incluir infoWindow
interface CustomMarker extends google.maps.Marker {
  infoWindow?: google.maps.InfoWindow;
}

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

export function DashboardRealTimeMap() {
  const [trackingData, setTrackingData] = useState<RepartidorTracking[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('Nunca');
  const [selectedRepartidor, setSelectedRepartidor] = useState<number | null>(null);
  
  const mapRef = useRef<GoogleMapsHandle>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, CustomMarker>>(new Map());
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Función para obtener color según el estado (para marcadores de repartidores)
  const getRepartidorStatusColor = (status: string): string => {
    switch (status) {
      case 'en_ruta': return '#f59e0b';
      case 'entregando': return '#10b981';
      case 'disponible': return '#3b82f6';
      case 'regresando': return '#8b5cf6';
      case 'descanso': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Función para obtener texto descriptivo del estado (para repartidores)
  const getRepartidorStatusText = (status: string): string => {
    switch (status) {
      case 'en_ruta': return 'En ruta';
      case 'entregando': return 'Entregando';
      case 'disponible': return 'Disponible';
      case 'regresando': return 'Regresando';
      case 'descanso': return 'En descanso';
      default: return status;
    }
  };

  // Inicializar mapa
  const initializeMap = async () => {
    if (isMapLoaded) return;
    
    setLoading(true);
    try {
      const mapInstance = await mapRef.current?.initializeMap();
      
      if (mapInstance) {
        const googleMap = mapRef.current?.getMap();
        if (googleMap) {
          // Configurar el mapa después de inicializarlo
          googleMap.setCenter({ lat: 19.4326, lng: -99.1332 }); // Centro de CDMX
          googleMap.setZoom(12);
          googleMap.setOptions({
            styles: [
              {
                featureType: 'all',
                elementType: 'geometry.fill',
                stylers: [{ color: '#1f2937' }]
              },
              {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#374151' }]
              },
              {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ color: '#4b5563' }]
              }
            ]
          });

          mapInstanceRef.current = googleMap;
          setIsMapLoaded(true);
          loadTrackingData();
        }
      }
    } catch (error) {
      console.error('❌ Error inicializando mapa:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el mapa',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar datos de tracking en tiempo real (SOLO UBICACIONES ACTUALES)
  const loadTrackingData = async () => {
    if (!mapInstanceRef.current) {
      console.error('❌ Mapa no disponible');
      return;
    }

    try {
      console.log('📍 Cargando datos de tracking para dashboard...');
      // USAR LA MISMA FUNCIÓN QUE EL GPS TRACKING
      const repartidoresLive = await fetchRepartidoresLive();
      
      const trackingData = repartidoresLive.map((r: any) => ({
        repartidorId: Number(r.repartidorId),
        nombre: r.nombre,
        tipo_vehiculo: r.tipo_vehiculo,
        location: {
          lat: r.location.lat,
          lng: r.location.lng,
          lastUpdate: r.location.lastUpdate,
          status: r.location.status,
          speed: r.location.speed || 0
        },
        isOnline: r.isOnline
      }));
      
      setTrackingData(trackingData);
      updateMapMarkers(trackingData);
      
      setLastUpdate(new Date().toLocaleTimeString());
      console.log(`✅ ${trackingData.length} repartidores actualizados en el dashboard`);
      
    } catch (error) {
      console.error('❌ Error cargando tracking en dashboard:', error);
    }
  };

  // Función para actualizar marcadores en el mapa (SOLO UBICACIONES ACTUALES)
  const updateMapMarkers = (data: RepartidorTracking[]) => {
    if (!mapInstanceRef.current || !(window as any).google) {
      console.log('⚠️ Mapa no disponible para marcadores');
      return;
    }

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current.clear();

    // Agregar nuevos marcadores (SOLO UBICACIONES ACTUALES)
    data.forEach(repartidor => {
      if (!repartidor.isOnline) return;

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
          fillColor: getRepartidorStatusColor(repartidor.location.status),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      const infoWindow = new (window as any).google.maps.InfoWindow({
        content: `
          <div style="color: black; padding: 8px; min-width: 150px;">
            <h4 style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
              ${repartidor.nombre}
            </h4>
            <div style="margin-bottom: 4px; font-size: 12px;">
              <strong>🚲</strong> ${repartidor.tipo_vehiculo}
            </div>
            <div style="margin-bottom: 4px; font-size: 12px;">
              <strong>📍</strong> 
              <span style="color: ${getRepartidorStatusColor(repartidor.location.status)}; font-weight: bold;">
                ${getRepartidorStatusText(repartidor.location.status)}
              </span>
            </div>
            <div style="font-size: 11px; color: #6b7280;">
              ⚡ ${repartidor.location.speed} km/h
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        // Cerrar otros info windows
        markersRef.current.forEach((otherMarker) => {
          if (otherMarker.infoWindow) {
            otherMarker.infoWindow.close();
          }
        });
        
        infoWindow.open(mapInstanceRef.current, marker);
        setSelectedRepartidor(repartidor.repartidorId);
      });

      marker.infoWindow = infoWindow;
      markersRef.current.set(repartidor.repartidorId, marker);
    });
  };

  // Función para centrar el mapa en un repartidor
  const centerOnRepartidor = (repartidorId: number) => {
    const repartidor = trackingData.find(r => r.repartidorId === repartidorId);
    if (repartidor && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({
        lat: repartidor.location.lat,
        lng: repartidor.location.lng
      });
      mapInstanceRef.current.setZoom(14);
      setSelectedRepartidor(repartidorId);
    }
  };

  // Auto-inicializar el mapa cuando el componente se monta
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeMap();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!isMapLoaded) return;

    const interval = setInterval(() => {
      loadTrackingData();
    }, 30000);

    return () => clearInterval(interval);
  }, [isMapLoaded]);

  const handleMapReady = (map: any) => {
    mapInstanceRef.current = map;
    setIsMapLoaded(true);
    setLoading(false);
    // Cargar datos inmediatamente
    setTimeout(() => {
      if (mapInstanceRef.current) {
        loadTrackingData();
      }
    }, 300);
    // Iniciar ciclo de actualización
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (mapInstanceRef.current) loadTrackingData();
    }, 30000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      markersRef.current.forEach(marker => marker.setMap && marker.setMap(null));
      markersRef.current.clear();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Mapa */}
      <div className="bg-zinc-800 rounded-xl h-48 relative overflow-hidden">
        {/* Overlay de carga */}
        {loading && (
          <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-yellow-400 text-sm">Cargando mapa...</p>
            </div>
          </div>
        )}

        {/* Indicador de estado */}
        {isMapLoaded && (
          <div className="absolute top-2 right-2 z-10 bg-zinc-900/80 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">En vivo</span>
            </div>
          </div>
        )}

        {/* Contador de repartidores */}
        {isMapLoaded && trackingData.length > 0 && (
          <div className="absolute bottom-2 left-2 z-10 bg-zinc-900/80 backdrop-blur-sm rounded-lg px-3 py-1">
            <span className="text-xs text-yellow-400 font-medium">
              {trackingData.filter(r => r.isOnline).length} activos
            </span>
          </div>
        )}

        {/* Contenedor del mapa */}
        <GoogleMapsContainer ref={mapRef} onMapReady={handleMapReady} className="w-full h-full" />
      </div>

      {/* Panel de repartidores debajo del mapa (SOLO NOMBRES) */}
      <div className="h-48 bg-zinc-900 border-t border-zinc-800 overflow-y-auto rounded-xl">
        <div className="p-4">
          <div className="bg-zinc-900 border-yellow-400/20 rounded-lg">
            <div className="py-2 px-3 flex items-center text-white text-base font-semibold">
              <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4V7a4 4 0 00-8 0v3m12 4a4 4 0 01-8 0" /></svg>
              Repartidores Activos
              {trackingData.length > 0 && (
                <span className="ml-2 text-xs bg-yellow-400/20 text-yellow-300 rounded px-2 py-0.5">
                  {trackingData.filter(r => r.isOnline).length} de {trackingData.length} visibles
                </span>
              )}
            </div>
            <div className="p-2">
              {trackingData.length === 0 ? (
                <p className="text-center text-muted">No hay datos de tracking disponibles</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trackingData.filter(r => r.isOnline).map((repartidor) => (
                    <div
                      key={repartidor.repartidorId}
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all shadow-sm bg-zinc-800/90 hover:bg-zinc-700/90 ${
                        selectedRepartidor === repartidor.repartidorId
                          ? 'border-yellow-400 bg-yellow-400/10'
                          : 'border-zinc-700'
                      }`}
                      onClick={() => {
                        setSelectedRepartidor(repartidor.repartidorId);
                        const marker = markersRef.current.get(repartidor.repartidorId);
                        if (mapInstanceRef.current && marker && marker.getPosition) {
                          const pos = marker.getPosition();
                          if (pos) {
                            mapInstanceRef.current.setCenter(pos);
                            mapInstanceRef.current.setZoom(15);
                          }
                        }
                      }}
                    >
                      {/* Badge de estado arriba a la derecha */}
                      <div className="absolute top-2 right-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getRepartidorStatusColor(repartidor.location.status) }}
                        ></div>
                      </div>

                      {/* SOLO NOMBRE */}
                      <div className="flex items-center justify-center h-full">
                        <h4 className="font-semibold text-white text-sm text-center">
                          {repartidor.nombre}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 