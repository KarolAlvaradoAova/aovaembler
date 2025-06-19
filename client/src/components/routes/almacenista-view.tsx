import React, { useEffect, useState, useContext, useCallback } from 'react';
import { MoreVertical, Home, Truck, Package, MapPin, Clock, Check, Copy, Search, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { fetchPedidos, fetchAlmacenistas, updatePedidoStatus } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const UserContext = React.createContext<any>(null);

export function AlmacenistaView() {
  // Obtener usuario actual
  const contextUser = useContext(UserContext);
  const windowUser = (window as any).user;
  const localStorageUser = typeof window !== 'undefined' ? 
    JSON.parse(window.localStorage.getItem('user') || 'null') : null;
  const user = contextUser || windowUser || localStorageUser;

  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [almacenista, setAlmacenista] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [updatingPedido, setUpdatingPedido] = useState<string | null>(null);
  const [showProductDetails, setShowProductDetails] = useState<{ [key: string]: boolean }>({});
  const [inventario, setInventario] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pendiente' | 'surtido'>('all');

  // Cargar pedidos y almacenista
  const loadPedidos = useCallback(async () => {
    try {
      const [pedidosData, almacenistasData] = await Promise.all([
        fetchPedidos(),
        fetchAlmacenistas(),
      ]);
      // Buscar almacenista por nombre
      const alm = almacenistasData.find((a: any) => a.nombre === user?.nombre);
      setAlmacenista(alm);
      if (alm) {
        // Filtrar pedidos asignados a la sucursal del almacenista y solo los de estado pendiente o surtido
        const pedidosFiltrados = pedidosData.filter((p: any) => 
          String(p.sucursal_asignada).toLowerCase().trim() === String(alm.sucursal).toLowerCase().trim() &&
          (p.estado === 'pendiente' || p.estado === 'surtido')
        );
        setPedidos(pedidosFiltrados);
      } else {
        setPedidos([]);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los pedidos', variant: 'destructive' });
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

  // --- Hook para cargar inventario CSV como objeto ---
  useEffect(() => {
    fetch('/data/inventario_dummy.csv')
      .then(res => res.text())
      .then(text => {
        // Parsear CSV a objeto
        const lines = text.split('\n').filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = values[i]; });
          return obj;
        });
        setInventario(data);
      });
  }, []);

  const handleUpdatePedidoStatus = async (pedidoId: string | number, newStatus: string, actionName: string) => {
    try {
      setUpdatingPedido(String(pedidoId));
      await updatePedidoStatus(pedidoId, newStatus);
      await loadPedidos();
      toast({ title: '✅ Estado actualizado', description: `${actionName} realizada exitosamente`, duration: 2000 });
    } catch (error) {
      toast({ title: '❌ Error', description: 'No se pudo actualizar el pedido', variant: 'destructive' });
    } finally {
      setUpdatingPedido(null);
      setSelected(null);
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'surtido': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'surtido': return 'Surtido';
      default: return 'Desconocido';
    }
  };

  const parseProductosDetalle = (productosDetalle: string) => {
    try {
      return JSON.parse(productosDetalle);
    } catch {
      return [];
    }
  };

  const toggleProductDetails = (pedidoId: string) => {
    setShowProductDetails(prev => ({ ...prev, [pedidoId]: !prev[pedidoId] }));
  };

  // Función para obtener ubicación en almacén
  function getUbicacionProducto(codigo: string) {
    // Normalizar: quitar espacios, asteriscos, ceros a la izquierda, mayúsculas, y recortar
    const norm = (str: string) => String(str || '').trim().replace(/\s|\*/g, '').replace(/^0+/, '').toUpperCase();
    const codigoNorm = norm(codigo);
    const row = inventario.find((item: any) => norm(item.Clave) === codigoNorm);
    if (row && row.Ubicacion && row.Ubicacion.trim() !== '') return row.Ubicacion;
    // Si no existe, inventar una ubicación basada en el código
    const hash = Array.from(codigoNorm).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const letra = String.fromCharCode(65 + (hash % 26));
    const num = 1 + (hash % 10);
    return `Estante ${letra}${num}`;
  }

  // Filtrar pedidos
  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = searchTerm === '' || 
      String(pedido.id).includes(searchTerm) ||
      pedido.productos?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || pedido.estado === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente').length;
  const pedidosSurtidos = pedidos.filter(p => p.estado === 'surtido').length;

  // --- UI ---
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Gestión de Almacén</h1>
          <p className="text-muted mt-1">
            {almacenista ? `${almacenista.nombre} - Sucursal ${almacenista.sucursal}` : 'Panel de almacén'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-muted">Última actualización</div>
            <div className="text-sm font-medium">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Pedidos Pendientes</p>
                <p className="text-3xl font-bold text-yellow-400">{pedidosPendientes}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Pedidos Surtidos</p>
                <p className="text-3xl font-bold text-green-400">{pedidosSurtidos}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Total Pedidos</p>
                <p className="text-3xl font-bold text-blue-400">{pedidos.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
                <Input
                  placeholder="Buscar por ID de pedido o productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-900/50 border-zinc-700"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
                className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30"
              >
                Todos ({pedidos.length})
              </Button>
              <Button
                variant={filterStatus === 'pendiente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pendiente')}
                className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30"
              >
                Pendientes ({pedidosPendientes})
              </Button>
              <Button
                variant={filterStatus === 'surtido' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('surtido')}
                className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
              >
                Surtidos ({pedidosSurtidos})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pedidos Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-yellow-400" />
            <span>Pedidos a Surtir</span>
            <Badge variant="secondary" className="ml-2">
              {filteredPedidos.length} pedidos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner mr-3"></div>
              <p className="text-muted">Cargando pedidos...</p>
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-yellow-400/50 mb-4" />
              <p className="text-muted text-center text-lg">No hay pedidos para mostrar</p>
              <p className="text-muted text-center">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-modern">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead className="w-32">Estado</TableHead>
                    <TableHead className="w-32">Ubicación</TableHead>
                    <TableHead className="w-40">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map((pedido) => {
                    const isUpdating = updatingPedido === String(pedido.id);
                    const productos = parseProductosDetalle(pedido.productos_detalle || '[]');
                    
                    return (
                      <TableRow key={pedido.id} className="hover:bg-zinc-800/50">
                        <TableCell className="font-mono font-bold text-yellow-400">
                          #{pedido.id}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted">
                                {pedido.productos_detalle ? `${productos.length} productos` : pedido.productos}
                              </span>
                              {pedido.productos_detalle && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleProductDetails(String(pedido.id))}
                                  className="h-6 px-2 text-xs text-yellow-400 hover:bg-yellow-400/10"
                                >
                                  {showProductDetails[String(pedido.id)] ? 'Ocultar' : 'Ver detalles'}
                                </Button>
                              )}
                            </div>
                            
                            {showProductDetails[String(pedido.id)] && pedido.productos_detalle && (
                              <div className="bg-zinc-800/50 rounded-lg p-3 mt-2">
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                  <div className="font-medium text-yellow-400">Código</div>
                                  <div className="font-medium text-yellow-400">Producto</div>
                                  <div className="font-medium text-yellow-400 text-right">Cant.</div>
                                  <div className="font-medium text-yellow-400">Ubicación</div>
                                  {productos.map((producto: any, idx: number) => (
                                    <React.Fragment key={idx}>
                                      <div className="font-mono text-yellow-300">{producto.codigo}</div>
                                      <div className="text-white">{producto.nombre}</div>
                                      <div className="text-yellow-400 font-bold text-right">{producto.cantidad}</div>
                                      <div className="text-blue-400">{getUbicacionProducto(producto.codigo)}</div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(pedido.estado)}>
                            {getStatusText(pedido.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            <span className="text-sm">Sucursal {pedido.sucursal_asignada}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {pedido.estado === 'pendiente' && (
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePedidoStatus(pedido.id, 'surtido', 'Marcar como surtido')}
                                disabled={isUpdating}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {isUpdating ? (
                                  <>
                                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Actualizando...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    Surtir
                                  </>
                                )}
                              </Button>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-yellow-400/30">
                                <DropdownMenuItem className="text-white hover:bg-yellow-400/10">
                                  Ver detalles completos
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-white hover:bg-yellow-400/10">
                                  Reportar incidencia
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-white hover:bg-yellow-400/10">
                                  Copiar ID
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
