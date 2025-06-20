import { useState, useEffect } from 'react';
import { 
  fetchPedidos, 
  fetchSucursales, 
  optimizeDeliveryRoute,
  calculateDistance,
  fetchPedidosFromCSV,
  fetchUsersFromCSV
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
      const [pedidosData, usersData] = await Promise.all([
        fetchPedidosFromCSV(),
        fetchUsersFromCSV()
      ]);
      setPedidos(pedidosData);
      
      // Usar solo datos de usuarios, filtrar repartidores
      const repartidoresCombinados = usersData
        .filter(u => u.type_u === 'repartidor')
        .map(user => ({
          ...user,
          // Usar datos del CSV de usuarios
          nombre: user.name_u,
          tipo_vehiculo: user.vehi_u,
          status: user.sta_u,
          lat: user.lat,
          lng: user.lon,
          activo: true // Asumir que todos los repartidores en users.csv están activos
        }));
      
      setRepartidores(repartidoresCombinados);
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
      // Filtrar repartidores que estén activos y disponibles
      const disponibles = repartidores.filter(r => 
        r.activo !== false && 
        (r.status === 'disponible' || r.sta_u === 'disponible')
      );

      // Verificar que no tengan pedidos asignados actualmente
      const repartidoresSinPedidos = disponibles.filter(repartidor => {
        const pedidosAsignados = pedidos.filter(p => 
          String(p.del_p) === String(repartidor.id_u) && 
          !['entregado', 'entregada', 'completed'].includes((p.sta_p || '').toLowerCase())
        );
        return pedidosAsignados.length === 0;
      });

      setRepartidoresDisponibles(repartidoresSinPedidos);
      return repartidoresSinPedidos;
    } catch (error) {
      console.error('Error obteniendo repartidores disponibles:', error);
      setRepartidoresDisponibles([]);
      return [];
    }
  };

  // Obtener solo pedidos sin repartidor asignado
  const getPedidosSinRepartidor = () => {
    return pedidos.filter(p => 
      !p.del_p || p.del_p === '' || p.del_p === null || p.del_p === undefined
    );
  };

  // Obtener pedidos por sucursal
  const getPedidosPorSucursal = () => {
    const pedidosSinRepartidor = getPedidosSinRepartidor();
    const grouped: { [key: string]: any[] } = {};
    
    pedidosSinRepartidor.forEach(pedido => {
      const sucursal = pedido.suc_p || 'Sin sucursal';
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
    const idsSucursal = pedidosSucursal.map(p => String(p.id_p));
    
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
      setSelectedPedidos(todosLosPedidos.map(p => String(p.id_p)));
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
        selectedPedidos.includes(String(p.id_p))
      );

      if (pedidosSeleccionados.length === 0) {
        toast({
          title: 'Error',
          description: 'No hay pedidos seleccionados para optimizar',
          variant: 'destructive'
        });
        return;
      }

      // Recargar datos de repartidores para obtener el estado más actualizado
      await loadInitialData();
      
      // Obtener repartidores disponibles
      const repartidoresDisponibles = await getRepartidoresDisponibles();

      // Agrupar pedidos por sucursal
      const pedidosPorSucursal: { [key: string]: any[] } = {};
      pedidosSeleccionados.forEach(pedido => {
        const sucursal = pedido.suc_p || 'satelite';
        if (!pedidosPorSucursal[sucursal]) {
          pedidosPorSucursal[sucursal] = [];
        }
        pedidosPorSucursal[sucursal].push(pedido);
      });

      // Variables para tracking de sucursales sin repartidores
      const sucursalesSinRepartidores: string[] = [];
      let totalPedidosSinAsignar = 0;

      // Para cada sucursal, buscar repartidores disponibles y asignar pedidos
      for (const [sucursal, pedidosSucursal] of Object.entries(pedidosPorSucursal)) {
        // Buscar repartidores disponibles para esta sucursal específica
        const repartidoresSucursal = repartidoresDisponibles.filter(r => r.suc_u === sucursal);

        if (repartidoresSucursal.length === 0) {
          // Si no hay repartidores disponibles para esta sucursal
          sucursalesSinRepartidores.push(sucursal);
          totalPedidosSinAsignar += pedidosSucursal.length;
          continue;
        }

        // Seleccionar el primer repartidor disponible de la lista (según la lógica solicitada)
        const repartidorSeleccionado = repartidoresSucursal[0];
        
        if (repartidorSeleccionado) {
          try {
            // Obtener IDs de pedidos de esta sucursal
            const pedidosIds = pedidosSucursal.map(p => String(p.id_p));
            
            // Usar la misma función de asignación que la manual para mantener consistencia
            await asignarRepartidorAPedidos(pedidosIds, String(repartidorSeleccionado.id_u));
            
            console.log(`✅ Asignados ${pedidosIds.length} pedidos de ${sucursal} al repartidor ${repartidorSeleccionado.nombre}`);
          } catch (error) {
            console.error(`Error asignando pedidos de ${sucursal}:`, error);
            // Agregar a la lista de errores pero continuar con otras sucursales
            sucursalesSinRepartidores.push(sucursal);
            totalPedidosSinAsignar += pedidosSucursal.length;
          }
        }
      }

      // Si hay sucursales sin repartidores disponibles, mostrar diálogo
      if (sucursalesSinRepartidores.length > 0) {
        setNoDriversData({
          sucursales: sucursalesSinRepartidores,
          totalPedidos: totalPedidosSinAsignar
        });
        setShowNoDriversDialog(true);
      }

      // Recargar datos
      await loadInitialData();
      
      // Limpiar selección
      setSelectedPedidos([]);
      setSelectionConfirmed(false);
      
      // Mostrar mensaje de éxito
      const sucursalesAsignadas = Object.keys(pedidosPorSucursal).filter(
        sucursal => !sucursalesSinRepartidores.includes(sucursal)
      );
      
      if (sucursalesAsignadas.length > 0) {
        toast({
          title: 'Optimización completada',
          description: `Pedidos asignados exitosamente a repartidores de ${sucursalesAsignadas.length} sucursal(es)`
        });
      }
    } catch (error) {
      console.error('Error en optimización automática:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar la optimización automática',
        variant: 'destructive'
      });
    } finally {
      setOptimizingAuto(false);
    }
  };

  const handleAssignManual = async () => {
    setAssigningManual(true);
    
    try {
      // Recargar datos de repartidores para obtener el estado más actualizado
      await loadInitialData();
      
      // Obtener repartidores disponibles
      const disponibles = await getRepartidoresDisponibles();
      
      if (disponibles.length === 0) {
        toast({
          title: 'Sin repartidores disponibles',
          description: 'No hay repartidores disponibles para asignar rutas. Verifica que los repartidores estén activos y con estado "disponible".',
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
    if (!selectedRepartidor || orderedPedidos.length === 0) {
      toast({
        title: 'Error',
        description: 'Selecciona un repartidor y ordena los pedidos',
        variant: 'destructive'
      });
      return;
    }

    setAssigningManual(true);

    try {
      // Asignar pedidos al repartidor en el orden especificado
      await asignarRepartidorAPedidos(orderedPedidos, selectedRepartidor);
      
      // Recargar datos
      await loadInitialData();
      
      // Limpiar selección
      setSelectedPedidos([]);
      setSelectionConfirmed(false);
      setShowManualAssignmentDialog(false);
      setOrderedPedidos([]);
      setSelectedRepartidor('');
      
      toast({
        title: 'Asignación completada',
        description: 'Los pedidos han sido asignados al repartidor seleccionado y se mantienen como pendiente para surtido'
      });
    } catch (error) {
      console.error('Error en asignación manual:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar la asignación manual',
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
      case 'entregado':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'en_ruta':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'pendiente':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'entregado':
        return <CheckCircle className="w-3 h-3" />;
      case 'en_ruta':
        return <Route className="w-3 h-3" />;
      case 'pendiente':
        return <Package className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'surtido':
        return 'Surtido';
      case 'recogido':
        return 'Recogido';
      case 'en_ruta':
        return 'En ruta';
      case 'entregado':
        return 'Entregado';
      default:
        return estado;
    }
  };

  const asignarRepartidorAPedidos = async (pedidosIds: string[], repartidorId: string): Promise<void> => {
    try {
      // Actualizar el estado de los pedidos en el CSV (mantener como pendiente)
      const pedidosActualizados = pedidos.map(p => {
        if (pedidosIds.includes(String(p.id_p))) {
          return {
            ...p,
            del_p: repartidorId,
            // Mantener como pendiente para que el almacenista lo surta
            sta_p: 'pendiente'
          };
        }
        return p;
      });

      // Actualizar el estado del repartidor en el CSV
      const repartidoresActualizados = repartidores.map(r => {
        if (String(r.id_u) === repartidorId) {
          return {
            ...r,
            sta_u: 'en_ruta',
            status: 'en_ruta'
          };
        }
        return r;
      });

      setPedidos(pedidosActualizados);
      setRepartidores(repartidoresActualizados);

      // Crear ruta manual con el orden especificado por el usuario
      try {
        const repartidor = repartidores.find(r => String(r.id_u) === repartidorId);
        const pedidosAsignados = pedidos.filter(p => pedidosIds.includes(String(p.id_p)));
        
        // Determinar sucursal de origen (usar la más común entre los pedidos asignados)
        const sucursalConteo: { [key: string]: number } = {};
        pedidosAsignados.forEach(pedido => {
          const sucursal = pedido.suc_p || 'satelite';
          sucursalConteo[sucursal] = (sucursalConteo[sucursal] || 0) + 1;
        });
        const sucursalOrigen = Object.keys(sucursalConteo).reduce((a, b) => 
          sucursalConteo[a] > sucursalConteo[b] ? a : b
        );

        // Crear request para la ruta manual
        const routeRequest = {
          repartidor_id: Number(repartidorId),
          sucursal_origen: sucursalOrigen,
          pedido_ids: pedidosIds.map(id => Number(id)),
          vehicle_type: repartidor?.tipo_vehiculo || 'car',
          optimization_method: 'manual', // Indicar que es asignación manual
          manual_order: pedidosIds // Pasar el orden específico del usuario
        };

        // Crear la ruta manual usando el servicio de rutas
        const response = await fetch('/api/routes/manual-assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(routeRequest)
        });

        if (!response.ok) {
          throw new Error('Error creando ruta manual');
        }

        console.log('✅ Ruta manual creada exitosamente');
        
        // **NUEVO: Sincronizar ruta para asegurar consistencia**
        try {
          const syncResponse = await fetch(`/api/routes/sync/${repartidorId}`, {
            method: 'POST'
          });
          if (syncResponse.ok) {
            console.log(`✅ Ruta del repartidor ${repartidorId} sincronizada exitosamente.`);
          } else {
            console.warn(`⚠️ No se pudo sincronizar la ruta del repartidor ${repartidorId}.`);
          }
        } catch (syncError) {
          console.error('Error sincronizando ruta:', syncError);
        }

      } catch (routeError) {
        console.error('Error creando ruta manual:', routeError);
        // Continuar aunque falle la creación de la ruta
      }

      // Guardar cambios en el servidor
      try {
        // Actualizar pedidos en el servidor (mantener como pendiente)
        await Promise.all(pedidosIds.map(async (pedidoId) => {
          const pedido = pedidos.find(p => String(p.id_p) === pedidoId);
          if (pedido) {
            await fetch(`/api/pedidos/${pedidoId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                del_p: repartidorId,
                sta_p: 'pendiente' // Mantener como pendiente
              })
            });
          }
        }));

        // Actualizar estado del repartidor en el servidor
        const repartidor = repartidores.find(r => String(r.id_u) === repartidorId);
        if (repartidor) {
          await fetch(`/api/repartidores/${repartidorId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'en_ruta'
            })
          });
        }
      } catch (serverError) {
        console.error('Error actualizando datos en el servidor:', serverError);
        // Continuar aunque falle la actualización del servidor
      }
    } catch (error) {
      console.error('Error asignando repartidor a pedidos:', error);
      throw error;
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
                        Asigna manualmente los pedidos a repartidores específicos que estén disponibles. 
                        El sistema consulta automáticamente los usuarios y estados de repartidores activos.
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
                💡 <strong>Asignación Manual:</strong> Consulta automáticamente usuarios y estados de repartidores disponibles. 
                Solo muestra repartidores activos con estado "disponible" y sin pedidos asignados.
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
            const idsSucursal = pedidosSucursal.map(p => String(p.id_p));
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
                    key={pedido.id_p} 
                      className="flex items-start space-x-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    <Checkbox
                      checked={selectedPedidos.includes(String(pedido.id_p))}
                      onCheckedChange={(checked) => 
                        handlePedidoToggle(String(pedido.id_p), checked as boolean)
                      }
                        className="mt-1 data-[state=checked]:bg-yellow-400 data-[state=checked]:border-yellow-400"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">
                          Pedido #{pedido.id_p}
                        </span>
                        <Badge 
                          className={`text-xs ${
                            pedido.sta_p === 'entregado' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            pedido.sta_p === 'en_ruta' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {getEstadoText(pedido.sta_p)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted truncate">
                          <span className="font-medium">Productos:</span> {pedido.prod_p}
                        </p>
                        <p className="text-sm text-muted truncate">
                          <span className="font-medium">Dirección:</span> {pedido.loc_p}
                        </p>
                        <p className="text-sm text-muted">
                          <span className="font-medium">Sucursal:</span> {pedido.suc_p}
                        </p>
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
                Seleccionar Repartidor Disponible
              </h4>
              <Select value={selectedRepartidor} onValueChange={setSelectedRepartidor}>
                <SelectTrigger className="bg-zinc-800 border-blue-400/30 text-white">
                  <SelectValue placeholder="Selecciona un repartidor disponible" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-blue-400/30">
                  {repartidoresDisponibles.map((repartidor: any) => (
                    <SelectItem 
                      key={repartidor.id_u} 
                      value={String(repartidor.id_u)}
                      className="text-white hover:bg-zinc-700"
                    >
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{repartidor.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {repartidor.tipo_vehiculo}
                        </Badge>
                        {repartidor.suc_u && (
                          <Badge variant="secondary" className="text-xs">
                            {repartidor.suc_u}
                          </Badge>
                        )}
                        <Badge variant="default" className="text-xs bg-green-500/20 text-green-400">
                          Disponible
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {repartidoresDisponibles.length === 0 && (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 text-sm">
                    No hay repartidores disponibles en este momento
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Los repartidores deben estar activos y con estado "disponible"
                  </p>
                </div>
              )}
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
                  const pedido = pedidos.find(p => String(p.id_p) === pedidoId);
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
                            #{index + 1} - Pedido #{pedido.id_p}
                          </span>
                          <Badge className={`text-xs ${getEstadoColor(pedido.sta_p)}`}>
                            {getEstadoIcon(pedido.sta_p)}
                            <span className="ml-1">{pedido.sta_p}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted truncate">
                          {pedido.prod_p}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          <p className="text-xs text-blue-400 truncate">
                            {pedido.loc_p}
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
                      const pedido = pedidos.find(p => String(p.id_p) === pedidoId);
                      if (!pedido) return null;
                      
                      return (
                        <div 
                          key={pedidoId}
                          className="flex items-center space-x-3 p-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-white">Pedido #{pedido.id_p}</span>
                            <p className="text-xs text-muted truncate">{pedido.prod_p}</p>
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