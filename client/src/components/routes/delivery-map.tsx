import { useEffect, useState } from 'react';
import { fetchPedidos, fetchRepartidores, fetchSucursales } from '@/lib/utils';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

export function DeliveryMap() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  // const [repartidores, setRepartidores] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('diario');
  const [sucursalFiltro, setSucursalFiltro] = useState('todas');

  useEffect(() => {
    Promise.all([
      fetchPedidos(),
      fetchRepartidores(),
      fetchSucursales()
    ]).then(([pedidosData, repartidoresData, sucursalesData]) => {
      setPedidos(pedidosData);
      // setRepartidores(repartidoresData);
      setSucursales(sucursalesData);
      setLoading(false);
    });
  }, []);

  // Helper para obtener nombre de sucursal
  const getSucursalNombre = (sucursal: string) => {
    if (!sucursal) return '';
    const found = sucursales.find((s: any) => s.nombre?.toLowerCase() === sucursal.toLowerCase());
    return found ? found.nombre.charAt(0).toUpperCase() + found.nombre.slice(1) : sucursal;
  };

  // Helper para obtener id de repartidor con 3 dígitos
  const getRepartidorId = (id: any) => String(id).padStart(3, '0');

  // Helper para traducir estado
  const traducirEstado = (estado: string) => {
    if (estado === 'en_ruta') return 'En reparto';
    if (estado === 'entregado') return 'Entregado';
    if (estado === 'pendiente') return 'En recolección';
    if (estado === 'surtido') return 'Surtido';
    return estado;
  };

  // Filtro de pedidos según periodo y sucursal
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

  return (
    <div className="w-full flex flex-col md:flex-row gap-8 items-start min-h-[500px]">
      {/* Mapa interactivo */}
      <div className="w-full md:w-2/3 flex-shrink-0 flex items-start justify-center">
        <div className="w-full max-w-2xl aspect-[4/3] min-h-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-yellow border-2 border-yellow-400 relative overflow-hidden">
          <div className="absolute top-4 left-4 z-10 bg-black/80 rounded-lg p-2">
            <span className="text-yellow-400 font-bold text-sm">Entregas en Tiempo Real</span>
          </div>
          
          {/* Simulación de mapa con puntos de entrega */}
          <div className="relative w-full h-full bg-gray-800 flex items-center justify-center">
            {/* Fondo del mapa simulado */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-yellow-400/30 rounded-lg"></div>
              <div className="absolute top-1/3 left-1/3 w-1/3 h-1/3 border border-yellow-400/20 rounded"></div>
            </div>
            
            {/* Puntos de entrega basados en pedidos reales */}
            {pedidosFiltrados.slice(0, 8).map((pedido, index) => {
              // Convertir coordenadas a posición en el mapa
              const x = ((pedido.latitud - 19.0) * 100) + 20; // Normalizar lat
              const y = ((pedido.longitud + 99.5) * 100) + 20; // Normalizar lng
              
              const getStatusColor = (estado: string) => {
                if (estado === 'entregado') return 'bg-green-500';
                if (estado === 'en_ruta') return 'bg-yellow-400';
                return 'bg-blue-400';
              };
              
              return (
                <div
                  key={pedido.id}
                  className={`absolute w-3 h-3 rounded-full ${getStatusColor(pedido.estado)} animate-pulse border-2 border-white shadow-lg`}
                  style={{
                    left: `${Math.max(5, Math.min(90, y))}%`,
                    top: `${Math.max(5, Math.min(90, x))}%`,
                  }}
                  title={`Pedido ${pedido.id} - ${traducirEstado(pedido.estado)}`}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                    #{pedido.id}
                  </div>
                </div>
              );
            })}
            
            {/* Leyenda */}
            <div className="absolute bottom-4 right-4 bg-black/80 rounded-lg p-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-white">Entregado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-white">En ruta</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-white">Pendiente</span>
                </div>
              </div>
            </div>
            
            {/* Estadísticas en tiempo real */}
            <div className="absolute top-4 right-4 bg-black/80 rounded-lg p-3 text-xs space-y-1">
              <div className="text-yellow-400 font-bold">En tiempo real:</div>
              <div className="text-white">{pedidosFiltrados.filter(p => p.estado === 'en_ruta').length} en ruta</div>
              <div className="text-white">{pedidosFiltrados.filter(p => p.estado === 'entregado').length} entregados</div>
              <div className="text-white">{pedidosFiltrados.filter(p => p.estado === 'pendiente').length} pendientes</div>
            </div>
          </div>
        </div>
      </div>
      {/* Controles y tabla a la derecha */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
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
          <div className="font-bold text-lg text-yellow-400">Filtrar por sucursal</div>
          <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
            <SelectTrigger className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-2 px-8 rounded-xl text-lg shadow-yellow w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white text-black max-h-60 overflow-y-auto">
              <SelectItem value="todas">Todas</SelectItem>
              {sucursales.map((s) => (
                <SelectItem key={s.nombre} value={s.nombre}>{getSucursalNombre(s.nombre)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="card bg-black rounded-2xl shadow-yellow border-2 border-yellow-400 p-0 overflow-x-auto">
          <table className="min-w-full text-base rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-yellow-400 text-black">
                <th className="p-3">Pedido</th>
                <th className="p-3">Repartidor</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Sucursal origen</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {loading ? (
                <tr><td colSpan={4} className="text-center p-4">Cargando...</td></tr>
              ) : (
                pedidosFiltrados.map((p: any) => (
                  <tr key={p.id} className="border-b border-yellow-400 hover:bg-yellow-400/10 transition">
                    <td className="p-3 font-bold text-yellow-300">D{getRepartidorId(p.id)}</td>
                    <td className="p-3">{getRepartidorId(p.repartidor_asignado)}</td>
                    <td className="p-3">{traducirEstado(p.estado)}</td>
                    <td className="p-3">{getSucursalNombre(p.sucursal_asignada)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}