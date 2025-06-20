import { useEffect, useState } from 'react';
import { fetchPedidosFromCSV, fetchIncidenciasFromCSV } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function DeliveryMetrics() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [incidencias, setIncidencias] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pedidosData, incidenciasData] = await Promise.all([
          fetchPedidosFromCSV(),
          fetchIncidenciasFromCSV()
        ]);
        setPedidos(pedidosData);
        setIncidencias(incidenciasData);
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };
    
    loadData();
  }, []);

  // Métricas conectadas a la base de datos CSV
  const total = pedidos.length;
  const pendientes = pedidos.filter(p => ['pendiente', 'surtido', 'recogido'].includes(p.sta_p)).length;
  const enRuta = pedidos.filter(p => p.sta_p === 'en_ruta').length;
  const entregados = pedidos.filter(p => p.sta_p === 'entregado').length;
  // Incidencias: obtenidas desde incidenciasdb.csv
  const totalIncidencias = incidencias.length;

  // Porcentajes
  const pendientesPct = total > 0 ? Math.round((pendientes / total) * 100) : 0;
  const enRutaPct = total > 0 ? Math.round((enRuta / total) * 100) : 0;
  const entregadosPct = total > 0 ? Math.round((entregados / total) * 100) : 0;
  const incidenciasPct = total > 0 ? Math.round((totalIncidencias / total) * 100) : 0;

  return (
    <Card className="bg-black border-2 border-yellow-400 rounded-2xl shadow-yellow p-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-yellow-400 tracking-wide">Métricas en Vivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        {/* Solo una sección de tarjetas de métricas, sin duplicados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="flex flex-col justify-between bg-gray-900 rounded-xl p-4 shadow-yellow border border-yellow-400 min-h-[120px] relative">
            <div>
              <div className="text-yellow-400 text-xs font-semibold mb-1">Completadas</div>
              <div className="text-3xl font-extrabold text-white leading-tight">{entregados}</div>
              <div className="text-xs text-gray-400">{entregadosPct}%</div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 h-4 flex items-end">
              <div className="w-full h-1 bg-gradient-to-r from-yellow-400/40 to-yellow-400/10 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col justify-between bg-gray-900 rounded-xl p-4 shadow-yellow border border-yellow-400 min-h-[120px] relative">
            <div>
              <div className="text-yellow-400 text-xs font-semibold mb-1">En Ruta</div>
              <div className="text-3xl font-extrabold text-white leading-tight">{enRuta}</div>
              <div className="text-xs text-gray-400">{enRutaPct}%</div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 h-4 flex items-end">
              <div className="w-full h-1 bg-gradient-to-r from-yellow-400/40 to-yellow-400/10 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col justify-between bg-gray-900 rounded-xl p-4 shadow-yellow border border-yellow-400 min-h-[120px] relative">
            <div>
              <div className="text-yellow-400 text-xs font-semibold mb-1">Pendientes</div>
              <div className="text-3xl font-extrabold text-white leading-tight">{pendientes}</div>
              <div className="text-xs text-gray-400">{pendientesPct}%</div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 h-4 flex items-end">
              <div className="w-full h-1 bg-gradient-to-r from-yellow-400/40 to-yellow-400/10 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col justify-between bg-gray-900 rounded-xl p-4 shadow-yellow border border-yellow-400 min-h-[120px] relative">
            <div>
              <div className="text-yellow-400 text-xs font-semibold mb-1">Incidencias</div>
              <div className="text-3xl font-extrabold text-white leading-tight">{totalIncidencias}</div>
              <div className="text-xs text-gray-400">{incidenciasPct}%</div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 h-4 flex items-end">
              <div className="w-full h-1 bg-gradient-to-r from-yellow-400/40 to-yellow-400/10 rounded-full" />
            </div>
          </div>
        </div>
        {/* Barras de progreso detalladas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Entregas Completadas</span>
              <span className="text-sm font-medium text-white">{entregadosPct}% ({entregados})</span>
            </div>
            <Progress value={entregadosPct} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">En Ruta</span>
              <span className="text-sm font-medium text-white">{enRutaPct}% ({enRuta})</span>
            </div>
            <Progress value={enRutaPct} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Pendientes</span>
              <span className="text-sm font-medium text-white">{pendientesPct}% ({pendientes})</span>
            </div>
            <Progress value={pendientesPct} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Incidencias</span>
              <span className="text-sm font-medium text-white">{incidenciasPct}% ({totalIncidencias})</span>
            </div>
            <Progress value={incidenciasPct} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}