# 📊 Sistema de Archivos CSV

## 📁 Estructura de Datos

El sistema utiliza archivos CSV para el almacenamiento y gestión de datos. Los archivos se encuentran en el directorio `server/database/`.

### 📊 Archivos CSV Disponibles

| Archivo | Registros | Descripción |
|---------|-----------|-------------|
| `pedidos.csv` | 6 | Órdenes de entrega |
| `clientes.csv` | 4 | Información de clientes |
| `sucursales.csv` | 3 | Ubicaciones de sucursales |
| `repartidores.csv` | 4 | Personal de entrega |
| `almacenistas.csv` | 3 | Personal de almacén |
| `incidencias.csv` | 3 | Reportes de problemas |
| `estado_repartidores.csv` | 4 | Estado actual de repartidores |

### 🔧 Módulos Principales

#### Backend
- `database/csvLoader.ts` - Módulo principal para carga y manipulación de datos CSV
- `src/index.ts` - Inicialización del sistema CSV
- `src/routes/*.ts` - Endpoints que utilizan el sistema CSV

### 🚀 Comandos Disponibles

```bash
# Iniciar servidor backend
npm run dev

# Probar endpoints
npm run test:endpoints
```

### 📁 Estructura de Directorios

```
backend/database/
├── csvLoader.ts          # Módulo de acceso a datos CSV
├── pedidos.csv           # Datos de pedidos
├── clientes.csv          # Datos de clientes
├── sucursales.csv        # Datos de sucursales
├── repartidores.csv      # Datos de repartidores
├── almacenistas.csv      # Datos de almacenistas
├── incidencias.csv       # Datos de incidencias
└── estado_repartidores.csv # Estado de repartidores
```

### 🔍 Endpoints Disponibles

Todas las APIs han sido implementadas y funcionan correctamente:
- ✅ GET `/api/pedidos` - Lista pedidos
- ✅ GET `/api/clientes` - Lista clientes  
- ✅ GET `/api/sucursales` - Lista sucursales
- ✅ GET `/api/repartidores` - Lista repartidores
- ✅ GET `/api/almacenistas` - Lista almacenistas
- ✅ GET `/api/incidencias` - Lista incidencias
- ✅ PATCH `/api/pedidos/:id` - Actualiza estado de pedido

### 💾 Respaldo

Los archivos CSV se mantienen en `server/database/` y se recomienda mantener copias de respaldo periódicas.

### 🎯 Ventajas del Sistema CSV

1. **Simplicidad**: Fácil de entender y mantener
2. **Portabilidad**: Los datos pueden ser editados con cualquier editor de texto
3. **Compatibilidad**: Fácil integración con herramientas de análisis de datos
4. **Bajo consumo**: No requiere servidor de base de datos
5. **Desarrollo rápido**: Ideal para prototipos y sistemas pequeños 