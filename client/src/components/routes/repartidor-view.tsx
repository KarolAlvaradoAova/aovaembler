import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ArrowLeft, MoreVertical, Home, Truck, MapPin, Clock, Package, Check, Navigation, Copy, Box, ShoppingBag, ExternalLink, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { fetchPedidos, updatePedidoStatus, fetchRepartidorLive, generateGoogleMapsDirectionsUrl, completeDelivery, updateStopStatus, fetchPedidosFromCSV, fetchUsersFromCSV, notifyDeliveryCompleted, notifyRouteStarted } from '@/lib/utils';
import copy from 'copy-to-clipboard';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Contexto de usuario global (App.tsx lo pasa a Layout y de ahí a children)
const UserContext = React.createContext<any>(null);

export function RepartidorView() {
  // Intentar obtener usuario del contexto, window, o localStorage
  const contextUser = useContext(UserContext);
  const windowUser = (window as any).user;
  const localStorageUser = typeof window !== 'undefined' ? 
    JSON.parse(window.localStorage.getItem('user') || 'null') : null;
  
  const user = contextUser || windowUser || localStorageUser;
  
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [repartidor, setRepartidor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [updatingPedido, setUpdatingPedido] = useState<string | null>(null);
  const [showProductDetails, setShowProductDetails] = useState<{ [key: string]: boolean }>({});
  const [evidencia, setEvidencia] = useState<{ [pedidoId: string]: File | null }>({});
  const [evidenciaPreview, setEvidenciaPreview] = useState<{ [pedidoId: string]: string }>({});
  const [activeTab, setActiveTab] = useState('entregas');
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Estado para la ubicación actual del repartidor
  const [currentLocation, setCurrentLocation] = useState({
    lat: 19.4326,
    lng: -99.1332,
    status: 'disponible'
  });

  // NUEVA FUNCIÓN: Cargar pedidos desde la ruta activa y pedidosdb.csv
  const loadPedidos = useCallback(async () => {
    try {
      // 1. Obtener usuario repartidor
      const users = await fetchUsersFromCSV();
      const rep = users.find((u: any) => u.name_u === user?.nombre && u.type_u === 'repartidor');
      setRepartidor(rep);
      if (!rep) {
        setPedidos([]);
        return;
      }
      // 2. Leer archivo de ruta activa
      const routeRes = await fetch(`/data/routes/route_${rep.id_u}.json`);
      if (!routeRes.ok) {
        setPedidos([]);
        return;
      }
      const routeData = await routeRes.json();
      // 3. Leer todos los pedidos
      const pedidosAll = await fetchPedidosFromCSV();
      // 4. Construir lista de entregas en el orden de la ruta
      const stops = (routeData.stops || []).filter((s: any) => s.type === 'delivery');
      const pedidosRuta = stops.map((stop: any) => {
        const pedido = pedidosAll.find((p: any) => String(p.id_p) === String(stop.pedido_id));
        if (!pedido) return null;
        // Adaptar campos para la UI existente
        return {
          ...pedido,
          id: pedido.id_p,
          direccion: pedido.loc_p,
          latitud: pedido.lat,
          longitud: pedido.long,
          sucursal_asignada: pedido.suc_p,
          productos: pedido.prod_p,
          productos_detalle: pedido.prode_p,
          estado: pedido.sta_p,
          pedido_id: pedido.id_p,
          // Puedes agregar más campos si la UI los requiere
        };
      }).filter(Boolean);
      // 5. Mostrar pedidos pendientes arriba y entregados abajo
      const pendientes = pedidosRuta.filter((p: any) => p.estado !== 'entregado');
      const entregados = pedidosRuta.filter((p: any) => p.estado === 'entregado');
      setPedidos([...pendientes, ...entregados]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ 
        title: 'Error', 
        description: 'No se pudieron cargar los pedidos',
        variant: 'destructive'
      });
      setPedidos([]);
    }
  }, [user?.nombre, toast]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (user?.nombre) {
        await loadPedidos();
      }
      setLoading(false);
    };
    
    load();
  }, [user?.nombre, loadPedidos]);

  // Simular actualización de ubicación cada 30 segundos
  useEffect(() => {
    if (!repartidor) return;

    const updateLocation = () => {
      // Obtener ubicación simulada basada en el nombre del repartidor
      const repartidorLocations: Record<string, { lat: number; lng: number }> = {
        'Juan Pérez': { lat: 19.4326, lng: -99.1332 }, // Centro CDMX
        'Ana López': { lat: 19.4284, lng: -99.1276 }, // Roma Norte
        'Carlos Ruiz': { lat: 19.4378, lng: -99.1419 }, // Condesa
        'María Torres': { lat: 19.4194, lng: -99.1438 }, // Doctores
        'Roberto Silva': { lat: 19.4450, lng: -99.1310 }, // Polanco
      };

      const baseLocation = repartidorLocations[repartidor.nombre] || { lat: 19.4326, lng: -99.1332 };
      
      // Agregar pequeña variación aleatoria para simular movimiento
      const variation = 0.001; // Aproximadamente 100 metros
      const newLocation = {
        lat: baseLocation.lat + (Math.random() - 0.5) * variation,
        lng: baseLocation.lng + (Math.random() - 0.5) * variation,
        status: currentLocation.status
      };

      setCurrentLocation(newLocation);
    };

    // Actualizar inmediatamente y luego cada 30 segundos
    updateLocation();
    const interval = setInterval(updateLocation, 30000);

    return () => clearInterval(interval);
  }, [repartidor]);

  const handleOpenGoogleMaps = (pedido: any) => {
    const coordinates = `${pedido.latitud},${pedido.longitud}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
    window.open(url, '_blank');
  };

  // Funciones simplificadas para CSV - sin productos detallados

  // NUEVA FUNCIÓN SIMPLIFICADA
  const handleUpdatePedidoStatus = async (pedidoId: string | number, newStatus: string, actionName: string) => {
    console.log('🚀 Actualizando pedido en backend:', { pedidoId, newStatus, actionName });
    
    try {
      // Mostrar estado de carga
      setUpdatingPedido(String(pedidoId));
      
      // 1. Actualizar pedido en backend
      await updatePedidoStatus(pedidoId, newStatus);
      
      // 2. Si se está marcando como entregado, actualizar también la ruta
      if (newStatus === 'entregado' && repartidor) {
        console.log('📦 Pedido entregado, actualizando ruta del repartidor...');
        
        try {
          // Obtener evidencia si existe
          const evidenciaFile = evidencia[String(pedidoId)];
          let deliveryEvidence = '';
          
          if (evidenciaFile) {
            // ✅ CORREGIDO: Convertir archivo a base64 de forma asíncrona
            deliveryEvidence = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(evidenciaFile);
            });
          }
          
          // Actualizar estado de la parada en la ruta
          const stopResult = await updateStopStatus(repartidor.id, pedidoId, 'completed', deliveryEvidence);
          console.log('✅ Parada actualizada en ruta:', stopResult);
          
          // ✅ NUEVO: Notificar entrega completada al servicio de estados
          try {
            await notifyDeliveryCompleted(repartidor.id, pedidoId);
            console.log('📊 Estado del repartidor actualizado automáticamente');
          } catch (statusError) {
            console.error('⚠️ Error notificando entrega completada:', statusError);
          }
          
          // Si completó toda la ruta, mostrar mensaje especial
          if (stopResult.rutaCompletada) {
            toast({
              title: '🎉 ¡Ruta completada!',
              description: 'Has terminado todas tus entregas. Ruta finalizada.',
              duration: 3000
            });
          }
          
        } catch (routeError) {
          console.error('⚠️ Error actualizando ruta, pero pedido se actualizó:', routeError);
          // No fallar la operación principal si hay error en la ruta
        }
      }
      
      // 3. Si se está marcando como en_ruta, notificar inicio de ruta
      if (newStatus === 'en_ruta' && repartidor) {
        try {
          await notifyRouteStarted(repartidor.id);
          console.log('🚀 Inicio de ruta notificado al servicio de estados');
        } catch (statusError) {
          console.error('⚠️ Error notificando inicio de ruta:', statusError);
        }
      }
      
      // 4. Recargar datos desde backend
      await loadPedidos();
      
      // 5. Mostrar mensaje de éxito
      toast({
        title: '✅ Estado actualizado',
        description: `${actionName} realizada exitosamente`,
        duration: 2000
      });
      
      console.log('🎉 Actualización completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error:', error);
      toast({
        title: '❌ Error',
        description: 'No se pudo actualizar el pedido',
        variant: 'destructive'
      });
    } finally {
      // Limpiar estados
      setUpdatingPedido(null);
      setSelected(null);
      
      // Limpiar evidencia después de completar entrega
      if (newStatus === 'entregado') {
        setEvidencia(prev => ({ ...prev, [String(pedidoId)]: null }));
        setEvidenciaPreview(prev => ({ ...prev, [String(pedidoId)]: '' }));
      }
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'status-info';
      case 'surtido': return 'status-info';
      case 'recogido': return 'status-warning';
      case 'en_ruta': return 'status-warning';
      case 'en_ubicacion': return 'status-warning';
      case 'entregado': return 'status-success';
      default: return 'status-info';
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'surtido': return 'Surtido';
      case 'recogido': return 'Recogido';
      case 'en_ruta': return 'En ruta';
      case 'en_ubicacion': return 'En ubicación';
      case 'entregado': return 'Entregado';
      default: return 'Desconocido';
    }
  };

  // Función para calcular ETA estimado basado en la distancia
  const calculateETA = (latitud: number, longitud: number) => {
    // Simulación simple de ETA basada en distancia desde centro CDMX
    const distance = Math.sqrt(
      Math.pow(latitud - 19.4326, 2) + Math.pow(longitud - (-99.1332), 2)
    );
    const estimatedMinutes = Math.round(15 + distance * 100); // Base 15 min + distancia
    return `~${estimatedMinutes} min`;
  };

  // Función para parsear productos detallados
  const parseProductosDetalle = (productosStr: string, detallesJSON?: string) => {
    try {
      // Primero parseamos los detalles JSON si están disponibles
      let detalles: { codigo: string; nombre: string; cantidad: number }[] = [];
      if (detallesJSON) {
        try {
          detalles = JSON.parse(detallesJSON);
        } catch (e) {
          console.error('Error parsing prode_p:', e);
        }
      }

      // Luego parseamos la cadena de productos
      // El formato es "1x11427512300-100,2x2711800109"
      const productos = productosStr.split(',').map(item => {
        const [cantidad, codigoCompleto] = item.trim().split('x');
        // Algunos códigos pueden tener un sufijo después de un espacio
        const codigo = codigoCompleto.split(' ')[0].trim();
        
        // Buscar el nombre en los detalles
        const detalle = detalles.find(d => d.codigo === codigo);
        
        return {
          codigo: codigo,
          cantidad: parseInt(cantidad.trim()),
          nombre: detalle ? detalle.nombre : codigo // Usar el nombre del detalle si existe
        };
      });

      return productos;
    } catch (error) {
      console.error('Error parsing productos:', error);
      return [];
    }
  };

  // Función para alternar visibilidad de detalles de productos
  const toggleProductDetails = (pedidoId: string) => {
    setShowProductDetails(prev => ({
      ...prev,
      [pedidoId]: !prev[pedidoId]
    }));
  };

  // Función para determinar las acciones disponibles según el estado
  const getAvailableActions = (estado: string) => {
    type ActionItem = {
      action: string;
      label: string;
      nextStatus: string;
      icon: any;
      color: string;
    };
    
    let actions: ActionItem[];
    
    switch (estado) {
      case 'pendiente':
        actions = []; // No puede hacer nada con pedidos pendientes
        break;
      case 'surtido':
        actions = [{ 
          action: 'recoger', 
          label: 'Recoger pedido', 
          nextStatus: 'recogido', 
          icon: Truck,
          color: 'btn-primary'
        }];
        break;
      case 'recogido':
        actions = [{ 
          action: 'enruta', 
          label: 'Salir en reparto', 
          nextStatus: 'en_ruta', 
          icon: MapPin,
          color: 'btn-warning'
        }];
        break;
      case 'en_ruta':
        actions = [{ 
          action: 'completar', 
          label: 'Marcar como entregado', 
          nextStatus: 'entregado', 
          icon: Check,
          color: 'btn-success'
        }];
        break;
      case 'entregado':
        actions = [];
        break;
      default:
        actions = [];
    }
    
    return actions;
  };

  // Nueva función para manejar la selección de evidencia
  const handleEvidenciaChange = (pedidoId: string, file: File | null) => {
    setEvidencia((prev) => ({ ...prev, [pedidoId]: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenciaPreview((prev) => ({ ...prev, [pedidoId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setEvidenciaPreview((prev) => ({ ...prev, [pedidoId]: '' }));
    }
  };

  // --- Calcular mochila ---
  // Devuelve un objeto {codigo, nombre, cantidadTotal}
  const mochila = React.useMemo(() => {
    const productosMap: Record<string, { codigo: string; nombre: string; cantidad: number }> = {};
    
    // Filtrar pedidos que están en curso (recogido, en_ruta) y no entregados
    const pedidosEnCurso = pedidos.filter(p => 
      ['recogido', 'en_ruta'].includes(p.sta_p) && p.sta_p !== 'entregado'
    );
    
    pedidosEnCurso.forEach(p => {
      let productos: any[] = [];
      
      // Usar prode_p (productos detallados) si está disponible
      if (p.prode_p) {
        try {
          productos = JSON.parse(p.prode_p);
        } catch (e) {
          console.error('Error parsing prode_p for pedido', p.id_p, e);
        }
      }
      
      // Si no hay productos detallados, parsear desde prod_p
      if (productos.length === 0 && p.prod_p) {
        productos = parseProductosDetalle(p.prod_p, p.prode_p);
      }
      
      productos.forEach((prod: any) => {
        if (!productosMap[prod.codigo]) {
          productosMap[prod.codigo] = { 
            codigo: prod.codigo, 
            nombre: prod.nombre || prod.codigo, 
            cantidad: 0 
          };
        }
        productosMap[prod.codigo].cantidad += Number(prod.cantidad) || 0;
      });
    });
    
    return Object.values(productosMap);
  }, [pedidos]);

  // Función para abrir Google Maps con la ruta del repartidor
  const openGoogleMapsRoute = async () => {
    if (!repartidor) {
      toast({ 
        title: 'Error', 
        description: 'No se encontró información del repartidor',
        variant: 'destructive'
      });
      return;
    }

    setLoadingRoute(true);

    try {
      // Obtener ubicación actual del dispositivo
      const getCurrentPosition = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocalización no soportada'));
            return;
          }
          
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000
            }
          );
        });
      };

      // Obtener ubicación actual
      const position = await getCurrentPosition();
      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;

      // Obtener paradas pendientes de la ruta (filtrar las que no están entregadas)
      const pendingStops = pedidos
        .filter(p => p.estado !== 'entregado')
        .map(p => ({ lat: p.latitud, lng: p.longitud }));

      if (pendingStops.length === 0) {
        toast({ 
          title: 'Sin entregas pendientes', 
          description: 'No tienes entregas pendientes en este momento',
          variant: 'destructive'
        });
        return;
      }

      // Construir URL de Google Maps
      // Formato: origin=start&destination=end&waypoints=punto1|punto2|punto3
      const origin = `${currentLat},${currentLng}`;
      const destination = `${pendingStops[pendingStops.length - 1].lat},${pendingStops[pendingStops.length - 1].lng}`;
      
      // Si hay paradas intermedias, agregarlas como waypoints
      let waypointsStr = '';
      if (pendingStops.length > 2) {
        // Excluir el último punto (es el destino)
        const waypoints = pendingStops.slice(0, -1);
        waypointsStr = `&waypoints=${waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|')}`;
      }

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsStr}&travelmode=driving`;

      // Abrir en nueva pestaña
      window.open(googleMapsUrl, '_blank');
      
      toast({ 
        title: '✅ Ruta abierta', 
        description: `Ruta con ${pendingStops.length} paradas cargada en Google Maps`,
        duration: 2000
      });
    } catch (error) {
      console.error('Error abriendo ruta en Google Maps:', error);
      
      // Si hay error de geolocalización, mostrar mensaje específico
      if (error instanceof GeolocationPositionError) {
        let errorMessage = 'No se pudo obtener tu ubicación actual';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor, habilita la ubicación en tu navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible. Verifica tu conexión GPS.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado al obtener ubicación.';
            break;
        }
        toast({ 
          title: 'Error de ubicación', 
          description: errorMessage,
          variant: 'destructive'
        });
      } else {
        toast({ 
          title: 'Error', 
          description: 'No se pudo abrir la ruta en Google Maps',
          variant: 'destructive'
        });
      }
    } finally {
      setLoadingRoute(false);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 p-1 bg-zinc-900/50 backdrop-blur-sm rounded-xl shadow-lg flex justify-center gap-2">
          <TabsTrigger 
            value="entregas" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400/20 data-[state=active]:to-yellow-400/10 data-[state=active]:text-yellow-400 data-[state=active]:shadow-lg data-[state=active]:shadow-yellow-400/20 transition-all duration-300 flex items-center gap-2 px-6 py-3"
          >
            <Truck className="w-5 h-5" />
            <span className="font-medium">Entregas</span>
            {pedidos.filter(p => ['en_ruta'].includes(p.estado)).length > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pedidos.filter(p => ['en_ruta'].includes(p.estado)).length}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="mochila"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400/20 data-[state=active]:to-yellow-400/10 data-[state=active]:text-yellow-400 data-[state=active]:shadow-lg data-[state=active]:shadow-yellow-400/20 transition-all duration-300 flex items-center gap-2 px-6 py-3"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="font-medium">Mochila</span>
            {mochila.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-yellow-400/20 text-yellow-400 rounded-full">
                {mochila.reduce((a, b) => a + b.cantidad, 0)}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="entregas" className="w-full max-w-3xl mx-auto">
          <div className="mobile-section w-full">
            {/* Page Header */}
            <div className="mobile-section w-full">
              <div className="flex items-center justify-between mb-4 w-full">
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="text-2xl font-bold text-gradient">Mis Entregas</h2>
                  <p className="text-muted truncate">
                    {repartidor ? `${repartidor.nombre} - ${repartidor.tipo_vehiculo}` : 'Pedidos asignados para hoy'}
                  </p>
                </div>
                {/* Botón para abrir Google Maps con la ruta */}
                <Button
                  onClick={openGoogleMapsRoute}
                  disabled={loadingRoute}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-yellow-400/25 disabled:opacity-75 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loadingRoute ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Obteniendo ubicación...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      <ExternalLink className="w-4 h-4" />
                      Ver Ruta
                    </>
                  )}
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="btn-ghost text-sm">
                    Filtrar
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-yellow-400/30">
                  <DropdownMenuItem className="text-white hover:bg-yellow-400/10">Por ETA</DropdownMenuItem>
                  <DropdownMenuItem className="text-white hover:bg-yellow-400/10">Por zona</DropdownMenuItem>
                  <DropdownMenuItem className="text-white hover:bg-yellow-400/10">Por estado</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats Banner */}
            <div className="mobile-section bg-gradient-radial w-full">
              <div className="grid grid-cols-4 gap-3">
                <div className="card-minimal p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {pedidos.filter(p => ['pendiente', 'surtido', 'aceptado'].includes(p.estado)).length}
                  </div>
                  <div className="text-xs text-muted">Por recoger</div>
                </div>
                <div className="card-minimal p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {pedidos.filter(p => ['en_ruta'].includes(p.estado)).length}
                  </div>
                  <div className="text-xs text-muted">En proceso</div>
                </div>
                <div className="card-minimal p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {pedidos.filter(p => p.estado === 'entregado').length}
                  </div>
                  <div className="text-xs text-muted">Entregados</div>
                </div>
                <div className="card-minimal p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{pedidos.length}</div>
                  <div className="text-xs text-muted">Total</div>
                </div>
              </div>
            </div>

            {/* Delivery List */}
            <div className="mobile-content space-y-4 w-full">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="loading-spinner mb-4"></div>
                  <p className="text-muted">Cargando entregas...</p>
                </div>
              ) : pedidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-yellow-400/50 mb-4" />
                  <p className="text-muted text-center">No tienes pedidos asignados</p>
                  {!repartidor && (
                    <p className="text-subtle text-sm text-center mt-2">
                      Usuario no encontrado como repartidor
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* PEDIDOS PENDIENTES - Arriba */}
                  {(() => {
                    const pedidosPendientes = pedidos.filter(p => p.estado !== 'entregado');
                    
                    if (pedidosPendientes.length > 0) {
                      return (
                        <div className="space-y-4 w-full">
                          <div className="flex items-center justify-between w-full">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Truck className="w-5 h-5 text-yellow-400" />
                              Próximas entregas ({pedidosPendientes.length})
                            </h3>
                          </div>
                          
                          <div className="space-y-4 w-full">
                            {pedidosPendientes.map((pedido: any, idx: number) => {
                              const availableActions = getAvailableActions(pedido.estado);
                              const isUpdating = updatingPedido === String(pedido.id);
                              
                              return (
                                <div 
                                  key={`${pedido.id}-${updatingPedido}`}
                                  className={`card-modern p-4 cursor-pointer transition-all duration-300 w-full ${
                                    selected === idx ? 'border-yellow-400/60 bg-yellow-400/5' : ''
                                  } ${isUpdating ? 'border-orange-400/60 bg-orange-400/5' : ''}`}
                                  onClick={() => !isUpdating && setSelected(selected === idx ? null : idx)}
                                >
                                  {/* Card Header */}
                                  <div className="flex items-start justify-between mb-3 w-full">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-6 h-6 text-black" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white text-lg">Pedido #{pedido.id}</h3>
                                        <div className="flex items-center space-x-2 mt-1 min-w-0">
                                          <MapPin className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                          <p className="text-sm text-muted truncate">{pedido.direccion}</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                      <div className={`status-indicator ${getStatusColor(pedido.estado)} ${isUpdating ? 'animate-pulse' : ''} text-xs whitespace-nowrap`}>
                                        {getStatusText(pedido.estado)}
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button 
                                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-yellow-400/50 hover:bg-yellow-400/10 transition-colors text-gray-400 hover:text-yellow-400 flex-shrink-0" 
                                            disabled={isUpdating}
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-zinc-900 border-yellow-400/30">
                                          <DropdownMenuItem className="text-white hover:bg-yellow-400/10">Ver detalles</DropdownMenuItem>
                                          <DropdownMenuItem className="text-white hover:bg-yellow-400/10">Reportar incidencia</DropdownMenuItem>
                                          <DropdownMenuItem className="text-white hover:bg-yellow-400/10">Contactar cliente</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleOpenGoogleMaps(pedido)}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Ver en Google Maps
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>

                                  {/* Card Content */}
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center space-x-2">
                                        <Home className="w-4 h-4 text-blue-400" />
                                        <span className="text-muted">Sucursal:</span>
                                        <span className="text-white font-medium">{pedido.sucursal_asignada}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-green-400" />
                                        <span className="text-white font-medium">
                                          {calculateETA(parseFloat(pedido.latitud), parseFloat(pedido.longitud))}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Products Section */}
                                    <div className="text-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <Package className="w-4 h-4 text-purple-400" />
                                          {!pedido.productos_detalle && (
                                            <span className="text-white">{pedido.productos}</span>
                                          )}
                                        </div>
                                        
                                        {pedido.productos_detalle && (
                                          <button 
                                            className="btn-ghost text-xs px-2 py-1 text-yellow-400 hover:bg-yellow-400/10 border border-yellow-400/30 rounded"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleProductDetails(String(pedido.id));
                                            }}
                                          >
                                            {showProductDetails[String(pedido.id)] ? 'Ocultar detalles' : 'Ver detalles'}
                                          </button>
                                        )}
                                      </div>
                                      
                                      {/* Detailed Products Table - Only shown when button is clicked */}
                                      {showProductDetails[String(pedido.id)] && pedido.prod_p && (
                                        <div className="bg-zinc-800 rounded-lg overflow-hidden mt-3 animate-slide-up">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="bg-yellow-400/20 text-yellow-400">
                                                <th className="text-left p-2 font-medium">Código</th>
                                                <th className="text-left p-2 font-medium">Producto</th>
                                                <th className="text-right p-2 font-medium">Cant.</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {parseProductosDetalle(pedido.prod_p, pedido.prode_p).map((producto: any, prodIdx: number) => (
                                                <tr key={prodIdx} className="border-t border-zinc-700">
                                                  <td className="p-2 text-yellow-300 font-mono text-xs">{producto.codigo}</td>
                                                  <td className="p-2 text-white text-xs leading-tight">{producto.nombre}</td>
                                                  <td className="p-2 text-right text-yellow-400 font-bold">{producto.cantidad}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-zinc-800 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                          width: 
                                            pedido.estado === 'entregado' ? '100%' : 
                                            pedido.estado === 'en_ruta' ? '80%' : 
                                            pedido.estado === 'recogido' ? '60%' :
                                            pedido.estado === 'surtido' ? '40%' : '20%'
                                        }}
                                      ></div>
                                    </div>
                                  </div>

                                  {/* Expanded Content */}
                                  {selected === idx && (
                                    <div className="mt-4 pt-4 border-t border-yellow-400/20 animate-slide-up">
                                      {/* Action Buttons */}
                                      <div className="space-y-3">
                                        {/* Ver en Google Maps button - always available */}
                                        <button 
                                          className="btn-secondary w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenGoogleMaps(pedido);
                                          }}
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                          Ver en Google Maps
                                        </button>

                                        {/* Workflow action buttons */}
                                        {availableActions.map((actionItem, actionIdx) => {
                                          const IconComponent = actionItem.icon;
                                          const isUpdating = updatingPedido === String(pedido.id);
                                          // Si la acción es 'completar' (marcar como entregado), mostrar input de evidencia
                                          const requiereEvidencia = actionItem.action === 'completar';
                                          return (
                                            <div key={actionIdx} className="space-y-2">
                                              {requiereEvidencia && (
                                                <div className="mb-2" onClick={e => e.stopPropagation()}>
                                                  <label className="block text-sm font-medium text-yellow-400 mb-1" onClick={e => e.stopPropagation()}>
                                                    Toma una foto de evidencia de entrega
                                                  </label>
                                                  <button
                                                    type="button"
                                                    className="btn-warning w-full mb-2"
                                                    disabled={isUpdating}
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      document.getElementById(`evidencia-input-${pedido.id}`)?.click();
                                                    }}
                                                  >
                                                    Tomar foto
                                                  </button>
                                                  <input
                                                    id={`evidencia-input-${pedido.id}`}
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    disabled={isUpdating}
                                                    style={{ display: 'none' }}
                                                    onClick={e => e.stopPropagation()}
                                                    onChange={e => {
                                                      const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                                      handleEvidenciaChange(String(pedido.id), file);
                                                    }}
                                                  />
                                                  {evidenciaPreview[String(pedido.id)] && (
                                                    <img
                                                      src={evidenciaPreview[String(pedido.id)]}
                                                      alt="Evidencia"
                                                      className="mt-2 rounded-lg max-h-40 border border-yellow-400"
                                                    />
                                                  )}
                                                </div>
                                              )}
                                              <button
                                                className={`${actionItem.color} w-full ${isUpdating ? 'opacity-75 cursor-not-allowed' : ''}`}
                                                disabled={isUpdating || (requiereEvidencia && !evidencia[String(pedido.id)])}
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  if (!isUpdating) {
                                                    // Aquí se podría enviar la imagen al backend si se implementa
                                                    handleUpdatePedidoStatus(pedido.id, actionItem.nextStatus, actionItem.label);
                                                  }
                                                }}
                                              >
                                                {isUpdating ? (
                                                  <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Actualizando...
                                                  </>
                                                ) : (
                                                  <>
                                                    <IconComponent className="w-4 h-4" />
                                                    {actionItem.label}
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          );
                                        })}

                                        {/* Completed state message */}
                                        {pedido.estado === 'entregado' && (
                                          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                                            <Check className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                            <p className="text-green-400 font-medium">Pedido entregado exitosamente</p>
                                            <p className="text-green-300 text-sm">¡Excelente trabajo!</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* PEDIDOS ENTREGADOS - Abajo */}
                  {(() => {
                    const pedidosEntregados = pedidos.filter(p => p.estado === 'entregado');
                    
                    if (pedidosEntregados.length > 0) {
                      return (
                        <div className="space-y-4 mt-8">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Check className="w-5 h-5 text-green-400" />
                              Entregas completadas ({pedidosEntregados.length})
                            </h3>
                          </div>
                          
                          <div className="space-y-3">
                            {pedidosEntregados.map((pedido, idx) => (
                              <div 
                                key={`completed-${pedido.id}`}
                                className="card-modern p-4 border-green-400/30 bg-green-400/5"
                              >
                                {/* Card Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Check className="w-5 h-5 text-black" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-white text-base truncate">Pedido #{pedido.id}</h3>
                                      <div className="flex items-center space-x-2 mt-1 min-w-0">
                                        <MapPin className="w-3 h-3 text-green-400 flex-shrink-0" />
                                        <p className="text-xs text-muted truncate">{pedido.direccion}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <div className="status-indicator bg-green-500/20 text-green-400 border-green-400/30 text-xs whitespace-nowrap">
                                      Entregado
                                    </div>
                                  </div>
                                </div>

                                {/* Card Content - Compact */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <Home className="w-3 h-3 text-blue-400" />
                                      <span className="text-muted">Sucursal:</span>
                                      <span className="text-white">{pedido.sucursal_asignada}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Package className="w-3 h-3 text-purple-400" />
                                      <span className="text-white">{pedido.productos}</span>
                                    </div>
                                  </div>

                                  {/* Progress Bar - Completed */}
                                  <div className="w-full bg-zinc-800 rounded-full h-1">
                                    <div className="bg-gradient-to-r from-green-400 to-green-500 h-1 rounded-full" style={{ width: '100%' }}></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  })()}
                </>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="mochila">
          <div className="mobile-section">
            <h2 className="text-2xl font-bold text-gradient mb-2 flex items-center gap-2">
              <Package className="w-7 h-7 text-yellow-400" /> Mochila del Repartidor
            </h2>
            <p className="text-muted mb-4">Productos que debes llevar según tus pedidos <span className="text-yellow-400 font-semibold">en ruta</span> o <span className="text-blue-400 font-semibold">en ubicación</span>.</p>
            
            {mochila.length === 0 ? (
              <div className="text-center text-muted py-8">
                <Package className="w-12 h-12 text-yellow-400/50 mb-2 mx-auto" />
                No tienes productos asignados en pedidos activos.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumen General */}
                <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/10">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" /> Resumen General
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full rounded-xl overflow-hidden shadow-lg border border-yellow-400/30 bg-zinc-900">
                      <thead>
                        <tr className="bg-gradient-to-r from-yellow-400/20 to-yellow-400/5 text-yellow-400">
                          <th className="p-3 text-left font-semibold tracking-wide">Código</th>
                          <th className="p-3 text-left font-semibold tracking-wide">Producto</th>
                          <th className="p-3 text-right font-semibold tracking-wide">Cantidad Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mochila.map((prod, idx) => (
                          <tr key={prod.codigo} className={`border-b border-zinc-800 hover:bg-yellow-400/10 transition ${idx % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800/60'}`}>
                            <td className="p-3 text-yellow-300 font-mono text-xs">{prod.codigo}</td>
                            <td className="p-3 text-white text-sm font-medium">{prod.nombre}</td>
                            <td className="p-3 text-right text-lg font-extrabold text-yellow-400 drop-shadow-lg">{prod.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block"></span> 
                      Total de productos: <span className="font-bold text-white">{mochila.reduce((a, b) => a + b.cantidad, 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Productos por Pedido */}
                <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/10">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5" /> Productos por Pedido
                  </h3>
                  <div className="space-y-3">
                    {pedidos
                      .filter(p => ['recogido', 'en_ruta'].includes(p.sta_p) && p.sta_p !== 'entregado')
                      .map((pedido) => {
                        let productosPedido: any[] = [];
                        
                        // Usar prode_p (productos detallados) si está disponible
                        if (pedido.prode_p) {
                          try {
                            productosPedido = JSON.parse(pedido.prode_p);
                          } catch (e) {
                            console.error('Error parsing prode_p for pedido', pedido.id_p, e);
                          }
                        }
                        
                        // Si no hay productos detallados, parsear desde prod_p
                        if (productosPedido.length === 0 && pedido.prod_p) {
                          productosPedido = parseProductosDetalle(pedido.prod_p, pedido.prode_p);
                        }

                        return (
                          <div key={pedido.id_p} className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
                            <div className="p-3 bg-gradient-to-r from-zinc-800 to-zinc-900 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">Pedido #{pedido.id_p}</span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  pedido.sta_p === 'en_ruta' 
                                    ? 'bg-yellow-400/20 text-yellow-400' 
                                    : 'bg-blue-400/20 text-blue-400'
                                }`}>
                                  {pedido.sta_p === 'en_ruta' ? 'En ruta' : 'Recogido'}
                                </span>
                              </div>
                              <span className="text-xs text-muted">
                                {productosPedido.reduce((sum: number, p: { cantidad: string | number }) => sum + (Number(p.cantidad) || 0), 0)} productos
                              </span>
                            </div>
                            <div className="p-3">
                              <table className="w-full">
                                <tbody>
                                  {productosPedido.map((prod: { codigo: string; nombre: string; cantidad: string | number }, idx: number) => (
                                    <tr key={prod.codigo} className={`${idx !== productosPedido.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                                      <td className="py-2 text-xs font-mono text-yellow-300">{prod.codigo}</td>
                                      <td className="py-2 text-sm text-white">{prod.nombre || prod.codigo}</td>
                                      <td className="py-2 text-right font-bold text-yellow-400">{prod.cantidad}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

