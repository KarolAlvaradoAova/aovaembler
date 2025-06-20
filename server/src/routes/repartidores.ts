import { Router } from 'express';
import { loadUsers, saveUsers, loadPedidos, savePedidos, saveParadasRuta } from '../../database/csvLoader';

const router = Router();

// GET todos los repartidores
router.get('/', async (_req, res) => {
  try {
    const users = await loadUsers();
    // Filtrar solo usuarios con type_u 'repartidor'
    const repartidores = users
      .filter((u: any) => u.type_u === 'repartidor')
      .map((u: any) => ({
        id: u.id_u,
        nombre: u.name_u,
        tipo_vehiculo: u.vehi_u,
        status: u.sta_u,
        lat: u.lat,
        lng: u.lon,
        activo: true
      }));
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
    const users = await loadUsers();
    const repartidores = users.filter((u: any) => u.type_u === 'repartidor');
    const repartidor = repartidores.find((r: any) => String(r.id_u) === String(id));
    
    if (!repartidor) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }

    // Retornar la ubicación actual del repartidor
    return res.json({
      repartidorId: id,
      nombre: repartidor.name_u,
      location: {
        lat: parseFloat(repartidor.lat),
        lng: parseFloat(repartidor.lon),
        lastUpdate: repartidor.ultima_actualizacion,
        status: repartidor.sta_u,
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

    // Cargar usuarios actuales
    const users = await loadUsers();
    const repartidorIndex = users.findIndex((u: any) => 
      String(u.id_u) === String(id) && u.type_u === 'repartidor'
    );
    
    if (repartidorIndex === -1) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }

    // Actualizar ubicación del repartidor
    users[repartidorIndex] = {
      ...users[repartidorIndex],
      lat: parseFloat(lat),
      lon: parseFloat(lng),
      sta_u: status || 'en_ruta',
      velocidad: speed || 0,
      ultima_actualizacion: new Date().toISOString()
    };

    // Guardar cambios en el CSV
    await saveUsers(users);

    return res.json({
      message: 'Ubicación actualizada exitosamente',
      repartidorId: id,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        lastUpdate: users[repartidorIndex].ultima_actualizacion,
        status: users[repartidorIndex].sta_u,
        speed: parseFloat(users[repartidorIndex].velocidad)
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
    const users = await loadUsers();
    const repartidores = users.filter((u: any) => u.type_u === 'repartidor');
    const trackingData = repartidores.map((repartidor: any) => ({
      repartidorId: repartidor.id_u,
      nombre: repartidor.name_u,
      tipo_vehiculo: repartidor.vehi_u,
      location: {
        lat: parseFloat(repartidor.lat?.toString() || '0'),
        lng: parseFloat(repartidor.lon?.toString() || '0'),
        lastUpdate: repartidor.ultima_actualizacion || new Date().toISOString(),
        status: repartidor.sta_u || 'disponible',
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
    const users = await loadUsers();
    const repartidores = users.filter((u: any) => u.type_u === 'repartidor');
    const repartidor = repartidores.find((r: any) => String(r.id_u) === String(id));
    if (!repartidor) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }
    
    // Ubicación actual desde users.csv (campos lat y lon)
    const ubicacion = {
      lat: repartidor.lat ? parseFloat(repartidor.lat) : 19.43,
      lng: repartidor.lon ? parseFloat(repartidor.lon) : -99.14,
      status: repartidor.sta_u || 'en_ruta',
      timestamp: repartidor.ultima_actualizacion || new Date().toISOString()
    };
    
    // Cargar pedidos desde el nuevo CSV
    const pedidos = await loadPedidos();
    
    // Intentar cargar ruta desde archivo JSON
    let ruta_actual = [];
    try {
      const fs = require('fs');
      const path = require('path');
      const routeFilePath = path.join(__dirname, '../../../client/public/data/routes', `route_${repartidor.id_u}.json`);
      
      if (fs.existsSync(routeFilePath)) {
        const routeData = JSON.parse(fs.readFileSync(routeFilePath, 'utf8'));
        if (routeData.stops && routeData.stops.length > 0) {
          // Convertir stops del JSON a formato ruta_actual
          ruta_actual = routeData.stops.map((stop: any) => {
            if (stop.type === 'origin') {
              return {
                tipo: 'origen',
                lat: stop.lat,
                lng: stop.lng,
                label: stop.address || 'Ubicación actual',
                status: ubicacion.status,
                timestamp: ubicacion.timestamp
              };
            } else if (stop.type === 'delivery') {
              // Buscar pedido correspondiente para obtener estado actual
              const pedido = pedidos.find((p: any) => String(p.id_p) === String(stop.pedido_id));
              return {
                tipo: 'parada',
                pedido_id: stop.pedido_id,
                lat: stop.lat,
                lng: stop.lng,
                label: stop.address,
                status: pedido ? pedido.sta_p : 'pendiente'
              };
            }
            return null;
          }).filter(Boolean);
        }
      }
    } catch (routeError) {
      console.log(`⚠️ No se pudo cargar ruta JSON para repartidor ${repartidor.id_u}:`, (routeError as Error).message);
      
      // Fallback: construir ruta desde pedidos asignados (usando nuevo campo del_p)
      const pedidosPendientes = pedidos.filter((p: any) => 
        String(p.del_p) === String(repartidor.id_u) &&
        !['entregado', 'entregada', 'completed'].includes((p.sta_p || '').toLowerCase())
      );
      
      ruta_actual = [
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
          pedido_id: p.id_p,
          lat: parseFloat(p.lat || '0'),
          lng: parseFloat(p.long || '0'),
          label: p.loc_p || 'Dirección no especificada',
          status: p.sta_p
        }))
      ];
    }
    
    // Responder con la estructura completa
    return res.json({
      id: repartidor.id_u,
      nombre: repartidor.name_u,
      tipo_vehiculo: repartidor.vehi_u,
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
    const users = await loadUsers();
    const repartidores = users.filter((u: any) => u.type_u === 'repartidor');
    // Cargar todos los pedidos desde el nuevo CSV
    const pedidos = await loadPedidos();
    
    // Para cada repartidor, construir su objeto con ubicación y ruta actual
    const repartidoresLive = await Promise.all(repartidores.map(async (repartidor: any) => {
      // Ubicación actual desde users.csv (campos lat y lon)
      const ubicacion = {
        lat: repartidor.lat ? parseFloat(repartidor.lat) : 19.43,
        lng: repartidor.lon ? parseFloat(repartidor.lon) : -99.14,
        status: repartidor.sta_u || 'en_ruta',
        timestamp: repartidor.ultima_actualizacion || new Date().toISOString()
      };

      // Intentar cargar ruta desde archivo JSON
      let ruta_actual = [];
      try {
        const fs = require('fs');
        const path = require('path');
        const routeFilePath = path.join(__dirname, '../../../client/public/data/routes', `route_${repartidor.id_u}.json`);
        
        if (fs.existsSync(routeFilePath)) {
          const routeData = JSON.parse(fs.readFileSync(routeFilePath, 'utf8'));
          if (routeData.stops && routeData.stops.length > 0) {
            // Convertir stops del JSON a formato ruta_actual
            ruta_actual = routeData.stops.map((stop: any) => {
              if (stop.type === 'origin') {
                return {
                  tipo: 'origen',
                  lat: stop.lat,
                  lng: stop.lng,
                  label: stop.address || 'Ubicación actual',
                  status: ubicacion.status,
                  timestamp: ubicacion.timestamp
                };
              } else if (stop.type === 'delivery') {
                // Buscar pedido correspondiente para obtener estado actual
                const pedido = pedidos.find((p: any) => String(p.id_p) === String(stop.pedido_id));
                return {
                  tipo: 'parada',
                  pedido_id: stop.pedido_id,
                  lat: stop.lat,
                  lng: stop.lng,
                  label: stop.address,
                  status: pedido ? pedido.sta_p : 'pendiente'
                };
              }
              return null;
            }).filter(Boolean);
          }
        }
      } catch (routeError) {
        console.log(`⚠️ No se pudo cargar ruta JSON para repartidor ${repartidor.id_u}:`, (routeError as Error).message);
        
        // Fallback: construir ruta desde pedidos asignados (usando nuevo campo del_p)
        const pedidosPendientes = pedidos.filter((p: any) => 
          String(p.del_p) === String(repartidor.id_u) &&
          !['entregado', 'entregada', 'completed'].includes((p.sta_p || '').toLowerCase())
        );
        
        ruta_actual = [
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
            pedido_id: p.id_p,
            lat: parseFloat(p.lat || '0'),
            lng: parseFloat(p.long || '0'),
            label: p.loc_p || 'Dirección no especificada',
            status: p.sta_p
          }))
        ];
      }

      return {
        id: repartidor.id_u,
        nombre: repartidor.name_u,
        tipo_vehiculo: repartidor.vehi_u,
        ubicacion_actual: ubicacion,
        ruta_actual
      };
    }));

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
    const [users, pedidos] = await Promise.all([
      loadUsers(),
      loadPedidos()
    ]);

    const repartidores = users.filter((u: any) => u.type_u === 'repartidor');
    const repartidor = repartidores.find((r: any) => String(r.id_u) === String(id));
    if (!repartidor) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }

    // Actualizar estado del pedido
    const pedidoIndex = pedidos.findIndex((p: any) => String(p.id_p) === String(pedidoId));
    if (pedidoIndex === -1) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    pedidos[pedidoIndex] = {
      ...pedidos[pedidoIndex],
      sta_p: 'entregado',
      fecha_entrega: new Date().toISOString(),
      evidencia_entrega: deliveryEvidence || ''
    };

    await savePedidos(pedidos);

    // ✅ NUEVO: Integrar con StatusService para actualización automática
    try {
      const { StatusService } = require('../services/statusService');
      await StatusService.onDeliveryCompleted(Number(id), Number(pedidoId));
    } catch (statusError) {
      console.error('⚠️ Error en StatusService, pero entrega se completó:', statusError);
    }

    // Verificar si el repartidor completó toda su ruta
    const pedidosPendientes = pedidos.filter((p: any) => 
      String(p.del_p) === String(id) &&
      !['entregado', 'entregada', 'completed'].includes((p.sta_p || '').toLowerCase())
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
    const users = await loadUsers();
    const repartidorIndex = users.findIndex((u: any) => 
      String(u.id_u) === String(id) && u.type_u === 'repartidor'
    );
    if (repartidorIndex !== -1) {
      users[repartidorIndex] = {
        ...users[repartidorIndex],
        sta_u: 'disponible'
      };
      await saveUsers(users);
    }

    return res.json({
      success: true,
      message: 'Ruta vaciada exitosamente',
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

      // ✅ NUEVO: Integrar con StatusService para actualización automática
      try {
        const { StatusService } = require('../services/statusService');
        await StatusService.onDeliveryCompleted(Number(id), Number(pedidoId));
      } catch (statusError) {
        console.error('⚠️ Error en StatusService, pero parada se actualizó:', statusError);
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
    const users = await loadUsers();
    const repartidores = users.filter((u: any) => u.type_u === 'repartidor');
    const estadoRepartidores = repartidores.map((repartidor: any) => ({
      id_repartidor: repartidor.id_u,
      estado: repartidor.sta_u || 'disponible',
      latitud: repartidor.lat || '19.4326',
      longitud: repartidor.lon || '-99.1332',
      ultima_actualizacion: repartidor.ultima_actualizacion || new Date().toISOString()
    }));

    return res.json(estadoRepartidores);
  } catch (error) {
    console.error('❌ Error obteniendo estado de repartidores:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH actualizar estado del repartidor
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status es requerido' });
    }

    // Cargar usuarios actuales
    const users = await loadUsers();
    const repartidorIndex = users.findIndex((u: any) => 
      String(u.id_u) === String(id) && u.type_u === 'repartidor'
    );
    
    if (repartidorIndex === -1) {
      return res.status(404).json({ error: 'Repartidor no encontrado' });
    }

    // Actualizar estado del repartidor
    users[repartidorIndex] = {
      ...users[repartidorIndex],
      sta_u: status,
      ultima_actualizacion: new Date().toISOString()
    };

    // Guardar cambios en el CSV
    await saveUsers(users);

    return res.json({
      message: 'Estado del repartidor actualizado exitosamente',
      repartidorId: id,
      status: status
    });
  } catch (error) {
    console.error('❌ Error actualizando estado del repartidor:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
