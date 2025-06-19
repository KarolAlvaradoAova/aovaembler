import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface GoogleMapsContainerProps {
  onMapReady?: (map: any) => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface GoogleMapsHandle {
  initializeMap: () => Promise<void>;
  getMap: () => any;
  isLoaded: () => boolean;
}

const API_KEY = 'AIzaSyBbqyucvWlUgQIT8iB9fhORgBZAt4HllU0';

export const GoogleMapsContainer = forwardRef<GoogleMapsHandle, GoogleMapsContainerProps>(
  ({ onMapReady, onError, className, style }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const isLoadedRef = useRef(false);
    const callbackNameRef = useRef<string>(`initGoogleMaps_${Date.now()}_${Math.random()}`);

    useImperativeHandle(ref, () => ({
      initializeMap: async () => {
        return initializeMap();
      },
      getMap: () => mapRef.current,
      isLoaded: () => isLoadedRef.current
    }));

          const initializeMap = async (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const sessionId = Date.now();
        try {
          console.log(`🗺️ [${sessionId}] GoogleMapsContainer.initializeMap iniciando...`);
          console.log(`🔑 [${sessionId}] API Key:`, API_KEY ? 'Presente' : 'Ausente');
          console.log(`🌐 [${sessionId}] Window.google:`, !!(window as any).google);
          console.log(`🗺️ [${sessionId}] Window.google.maps:`, !!(window as any).google?.maps);
          console.log(`📦 [${sessionId}] Container ref:`, !!containerRef.current);
          console.log(`🏁 [${sessionId}] isLoadedRef:`, isLoadedRef.current);
          console.log(`🗄️ [${sessionId}] mapRef:`, !!mapRef.current);

        if (isLoadedRef.current && mapRef.current) {
          console.log('✅ Mapa ya está inicializado');
          onMapReady?.(mapRef.current);
          resolve();
          return;
        }

        if (!containerRef.current) {
          const error = 'Contenedor no encontrado';
          console.error('❌', error);
          onError?.(error);
          reject(new Error(error));
          return;
        }

        // Verificar si Google Maps ya está disponible
        if ((window as any).google?.maps) {
          console.log('📍 Google Maps ya disponible, creando mapa...');
          createMap();
          resolve();
          return;
        }

        // Intentar método simple primero (sin callback)
        if (!API_KEY) {
          const error = 'API Key de Google Maps no configurada';
          console.error('❌', error);
          onError?.(error);
          reject(new Error(error));
          return;
        }

                          // Verificar si ya hay un script cargándose
          const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
          if (existingScript) {
            console.log('⏳ Script existente encontrado:', (existingScript as HTMLScriptElement).src);
            
            // Si ha pasado mucho tiempo, eliminar el script problemático
            console.log('🧹 Eliminando script problemático y creando uno nuevo...');
            existingScript.remove();
            
            // Limpiar callbacks globales problemáticos
            Object.keys(window).forEach(key => {
              if (key.startsWith('initGoogleMaps_')) {
                console.log('🧹 Eliminando callback global:', key);
                delete (window as any)[key];
              }
            });
          }

          // Crear callback único
          const callbackName = callbackNameRef.current;
          (window as any)[callbackName] = () => {
            console.log('✅ Callback de Google Maps ejecutado:', callbackName);
            createMap();
            resolve();
            // Limpiar el callback después de usar
            delete (window as any)[callbackName];
          };

          // Cargar script con timeout
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry&callback=${callbackName}`;
          script.async = true;
          script.defer = true;
          script.onerror = (error) => {
            const errorMsg = 'Error cargando Google Maps script';
            console.error('❌', errorMsg, error);
            onError?.(errorMsg);
            reject(new Error(errorMsg));
          };

          // Timeout agresivo de 15 segundos
          const timeoutId = setTimeout(() => {
            if (!isLoadedRef.current) {
              const errorMsg = 'Timeout: Google Maps no se cargó en 15 segundos';
              console.error('❌', errorMsg);
              script.remove();
              delete (window as any)[callbackName];
              onError?.(errorMsg);
              reject(new Error(errorMsg));
            }
          }, 15000);

          // Limpiar timeout cuando se resuelva
          const originalResolve = resolve;
          resolve = () => {
            clearTimeout(timeoutId);
            originalResolve();
          };

          document.head.appendChild(script);
          console.log('📜 Script agregado con callback:', callbackName);
          console.log('⏰ Timeout configurado para 15 segundos');

        } catch (error) {
          console.error('❌ Error en initializeMap:', error);
          onError?.(error as string);
          reject(error);
        }
      });
    };

    const createMap = () => {
      try {
        if (!containerRef.current) {
          console.error('❌ Contenedor no disponible para crear mapa');
          return;
        }

        if (!(window as any).google?.maps) {
          console.error('❌ Google Maps no disponible');
          return;
        }

        console.log('🎯 Creando instancia de Google Maps...');

        // Limpiar contenedor de forma segura
        const container = containerRef.current;
        container.innerHTML = '';

        // Crear mapa
        const map = new (window as any).google.maps.Map(container, {
          center: { lat: 19.4326, lng: -99.1332 },
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
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

        mapRef.current = map;
        isLoadedRef.current = true;

        console.log('✅ Google Maps creado exitosamente');
        onMapReady?.(map);

      } catch (error) {
        console.error('❌ Error creando mapa:', error);
        onError?.(error as string);
      }
    };

    // Cleanup
    useEffect(() => {
      return () => {
        console.log('🧹 Limpiando GoogleMapsContainer...');
        
        // Limpiar callback si existe
        const callbackName = callbackNameRef.current;
        if ((window as any)[callbackName]) {
          delete (window as any)[callbackName];
        }

        // Reset refs
        mapRef.current = null;
        isLoadedRef.current = false;
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={className}
        style={style}
      />
    );
  }
);

GoogleMapsContainer.displayName = 'GoogleMapsContainer'; 