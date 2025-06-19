# 🖥️ Backend - Embler 2.0

Backend de la aplicación Embler 2.0, desarrollado con Node.js + Express + TypeScript.

## 🛠️ Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **TypeScript** - Tipado estático
- **SQLite3** - Base de datos embebida
- **Google Maps Services** - APIs de mapas y rutas
- **WebSockets (ws)** - Comunicación en tiempo real
- **CSV Parse/Stringify** - Manejo de archivos CSV

## 📁 Estructura

```
src/
├── routes/              # Rutas de la API
│   ├── pedidos.ts      # Endpoints de pedidos
│   ├── repartidores.ts # Endpoints de repartidores
│   ├── routes.ts       # Optimización de rutas
│   └── ...
├── index.ts            # Punto de entrada del servidor
database/
├── logistica_renovated.db   # Base de datos principal
├── sqlLoader.ts        # Funciones de base de datos
├── csvLoader.ts        # Carga de datos CSV
├── migrate.ts          # Scripts de migración
└── renovate_database.ts # Renovación de DB
```

## 🚀 Comandos

```bash
# Desarrollo
npm run dev              # Inicia el servidor de desarrollo (puerto 4000)

# Build y producción
npm run build            # Compila TypeScript
npm run start            # Inicia el servidor en producción

# Base de datos
npm run migrate          # Ejecuta migraciones
npm run renovate         # Renueva la base de datos
npm run update:products  # Actualiza productos del inventario

# Testing
npm run test:endpoints   # Prueba endpoints principales
npm run test:quick       # Tests rápidos
npm run test:products    # Tests de productos
npm run test:renovated   # Tests de DB renovada
```

## 🗄️ Base de Datos

### Estructura Principal

```sql
-- Productos del inventario
productos (clave, nombre, precio, stock_satelite, stock_metepec, stock_lindavista)

-- Pedidos
pedidos (id, cliente_nombre, direccion_entrega, repartidor_id, sucursal, total, estado_pedido)

-- Relación pedido-productos
pedido_productos (pedido_id, clave_producto, cantidad, precio_unitario, subtotal)

-- Repartidores
repartidores (id, nombre, telefono, email, lat, lng, status)

-- Sucursales
sucursales (id, nombre, direccion, lat, lng, gerente)

-- Clientes
clientes (id, nombre, telefono, email, direccion)

-- Incidencias
incidencias (id, tipo, descripcion, pedido_id, repartidor_id, fecha_creacion)
```

### Datos Reales

- **15 productos automotrices** (BMW, Mercedes, Audi, etc.)
- **3 sucursales** (Satélite, Metepec, Lindavista)
- **4 repartidores** activos
- **Pedidos** con productos y precios reales

## 🔌 API Endpoints

### Pedidos
```
GET    /api/pedidos                 # Lista todos los pedidos
GET    /api/pedidos/:id             # Pedido específico
GET    /api/pedidos/:id/productos   # Productos de un pedido
GET    /api/pedidos/:id/completo    # Pedido completo con productos
```

### Repartidores
```
GET    /api/repartidores                    # Lista repartidores
GET    /api/repartidores/tracking/all       # Tracking de todos
GET    /api/repartidores/:id/location       # Ubicación específica
POST   /api/repartidores/:id/location       # Actualizar ubicación
```

### Optimización de Rutas
```
POST   /api/routes/optimize                 # Optimizar ruta
GET    /api/routes/active/:repartidorId     # Ruta activa
```

### Otros
```
GET    /api/sucursales        # Lista sucursales
GET    /api/clientes          # Lista clientes
GET    /api/almacenistas      # Lista almacenistas
GET    /api/incidencias       # Lista incidencias
```

## 🗺️ Integración con Google Maps

### APIs Utilizadas
- **Directions API** - Cálculo de rutas
- **Distance Matrix API** - Distancias entre puntos
- **Geocoding API** - Conversión de direcciones

### Configuración
```env
GOOGLE_MAPS_API_KEY=tu_api_key
BACKEND_PORT=4000
WS_PORT=4001
```

## 🔄 WebSockets

### Eventos en Tiempo Real
- Actualizaciones de ubicación de repartidores
- Cambios de estado de pedidos
- Notificaciones de incidencias
- Métricas del dashboard

### Conexión
```javascript
const ws = new WebSocket('ws://localhost:4001');
```

## 📊 Funcionalidades

### 🎯 Optimización de Rutas
- Algoritmo de vecino más cercano
- Cálculo de distancias reales con Google Maps
- Minimización de tiempo total de entrega
- Máximo 15 pedidos por ruta

### 📡 Tracking en Tiempo Real
- Ubicación GPS de repartidores
- Estados: disponible, en ruta, entregando
- Velocidad y última actualización
- Broadcasting vía WebSockets

### 📦 Gestión de Productos
- Inventario real automotriz
- Stock por sucursal
- Precios actualizados
- Relación pedido-productos detallada

### 📈 Métricas y Analytics
- Entregas del día
- Repartidores activos
- Tiempo promedio de entrega
- Eficiencia de rutas
- Ingresos diarios

## ⚙️ Configuración

### Variables de Entorno
```env
# Google Maps
GOOGLE_MAPS_API_KEY=tu_api_key

# Puertos
BACKEND_PORT=4000
WS_PORT=4001

# Base de datos
DB_PATH=./database/logistica_renovated.db

# Configuración de tracking
TRACKING_UPDATE_INTERVAL=5000
```

### Inicialización
```bash
# Primera vez
npm install
npm run migrate        # Crear/actualizar DB
npm run renovate       # Cargar datos de prueba
npm run dev           # Iniciar servidor
```

## 🧪 Testing

### Scripts Disponibles
```bash
npm run test:endpoints    # Prueba todos los endpoints
npm run test:quick       # Test rápido de funcionalidades
npm run test:products    # Test específico de productos
npm run test:renovated   # Verifica DB renovada
```

### Ejemplos de Test
```javascript
// Obtener todos los pedidos
GET http://localhost:4000/api/pedidos

// Tracking de repartidores
GET http://localhost:4000/api/repartidores/tracking/all

// Optimizar ruta
POST http://localhost:4000/api/routes/optimize
{
  "repartidor_id": 1,
  "sucursal_origen": "Satélite",
  "pedidos": [1, 2, 3]
}
```

## 🔧 Scripts de Utilidad

### Actualización de Productos
```bash
npm run update:products    # Actualiza desde inventario_dummy.csv
```

### Migración de Base de Datos
```bash
npm run migrate           # Crea/actualiza estructura
npm run renovate          # Renovación completa con datos reales
```

## 🚀 Deploy

```bash
# Build para producción
npm run build

# Los archivos compilados se generan en dist/
node dist/src/index.js
```

## 📝 Logs

El servidor muestra información detallada:
```
🚀 Backend listening on port 4000
📊 Sistema CSV inicializado
📍 Google Maps tracking APIs disponibles
🗺️  Route optimization APIs disponibles
```

---

Para más información sobre el frontend, consulta [../client/README.md](../client/README.md) 