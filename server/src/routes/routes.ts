import { Router } from 'express';
import { routeService } from '../services/routeService';
import { loadRepartidores } from '../../database/csvLoader';

const router = Router();

// Simulación de optimización de rutas para demo
// En producción aquí usarías Google Routes API

interface RouteOptimizationRequest {
  repartidorId: string;
  sucursalOrigen: string;
  pedidosIds: string[];
  vehicleType?: string;
}

// POST optimizar ruta para un repartidor con persistencia
router.post('/optimize', async (req, res) => {
  try {
    const { repartidorId, sucursalOrigen, pedidosIds, vehicleType = 'car' }: RouteOptimizationRequest = req.body;

    if (!repartidorId || !pedidosIds || pedidosIds.length === 0) {
      return res.status(400).json({ 
        error: 'repartidorId y pedidosIds son requeridos' 
      });
    }

    // Usar el nuevo servicio de rutas
    const optimizationRequest = {
      repartidor_id: Number(repartidorId),
      sucursal_origen: sucursalOrigen,
      pedido_ids: pedidosIds.map(id => Number(id)),
      vehicle_type: vehicleType,
      optimization_method: 'distance'
    };

    const result = await routeService.optimizeRepartidorRoute(optimizationRequest);

    return res.json({
      success: true,
      message: 'Ruta optimizada y guardada exitosamente',
      route: result.route,
      efficiency_improvement: result.efficiency_improvement,
      googleMapsUrl: result.google_maps_url
    });

  } catch (error) {
    console.error('❌ Error optimizando ruta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET ruta activa de un repartidor (ahora usa persistencia)
router.get('/active/:repartidorId', async (req, res) => {
  try {
    const { repartidorId } = req.params;
    // Sincronizar la ruta antes de devolverla
    await routeService.syncRouteWithPedidos(Number(repartidorId));
    // Usar el servicio de rutas para obtener la ruta persistente
    const activeRoute = await routeService.getRepartidorActiveRoute(Number(repartidorId));

    if (!activeRoute) {
      return res.json({ 
        message: 'No hay ruta activa para este repartidor',
        route: null 
      });
    }

    return res.json({
      message: 'Ruta activa encontrada',
      route: activeRoute,
      progress: await routeService.getRouteProgress(activeRoute.id),
      eta: await routeService.getRouteETA(activeRoute.id)
    });

  } catch (error) {
    console.error('❌ Error obteniendo ruta activa:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST auto-optimizar pedidos de un repartidor
router.post('/auto-optimize/:repartidorId', async (req, res) => {
  try {
    const { repartidorId } = req.params;
    
    console.log(`🤖 Iniciando auto-optimización para repartidor ${repartidorId}`);
    
    const result = await routeService.autoOptimizeRepartidorPedidos(Number(repartidorId));
    
    if (!result) {
      return res.json({
        message: 'No se pudo auto-optimizar la ruta',
        reason: 'No hay pedidos válidos o ya existe una ruta manual'
      });
    }

    return res.json({
      message: 'Auto-optimización completada exitosamente',
      route: result.route,
      efficiency_improvement: result.efficiency_improvement,
      time_saved: result.time_saved,
      googleMapsUrl: result.google_maps_url
    });

  } catch (error) {
    console.error('❌ Error en auto-optimización:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET todas las rutas activas
router.get('/all-active', async (_req, res) => {
  try {
    const activeRoutes = await routeService.getAllActiveRoutes();
    
    // Enriquecer con información adicional
    const routesWithProgress = await Promise.all(
      activeRoutes.map(async (route: any) => ({
        ...route,
        progress: await routeService.getRouteProgress(route.id),
        eta: await routeService.getRouteETA(route.id)
      }))
    );

    return res.json({
      message: 'Rutas activas obtenidas exitosamente',
      routes: routesWithProgress,
      total: routesWithProgress.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo rutas activas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET estado de ruta de un repartidor
router.get('/status/:repartidorId', async (req, res) => {
  try {
    const { repartidorId } = req.params;
    
    const status = await routeService.getRouteStatus(Number(repartidorId));
    
    return res.json({
      repartidorId: Number(repartidorId),
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo estado de ruta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para limpiar rutas huérfanas
router.post('/cleanup-orphaned', async (_req, res) => {
  try {
    const result = await routeService.cleanupOrphanedRoutes();
    res.json({
      success: true,
      message: `Limpieza completada: ${result.cleaned}/${result.total} rutas huérfanas eliminadas`,
      data: result
    });
  } catch (error) {
    console.error('Error limpiando rutas huérfanas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para sincronizar ruta de un repartidor específico
router.post('/sync/:repartidorId', async (req, res) => {
  try {
    const repartidorId = parseInt(req.params.repartidorId);
    const result = await routeService.syncRouteWithPedidos(repartidorId);
    res.json({
      success: result,
      message: result ? 'Ruta sincronizada correctamente' : 'Error sincronizando ruta',
      data: { repartidorId, synced: result }
    });
  } catch (error) {
    console.error('Error sincronizando ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para sincronizar todas las rutas
router.post('/sync-all', async (_req, res) => {
  try {
    const repartidores = await loadRepartidores();
    const results = await Promise.all(
      repartidores.map(async (repartidor: any) => {
        const result = await routeService.syncRouteWithPedidos(Number(repartidor.id));
        return { repartidorId: repartidor.id, synced: result };
      })
    );
    
    const syncedCount = results.filter((r: any) => r.synced).length;
    const totalCount = results.length;
    
    res.json({
      success: true,
      message: `Sincronización completada: ${syncedCount}/${totalCount} repartidores sincronizados`,
      data: { results, syncedCount, totalCount }
    });
  } catch (error) {
    console.error('Error sincronizando todas las rutas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// === FUNCIONES AUXILIARES REMOVIDAS ===
// Las funciones auxiliares ahora están implementadas en RouteService

export default router; 