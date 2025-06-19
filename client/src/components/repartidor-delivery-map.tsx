import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GoogleMapsContainer, GoogleMapsHandle } from './google-maps-container';
import { MapPin, Navigation, User } from 'lucide-react';

interface DeliveryMapProps {
  pedido: {
    id: string | number;
    latitud: string;
    longitud: string;
    direccion: string;
  };
  repartidorNombre?: string;
  className?: string;
}

export function RepartidorDeliveryMap({ pedido, repartidorNombre, className = "" }: DeliveryMapProps) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repartidorLocation, setRepartidorLocation] = useState({ lat: 19.4326, lng: -99.1332 }); // Default CDMX center
  
  const mapRef = useRef<GoogleMapsHandle>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Array<any>>([]);
  const { toast } = useToast();

  // Obtener ubicación simulada del repartidor basada en su nombre
  const getRepartidorLocation = (nombre?: string) => {
    // Ubicaciones demo para diferentes repartidores
    const repartidorLocations: Record<string, { lat: number; lng: number }> = {
      'Juan Pérez': { lat: 19.4326, lng: -99.1332 }, // Centro CDMX
      'Ana López': { lat: 19.4284, lng: -99.1276 }, // Roma Norte
      'Carlos Ruiz': { lat: 19.4378, lng: -99.1419 }, // Condesa
      'María Torres': { lat: 19.4194, lng: -99.1438 }, // Doctores
      'Roberto Silva': { lat: 19.4450, lng: -99.1310 }, // Polanco
    };

    return repartidorLocations[nombre || ''] || { lat: 19.4326, lng: -99.1332 };
  };

  // Inicializar el mapa
  const initializeMap = async () => {
    if (isMapLoaded) return;
    
    setLoading(true);
    try {
      console.log('🗺️ Inicializando mapa de entrega...');
      
      if (!mapRef.current) {
        throw new Error('Referencia del mapa no disponible');
      }

      await mapRef.current.initializeMap();
      mapInstanceRef.current = mapRef.current.getMap();
      
      if (mapInstanceRef.current) {
        setIsMapLoaded(true);
        console.log('✅ Mapa de entrega inicializado');
        
        // Obtener ubicación del repartidor
        const repLocation = getRepartidorLocation(repartidorNombre);
        setRepartidorLocation(repLocation);
        
        // Crear marcadores
        createMarkers(repLocation);
      }
    } catch (error) {
      console.error('❌ Error inicializando mapa de entrega:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el mapa',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Crear marcadores para repartidor y cliente
  const createMarkers = (repLocation: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current || !(window as any).google) {
      console.log('⚠️ Mapa no disponible para marcadores');
      return;
    }

    console.log('📍 Creando marcadores de entrega...');

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current = [];

    const google = (window as any).google;
    const clientLocation = {
      lat: parseFloat(pedido.latitud),
      lng: parseFloat(pedido.longitud)
    };

    // Marcador del repartidor (ubicación actual)
    const repartidorMarker = new google.maps.Marker({
      position: repLocation,
      map: mapInstanceRef.current,
      title: `${repartidorNombre || 'Repartidor'} - Ubicación actual`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#10b981', // Verde para repartidor
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });

    // Info window del repartidor
    const repartidorInfo = new google.maps.InfoWindow({
      content: `
        <div style="color: black; padding: 8px; min-width: 150px;">
          <h4 style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            👤 ${repartidorNombre || 'Repartidor'}
          </h4>
          <div style="margin-bottom: 4px; font-size: 12px;">
            📍 <strong>Ubicación actual</strong>
          </div>
          <div style="font-size: 11px; color: #6b7280;">
            🕐 En tiempo real
          </div>
        </div>
      `
    });

    repartidorMarker.addListener('click', () => {
      // Cerrar otros info windows
      markersRef.current.forEach((marker) => {
        if (marker.infoWindow) {
          marker.infoWindow.close();
        }
      });
      repartidorInfo.open(mapInstanceRef.current, repartidorMarker);
    });

    repartidorMarker.infoWindow = repartidorInfo;
    markersRef.current.push(repartidorMarker);

    // Marcador del cliente (destino)
    const clientMarker = new google.maps.Marker({
      position: clientLocation,
      map: mapInstanceRef.current,
      title: `Cliente - ${pedido.direccion}`,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#f59e0b', // Amarillo para cliente
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });

    // Info window del cliente
    const clientInfo = new google.maps.InfoWindow({
      content: `
        <div style="color: black; padding: 8px; min-width: 180px;">
          <h4 style="margin: 0 0 6px 0; color: #1f2937; font-size: 14px;">
            🏠 Destino de entrega
          </h4>
          <div style="margin-bottom: 4px; font-size: 12px;">
            📍 <strong>${pedido.direccion}</strong>
          </div>
          <div style="margin-bottom: 4px; font-size: 12px;">
            🎯 Pedido #${pedido.id}
          </div>
          <div style="font-size: 11px; color: #6b7280;">
            📋 ${pedido.latitud}, ${pedido.longitud}
          </div>
        </div>
      `
    });

    clientMarker.addListener('click', () => {
      // Cerrar otros info windows
      markersRef.current.forEach((marker) => {
        if (marker.infoWindow) {
          marker.infoWindow.close();
        }
      });
      clientInfo.open(mapInstanceRef.current, clientMarker);
    });

    clientMarker.infoWindow = clientInfo;
    markersRef.current.push(clientMarker);

    // Crear ruta opcional entre repartidor y cliente
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // No mostrar marcadores por defecto
      polylineOptions: {
        strokeColor: '#fbbf24',
        strokeWeight: 3,
        strokeOpacity: 0.8
      }
    });

    directionsRenderer.setMap(mapInstanceRef.current);

    // Calcular ruta
    directionsService.route({
      origin: repLocation,
      destination: clientLocation,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result: any, status: any) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        console.log('✅ Ruta calculada');
      } else {
        console.log('⚠️ No se pudo calcular la ruta:', status);
      }
    });

    // Ajustar vista para mostrar ambos marcadores
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(repLocation);
    bounds.extend(clientLocation);
    mapInstanceRef.current.fitBounds(bounds);
    
    // Asegurar un zoom mínimo
    google.maps.event.addListenerOnce(mapInstanceRef.current, 'bounds_changed', () => {
      if (mapInstanceRef.current.getZoom() > 15) {
        mapInstanceRef.current.setZoom(15);
      }
    });
  };

  // Auto-inicializar cuando el componente se monta
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeMap();
    }, 300);

    return () => clearTimeout(timer);
  }, [pedido.id, repartidorNombre]);

  // Actualizar marcadores cuando cambie el pedido
  useEffect(() => {
    if (isMapLoaded && repartidorLocation) {
      const repLocation = getRepartidorLocation(repartidorNombre);
      setRepartidorLocation(repLocation);
      createMarkers(repLocation);
    }
  }, [pedido.id, pedido.latitud, pedido.longitud, repartidorNombre]);

  return (
    <div className={`bg-zinc-700 rounded-lg h-32 relative overflow-hidden ${className}`}>
      {/* Overlay de carga */}
      {loading && (
        <div className="absolute inset-0 bg-zinc-800/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
            <p className="text-yellow-400 text-xs">Cargando ruta...</p>
          </div>
        </div>
      )}

      {/* Indicadores de leyenda */}
      {isMapLoaded && (
        <div className="absolute top-2 left-2 z-10 space-y-1">
          <div className="flex items-center space-x-1 bg-zinc-900/80 backdrop-blur-sm rounded px-2 py-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-white">Tú</span>
          </div>
          <div className="flex items-center space-x-1 bg-zinc-900/80 backdrop-blur-sm rounded px-2 py-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-xs text-white">Cliente</span>
          </div>
        </div>
      )}

      {/* Contenedor del mapa */}
      <GoogleMapsContainer
        ref={mapRef}
        className="w-full h-full"
        onMapReady={(map) => {
          console.log('🗺️ Mapa de entrega listo');
          mapInstanceRef.current = map;
        }}
        onError={(error) => {
          console.error('❌ Error en mapa de entrega:', error);
          toast({
            title: 'Error',
            description: 'No se pudo cargar el mapa',
            variant: 'destructive'
          });
        }}
      />

      {/* Fallback cuando no hay mapa */}
      {!isMapLoaded && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm text-muted">Ubicación del cliente</p>
            <p className="text-xs text-subtle">{pedido.latitud}, {pedido.longitud}</p>
            <p className="text-xs text-white mt-1">{pedido.direccion}</p>
          </div>
        </div>
      )}
    </div>
  );
} 