import { fetchPedidos, fetchRepartidores, fetchSucursales, fetchIncidencias } from '@/lib/utils';
import { RealTimeMap } from './real-time-map';
import { ErrorBoundary } from '../error-boundary';
import { DashboardRealTimeMap } from '../dashboard-real-time-map';
import { RouteOptimizer } from './route-optimizer';
import { DeliveryMetrics } from './delivery-metrics';
import { IncidentsTable } from './incidents-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { ChartBar, ChartPie, ChartLine } from '../ui/chart2';
import { FakeOrderButton } from '../fake-order-button';

export function Routes() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [repartidores, setRepartidores] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidoExpandido, setPedidoExpandido] = useState<number | null>(null);
  // Solo para la tabla de reporte de entregas
  const [incidenciasReporte, setIncidenciasReporte] = useState<any[]>([]);

  // Filtros para los menús desplegables de la sección de reporte de entregas
  const [periodo, setPeriodo] = useState('diario');
  const [zona, setZona] = useState('todas');
  const [tipoGrafico, setTipoGrafico] = useState('barras');

  useEffect(() => {
    // Mantén la carga de pedidos, repartidores y sucursales igual
    Promise.all([
      fetchPedidos(),
      fetchRepartidores(),
      fetchSucursales()
    ]).then(([pedidosData, repartidoresData, sucursalesData]) => {
      setPedidos(pedidosData);
      setRepartidores(repartidoresData);
      setSucursales(sucursalesData);
      setLoading(false);
    });
    // Solo para la tabla de reporte de entregas, carga incidencias aparte
    fetchIncidencias().then(data => setIncidenciasReporte(data));
  }, []);

  // Contadores conectados a la base de datos
  // Entregas realizadas hoy (no hay campo de fecha, así que solo entregados)
  const entregasHoy = pedidos.filter(p => p.estado === 'entregado').length;
  // Entregas en reparto
  const enReparto = pedidos.filter(p => p.estado === 'en_ruta').length;
  // Repartidores disponibles: los que NO están asignados a un pedido en_ruta
  const repartidoresOcupados = pedidos.filter(p => p.estado === 'en_ruta').map(p => String(p.repartidor_asignado));
  const repartidoresDisponibles = repartidores.filter(r => r.status === 'disponible').length;
  // Porcentaje de entregas completadas respecto al total de pedidos
  const porcentajeEntregados = pedidos.length > 0 ? Math.round((entregasHoy / pedidos.length) * 100) : 0;

  // Función para recargar pedidos
  const reloadPedidos = async () => {
    setLoading(true);
    const pedidosData = await fetchPedidos();
    setPedidos(pedidosData);
    setLoading(false);
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gradient mb-2">Panel de Control</h1>
        <p className="text-muted text-lg">Gestión integral de entregas y logística</p>
      </div>
      
      <Tabs defaultValue="dashboard" className="w-full space-y-6">
          <TabsList className="!h-auto card-glass p-4 mb-8 w-full !flex flex-wrap justify-start items-center gap-2 min-h-[68px]">
            <TabsTrigger 
              value="dashboard"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:shadow-lg text-white hover:bg-yellow-400/10 transition-all duration-200 rounded-xl px-6 font-medium whitespace-nowrap flex items-center justify-center h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-inset"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="tracking"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:shadow-lg text-white hover:bg-yellow-400/10 transition-all duration-200 rounded-xl px-6 font-medium whitespace-nowrap flex items-center justify-center h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-inset"
            >
              📍 GPS Tracking
            </TabsTrigger>
            <TabsTrigger 
              value="rutas"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:shadow-lg text-white hover:bg-yellow-400/10 transition-all duration-200 rounded-xl px-6 font-medium whitespace-nowrap flex items-center justify-center h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-inset"
            >
              🗺️ Optimizar Rutas
            </TabsTrigger>
            <TabsTrigger 
              value="metricas"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:shadow-lg text-white hover:bg-yellow-400/10 transition-all duration-200 rounded-xl px-6 font-medium whitespace-nowrap flex items-center justify-center h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-inset"
            >
              Métricas
            </TabsTrigger>
            <TabsTrigger 
              value="incidencias"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:shadow-lg text-white hover:bg-yellow-400/10 transition-all duration-200 rounded-xl px-6 font-medium whitespace-nowrap flex items-center justify-center h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-inset"
            >
              Incidencias
            </TabsTrigger>
            <TabsTrigger 
              value="detalles-repartidores"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:shadow-lg text-white hover:bg-yellow-400/10 transition-all duration-200 rounded-xl px-6 font-medium whitespace-nowrap flex items-center justify-center h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-inset"
            >
              Detalles Repartidores
            </TabsTrigger>
            <TabsTrigger 
              value="reporte-entregas"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:shadow-lg text-white hover:bg-yellow-400/10 transition-all duration-200 rounded-xl px-6 font-medium whitespace-nowrap flex items-center justify-center h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-inset"
            >
              Reporte de entregas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="card-modern p-6 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="status-indicator status-success">+{porcentajeEntregados}%</div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">{entregasHoy}</h3>
                  <p className="text-yellow-400 font-medium mb-2">Entregas completadas</p>
                  <p className="text-xs text-muted">Hoy comparado con ayer</p>
                </div>
              </div>

              <div className="card-modern p-6 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
                    </svg>
                  </div>
                  <div className="status-indicator status-warning">En ruta</div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">{enReparto}</h3>
                  <p className="text-yellow-400 font-medium mb-2">Entregas en curso</p>
                  <p className="text-xs text-muted">Pedidos activos en reparto</p>
                </div>
              </div>

              <div className="card-modern p-6 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div className="status-indicator status-info">Disponible</div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-1">{repartidoresDisponibles}</h3>
                  <p className="text-yellow-400 font-medium mb-2">Repartidores libres</p>
                  <p className="text-xs text-muted">Listos para asignación</p>
                </div>
              </div>
            </div>
            {/* Secondary Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Map Section */}
              <div className="card-modern p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Rastreo en tiempo real</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted">Actualizado hace 5 min</span>
                  </div>
                </div>
                <DashboardRealTimeMap />
              </div>

              {/* Delivery Team Status */}
              <div className="card-modern p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Estado del equipo</h3>
                <div className="space-y-3">
                  {repartidores.slice(0, 4).map((r) => {
                    // Usar sucursal_base directamente del repartidor
                    const sucursal = r.sucursal_base ? r.sucursal_base.charAt(0).toUpperCase() + r.sucursal_base.slice(1) : 'Sucursal Central';
                    // Determinar color y texto según status
                    const statusColor = r.status === 'en_ruta' ? 'status-warning' : r.status === 'ocupado' ? 'status-info' : 'status-success';
                    const statusText = r.status === 'en_ruta' ? 'En ruta' : r.status === 'ocupado' ? 'Ocupado' : 'Disponible';
                    return (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-black font-bold">
                            {String(r.id).padStart(2, '0')}
                          </div>
                          <div>
                            <p className="font-medium text-white">{r.nombre}</p>
                            <p className="text-sm text-muted">{sucursal}</p>
                          </div>
                        </div>
                        <div className={`status-indicator ${statusColor}`}>{statusText}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Live Orders Table */}
            <div className="card-modern p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Pedidos en tiempo real</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted">Actualización automática</span>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-yellow-400/20">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Productos</th>
                      <th>Dirección</th>
                      <th>Estado</th>
                      <th>Sucursal</th>
                      <th>Repartidor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.slice(0, 8).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className="font-mono text-yellow-400">#{p.id}</span>
                        </td>
                        <td className="max-w-32 truncate">{p.productos}</td>
                        <td className="max-w-40 truncate">{p.direccion}</td>
                        <td>
                          <div className={`status-indicator ${
                            p.estado === 'entregado' ? 'status-success' :
                            p.estado === 'en_ruta' ? 'status-warning' :
                            'status-info'
                          }`}>
                            {traducirEstadoPedido(p.estado)}
                          </div>
                        </td>
                        <td>{p.sucursal_asignada}</td>
                        <td>
                          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
                            {String(p.repartidor_asignado).padStart(2, '0')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="tracking">
            <ErrorBoundary>
              <RealTimeMap />
            </ErrorBoundary>
          </TabsContent>
          <TabsContent value="rutas">
            <RouteOptimizer />
          </TabsContent>
          <TabsContent value="metricas">
            {/* Solo mostrar DeliveryMetrics, sin tarjetas grandes arriba */}
            <div className="mt-8">
              <DeliveryMetrics />
            </div>
          </TabsContent>
          <TabsContent value="incidencias">
            <IncidentsTable />
          </TabsContent>
          <TabsContent value="detalles-repartidores">
            {/* Tabla de detalles de repartidores, ahora con formato visual solicitado y expandible */}
            <div className="overflow-x-auto w-full rounded-xl shadow-lg">
              <table className="min-w-full rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-yellow-400 text-black text-lg">
                    <th className="p-3 font-bold">Pedido</th>
                    <th className="p-3 font-bold">Repartidor</th>
                    <th className="p-3 font-bold">Estado</th>
                    <th className="p-3 font-bold">Sucursal origen</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map((p) => (
                    <>
                      <tr
                        key={p.id}
                        className={`bg-black text-white border-b border-yellow-400 hover:bg-yellow-400/10 transition cursor-pointer ${pedidoExpandido === p.id ? 'ring-2 ring-yellow-400' : ''}`}
                        onClick={() => setPedidoExpandido(pedidoExpandido === p.id ? null : p.id)}
                      >
                        <td className="p-3 font-bold text-yellow-300">D{p.id}</td>
                        <td className="p-3">{String(p.repartidor_asignado).padStart(3, '0')}</td>
                        <td className="p-3">{traducirEstadoPedido(p.estado)}</td>
                        <td className="p-3">{p.sucursal_asignada}</td>
                      </tr>
                      {pedidoExpandido === p.id && (
                        <tr className="bg-yellow-50 text-black">
                          <td colSpan={4} className="p-4 border-b border-yellow-400">
                            <div className="font-bold mb-2">Detalles del pedido</div>
                            <div><span className="font-semibold">Productos:</span> {p.productos}</div>
                            <div><span className="font-semibold">Dirección:</span> {p.direccion}</div>
                            <div><span className="font-semibold">Lat/Lng:</span> {p.latitud}, {p.longitud}</div>
                            <div><span className="font-semibold">Estado:</span> {traducirEstadoPedido(p.estado)}</div>
                            <div><span className="font-semibold">Sucursal origen:</span> {p.sucursal_asignada}</div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="reporte-entregas">
            <div className="flex flex-col gap-6 w-full mb-6">
              {/* KPIs rápidos y resumen de incidencias */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-modern p-4 flex flex-col items-center bg-black border-2 border-yellow-400 rounded-2xl shadow-yellow">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">{pedidos.filter(p => p.estado === 'entregado').length}</div>
                  <div className="text-white font-medium">Entregas completadas</div>
                </div>
                <div className="card-modern p-4 flex flex-col items-center bg-black border-2 border-yellow-400 rounded-2xl shadow-yellow">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">{pedidos.filter(p => p.estado === 'en_ruta').length}</div>
                  <div className="text-white font-medium">En reparto</div>
                </div>
                <div className="card-modern p-4 flex flex-col items-center bg-black border-2 border-yellow-400 rounded-2xl shadow-yellow">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">{incidenciasReporte.length}</div>
                  <div className="text-white font-medium">Incidencias totales</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-8 w-full">
              <Card className="bg-black border-2 border-yellow-400 rounded-2xl shadow-yellow p-0 w-full md:w-2/3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-yellow-400 tracking-wide text-center">
                    Reporte de entregas por sucursal
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-black text-yellow-400">
                          <TableHead className="text-yellow-400 font-bold text-center">Sucursal</TableHead>
                          <TableHead className="text-yellow-400 font-bold text-center">En reparto</TableHead>
                          <TableHead className="text-yellow-400 font-bold text-center">Entregas</TableHead>
                          <TableHead className="text-yellow-400 font-bold text-center">Incidencias</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Filtrado dinámico por zona y periodo */}
                        {sucursales
                          .filter((suc) => zona === 'todas' || (suc.nombre || '').toLowerCase() === zona.toLowerCase())
                          .map((suc, idx) => {
                            const nombre = suc.nombre || suc.sucursal || '';
                            // Filtro de pedidos por sucursal y periodo
                            let pedidosSucursal = pedidos.filter(p => (p.sucursal_asignada || '').toLowerCase() === nombre.toLowerCase());
                            // Filtro por periodo (simulado, ya que no hay fecha real)
                            if (periodo === 'semanal') {
                              pedidosSucursal = pedidosSucursal.filter(p => p.estado === 'entregado' || p.estado === 'en_ruta');
                            } else if (periodo === 'mensual') {
                              pedidosSucursal = pedidosSucursal.filter(p => p.estado === 'entregado');
                            }
                            const enReparto = pedidosSucursal.filter(p => p.estado === 'en_ruta').length;
                            const entregas = pedidosSucursal.filter(p => p.estado === 'entregado').length;
                            // Incidencias: por sucursal, usando ubicacion o sucursal_asignada si existe
                            const incidenciasSucursal = incidenciasReporte.filter(i => {
                              if (i.ubicacion && i.ubicacion.toLowerCase().includes(nombre.toLowerCase())) return true;
                              if (i.sucursal_asignada && i.sucursal_asignada.toLowerCase() === nombre.toLowerCase()) return true;
                              return false;
                            }).length;
                            // Si no hay datos y está filtrando, no mostrar la fila
                            if (enReparto === 0 && entregas === 0 && incidenciasSucursal === 0 && zona !== 'todas') return null;
                            return (
                              <TableRow key={nombre} className={idx % 2 === 0 ? 'bg-gray-900 border-b border-yellow-400' : 'bg-black border-b border-yellow-400'}>
                                <TableCell className="text-yellow-400 font-bold text-center">{nombre.charAt(0).toUpperCase() + nombre.slice(1)}</TableCell>
                                <TableCell className="text-white text-center">{enReparto}</TableCell>
                                <TableCell className="text-white text-center">{entregas}</TableCell>
                                <TableCell className="text-white text-center">{incidenciasSucursal}</TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              <div className="flex flex-col gap-6 w-full md:w-1/3">
                <div className="card flex flex-col gap-4 p-6 rounded-2xl shadow-yellow border-2 border-yellow-400 bg-black">
                  <div className="font-bold text-lg text-yellow-400">Seleccionar periodo temporal</div>
                  <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-8 rounded-xl text-lg shadow-yellow w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="diario">Diario</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="font-bold text-lg text-yellow-400">Filtrar por zona</div>
                  <Select value={zona} onValueChange={setZona}>
                    <SelectTrigger className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-8 rounded-xl text-lg shadow-yellow w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black max-h-60 overflow-y-auto">
                      <SelectItem value="todas">Todas</SelectItem>
                      {sucursales.map((s) => (
                        <SelectItem key={s.nombre} value={s.nombre}>{s.nombre.charAt(0).toUpperCase() + s.nombre.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="font-bold text-lg text-yellow-400">Tipo de gráfico</div>
                  <Select value={tipoGrafico} onValueChange={setTipoGrafico}>
                    <SelectTrigger className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-8 rounded-xl text-lg shadow-yellow w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="barras">Barras</SelectItem>
                      <SelectItem value="pastel">Pastel</SelectItem>
                      <SelectItem value="lineas">Líneas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full flex justify-center items-end">
                  {/* Gráfico dinámico según selección y filtros */}
                  <div className="w-full max-w-lg h-72 bg-gray-900 flex flex-col items-center justify-center rounded-xl border-2 border-yellow-400 text-yellow-400 font-extrabold shadow-yellow mt-4 p-4">
                    {tipoGrafico === 'barras' ? (
                      (() => {
                        const sucursalesFiltradas = sucursales.filter((suc) => zona === 'todas' || (suc.nombre || '').toLowerCase() === zona.toLowerCase());
                        let hayDatos = pedidos.length > 0;
                        let data: any[];
                        if (!hayDatos) {
                          data = sucursalesFiltradas.map((suc, i) => {
                            const nombre = suc.nombre || suc.sucursal || '';
                            return {
                              sucursal: nombre.charAt(0).toUpperCase() + nombre.slice(1),
                              'En reparto': Math.floor(Math.random() * 5) + 1 + i,
                              'Entregados': Math.floor(Math.random() * 10) + 2 + i,
                              'Incidencias': Math.floor(Math.random() * 3) + i
                            };
                          });
                        } else {
                          data = sucursalesFiltradas.map((suc) => {
                            const nombre = suc.nombre || suc.sucursal || '';
                            let pedidosSucursal = pedidos.filter(p => (p.sucursal_asignada || '').toLowerCase() === nombre.toLowerCase());
                            if (periodo === 'semanal') {
                              pedidosSucursal = pedidosSucursal.filter(p => p.estado === 'entregado' || p.estado === 'en_ruta');
                            } else if (periodo === 'mensual') {
                              pedidosSucursal = pedidosSucursal.filter(p => p.estado === 'entregado');
                            }
                            const enReparto = pedidosSucursal.filter(p => p.estado === 'en_ruta').length;
                            const entregas = pedidosSucursal.filter(p => p.estado === 'entregado').length;
                            const incidenciasSucursal = incidenciasReporte.filter(i => {
                              if (i.ubicacion && i.ubicacion.toLowerCase().includes(nombre.toLowerCase())) return true;
                              if (i.sucursal_asignada && i.sucursal_asignada.toLowerCase() === nombre.toLowerCase()) return true;
                              return false;
                            }).length;
                            return {
                              sucursal: nombre.charAt(0).toUpperCase() + nombre.slice(1),
                              'En reparto': enReparto,
                              'Entregados': entregas,
                              'Incidencias': incidenciasSucursal,
                            };
                          });
                        }
                        const chartData = {
                          labels: data.map(d => d.sucursal),
                          datasets: [
                            {
                              label: 'En reparto',
                              data: data.map(d => d['En reparto']),
                              backgroundColor: '#FFD600',
                            },
                            {
                              label: 'Entregados',
                              data: data.map(d => d['Entregados']),
                              backgroundColor: '#BDBDBD',
                            },
                            {
                              label: 'Incidencias',
                              data: data.map(d => d['Incidencias']),
                              backgroundColor: '#111',
                            },
                          ],
                        };
                        const options = {
                          responsive: true,
                          plugins: { legend: { position: 'top' as const } },
                          scales: { x: { ticks: { color: '#FFD600' } }, y: { ticks: { color: '#fff' } } },
                        };
                        return <ChartBar data={chartData} options={options} />;
                      })()
                    ) : tipoGrafico === 'pastel' ? (
                      (() => {
                        const sucursalesFiltradas = sucursales.filter((suc) => zona === 'todas' || (suc.nombre || '').toLowerCase() === zona.toLowerCase());
                        let hayDatos = pedidos.length > 0;
                        let data: any[];
                        if (!hayDatos) {
                          data = sucursalesFiltradas.map((suc, i) => {
                            const nombre = suc.nombre || suc.sucursal || '';
                            return {
                              name: nombre.charAt(0).toUpperCase() + nombre.slice(1),
                              value: Math.floor(Math.random() * 10) + 2 + i
                            };
                          }).filter(item => item.value > 0);
                        } else {
                          data = sucursalesFiltradas.map((suc) => {
                            const nombre = suc.nombre || suc.sucursal || '';
                            let pedidosSucursal = pedidos.filter(p => (p.sucursal_asignada || '').toLowerCase() === nombre.toLowerCase());
                            if (periodo === 'semanal') {
                              pedidosSucursal = pedidosSucursal.filter(p => p.estado === 'entregado' || p.estado === 'en_ruta');
                            } else if (periodo === 'mensual') {
                              pedidosSucursal = pedidosSucursal.filter(p => p.estado === 'entregado');
                            }
                            const total = pedidosSucursal.length;
                            return {
                              name: nombre.charAt(0).toUpperCase() + nombre.slice(1),
                              value: total,
                            };
                          }).filter(item => item.value > 0);
                        }
                        const chartData = {
                          labels: data.map(d => d.name),
                          datasets: [
                            {
                              label: 'Entregas',
                              data: data.map(d => d.value),
                              backgroundColor: ['#FFD600', '#BDBDBD', '#111', '#666'],
                            },
                          ],
                        };
                        const options = { responsive: true, plugins: { legend: { position: 'top' as const } } };
                        return <ChartPie data={chartData} options={options} />;
                      })()
                    ) : tipoGrafico === 'lineas' ? (
                      (() => {
                        const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                        let sucursalesFiltradas = sucursales.filter((suc) => zona === 'todas' || (suc.nombre || '').toLowerCase() === zona.toLowerCase());
                        let hayDatos = pedidos.some(p => p.estado === 'entregado');
                        let data: any[];
                        if (!hayDatos) {
                          data = dias.map((dia, idx) => {
                            const obj: any = { dia };
                            sucursalesFiltradas.forEach((suc, i) => {
                              const nombre = suc.nombre || suc.sucursal || '';
                              obj[nombre.charAt(0).toUpperCase() + nombre.slice(1)] = Math.floor(Math.random() * 10) + 1 + idx + i;
                            });
                            return obj;
                          });
                        } else {
                          data = dias.map((dia, idx) => {
                            const obj: any = { dia };
                            sucursalesFiltradas.forEach((suc) => {
                              const nombre = suc.nombre || suc.sucursal || '';
                              const entregas = pedidos.filter(p => (p.sucursal_asignada || '').toLowerCase() === nombre.toLowerCase() && p.estado === 'entregado').length;
                              obj[nombre.charAt(0).toUpperCase() + nombre.slice(1)] = Math.max(0, Math.round(entregas * (0.7 + 0.1 * idx)));
                            });
                            return obj;
                          });
                        }
                        const chartData = {
                          labels: dias,
                          datasets: sucursalesFiltradas.map((suc, i) => {
                            const nombre = suc.nombre || suc.sucursal || '';
                            return {
                              label: nombre.charAt(0).toUpperCase() + nombre.slice(1),
                              data: data.map(d => d[nombre.charAt(0).toUpperCase() + nombre.slice(1)]),
                              borderColor: ['#FFD600', '#BDBDBD', '#111', '#29B6F6', '#FF7043'][i % 5],
                              backgroundColor: ['#FFD600', '#BDBDBD', '#111', '#29B6F6', '#FF7043'][i % 5],
                            };
                          }),
                        };
                        const options = { responsive: true, plugins: { legend: { position: 'top' as const } } };
                        return <ChartLine data={chartData} options={options} />;
                      })()
                    ) : (
                      <div className="text-muted">Selecciona un tipo de gráfico</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Botón flotante para crear pedidos falsos */}
        <FakeOrderButton onPedidoCreado={reloadPedidos} />
      </div>
    );
}

// Utilidad para traducir el estado a texto amigable
function traducirEstadoPedido(estado: string) {
  switch (estado) {
    case 'en_ruta': return 'En reparto';
    case 'pendiente': return 'En recolección';
    case 'surtido': return 'Surtido';
    case 'entregado': return 'Entregado';
    default: return estado;
  }
}