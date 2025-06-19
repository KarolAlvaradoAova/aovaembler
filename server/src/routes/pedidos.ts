import { Router } from 'express';
import { loadPedidos, updatePedido, updateParadaRuta, saveCSV } from '../../database/csvLoader';

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
    
    console.log(`🔄 API: Actualizando pedido ${pedidoId} con campos:`, updateFields);
    
    // Actualizar pedido en CSV
    const pedidoActualizado = await updatePedido(pedidoId, updateFields);
    
    if (!pedidoActualizado) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Si el estado es entregado, actualizar también la parada de ruta correspondiente
    if (updateFields.estado === 'entregado' || updateFields.estado === 'entregada' || updateFields.estado === 'completed') {
      try {
        await updateParadaRuta(pedidoId, { status: 'completed', actual_arrival: new Date().toISOString() });
        console.log(`✅ Parada de ruta para pedido ${pedidoId} marcada como completada`);
      } catch (err) {
        console.error(`❌ No se pudo actualizar la parada de ruta para pedido ${pedidoId}:`, err);
      }
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
