import { Router } from 'express';
import { loadRepartidores, saveRepartidores, loadPedidos, savePedidos, saveParadasRuta } from '../../database/csvLoader';
import { Repartidor } from '../../../shared/types';

const router = Router();

// GET todos los repartidores
router.get('/', async (_req, res) => {
  try {
    const repartidores = await loadRepartidores();
    return res.json(repartidores);
  } catch (error) {
    console.error('❌ Error consultando repartidores:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET ubicación en tiempo real de un repartidor específico
router.get('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const repartidores = await loadRepartidores();
    const repartidor = repartidores.find((r: any) => String(r.id) === String(id));
    
    if (!repartidor) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }

    // Retornar la ubicación actual del repartidor
    return res.json({
      repartidorId: id,
      nombre: repartidor.nombre,
      location: {
        lat: parseFloat(repartidor.lat),
        lng: parseFloat(repartidor.lng),
        lastUpdate: repartidor.ultima_actualizacion,
        status: repartidor.status,
        speed: parseFloat(repartidor.velocidad)
      },
      isOnline: true
    });
  } catch (error) {
    console.error('❌ Error obteniendo ubicación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST actualizar ubicación de repartidor
router.post('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, status, speed } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
    }

    // Cargar repartidores actuales
    const repartidores = await loadRepartidores();
    const repartidorIndex = repartidores.findIndex((r: any) => String(r.id) === String(id));
    
    if (repartidorIndex === -1) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }

    // Actualizar ubicación del repartidor
    repartidores[repartidorIndex] = {
      ...repartidores[repartidorIndex],
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      status: status || 'en_ruta',
      velocidad: speed || 0,
      ultima_actualizacion: new Date().toISOString()
    };

    // Guardar cambios en el CSV
    await saveRepartidores(repartidores);

    return res.json({
      message: 'Ubicación actualizada exitosamente',
      repartidorId: id,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        lastUpdate: repartidores[repartidorIndex].ultima_actualizacion,
        status: repartidores[repartidorIndex].status,
        speed: parseFloat(repartidores[repartidorIndex].velocidad)
      }
    });
  } catch (error) {
    console.error('❌ Error actualizando ubicación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET todas las ubicaciones en tiempo real
router.get('/tracking/all', async (_req, res) => {
  try {
    const repartidores = await loadRepartidores();
    const trackingData = repartidores.map((repartidor: Repartidor) => ({
      repartidorId: repartidor.id,
      nombre: repartidor.nombre,
      tipo_vehiculo: repartidor.tipo_vehiculo,
      location: {
        lat: parseFloat(repartidor.lat?.toString() || '0'),
        lng: parseFloat(repartidor.lng?.toString() || '0'),
        lastUpdate: repartidor.ultima_actualizacion || new Date().toISOString(),
        status: repartidor.status || 'disponible',
        speed: parseFloat(repartidor.velocidad?.toString() || '0')
      },
      isOnline: true
    }));

    return res.json(trackingData);
  } catch (error) {
    console.error('❌ Error obteniendo tracking:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /repartidores/:id/live
router.get('/:id/live', async (req, res) => {
  try {
    const { id } = req.params;
    // Cargar repartidor
    const repartidores = await loadRepartidores();
    const repartidor = repartidores.find((r: any) => String(r.id) === String(id));
    if (!repartidor) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }
    // Cargar ubicación actual (simulada si no existe)
    const ubicacion = {
      lat: repartidor.lat ? parseFloat(repartidor.lat) : 19.43 + Math.random() * 0.01,
      lng: repartidor.lng ? parseFloat(repartidor.lng) : -99.14 + Math.random() * 0.01,
      status: repartidor.status || 'en_ruta',
      timestamp: repartidor.ultima_actualizacion || new Date().toISOString()
    };
    // Cargar pedidos asignados y no entregados
    const pedidos = await loadPedidos();
    const pedidosPendientes = pedidos.filter((p: any) => 
      String(p.repartidor_asignado) === String(id) &&
      !['entregado', 'entregada', 'completed'].includes((p.estado || '').toLowerCase())
    );
    // Construir vector de ruta
    const ruta_actual = [
      {
        tipo: 'origen',
        lat: ubicacion.lat,
        lng: ubicacion.lng,
        label: 'Ubicación actual',
        status: ubicacion.status,
        timestamp: ubicacion.timestamp
      },
      ...pedidosPendientes.map((p: any) => ({
        tipo: 'parada',
        pedido_id: p.id,
        lat: parseFloat(p.latitud),
        lng: parseFloat(p.longitud),
        label: p.direccion,
        status: p.estado
      }))
    ];
    // Responder con la estructura completa
    return res.json({
      id: repartidor.id,
      nombre: repartidor.nombre,
      tipo_vehiculo: repartidor.tipo_vehiculo,
      ubicacion_actual: ubicacion,
      ruta_actual
    });
  } catch (error) {
    console.error('❌ Error en /repartidores/:id/live:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /repartidores/live
router.get('/live', async (_req, res) => {
  try {
    // Cargar todos los repartidores
    const repartidores = await loadRepartidores();
    // Cargar todos los pedidos
    const pedidos = await loadPedidos();
    // Para cada repartidor, construir su objeto con ubicación y ruta actual
    const repartidoresLive = repartidores.map((repartidor: any) => {
      // Ubicación actual (simulada si no existe)
      const ubicacion = {
        lat: repartidor.lat ? parseFloat(repartidor.lat) : 19.43 + Math.random() * 0.01,
        lng: repartidor.lng ? parseFloat(repartidor.lng) : -99.14 + Math.random() * 0.01,
        status: repartidor.status || 'en_ruta',
        timestamp: repartidor.ultima_actualizacion || new Date().toISOString()
      };
      // Pedidos asignados y no entregados
      const pedidosPendientes = pedidos.filter((p: any) => 
        String(p.repartidor_asignado) === String(repartidor.id) &&
        !['entregado', 'entregada', 'completed'].includes((p.estado || '').toLowerCase())
      );
      // Vector de ruta
      const ruta_actual = [
        {
          tipo: 'origen',
          lat: ubicacion.lat,
          lng: ubicacion.lng,
          label: 'Ubicación actual',
          status: ubicacion.status,
          timestamp: ubicacion.timestamp
        },
        ...pedidosPendientes.map((p: any) => ({
          tipo: 'parada',
          pedido_id: p.id,
          lat: parseFloat(p.latitud),
          lng: parseFloat(p.longitud),
          label: p.direccion,
          status: p.estado
        }))
      ];
      return {
        id: repartidor.id,
        nombre: repartidor.nombre,
        tipo_vehiculo: repartidor.tipo_vehiculo,
        ubicacion_actual: ubicacion,
        ruta_actual
      };
    });
    return res.json(repartidoresLive);
  } catch (error) {
    console.error('❌ Error en /repartidores/live:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST completar entrega y actualizar ruta
router.post('/:id/complete-delivery', async (req, res) => {
  try {
    const { id } = req.params;
    const { pedidoId, deliveryEvidence } = req.body;

    if (!pedidoId) {
      return res.status(400).json({ error: 'pedidoId es requerido' });
    }

    // Cargar datos actuales
    const [repartidores, pedidos] = await Promise.all([
      loadRepartidores(),
      loadPedidos()
    ]);

    const repartidor = repartidores.find((r: any) => String(r.id) === String(id));
    if (!repartidor) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }

    // Actualizar estado del pedido
    const pedidoIndex = pedidos.findIndex((p: any) => String(p.id) === String(pedidoId));
    if (pedidoIndex === -1) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    pedidos[pedidoIndex] = {
      ...pedidos[pedidoIndex],
      estado: 'entregado',
      fecha_entrega: new Date().toISOString(),
      evidencia_entrega: deliveryEvidence || ''
    };

    await savePedidos(pedidos);

    // Verificar si el repartidor completó toda su ruta
    const pedidosPendientes = pedidos.filter((p: any) => 
      String(p.repartidor_asignado) === String(id) &&
      !['entregado', 'entregada', 'completed'].includes((p.estado || '').toLowerCase())
    );

    let message = 'Entrega completada exitosamente';
    let rutaCompletada = false;

    // Si no hay más pedidos pendientes, vaciar array de paradas y marcar ruta como vacía
    if (pedidosPendientes.length === 0) {
      const { routeService } = require('../services/routeService');
      const rutaActiva = await routeService.getRepartidorActiveRoute(Number(id));
      if (rutaActiva) {
        // Vaciar paradas y marcar como vacía
        rutaActiva.status = 'vacía';
        rutaActiva.total_stops = 0;
        rutaActiva.total_distance = 0;
        rutaActiva.total_estimated_time = 0;
        rutaActiva.current_stop_index = 0;
        rutaActiva.stops = [];
        rutaActiva.completed_at = new Date().toISOString();
        await routeService.saveActiveRoute(rutaActiva);
        // Vaciar paradas en paradas_ruta.csv
        await saveParadasRuta([]);
        message = 'Entrega completada. Ruta vaciada.';
        rutaCompletada = true;
      }
      // Actualizar estado del repartidor a disponible
      const repartidorIndex = repartidores.findIndex((r: any) => String(r.id) === String(id));
      if (repartidorIndex !== -1) {
        repartidores[repartidorIndex] = {
          ...repartidores[repartidorIndex],
          status: 'disponible'
        };
        await saveRepartidores(repartidores);
      }
    }

    return res.json({
      success: true,
      message,
      pedidoId,
      rutaCompletada,
      pedidosPendientes: pedidosPendientes.length
    });

  } catch (error) {
    console.error('❌ Error completando entrega:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST vaciar ruta del repartidor (forzar limpieza)
router.post('/:id/clear-route', async (req, res) => {
  try {
    const { id } = req.params;
    const { routeService } = require('../services/routeService');
    const rutaActiva = await routeService.getRepartidorActiveRoute(Number(id));
    if (rutaActiva) {
      // Vaciar paradas y marcar como vacía
      rutaActiva.status = 'vacía';
      rutaActiva.total_stops = 0;
      rutaActiva.total_distance = 0;
      rutaActiva.total_estimated_time = 0;
      rutaActiva.current_stop_index = 0;
      rutaActiva.stops = [];
      rutaActiva.completed_at = new Date().toISOString();
      await routeService.saveActiveRoute(rutaActiva);
      // Vaciar paradas en paradas_ruta.csv
      await saveParadasRuta([]);
    }
    // Actualizar estado del repartidor
    const repartidores = await loadRepartidores();
    const repartidorIndex = repartidores.findIndex((r: any) => String(r.id) === String(id));
    if (repartidorIndex !== -1) {
      repartidores[repartidorIndex] = {
        ...repartidores[repartidorIndex],
        status: 'disponible'
      };
      await saveRepartidores(repartidores);
    }
    return res.json({
      success: true,
      message: 'Ruta vaciada exitosamente. Repartidor disponible.',
      repartidorId: id
    });
  } catch (error) {
    console.error('❌ Error vaciando ruta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST actualizar estado de parada en ruta
router.post('/:id/update-stop-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { pedidoId, stopStatus, deliveryEvidence } = req.body;

    if (!pedidoId || !stopStatus) {
      return res.status(400).json({ error: 'pedidoId y stopStatus son requeridos' });
    }

    // Importar routeService
    const { routeService } = require('../services/routeService');
    
    // Obtener ruta activa del repartidor
    const rutaActiva = await routeService.getRepartidorActiveRoute(Number(id));
    if (!rutaActiva) {
      return res.status(404).json({ error: 'No se encontró ruta activa para este repartidor' });
    }

    // Encontrar la parada correspondiente al pedido
    const paradaIndex = rutaActiva.stops.findIndex((stop: any) => 
      String(stop.pedido_id) === String(pedidoId)
    );

    if (paradaIndex === -1) {
      return res.status(404).json({ error: 'No se encontró la parada correspondiente al pedido' });
    }

    // Actualizar estado de la parada
    const paradaActualizada = {
      ...rutaActiva.stops[paradaIndex],
      status: stopStatus,
      actual_arrival: stopStatus === 'completed' ? new Date().toISOString() : undefined,
      delivery_evidence: deliveryEvidence || undefined
    };

    // Actualizar la parada en la base de datos
    await routeService.updateParadaRuta(pedidoId, {
      status: stopStatus,
      actual_arrival: paradaActualizada.actual_arrival,
      delivery_evidence: paradaActualizada.delivery_evidence
    }, rutaActiva.id);

    // ✅ CORREGIDO: Verificar si todas las paradas están completadas
    // Primero actualizar la parada actual en el array en memoria
    const paradasActualizadas = rutaActiva.stops.map((stop: any) => {
      if (String(stop.pedido_id) === String(pedidoId)) {
        return {
          ...stop,
          status: stopStatus,
          actual_arrival: stopStatus === 'completed' ? new Date().toISOString() : undefined,
          delivery_evidence: deliveryEvidence || undefined
        };
      }
      return stop;
    });

    // Ahora verificar si TODAS las paradas están completadas
    const todasCompletadas = paradasActualizadas.every((stop: any) => 
      stop.status === 'completed'
    );

    let message = 'Estado de parada actualizado exitosamente';
    let rutaCompletada = false;

    if (todasCompletadas) {
      // Marcar ruta como completada
      await routeService.updateRutaStatus(rutaActiva.id, 'completed');
      message = 'Parada actualizada. Ruta completada.';
      rutaCompletada = true;

      // Actualizar estado del repartidor a disponible
      const repartidores = await loadRepartidores();
      const repartidorIndex = repartidores.findIndex((r: any) => String(r.id) === String(id));
      if (repartidorIndex !== -1) {
        repartidores[repartidorIndex] = {
          ...repartidores[repartidorIndex],
          status: 'disponible'
        };
        await saveRepartidores(repartidores);
      }
    }

    return res.json({
      success: true,
      message,
      pedidoId,
      stopStatus,
      rutaCompletada,
      paradaActualizada
    });

  } catch (error) {
    console.error('❌ Error actualizando estado de parada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET estado de todos los repartidores
router.get('/estado', async (_req, res) => {
  try {
    const repartidores = await loadRepartidores();
    const estadoRepartidores = repartidores.map((repartidor: any) => ({
      id_repartidor: repartidor.id,
      estado: repartidor.status || 'disponible',
      latitud: repartidor.lat || '19.4326',
      longitud: repartidor.lng || '-99.1332',
      ultima_actualizacion: repartidor.ultima_actualizacion || new Date().toISOString()
    }));

    return res.json(estadoRepartidores);
  } catch (error) {
    console.error('❌ Error obteniendo estado de repartidores:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
