import { Router } from 'express';
import { loadPedidos, updatePedido, saveCSV } from '../../database/csvLoader';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const pedidos = await loadPedidos();
    res.json(pedidos);
  } catch (error) {
    console.error('❌ Error consultando pedidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para actualizar estado de pedido
router.patch('/:id', async (req, res) => {
  try {
    const pedidoId = req.params.id;
    const updateFields = req.body;
    
    console.log(`🔄 API: Actualizando pedido ${pedidoId}`);
    console.log('📥 Campos recibidos:', updateFields);
    console.log('📥 Body completo:', req.body);
    
    // No convertir estado a sta_p, usar directamente el campo estado
    console.log('📤 Campos a actualizar:', updateFields);
    
    // Actualizar pedido en CSV
    const pedidoActualizado = await updatePedido(pedidoId, updateFields);
    
    if (!pedidoActualizado) {
      console.log('❌ Pedido no encontrado');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    console.log('✅ Pedido actualizado:', pedidoActualizado);
    
    // ✅ NUEVO: Integrar con StatusService para actualización automática
    try {
      const { StatusService } = require('../services/statusService');
      
      // Si el pedido tiene un repartidor asignado, actualizar su estado
      if (pedidoActualizado.del_p) {
        await StatusService.updateRepartidorStatus(Number(pedidoActualizado.del_p));
        console.log(`📊 Estado del repartidor ${pedidoActualizado.del_p} actualizado automáticamente`);
      }
      
      // Si se marcó como entregado, notificar entrega completada
      if (updateFields.estado === 'entregado' && pedidoActualizado.del_p) {
        await StatusService.onDeliveryCompleted(Number(pedidoActualizado.del_p), Number(pedidoId));
        console.log(`📦 Entrega completada notificada para repartidor ${pedidoActualizado.del_p}`);
      }
      
    } catch (statusError) {
      console.error('⚠️ Error en StatusService, pero pedido se actualizó:', statusError);
    }
    
    console.log(`✅ API: Pedido ${pedidoId} actualizado exitosamente`);
    
    return res.json({ 
      message: 'Pedido actualizado exitosamente',
      pedido: pedidoActualizado
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST crear nuevo pedido
router.post('/', async (req, res) => {
  try {
    const pedidos = await loadPedidos();
    
    // Validar que el ID no exista
    if (pedidos.some((p: any) => String(p.id) === String(req.body.id))) {
      return res.status(400).json({ error: 'El ID del pedido ya existe' });
    }

    // Agregar nuevo pedido
    pedidos.push(req.body);
    
    // Guardar en CSV
    await saveCSV('pedidos.csv', pedidos);
    
    console.log(`✅ Pedido ${req.body.id} creado exitosamente`);
    
    return res.json({ 
      message: 'Pedido creado exitosamente',
      pedido: req.body
    });
    
  } catch (error) {
    console.error('❌ Error creando pedido:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
