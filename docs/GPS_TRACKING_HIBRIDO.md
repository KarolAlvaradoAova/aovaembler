# 🗺️ GPS Tracking Híbrido - Embler 7.6

## 📋 **Descripción General**

El sistema de GPS tracking híbrido de Embler 7.6 combina la **lógica de trazado de rutas de Embler 6.2** con el **sistema de archivos JSON de Embler 7.6** para crear una solución completa de tracking en tiempo real.

## 🔄 **Arquitectura del Sistema**

### **Componentes Principales:**

1. **`google-routes.ts`** - Servicio de rutas adaptado de Embler 6.2
2. **`utils.ts`** - Funciones híbridas para obtención de datos
3. **`real-time-map.tsx`** - Componente de tracking en tiempo real
4. **Archivos JSON de rutas** - Sistema de almacenamiento de Embler 7.6

## 🎯 **Flujo de Funcionamiento**

### **1. Obtención de Datos (Sistema 7.6)**
```typescript
// Cargar repartidores desde CSV
const users = await fetchUsersFromCSV();
const repartidores = users.filter(u => u.type_u === 'repartidor');

// Cargar pedidos para estados actuales
const pedidosAll = await fetchPedidosFromCSV();

// Para cada repartidor, cargar ruta desde JSON
const routeRes = await fetch(`/data/routes/route_${repartidor.id_u}.json`);
```

### **2. Conversión de Formato (Compatibilidad 6.2)**
```typescript
// Convertir stops del JSON a formato ruta_actual
ruta_actual = routeData.stops.map(stop => {
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
    return {
      tipo: 'parada',
      pedido_id: stop.pedido_id,
      lat: stop.lat,
      lng: stop.lng,
      label: stop.address,
      status: pedido ? pedido.sta_p : 'pendiente'
    };
  }
});
```

### **3. Trazado de Rutas (Lógica 6.2)**
```typescript
// Usar la función createRouteFromRutaActual de 6.2
await createRouteFromRutaActual(
  repartidorId,
  repartidorName,
  ruta_actual,
  map
);
```

## 🛠️ **Funciones Principales**

### **Obtención de Datos Híbridos**
- `fetchRepartidoresWithRoutes()` - Carga repartidores con rutas desde JSON
- `fetchRepartidoresLive()` - Convierte a formato compatible con tracking
- `getRepartidorRoute()` - Obtiene ruta específica de un repartidor

### **Gestión de Rutas**
- `createRouteFromRutaActual()` - Crea ruta en el mapa (lógica 6.2)
- `updateStopStatusInRoute()` - Actualiza estado de paradas
- `clearAllRoutes()` - Limpia todas las rutas del mapa

### **Tracking en Tiempo Real**
- `simulateRepartidorMovement()` - Simula movimiento de repartidor
- `calculateDistanceBetweenPoints()` - Calcula distancias
- `completeStop()` - Marca parada como completada

## 📊 **Estructura de Datos**

### **Formato de Ruta (Compatible 6.2)**
```typescript
interface RouteStop {
  tipo: 'origen' | 'parada' | 'destino';
  lat: number;
  lng: number;
  label: string;
  status?: string;
  timestamp?: string;
  pedido_id?: string;
}
```

### **Datos de Tracking**
```typescript
interface RepartidorTracking {
  repartidorId: number;
  nombre: string;
  tipo_vehiculo: string;
  location: {
    lat: number;
    lng: number;
    lastUpdate: string;
    status: string;
    speed: number;
  };
  isOnline: boolean;
  ruta_actual?: RouteStop[];
}
```

## 🎨 **Características Visuales**

