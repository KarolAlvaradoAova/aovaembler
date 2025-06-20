import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Función para cargar CSV desde csv dbs
export function loadCSV(fileName: string) {
  const filePath = path.join(__dirname, '../../client/public/data/csv dbs', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo CSV no encontrado: ${fileName}`);
    return [];
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });
}

// Función para guardar CSV
export function saveCSV(fileName: string, data: any[]) {
  try {
    const filePath = path.join(__dirname, '../../client/public/data/csv dbs', fileName);
    
    // Convertir objetos a CSV
    const csvContent = stringify(data, {
      header: true,
      columns: Object.keys(data[0] || {}),
    });
    
    // Escribir archivo
    fs.writeFileSync(filePath, csvContent, 'utf-8');
    console.log(`✅ CSV guardado: ${fileName}`);
    
  } catch (error) {
    console.error(`❌ Error guardando CSV ${fileName}:`, error);
    throw error;
  }
}

// Funciones específicas para cargar cada tipo de datos
export async function loadPedidos() {
  return loadCSV('pedidosdb.csv');
}

export async function loadClientes() {
  return loadCSV('clientes.csv');
}

export async function loadSucursales() {
  return loadCSV('sucursalesdb.csv');
}

export async function loadRepartidores() {
  return loadCSV('repartidores.csv');
}

export async function loadAlmacenistas() {
  return loadCSV('almacenistas.csv');
}

export async function loadIncidencias() {
  return loadCSV('incidenciasdb.csv');
}

// === NUEVAS FUNCIONES PARA RUTAS ===

export async function loadRutasActivas() {
  return loadCSV('rutas_activas.csv');
}

export async function loadParadasRuta() {
  return loadCSV('paradas_ruta.csv');
}

export async function saveRutaActiva(ruta: any) {
  try {
    const rutasExistentes = await loadRutasActivas();
    const rutaIndex = rutasExistentes.findIndex((r: any) => r.id === ruta.id);
    
    if (rutaIndex >= 0) {
      rutasExistentes[rutaIndex] = ruta;
    } else {
      rutasExistentes.push(ruta);
    }
    
    saveCSV('rutas_activas.csv', rutasExistentes);
    console.log(`✅ Ruta ${ruta.id} guardada exitosamente`);
    return ruta;
  } catch (error) {
    console.error(`❌ Error guardando ruta ${ruta.id}:`, error);
    throw error;
  }
}

export async function saveParadasRuta(paradas: any[]) {
  try {
    const paradasExistentes = await loadParadasRuta();
    
    // Actualizar o agregar cada parada
    paradas.forEach(nuevaParada => {
      const paradaIndex = paradasExistentes.findIndex((p: any) => p.id === nuevaParada.id);
      
      if (paradaIndex >= 0) {
        paradasExistentes[paradaIndex] = nuevaParada;
      } else {
        paradasExistentes.push(nuevaParada);
      }
    });
    
    saveCSV('paradas_ruta.csv', paradasExistentes);
    console.log(`✅ ${paradas.length} paradas guardadas exitosamente`);
    return paradas;
  } catch (error) {
    console.error(`❌ Error guardando paradas:`, error);
    throw error;
  }
}

// Función para actualizar un pedido
export async function updatePedido(id: string | number, data: any) {
  try {
    console.log(`🔄 CSV: Actualizando pedido ${id} con datos:`, data);
    const pedidos = loadCSV('pedidosdb.csv');
    console.log(`📊 CSV: Cargados ${pedidos.length} pedidos`);
    // Buscar por id_p
    const pedidoIndex = pedidos.findIndex((p: any) => String(p.id_p) === String(id));
    console.log(`🔍 CSV: Buscando pedido con id_p=${id}, encontrado en índice: ${pedidoIndex}`);
    if (pedidoIndex === -1) {
      console.log('❌ CSV: Pedido no encontrado');
      console.log('📋 CSV: IDs disponibles:', pedidos.map((p: any) => p.id_p).slice(0, 10));
      throw new Error(`Pedido con ID ${id} no encontrado`);
    }
    console.log('📋 CSV: Pedido original:', pedidos[pedidoIndex]);
    // Adaptar campos: si viene 'estado', actualizar 'sta_p'
    let updateData = { ...data };
    if (updateData.estado) {
      updateData.sta_p = updateData.estado;
      delete updateData.estado;
    }
    // Actualizar pedido
    pedidos[pedidoIndex] = { ...pedidos[pedidoIndex], ...updateData };
    console.log('📋 CSV: Pedido actualizado:', pedidos[pedidoIndex]);
    // Guardar CSV actualizado
    saveCSV('pedidosdb.csv', pedidos);
    console.log(`✅ CSV: Pedido ${id} actualizado exitosamente`);
    return pedidos[pedidoIndex];
  } catch (error) {
    console.error(`❌ CSV: Error actualizando pedido ${id}:`, error);
    throw error;
  }
}

// Función para compatibilidad (no necesaria inicialización)
export async function initDatabase() {
  console.log('✅ Sistema CSV inicializado');
  return Promise.resolve();
}

// Función placeholder para compatibilidad
export async function closeDatabase() {
  console.log('✅ Sistema CSV cerrado');
  return Promise.resolve();
}

export async function saveRepartidores(repartidores: any[]) {
  return saveCSV('repartidores.csv', repartidores);
}

export async function savePedidos(pedidos: any[]) {
  return saveCSV('pedidosdb.csv', pedidos);
}

// Función para actualizar una parada de ruta por pedido_id (y opcionalmente route_id)
export async function updateParadaRuta(pedidoId: string | number, data: any, routeId?: string) {
  try {
    const paradas = await loadParadasRuta();
    // Buscar la parada por pedido_id (y opcionalmente por route_id)
    const paradaIndex = paradas.findIndex((p: any) => 
      String(p.pedido_id) === String(pedidoId) &&
      (routeId ? String(p.route_id) === String(routeId) : true)
    );
    if (paradaIndex === -1) {
      throw new Error(`Parada con pedido_id ${pedidoId}${routeId ? ' y route_id ' + routeId : ''} no encontrada`);
    }
    // Actualizar parada
    paradas[paradaIndex] = { ...paradas[paradaIndex], ...data };
    // Guardar CSV actualizado
    await saveCSV('paradas_ruta.csv', paradas);
    console.log(`✅ Parada de ruta para pedido ${pedidoId} actualizada exitosamente`);
    return paradas[paradaIndex];
  } catch (error) {
    console.error(`❌ Error actualizando parada de ruta para pedido ${pedidoId}:`, error);
    throw error;
  }
}

// Inicializa rutas persistentes para todos los repartidores
export async function initPersistentRoutes() {
  const users = await loadUsers();
  const repartidores = users.filter((u: any) => u.role === 'repartidor');
  let rutas = await loadRutasActivas();
  const now = new Date().toISOString();

  let changed = false;

  for (const repartidor of repartidores) {
    let ruta = rutas.find((r: any) => Number(r.repartidor_id) === Number(repartidor.id));
    if (!ruta) {
      // Crear ruta vacía
      ruta = {
        id: `ruta_persistente_${repartidor.id}`,
        repartidor_id: repartidor.id,
        repartidor_nombre: repartidor.name_u,
        sucursal_origen: '',
        vehicle_type: repartidor.vehi_u || 'car',
        status: 'vacía',
        created_at: now,
        started_at: '',
        completed_at: '',
        current_stop_index: 0,
        total_stops: 0,
        total_distance: 0,
        total_estimated_time: 0,
        actual_time: '',
        efficiency_score: '',
        optimization_method: '',
        auto_optimized: false,
        optimization_timestamp: '',
        google_maps_url: '',
      };
      rutas.push(ruta);
      changed = true;
    }
  }
  if (changed) {
    saveCSV('rutas_activas.csv', rutas);
    console.log('✅ Rutas persistentes inicializadas para todos los repartidores');
  } else {
    console.log('✅ Todas las rutas persistentes ya existen');
  }
}

export async function loadUsers() {
  return loadCSV('users.csv');
}

export async function saveUsers(users: any[]) {
  return saveCSV('users.csv', users);
} 