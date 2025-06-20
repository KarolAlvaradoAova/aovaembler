const fetch = require('node-fetch');

async function testUpdatePedido() {
  try {
    console.log('🧪 Probando actualización de pedido...');
    
    // Primero obtener todos los pedidos
    const response = await fetch('http://localhost:4000/api/pedidos');
    const pedidos = await response.json();
    
    console.log(`📊 Encontrados ${pedidos.length} pedidos`);
    
    if (pedidos.length === 0) {
      console.log('❌ No hay pedidos para probar');
      return;
    }
    
    // Tomar el primer pedido pendiente
    const pedidoPendiente = pedidos.find(p => p.sta_p === 'pendiente');
    
    if (!pedidoPendiente) {
      console.log('❌ No hay pedidos pendientes para probar');
      return;
    }
    
    console.log('🎯 Pedido a actualizar:', {
      id: pedidoPendiente.id_p,
      estado_actual: pedidoPendiente.sta_p,
      productos: pedidoPendiente.prod_p
    });
    
    // Actualizar el pedido
    const updateResponse = await fetch(`http://localhost:4000/api/pedidos/${pedidoPendiente.id_p}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado: 'surtido' })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.log('❌ Error en actualización:', error);
      return;
    }
    
    const result = await updateResponse.json();
    console.log('✅ Pedido actualizado exitosamente:', result);
    
    // Verificar que se actualizó
    const verifyResponse = await fetch('http://localhost:4000/api/pedidos');
    const pedidosActualizados = await verifyResponse.json();
    const pedidoActualizado = pedidosActualizados.find(p => p.id_p === pedidoPendiente.id_p);
    
    console.log('🔍 Verificación:', {
      id: pedidoActualizado.id_p,
      estado_nuevo: pedidoActualizado.sta_p,
      actualizado: pedidoActualizado.sta_p === 'surtido'
    });
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

testUpdatePedido(); 