### **Marcadores Personalizados**
- **Origen**: Círculo azul (#3b82f6)
- **Destino**: Círculo rojo (#ef4444)
- **Paradas**: Círculos con colores según estado
  - Pendiente: Gris (#6b7280)
  - En camino: Amarillo (#f59e0b)
  - Entregado: Verde (#10b981)
  - Cancelado: Rojo (#ef4444)

### **Rutas Coloreadas**
- Cada repartidor tiene un color único
- Grosor de línea: 4px
- Opacidad: 0.8

## 🔧 **Configuración**

### **Ubicaciones Reales desde CSV**
```typescript
// Los datos de ubicación se obtienen directamente del CSV users.csv
// Estructura: lat (latitud), lon (longitud)
const baseLocation = {
  lat: parseFloat(repartidor.lat), 
  lng: parseFloat(repartidor.lon) 
};

// Ubicaciones actuales en el sistema:
// - Juan Pérez: 19.500142, -99.237374 (Satélite)
// - Ana López: 19.263373, -99.632921 (Metepec)
// - Carlos Ruiz: 19.516238, -99.143365 (Lindavista)
// - Maria Torres: 19.500142, -99.237374 (Satélite)
```

### **Variación de Movimiento**
```typescript
const variation = 0.001; // Pequeña variación para simular movimiento
const ubicacion = {
  lat: baseLocation.lat + (Math.random() - 0.5) * variation,
  lng: baseLocation.lng + (Math.random() - 0.5) * variation,
  // ...
};
```

## 🚀 **Uso del Sistema**

### **1. Inicialización**
```typescript
// En real-time-map.tsx
const loadRepartidoresLive = async () => {
  const trackingData = await fetchRepartidoresLive();
  setTrackingData(trackingData);
  
  if (showRoutes) {
    await loadRoutesForRepartidores(trackingData);
  }
};
```

### **2. Actualización de Estados**
```typescript
// Actualizar estado de parada
await updateStopStatusInRoute(repartidorId, stopIndex, 'entregado');

// Completar parada
await completeStop(repartidorId, stopIndex, 'evidencia_entrega.jpg');
```

### **3. Gestión de Rutas**
```typescript
// Mostrar/ocultar rutas
const toggleRoutes = () => {
  if (showRoutes) {
    googleRoutesService.clearAllRoutes();
    setShowRoutes(false);
  } else {
    setShowRoutes(true);
    loadRoutesForRepartidores(trackingData);
  }
};
```

## 🔍 **Ventajas del Sistema Híbrido**

### **✅ Beneficios de Embler 6.2**
- Lógica robusta de trazado de rutas
- Marcadores personalizados y informativos
- InfoWindows detallados
- Gestión eficiente de múltiples rutas

### **✅ Beneficios de Embler 7.6**
- Sistema de archivos JSON persistente
- Estructura de datos simplificada
- Fácil mantenimiento y actualización
- Compatibilidad con CSV

### **✅ Ventajas Combinadas**
- **Flexibilidad**: Fácil cambio entre sistemas
- **Escalabilidad**: Soporte para múltiples repartidores
- **Mantenibilidad**: Código modular y reutilizable
- **Rendimiento**: Optimización de carga de datos

## 🐛 **Solución de Problemas**

### **Rutas No Se Muestran**
1. Verificar que los archivos JSON existen en `/data/routes/`
2. Comprobar que `showRoutes` está habilitado
3. Revisar la consola para errores de carga

### **Marcadores No Aparecen**
1. Verificar que Google Maps está inicializado
2. Comprobar que los datos de ubicación son válidos
3. Revisar filtros aplicados

### **Estados No Se Actualizan**
1. Verificar conexión con el backend
2. Comprobar que los archivos CSV son accesibles
3. Revisar logs de actualización

## 📈 **Próximas Mejoras**

1. **Integración con GPS Real**: Conectar con dispositivos GPS reales
2. **Optimización de Rutas**: Implementar algoritmos de optimización
3. **Notificaciones**: Sistema de alertas en tiempo real
4. **Analytics**: Métricas de rendimiento de repartidores
5. **Offline Mode**: Funcionalidad sin conexión

---

**Desarrollado para Embler 7.6** - Sistema de GPS Tracking Híbrido 