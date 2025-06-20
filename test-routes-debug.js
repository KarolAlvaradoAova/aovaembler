// Script de prueba para debuggear el problema de las rutas
const fs = require('fs');
const path = require('path');

// Función para validar coordenadas
function validateAndFixCoordinates(lat, lng) {
  const isValidLat = lat >= -90 && lat <= 90;
  const isValidLng = lng >= -180 && lng <= 180;
  
  if (isValidLat && isValidLng) {
    return { lat, lng, fixed: false };
  }
  
  if (!isValidLat && !isValidLng) {
    return { lat: lng, lng: lat, fixed: true };
  }
  
  if (isValidLat && !isValidLng) {
    return { lat: lng, lng: lat, fixed: true };
  }
  
  if (!isValidLat && isValidLng) {
    return { lat: lng, lng: lat, fixed: true };
  }
  
  return { lat, lng, fixed: false };
}

// Función para analizar archivos de ruta
function analyzeRouteFile(filePath) {
  try {
    const routeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\n📁 Analizando: ${path.basename(filePath)}`);
    console.log(`Repartidor: ${routeData.repartidor_nombre} (ID: ${routeData.repartidor_id})`);
    console.log(`Total de paradas: ${routeData.stops?.length || 0}`);
    
    if (routeData.stops && routeData.stops.length > 0) {
      console.log('\n📍 Paradas:');
      routeData.stops.forEach((stop, index) => {
        const originalCoords = { lat: stop.lat, lng: stop.lng };
        const fixedCoords = validateAndFixCoordinates(stop.lat, stop.lng);
        
        console.log(`  ${index + 1}. ${stop.type.toUpperCase()}`);
        console.log(`     Dirección: ${stop.address}`);
        console.log(`     Coordenadas originales: ${originalCoords.lat}, ${originalCoords.lng}`);
        console.log(`     Coordenadas corregidas: ${fixedCoords.lat}, ${fixedCoords.lng} ${fixedCoords.fixed ? '(CORREGIDO)' : ''}`);
        
        if (stop.pedido_id) {
          console.log(`     Pedido ID: ${stop.pedido_id}`);
        }
        console.log('');
      });
    }
    
    return routeData;
  } catch (error) {
    console.error(`❌ Error leyendo ${filePath}:`, error.message);
    return null;
  }
}

// Función principal
function main() {
  console.log('🔍 DEBUGGING DE RUTAS - Embler 7.6\n');
  
  const routesDir = path.join(__dirname, 'client', 'public', 'data', 'routes');
  
  if (!fs.existsSync(routesDir)) {
    console.error('❌ Directorio de rutas no encontrado:', routesDir);
    return;
  }
  
  const files = fs.readdirSync(routesDir).filter(file => file.endsWith('.json'));
  console.log(`📂 Encontrados ${files.length} archivos de ruta`);
  
  files.forEach(file => {
    const filePath = path.join(routesDir, file);
    analyzeRouteFile(filePath);
  });
  
  console.log('\n✅ Análisis completado');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { validateAndFixCoordinates, analyzeRouteFile }; 