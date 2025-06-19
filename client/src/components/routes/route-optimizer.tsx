import { useState, useEffect } from 'react';
import { 
  fetchPedidos, 
  fetchRepartidores, 
  fetchSucursales, 
  optimizeDeliveryRoute,
  calculateDistance
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Route, Package, CheckCircle, AlertCircle, Building, Zap, Users, Settings, ArrowUp, ArrowDown, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function RouteOptimizer() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [repartidores, setRepartidores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedidos, setSelectedPedidos] = useState<string[]>([]);
  const [confirmingSelection, setConfirmingSelection] = useState(false);
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [optimizingAuto, setOptimizingAuto] = useState(false);
  const [assigningManual, setAssigningManual] = useState(false);
  const [showNoDriversDialog, setShowNoDriversDialog] = useState(false);
  const [showManualAssignmentDialog, setShowManualAssignmentDialog] = useState(false);
  const [selectedRepartidor, setSelectedRepartidor] = useState<string>('');
  const [orderedPedidos, setOrderedPedidos] = useState<string[]>([]);
  const [repartidoresDisponibles, setRepartidoresDisponibles] = useState<any[]>([]);
  const [noDriversData, setNoDriversData] = useState<{
    sucursales: string[];
    totalPedidos: number;
  }>({ sucursales: [], totalPedidos: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [pedidosData, repartidoresData] = await Promise.all([
        fetchPedidos(),
        fetchRepartidores()
      ]);
      setPedidos(pedidosData);
      setRepartidores(repartidoresData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Obtener repartidores disponibles (de cualquier sucursal)
  const getRepartidoresDisponibles = async () => {
    try {
      const estadoRepartidores = await fetch('/api/repartidores/estado').then(res => res.json());
      
      const disponibles = repartidores.filter((repartidor: any) => {
        const estado = estadoRepartidores.find((e: any) => 
          Number(e.id_repartidor) === Number(repartidor.id)
        );
        return estado && estado.estado === 'disponible';
      });

      setRepartidoresDisponibles(disponibles);
      return disponibles;
    } catch (error) {
      console.error('Error obteniendo repartidores disponibles:', error);
      setRepartidoresDisponibles([]);
      return [];
    }
  };

  // Obtener solo pedidos sin repartidor asignado
  const getPedidosSinRepartidor = () => {
    return pedidos.filter(p => 
      !p.repartidor_asignado || p.repartidor_asignado === '' || p.repartidor_asignado === null
    );
  };

  // Obtener pedidos por sucursal
  const getPedidosPorSucursal = () => {
    const pedidosSinRepartidor = getPedidosSinRepartidor();
    const grouped: { [key: string]: any[] } = {};
    
    pedidosSinRepartidor.forEach(pedido => {
      const sucursal = pedido.sucursal_asignada || 'Sin sucursal';
      if (!grouped[sucursal]) {
        grouped[sucursal] = [];
      }
      grouped[sucursal].push(pedido);
    });
    
    return grouped;
  };

  const handlePedidoToggle = (pedidoId: string, checked: boolean) => {
    if (checked) {
      setSelectedPedidos(prev => [...prev, pedidoId]);
    } else {
      setSelectedPedidos(prev => prev.filter(id => id !== pedidoId));
    }
  };

  const handleSelectAllFromSucursal = (sucursal: string, checked: boolean) => {
    const pedidosSucursal = getPedidosPorSucursal()[sucursal] || [];
    const idsSucursal = pedidosSucursal.map(p => String(p.id));
    
    if (checked) {
      // Agregar todos los pedidos de la sucursal que no estén ya seleccionados
      setSelectedPedidos(prev => {
        const newSelection = [...prev];
        idsSucursal.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    } else {
      // Remover todos los pedidos de la sucursal
      setSelectedPedidos(prev => prev.filter(id => !idsSucursal.includes(id)));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const todosLosPedidos = getPedidosSinRepartidor();
    if (checked) {
      setSelectedPedidos(todosLosPedidos.map(p => String(p.id)));
    } else {
      setSelectedPedidos([]);
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedPedidos.length === 0) {
      toast({
        title: 'Sin pedidos seleccionados',
        description: 'Selecciona al menos un pedido para continuar',
        variant: 'destructive'
      });
      return;
    }

    setConfirmingSelection(true);
    
    // Simular proceso de confirmación
    setTimeout(() => {
      toast({
        title: 'Selección confirmada',
        description: `${selectedPedidos.length} pedidos seleccionados para optimización`,
      });
      setConfirmingSelection(false);
      setSelectionConfirmed(true);
    }, 1000);
  };

  const handleOptimizeAuto = async () => {
    setOptimizingAuto(true);
    
    try {
      // Obtener los pedidos seleccionados con datos completos
      const pedidosSeleccionados = pedidos.filter(p => 
        selectedPedidos.includes(String(p.id))
      );

      if (pedidosSeleccionados.length === 0) {
        toast({
          title: 'Error',
          description: 'No hay pedidos seleccionados para optimizar',
          variant: 'destructive'
        });
        return;
      }

      // Agrupar pedidos por sucursal
      const pedidosPorSucursal: { [key: string]: any[] } = {};
      pedidosSeleccionados.forEach(pedido => {
        const sucursal = pedido.sucursal_asignada || 'Sin sucursal';
        if (!pedidosPorSucursal[sucursal]) {
          pedidosPorSucursal[sucursal] = [];
        }
        pedidosPorSucursal[sucursal].push(pedido);
      });

      console.log('🔄 Iniciando optimización automática por sucursal:', Object.keys(pedidosPorSucursal));

      // Procesar cada sucursal
      const resultados = [];
      
      for (const [sucursal, pedidosSucursal] of Object.entries(pedidosPorSucursal)) {
        console.log(`📍 Procesando sucursal: ${sucursal} con ${pedidosSucursal.length} pedidos`);
        
        try {
          // 1. Buscar repartidores disponibles de la sucursal
          const repartidoresDisponibles = await buscarRepartidoresDisponibles(sucursal);
          
          if (repartidoresDisponibles.length === 0) {
            console.log(`⚠️ No hay repartidores disponibles en ${sucursal}`);
            resultados.push({
              sucursal,
              success: false,
              message: `No hay repartidores disponibles en ${sucursal}`,
              pedidos: pedidosSucursal.length
            });
            continue;
          }

          // 1.1. Seleccionar el repartidor más cercano a la sucursal
          const repartidorSeleccionado = await seleccionarRepartidorMasCercano(
            repartidoresDisponibles, 
            sucursal
          );

          if (!repartidorSeleccionado) {
            console.log(`⚠️ No se pudo seleccionar repartidor para ${sucursal}`);
            resultados.push({
              sucursal,
              success: false,
              message: `No se pudo seleccionar repartidor para ${sucursal}`,
              pedidos: pedidosSucursal.length
            });
            continue;
          }

          console.log(`✅ Repartidor seleccionado: ${repartidorSeleccionado.nombre} (ID: ${repartidorSeleccionado.id})`);

          // 1.1.1. Optimizar ruta usando Google Routes API
          const pedidosIds = pedidosSucursal.map(p => String(p.id));
          const rutaOptimizada = await optimizeDeliveryRoute(
            String(repartidorSeleccionado.id),
            sucursal,
            pedidosIds,
            repartidorSeleccionado.tipo_vehiculo || 'car'
          );

          console.log('🟡 Respuesta de optimizeDeliveryRoute:', rutaOptimizada);

          // Considerar éxito si success: true o si hay un mensaje de éxito
          const exito = rutaOptimizada && (rutaOptimizada.success === true || (typeof rutaOptimizada.message === 'string' && rutaOptimizada.message.toLowerCase().includes('exitosa')));

          if (!exito) {
            console.log(`⚠️ Error optimizando ruta para ${sucursal}`);
            resultados.push({
              sucursal,
              success: false,
              message: `Error optimizando ruta para ${sucursal}`,
              pedidos: pedidosSucursal.length
            });
            continue;
          }

          // 1.1.2. Asignar repartidor a cada pedido
          await asignarRepartidorAPedidos(pedidosIds, String(repartidorSeleccionado.id));

          console.log(`✅ Optimización completada para ${sucursal}`);
          resultados.push({
            sucursal,
            success: true,
            message: `Optimización exitosa para ${sucursal}`,
            repartidor: repartidorSeleccionado.nombre,
            pedidos: pedidosSucursal.length,
            route: rutaOptimizada.route
          });

        } catch (error) {
          console.error(`❌ Error procesando sucursal ${sucursal}:`, error);
          resultados.push({
            sucursal,
            success: false,
            message: `Error procesando ${sucursal}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            pedidos: pedidosSucursal.length
          });
        }
      }

      // Mostrar resultados
      const exitosos = resultados.filter(r => r.success);
      const fallidos = resultados.filter(r => !r.success);

      if (exitosos.length > 0) {
        toast({
          title: 'Optimización completada',
          description: `${exitosos.length} sucursal(es) optimizada(s) exitosamente`,
        });
      }

      if (fallidos.length > 0) {
        toast({
          title: 'Algunas optimizaciones fallaron',
          description: `${fallidos.length} sucursal(es) no pudieron ser optimizada(s)`,
          variant: 'destructive'
        });
      }

      if (exitosos.length === 0 && fallidos.length > 0) {
        // Mostrar diálogo detallado en lugar del toast genérico
        const sucursalesSinRepartidores = fallidos
          .filter(r => r.message.includes('No hay repartidores disponibles'))
          .map(r => r.sucursal);
        
        const totalPedidosAfectados = fallidos.reduce((sum, r) => sum + r.pedidos, 0);
        
        setNoDriversData({
          sucursales: sucursalesSinRepartidores,
          totalPedidos: totalPedidosAfectados
        });
        setShowNoDriversDialog(true);
      }

      // Recargar datos para mostrar los cambios
      await loadInitialData();
      
      // Resetear selección
      setSelectedPedidos([]);
      setSelectionConfirmed(false);

    } catch (error) {
      console.error('❌ Error en optimización automática:', error);
      toast({
        title: 'Error',
        description: 'Error durante la optimización automática',
        variant: 'destructive'
      });
    } finally {
      setOptimizingAuto(false);
    }
  };

  // Función auxiliar para buscar repartidores disponibles por sucursal
  const buscarRepartidoresDisponibles = async (sucursal: string): Promise<any[]> => {
    try {
      // Cargar repartidores y su estado
      const [repartidores, estadoRepartidores] = await Promise.all([
        fetchRepartidores(),
        fetch('/api/repartidores/estado').then(res => res.json())
      ]);

      // Filtrar repartidores disponibles y de la sucursal
      const disponibles = repartidores.filter((repartidor: any) => {
        const estado = estadoRepartidores.find((e: any) => 
          Number(e.id_repartidor) === Number(repartidor.id)
        );
        // Verificar si está disponible y su sucursal_base coincide
        return estado && estado.estado === 'disponible' && repartidor.sucursal_base === sucursal;
      });

      console.log(`🔍 Repartidores disponibles para ${sucursal}:`, disponibles.length);
      return disponibles;
    } catch (error) {
      console.error('❌ Error buscando repartidores disponibles:', error);
      return [];
    }
  };

  // Función auxiliar para seleccionar el repartidor más cercano a la sucursal
  const seleccionarRepartidorMasCercano = async (repartidores: any[], sucursal: string): Promise<any | null> => {
    try {
      // Obtener coordenadas de la sucursal
      const sucursales = await fetchSucursales();
      const sucursalData = sucursales.find((s: any) => 
        s.nombre.toLowerCase() === sucursal.toLowerCase()
      );

      if (!sucursalData) {
        console.log(`⚠️ No se encontraron coordenadas para la sucursal ${sucursal}`);
        return repartidores[0]; // Retornar el primero como fallback
      }

      const sucursalCoords = {
        lat: Number(sucursalData.latitud),
        lng: Number(sucursalData.longitud)
      };

      // Obtener estado de repartidores para sus ubicaciones actuales
      const estadoRepartidores = await fetch('/api/repartidores/estado').then(res => res.json());

      // Calcular distancia de cada repartidor a la sucursal
      const repartidoresConDistancia = repartidores.map(repartidor => {
        const estado = estadoRepartidores.find((e: any) => 
          Number(e.id_repartidor) === Number(repartidor.id)
        );

        if (!estado) {
          return { ...repartidor, distancia: Infinity };
        }

        const repartidorCoords = {
          lat: Number(estado.latitud),
          lng: Number(estado.longitud)
        };

        const distancia = calculateDistance(sucursalCoords, repartidorCoords);
        return { ...repartidor, distancia };
      });

      // Ordenar por distancia y retornar el más cercano
      repartidoresConDistancia.sort((a, b) => a.distancia - b.distancia);
      
      console.log(`📍 Repartidor más cercano a ${sucursal}: ${repartidoresConDistancia[0]?.nombre} (${repartidoresConDistancia[0]?.distancia.toFixed(2)} km)`);
      
      return repartidoresConDistancia[0] || null;
    } catch (error) {
      console.error('❌ Error seleccionando repartidor más cercano:', error);
      return repartidores[0] || null; // Fallback al primer repartidor disponible
    }
  };

  // Función auxiliar para asignar repartidor a pedidos
  const asignarRepartidorAPedidos = async (pedidosIds: string[], repartidorId: string): Promise<void> => {
    try {
      // Actualizar cada pedido con el repartidor asignado
      const actualizaciones = pedidosIds.map(async (pedidoId) => {
        const response = await fetch(`/api/pedidos/${pedidoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repartidor_asignado: repartidorId,
            estado: 'en_ruta'
          })
        });

        if (!response.ok) {
          throw new Error(`Error actualizando pedido ${pedidoId}`);
        }

        return response.json();
      });

      await Promise.all(actualizaciones);
      console.log(`✅ Repartidor ${repartidorId} asignado a ${pedidosIds.length} pedidos`);
    } catch (error) {
      console.error('❌ Error asignando repartidor a pedidos:', error);
      throw error;
    }
  };

  const handleAssignManual = async () => {
    setAssigningManual(true);
    
    try {
      // Obtener repartidores disponibles
      const disponibles = await getRepartidoresDisponibles();
      
      if (disponibles.length === 0) {
        toast({
          title: 'Sin repartidores disponibles',
          description: 'No hay repartidores disponibles para asignar rutas',
          variant: 'destructive'
        });
        return;
      }

      // Inicializar el orden de pedidos con la selección actual
      setOrderedPedidos([...selectedPedidos]);
      setSelectedRepartidor('');
      setShowManualAssignmentDialog(true);
      
    } catch (error) {
      console.error('Error preparando asignación manual:', error);
      toast({
        title: 'Error',
        description: 'Error al preparar la asignación manual',
        variant: 'destructive'
      });
    } finally {
      setAssigningManual(false);
    }
  };

  const handleConfirmManualAssignment = async () => {
    if (!selectedRepartidor) {
      toast({
        title: 'Repartidor no seleccionado',
        description: 'Debes seleccionar un repartidor para continuar',
        variant: 'destructive'
      });
      return;
    }

    if (orderedPedidos.length === 0) {
      toast({
        title: 'Sin pedidos ordenados',
        description: 'Debes tener al menos un pedido en el orden',
        variant: 'destructive'
      });
      return;
    }

    setAssigningManual(true);

    try {
      // Asignar repartidor a los pedidos en el orden especificado
      await asignarRepartidorAPedidos(orderedPedidos, selectedRepartidor);
      
      toast({
        title: 'Asignación exitosa',
        description: `${orderedPedidos.length} pedidos asignados al repartidor`,
      });

      // Limpiar estado
      setSelectedPedidos([]);
      setSelectionConfirmed(false);
      setShowManualAssignmentDialog(false);
      setSelectedRepartidor('');
      setOrderedPedidos([]);

      // Recargar datos
      await loadInitialData();

    } catch (error) {
      console.error('Error en asignación manual:', error);
      toast({
        title: 'Error',
        description: 'Error al asignar pedidos al repartidor',
        variant: 'destructive'
      });
    } finally {
      setAssigningManual(false);
    }
  };

  const movePedidoUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedPedidos];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    setOrderedPedidos(newOrder);
  };

  const movePedidoDown = (index: number) => {
    if (index === orderedPedidos.length - 1) return;
    const newOrder = [...orderedPedidos];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrderedPedidos(newOrder);
  };

  const removePedidoFromOrder = (pedidoId: string) => {
    setOrderedPedidos(prev => prev.filter(id => id !== pedidoId));
  };

  const addPedidoToOrder = (pedidoId: string) => {
    if (!orderedPedidos.includes(pedidoId)) {
      setOrderedPedidos(prev => [...prev, pedidoId]);
    }
  };

  const handleResetSelection = () => {
    setSelectedPedidos([]);
    setSelectionConfirmed(false);
    toast({
      title: 'Selección reiniciada',
      description: 'Puedes seleccionar nuevos pedidos',
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-500 text-black';
      case 'surtido':
        return 'bg-blue-500 text-white';
      case 'en_ruta':
        return 'bg-orange-500 text-white';
      case 'entregado':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <AlertCircle className="w-4 h-4" />;
      case 'surtido':
        return <Package className="w-4 h-4" />;
      case 'en_ruta':
        return <Route className="w-4 h-4" />;
      case 'entregado':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Route className="w-8 h-8 text-yellow-400 mx-auto mb-2 animate-pulse" />
          <p className="text-muted">Cargando optimizador de rutas...</p>
        </div>
      </div>
    );
  }

  const pedidosSinRepartidor = getPedidosSinRepartidor();
  const pedidosPorSucursal = getPedidosPorSucursal();
  const totalPedidos = pedidosSinRepartidor.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
          <h2 className="text-3xl font-bold text-white mb-2">Optimizador de Rutas</h2>
          <p className="text-muted text-lg">Selecciona pedidos sin repartidor asignado para optimizar rutas</p>
        </div>
        
        {/* Estadísticas rápidas */}
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{totalPedidos}</div>
            <div className="text-sm text-muted">Sin asignar</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{selectedPedidos.length}</div>
            <div className="text-sm text-muted">Seleccionados</div>
          </div>
        </div>
      </div>

      {/* Resumen de selección */}
      {selectedPedidos.length > 0 && !selectionConfirmed && (
        <Card className="bg-green-900/20 border-green-400/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">
                    {selectedPedidos.length} pedido{selectedPedidos.length !== 1 ? 's' : ''} seleccionado{selectedPedidos.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-green-300">
                    Listo para optimización de ruta
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleConfirmSelection}
                disabled={confirmingSelection}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {confirmingSelection ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Selección
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opciones después de confirmar selección */}
      {selectionConfirmed && (
        <Card className="bg-blue-900/20 border-blue-400/30">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
              <Settings className="w-5 h-5 mr-2 text-blue-400" />
              Opciones de Optimización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              <div>
                  <p className="text-white font-medium">
                    {selectedPedidos.length} pedidos confirmados
                  </p>
                  <p className="text-sm text-blue-300">
                    Selecciona cómo quieres proceder con la optimización
                  </p>
                        </div>
              </div>
              <Button 
                onClick={handleResetSelection}
                variant="outline"
                className="border-blue-400 text-blue-400 hover:bg-blue-400/10"
              >
                Cambiar Selección
              </Button>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Optimización Automática */}
              <Card className="bg-zinc-800 border-yellow-400/30 hover:border-yellow-400/50 transition-colors">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto">
                      <Zap className="w-8 h-8 text-yellow-400" />
                    </div>
              <div>
                      <h3 className="text-xl font-bold text-white mb-2">Optimización Automática</h3>
                      <p className="text-sm text-muted mb-4">
                        El sistema asignará automáticamente los pedidos a repartidores disponibles 
                        y optimizará las rutas usando algoritmos inteligentes.
                      </p>
                      <Button 
                        onClick={handleOptimizeAuto}
                        disabled={optimizingAuto}
                        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
                      >
                        {optimizingAuto ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                            Optimizando...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Optimizar Automáticamente
                          </>
                        )}
                      </Button>
              </div>
                  </div>
                </CardContent>
              </Card>

              {/* Asignación Manual */}
              <Card className="bg-zinc-800 border-blue-400/30 hover:border-blue-400/50 transition-colors">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-400/20 rounded-full flex items-center justify-center mx-auto">
                      <Users className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Asignación Manual</h3>
                      <p className="text-sm text-muted mb-4">
                        Asigna manualmente los pedidos a repartidores específicos 
                        y configura las rutas según tus preferencias.
                      </p>
                      <Button 
                        onClick={handleAssignManual}
                        disabled={assigningManual}
                        className="w-full bg-blue-400 hover:bg-blue-500 text-white font-medium"
                      >
                        {assigningManual ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Configurando...
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4 mr-2" />
                            Asignar Manualmente
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted">
                💡 <strong>Optimización Automática:</strong> Recomendado para la mayoría de casos. 
                <br />
                💡 <strong>Asignación Manual:</strong> Útil cuando necesitas control específico sobre repartidores y rutas.
              </p>
                </div>
            </CardContent>
          </Card>
      )}

      {/* Controles de selección */}
          <Card className="bg-zinc-900 border-yellow-400/20">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
            <Package className="w-5 h-5 mr-2 text-yellow-400" />
            Selección de Pedidos
              </CardTitle>
            </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleccionar todos */}
          <div className="flex items-center space-x-3 p-3 bg-zinc-800 rounded-lg">
            <Checkbox
              checked={selectedPedidos.length === totalPedidos && totalPedidos > 0}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
            />
            <div className="flex-1">
              <p className="font-medium text-white">Seleccionar todos los pedidos</p>
              <p className="text-sm text-muted">
                {totalPedidos} pedidos disponibles sin repartidor asignado
              </p>
            </div>
          </div>

          {/* Pedidos por sucursal */}
          {Object.entries(pedidosPorSucursal).map(([sucursal, pedidosSucursal]) => {
            const idsSucursal = pedidosSucursal.map(p => String(p.id));
            const seleccionadosSucursal = selectedPedidos.filter(id => idsSucursal.includes(id));
            const todosSeleccionados = seleccionadosSucursal.length === idsSucursal.length && idsSucursal.length > 0;
            
            return (
              <div key={sucursal} className="space-y-3">
                {/* Header de sucursal */}
                <div className="flex items-center space-x-3 p-3 bg-zinc-800/50 rounded-lg">
                  <Checkbox
                    checked={todosSeleccionados}
                    onCheckedChange={(checked) => handleSelectAllFromSucursal(sucursal, checked as boolean)}
                    className="data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                  />
                  <Building className="w-4 h-4 text-yellow-400" />
                  <div className="flex-1">
                    <p className="font-medium text-white capitalize">
                      {sucursal}
                    </p>
                    <p className="text-sm text-muted">
                      {pedidosSucursal.length} pedido{pedidosSucursal.length !== 1 ? 's' : ''} • {seleccionadosSucursal.length} seleccionado{seleccionadosSucursal.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Lista de pedidos de la sucursal */}
                <div className="ml-8 space-y-2">
                  {pedidosSucursal.map((pedido) => (
                  <div 
                    key={pedido.id} 
                      className="flex items-start space-x-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    <Checkbox
                      checked={selectedPedidos.includes(String(pedido.id))}
                      onCheckedChange={(checked) => 
                        handlePedidoToggle(String(pedido.id), checked as boolean)
                      }
                        className="mt-1 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">
                          Pedido #{pedido.id}
                        </span>
                        <Badge 
                            className={`text-xs ${getEstadoColor(pedido.estado)}`}
                        >
                            <div className="flex items-center space-x-1">
                              {getEstadoIcon(pedido.estado)}
                              <span>{pedido.estado}</span>
                            </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted truncate">
                          {pedido.productos}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <MapPin className="w-3 h-3 text-yellow-400" />
                          <p className="text-xs text-yellow-400 truncate">
                        {pedido.direccion}
                      </p>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {pedido.latitud}, {pedido.longitud}
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            );
          })}

          {/* Mensaje si no hay pedidos */}
          {totalPedidos === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-muted text-lg">No hay pedidos sin repartidor asignado</p>
                  <p className="text-sm text-zinc-600 mt-2">
                Todos los pedidos ya tienen repartidor asignado o no hay pedidos pendientes
                  </p>
                </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Asignación Manual */}
      <Dialog open={showManualAssignmentDialog} onOpenChange={setShowManualAssignmentDialog}>
        <DialogContent className="bg-zinc-900 border-blue-400/30 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-blue-400">
              <Users className="w-5 h-5 mr-2" />
              Asignación Manual de Ruta
            </DialogTitle>
            <DialogDescription className="text-zinc-300">
              Selecciona un repartidor disponible y ordena los pedidos según la ruta deseada
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Selección de Repartidor */}
            <div className="space-y-3">
              <h4 className="font-medium text-white flex items-center">
                <User className="w-4 h-4 mr-2" />
                Seleccionar Repartidor
              </h4>
              <Select value={selectedRepartidor} onValueChange={setSelectedRepartidor}>
                <SelectTrigger className="bg-zinc-800 border-blue-400/30 text-white">
                  <SelectValue placeholder="Selecciona un repartidor disponible" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-blue-400/30">
                  {repartidoresDisponibles.map((repartidor: any) => (
                    <SelectItem 
                      key={repartidor.id} 
                      value={String(repartidor.id)}
                      className="text-white hover:bg-zinc-700"
                    >
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{repartidor.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {repartidor.tipo_vehiculo}
                        </Badge>
                        {repartidor.sucursal_base && (
                          <Badge variant="secondary" className="text-xs">
                            {repartidor.sucursal_base}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Orden de Pedidos */}
            <div className="space-y-3">
              <h4 className="font-medium text-white flex items-center">
                <Route className="w-4 h-4 mr-2" />
                Orden de Entrega
              </h4>
              
              {/* Lista de pedidos ordenados */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {orderedPedidos.map((pedidoId, index) => {
                  const pedido = pedidos.find(p => String(p.id) === pedidoId);
                  if (!pedido) return null;
                  
                  return (
                    <div 
                      key={pedidoId}
                      className="flex items-center space-x-3 p-3 bg-zinc-800 rounded-lg border border-blue-400/20"
                    >
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => movePedidoUp(index)}
                          disabled={index === 0}
                          className="p-1 h-8 w-8"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => movePedidoDown(index)}
                          disabled={index === orderedPedidos.length - 1}
                          className="p-1 h-8 w-8"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white">
                            #{index + 1} - Pedido #{pedido.id}
                          </span>
                          <Badge className={`text-xs ${getEstadoColor(pedido.estado)}`}>
                            {getEstadoIcon(pedido.estado)}
                            <span className="ml-1">{pedido.estado}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted truncate">
                          {pedido.productos}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          <p className="text-xs text-blue-400 truncate">
                            {pedido.direccion}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePedidoFromOrder(pedidoId)}
                        className="text-red-400 hover:text-red-300 p-1 h-8 w-8"
                      >
                        ×
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Pedidos disponibles para agregar */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-zinc-400">Pedidos disponibles para agregar:</h5>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {selectedPedidos
                    .filter(pedidoId => !orderedPedidos.includes(pedidoId))
                    .map((pedidoId) => {
                      const pedido = pedidos.find(p => String(p.id) === pedidoId);
                      if (!pedido) return null;
                      
                      return (
                        <div 
                          key={pedidoId}
                          className="flex items-center space-x-3 p-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-white">Pedido #{pedido.id}</span>
                            <p className="text-xs text-muted truncate">{pedido.productos}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addPedidoToOrder(pedidoId)}
                            className="text-blue-400 hover:text-blue-300 p-1 h-6 w-6"
                          >
                            +
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => setShowManualAssignmentDialog(false)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmManualAssignment}
              disabled={assigningManual || !selectedRepartidor || orderedPedidos.length === 0}
              className="bg-blue-400 hover:bg-blue-500 text-white"
            >
              {assigningManual ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Asignando...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Confirmar Asignación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para cuando no hay repartidores disponibles */}
      <Dialog open={showNoDriversDialog} onOpenChange={setShowNoDriversDialog}>
        <DialogContent className="bg-zinc-900 border-red-400/30">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-400">
              <AlertCircle className="w-5 h-5 mr-2" />
              Sin Repartidores Disponibles
            </DialogTitle>
            <DialogDescription className="text-zinc-300">
              No se pudieron asignar repartidores a los pedidos seleccionados porque no hay repartidores disponibles en las siguientes sucursales:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-zinc-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Sucursales afectadas:</h4>
              <div className="space-y-2">
                {noDriversData.sucursales.map((sucursal, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Building className="w-4 h-4 text-red-400" />
                    <span className="text-zinc-300 capitalize">{sucursal}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-400">
                <Package className="w-4 h-4" />
                <span className="font-medium">
                  {noDriversData.totalPedidos} pedido{noDriversData.totalPedidos !== 1 ? 's' : ''} sin asignar
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-1">
                Estos pedidos permanecerán sin repartidor asignado hasta que haya repartidores disponibles.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={() => setShowNoDriversDialog(false)}
              className="bg-red-400 hover:bg-red-500 text-white"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 