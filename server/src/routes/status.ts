import express from 'express';
import { StatusService } from '../services/statusService';

const router = express.Router();

// GET - Obtener estados de todos los repartidores
router.get('/repartidores', async (_req, res) => {
  try {
    const estados = await StatusService.getRepartidoresStatus();
    return res.json(estados);
  } catch (error) {
    console.error('❌ Error obteniendo estados de repartidores:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Actualizar estado de todos los repartidores automáticamente
router.post('/repartidores/update-all', async (_req, res) => {
  try {
    const resultado = await StatusService.updateAllRepartidorStatus();
    return res.json(resultado);
  } catch (error) {
    console.error('❌ Error actualizando estados de repartidores:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Actualizar estado de un repartidor específico
router.post('/repartidores/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado = await StatusService.updateRepartidorStatus(Number(id));
    
    if (actualizado) {
      return res.json({ 
        success: true, 
        message: `Estado del repartidor ${id} actualizado exitosamente` 
      });
    } else {
      return res.json({ 
        success: false, 
        message: `No se requieren cambios para el repartidor ${id}` 
      });
    }
  } catch (error) {
    console.error(`❌ Error actualizando estado del repartidor:`, error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Notificar entrega completada
router.post('/repartidores/:id/delivery-completed', async (req, res) => {
  try {
    const { id } = req.params;
    const { pedidoId } = req.body;
    
    if (!pedidoId) {
      return res.status(400).json({ error: 'pedidoId es requerido' });
    }

    await StatusService.onDeliveryCompleted(Number(id), Number(pedidoId));
    
    return res.json({ 
      success: true, 
      message: 'Entrega procesada exitosamente' 
    });
  } catch (error) {
    console.error('❌ Error procesando entrega completada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST - Notificar inicio de ruta
router.post('/repartidores/:id/route-started', async (req, res) => {
  try {
    const { id } = req.params;
    
    await StatusService.onRouteStarted(Number(id));
    
    return res.json({ 
      success: true, 
      message: 'Inicio de ruta procesado exitosamente' 
    });
  } catch (error) {
    console.error('❌ Error procesando inicio de ruta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router; 