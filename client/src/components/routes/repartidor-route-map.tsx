import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GoogleMapsContainer, GoogleMapsHandle } from '../google-maps-container';
import { createRouteFromRutaActual } from '@/lib/google-routes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { fetchRepartidorLive } from '@/lib/utils';

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
      };
    };
  }
}

interface RepartidorRouteMapProps {
  repartidorId: number;
  repartidorNombre: string;
  currentLocation: {
    lat: number;
    lng: number;
    status: string;
  };
}

// Utilidad para asociar un marcador personalizado a una instancia de mapa sin modificar el tipo original
const customMarkerMap = new WeakMap<google.maps.Map, google.maps.Marker>();

export function RepartidorRouteMap({ repartidorId, repartidorNombre, currentLocation }: RepartidorRouteMapProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  const mapRef = useRef<GoogleMapsHandle>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const { toast } = useToast();

  // Inicializar mapa
  const initializeMap = async () => {
    if (isMapLoaded) return;
    setLoading(true);
    try {
      await mapRef.current?.initializeMap();
      const map = mapRef.current?.getMap();
      if (map) {
        mapInstanceRef.current = map;
        setIsMapLoaded(true);
        // Centrar en ubicación actual del repartidor
        const latLng = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
        map.setCenter(latLng);
        map.setZoom(14);
        // Cargar ruta inicial
        await loadRoute();
      }
    } catch (error) {
      console.error('❌ Error inicializando mapa de ruta:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el mapa',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar ruta y puntos del repartidor usando /repartidores/:id/live
  const loadRoute = async () => {
    if (!isMapLoaded || !mapInstanceRef.current) return;
    setLoadingRoute(true);
    try {
      // Limpiar marcador previo
      const map = mapInstanceRef.current;
      if (map && customMarkerMap.has(map)) {
        const prevMarker = customMarkerMap.get(map);
        if (prevMarker) prevMarker.setMap(null);
        customMarkerMap.delete(map);
      }
      // Limpiar rutas previas
      // (asume que createRouteFromRutaActual limpia la anterior)
      // Obtener datos live
      const repartidorLive = await fetchRepartidorLive(repartidorId);
      const rutaActual = repartidorLive?.ruta_actual || [];
      // Si hay más de un punto, dibujar la ruta
      if (rutaActual.length > 1) {
        await createRouteFromRutaActual(
          repartidorId,
          repartidorNombre,
          rutaActual,
          mapInstanceRef.current
        );
        setLastUpdate(new Date().toLocaleTimeString());
        toast({
          title: '✅ Ruta actualizada',
          description: `${rutaActual.length - 1} paradas en la ruta`,
        });
      } else if (rutaActual.length === 1) {
        // Solo ubicación actual: mostrar marcador
        const punto = rutaActual[0];
        const marker = new window.google.maps.Marker({
          position: { lat: punto.lat, lng: punto.lng },
          map: mapInstanceRef.current,
          title: repartidorNombre,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style='color: black; padding: 10px; min-width: 180px;'>
              <h4 style='margin: 0 0 6px 0; color: #1f2937; font-size: 15px;'>${repartidorNombre}</h4>
              <div style='margin-bottom: 4px; font-size: 13px;'>
                <strong>📍 Sin ruta activa</strong>
              </div>
              <div style='font-size: 12px; color: #6b7280;'>Esta es tu ubicación actual</div>
            </div>
          `
        });
        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });
        infoWindow.open(mapInstanceRef.current, marker);
        if (map) customMarkerMap.set(map, marker);
        setLastUpdate(new Date().toLocaleTimeString());
        toast({
          title: 'ℹ️ Sin ruta activa',
          description: 'No tienes una ruta asignada en este momento',
        });
      } else {
        // No hay datos
        setLastUpdate(new Date().toLocaleTimeString());
        toast({
          title: 'ℹ️ Sin datos',
          description: 'No se encontró información de ruta ni ubicación',
        });
      }
    } catch (error) {
      console.error('Error cargando ruta:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la ruta',
        variant: 'destructive'
      });
    } finally {
      setLoadingRoute(false);
    }
  };

  // Auto-inicializar cuando el componente se monta
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeMap();
    }, 500);
    return () => {
      clearTimeout(timer);
      // Limpiar marcador al desmontar
      const map = mapInstanceRef.current;
      if (map && customMarkerMap.has(map)) {
        const prevMarker = customMarkerMap.get(map);
        if (prevMarker) prevMarker.setMap(null);
        customMarkerMap.delete(map);
      }
    };
  }, []);

  // Actualizar ruta cuando cambia la ubicación
  useEffect(() => {
    if (isMapLoaded && mapInstanceRef.current) {
      // Centrar siempre en la ubicación actual
      const latLng = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
      mapInstanceRef.current.setCenter(latLng);
      mapInstanceRef.current.setZoom(14);
      loadRoute();
    }
  }, [currentLocation.lat, currentLocation.lng]);

  return (
    <Card className="w-full h-[400px] relative">
      <CardHeader className="absolute top-0 left-0 right-0 z-10 bg-zinc-900/95 p-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Mi Ruta Actual</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="bg-zinc-800 px-2 py-1 rounded text-xs text-muted">
              {lastUpdate ? `Última actualización: ${lastUpdate}` : 'Cargando...'}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={loadRoute}
              disabled={loadingRoute}
              className="bg-zinc-800 hover:bg-zinc-700"
            >
              {loadingRoute ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
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
            ref={mapRef}
            className="w-full h-full"
            onMapReady={(map) => {
              mapInstanceRef.current = map;
              setIsMapLoaded(true);
              setLoading(false);
              // Centrar en ubicación actual
              const latLng = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
              map.setCenter(latLng);
              map.setZoom(14);
              loadRoute();
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
} 