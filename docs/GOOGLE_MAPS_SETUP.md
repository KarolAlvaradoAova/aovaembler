# 🗺️ Configuración de Google Maps para Tracking y Optimización de Rutas

## 📋 Resumen de Implementación

Este documento explica cómo configurar las APIs de Google Maps para el sistema de tracking en tiempo real y optimización de rutas de delivery que hemos implementado.

## 🔑 APIs de Google Requeridas

### 1. **Google Maps JavaScript API**
- **Propósito**: Mostrar mapas interactivos en tiempo real
- **Uso**: Visualización de ubicaciones de repartidores, rutas, puntos de entrega
- **Costo**: $7 USD por 1,000 cargas de mapa

### 2. **Google Routes API (Directions API)**
- **Propósito**: Cálculo y optimización de rutas de entrega
- **Uso**: Optimización de secuencia de paradas, cálculo de distancias y tiempos
- **Costo**: $5 USD por 1,000 solicitudes

### 3. **Google Places API** (Opcional)
- **Propósito**: Autocompletar direcciones y validación
- **Uso**: Mejorar la entrada de direcciones de clientes
- **Costo**: $17 USD por 1,000 solicitudes

### 4. **Google Geolocation API** (Opcional)
- **Propósito**: Obtener ubicación actual del dispositivo
- **Uso**: Posicionamiento inicial de repartidores
- **Costo**: $5 USD por 1,000 solicitudes

## 🚀 Pasos de Configuración

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la facturación para el proyecto

### Paso 2: Habilitar APIs

1. Ve a "APIs & Services" > "Library"
2. Busca y habilita las siguientes APIs:
   - Maps JavaScript API
   - Directions API
   - Places API (opcional)
   - Geolocation API (opcional)

### Paso 3: Crear API Key

1. Ve a "APIs & Services" > "Credentials"
2. Clic en "Create Credentials" > "API Key"
3. Copia la API Key generada

### Paso 4: Configurar Restricciones (Importante para Seguridad)

#### Restricciones de HTTP Referrer (para Frontend):
```
https://tu-dominio.com/*
http://localhost:5173/*
```

#### Restricciones de IP (para Backend):
- Agrega las IPs de tus servidores de producción

#### Restricciones de API:
- Maps JavaScript API
- Directions API
- Places API (si está habilitada)

### Paso 5: Configurar Variables de Entorno

#### Frontend (.env)
```env
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key_aqui
VITE_TRACKING_UPDATE_INTERVAL=5000
VITE_WS_URL=ws://localhost:4001
```

#### Backend (.env)
```env
GOOGLE_MAPS_API_KEY=tu_google_maps_api_key_aqui
WS_PORT=4001
TRACKING_UPDATE_INTERVAL=5000
```

## 💰 Estimación de Costos (Para Demo)

### Uso Estimado Mensual:
- **Cargas de mapa**: ~1,000 cargas = $7 USD
- **Solicitudes de rutas**: ~500 optimizaciones = $2.50 USD
- **Total mensual**: ~$10 USD

### Para Producción:
- **Cargas de mapa**: ~10,000 cargas = $70 USD
- **Solicitudes de rutas**: ~5,000 optimizaciones = $25 USD
- **Places API**: ~2,000 autocompletes = $34 USD
- **Total mensual**: ~$130 USD

## 🛠️ Funcionalidades Implementadas

### 1. **Tracking en Tiempo Real** (`/tracking`)
- ✅ Mapa interactivo con Google Maps
- ✅ Marcadores dinámicos para repartidores
- ✅ Estados de repartidores (disponible, en ruta, entregando)
- ✅ Información en tiempo real (velocidad, ubicación, última actualización)
- ✅ Auto-refresh cada 5 segundos
- ✅ Panel de control de repartidores activos

### 2. **Optimización de Rutas** (`/rutas`)
- ✅ Selección de repartidor y sucursal de origen
- ✅ Selección múltiple de pedidos
- ✅ Algoritmo de optimización (vecino más cercano)
- ✅ Cálculo de distancias y tiempos estimados
- ✅ Integración con Google Maps para direcciones
- ✅ Secuencia optimizada de entregas

### 3. **APIs Backend Implementadas**

#### Tracking APIs:
```
GET /api/repartidores/tracking/all
GET /api/repartidores/:id/location
POST /api/repartidores/:id/location
```

#### Route Optimization APIs:
```
POST /api/routes/optimize
GET /api/routes/active/:repartidorId
```

## 🔧 Modo Desarrollo vs Producción

### Modo Desarrollo (Sin API Key):
- El sistema funciona en "modo simulación"
- Los mapas muestran una interfaz placeholder
- Las funcionalidades de tracking y optimización funcionan con datos simulados
- Ideal para desarrollo y testing sin costos

### Modo Producción (Con API Key):
- Mapas reales de Google Maps
- Direcciones reales y cálculos precisos
- Optimización de rutas usando Google Directions API
- Tracking GPS real

## 📱 Integración con App Móvil (Futuro)

### Para Repartidores:
```javascript
// Actualizar ubicación desde app móvil
const updateLocation = async (lat, lng, status, speed) => {
  await fetch(`/api/repartidores/${repartidorId}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, status, speed })
  });
};

// Obtener ruta optimizada
const getOptimizedRoute = async () => {
  const response = await fetch(`/api/routes/active/${repartidorId}`);
  return await response.json();
};
```

## 🛡️ Seguridad y Mejores Prácticas

### 1. **Protección de API Keys**
- ✅ Usar restricciones de dominio/IP
- ✅ Variables de entorno para keys
- ✅ Nunca exponer keys en el código

### 2. **Rate Limiting**
- ✅ Implementar límites de solicitudes
- ✅ Cache de resultados de optimización
- ✅ Batch de actualizaciones de tracking

### 3. **Validación de Datos**
- ✅ Validar coordenadas GPS
- ✅ Sanitizar direcciones
- ✅ Verificar permisos de repartidores

## 📊 Monitoreo y Analytics

### Métricas Implementadas:
- Repartidores en línea
- Eficiencia de rutas optimizadas
- Tiempo promedio de entrega
- Distancia total recorrida
- Incidencias por región

### Google Cloud Monitoring:
- Uso de API quotas
- Latencia de solicitudes
- Errores de API
- Costos diarios

## 🔄 Algoritmo de Optimización

### Implementación Actual (Demo):
```javascript
// Algoritmo simple de vecino más cercano
function optimizeRoute(pedidos, origen) {
  // 1. Calcular distancias desde origen
  // 2. Ordenar por proximidad
  // 3. Optimizar secuencia
  // 4. Calcular ETAs
}
```

### Para Producción:
- Usar Google Routes API con waypoint optimization
- Considerar restricciones de tráfico en tiempo real
- Algoritmos más sofisticados (TSP, genetic algorithms)

## 📞 Soporte y Documentación

### Recursos Adicionales:
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Directions API Guide](https://developers.google.com/maps/documentation/directions)
- [JavaScript API Reference](https://developers.google.com/maps/documentation/javascript)

### Para Implementación en Producción:
1. Configurar monitoring de costos
2. Implementar fallbacks para errores de API
3. Optimizar caching de rutas frecuentes
4. Configurar alertas de uso excesivo

---

**⚠️ Nota Importante**: Este es un sistema de demo. Para producción, considera implementar:
- Base de datos robusta para tracking histórico
- WebSockets para updates en tiempo real
- Autenticación y autorización
- Backup y recuperación de datos
- Escalabilidad horizontal 