import { useEffect, useState } from 'react';
import { fetchPedidos } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function DeliveryMetrics() {
  const [pedidos, setPedidos] = useState<any[]>([]);

  useEffect(() => {
    fetchPedidos().then((data) => {
      setPedidos(data);
    });
  }, []);

  // Métricas conectadas a la base de datos
  const total = pedidos.length;
  const completados = pedidos.filter(p => p.estado === 'entregado').length;
  const enRuta = pedidos.filter(p => p.estado === 'en_ruta').length;
  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
  const surtidos = pedidos.filter(p => p.estado === 'surtido').length;
  // Incidencias: si tuvieras un campo de incidencias, aquí se cuenta. Por ahora, 0.
  const incidencias = 0;

  // Porcentajes
  const completadosPct = total > 0 ? Math.round((completados / total) * 100) : 0;
  const enRutaPct = total > 0 ? Math.round((enRuta / total) * 100) : 0;
  const pendientesPct = total > 0 ? Math.round((pendientes / total) * 100) : 0;
  const surtidosPct = total > 0 ? Math.round((surtidos / total) * 100) : 0;
  const incidenciasPct = total > 0 ? Math.round((incidencias / total) * 100) : 0;

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
              <div className="text-3xl font-extrabold text-white leading-tight">{completados}</div>
              <div className="text-xs text-gray-400">{completadosPct}%</div>
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
              <div className="text-yellow-400 text-xs font-semibold mb-1">Surtidos</div>
              <div className="text-3xl font-extrabold text-white leading-tight">{surtidos}</div>
              <div className="text-xs text-gray-400">{surtidosPct}%</div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 h-4 flex items-end">
              <div className="w-full h-1 bg-gradient-to-r from-yellow-400/40 to-yellow-400/10 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col justify-between bg-gray-900 rounded-xl p-4 shadow-yellow border border-yellow-400 min-h-[120px] relative">
            <div>
              <div className="text-yellow-400 text-xs font-semibold mb-1">Incidencias</div>
              <div className="text-3xl font-extrabold text-white leading-tight">{incidencias}</div>
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
              <span className="text-sm font-medium text-white">{completadosPct}% ({completados})</span>
            </div>
            <Progress value={completadosPct} className="h-2" />
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
              <span className="text-sm text-gray-400">Surtidos</span>
              <span className="text-sm font-medium text-white">{surtidosPct}% ({surtidos})</span>
            </div>
            <Progress value={surtidosPct} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Incidencias</span>
              <span className="text-sm font-medium text-white">{incidenciasPct}%</span>
            </div>
            <Progress value={incidenciasPct} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}