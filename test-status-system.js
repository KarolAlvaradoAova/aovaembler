const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000/api';

async function testStatusSystem() {
  console.log('🧪 Probando sistema de actualización automática de estados...\n');

  try {
    // 1. Obtener estados actuales de repartidores
    console.log('1️⃣ Obteniendo estados actuales de repartidores...');
    const response = await fetch(`${BASE_URL}/status/repartidores`);
    const estados = await response.json();
    
    console.log('📊 Estados actuales:');
    estados.forEach(estado => {
      console.log(`   - ${estado.nombre}: ${estado.estado}`);
    });
    console.log('');

    // 2. Ejecutar actualización automática
    console.log('2️⃣ Ejecutando actualización automática...');
    const updateResponse = await fetch(`${BASE_URL}/status/repartidores/update-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const updateResult = await updateResponse.json();
    
    console.log('📊 Resultado de actualización:', updateResult);
    console.log('');

    // 3. Verificar estados después de la actualización
    console.log('3️⃣ Verificando estados después de la actualización...');
    const response2 = await fetch(`${BASE_URL}/status/repartidores`);
    const estadosActualizados = await response2.json();
    
    console.log('📊 Estados actualizados:');
    estadosActualizados.forEach(estado => {
      console.log(`   - ${estado.nombre}: ${estado.estado}`);
    });
    console.log('');

    // 4. Probar actualización de un repartidor específico
    if (estadosActualizados.length > 0) {
      const primerRepartidor = estadosActualizados[0];
      console.log(`4️⃣ Probando actualización específica para ${primerRepartidor.nombre}...`);
      
      const specificUpdateResponse = await fetch(`${BASE_URL}/status/repartidores/${primerRepartidor.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const specificResult = await specificUpdateResponse.json();
      
      console.log('📊 Resultado de actualización específica:', specificResult);
      console.log('');
    }

    // 5. Probar notificación de entrega completada
    console.log('5️⃣ Probando notificación de entrega completada...');
    const deliveryResponse = await fetch(`${BASE_URL}/status/repartidores/5/delivery-completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidoId: 1029 })
    });
    const deliveryResult = await deliveryResponse.json();
    
    console.log('📊 Resultado de notificación de entrega:', deliveryResult);
    console.log('');

    console.log('✅ Pruebas del sistema de estados completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar pruebas
testStatusSystem(); 