# Optimizador de Rutas - Embler

Este script optimiza las rutas de todos los repartidores usando la API de Google Maps Directions.

## ¿Qué hace el script?

1. **Lee los datos**: Obtiene repartidores de `users.csv` y pedidos de `pedidosdb.csv`
2. **Filtra repartidores**: Solo procesa usuarios con `type_u = "repartidor"`
3. **Agrupa pedidos**: Filtra pedidos pendientes por cada repartidor usando `del_p`
4. **Optimiza rutas**: Usa Google Maps Directions API para optimizar el orden de entrega
5. **Guarda resultados**: Crea archivos JSON con las rutas optimizadas

## Estructura de salida

Las rutas se guardan en `client/public/data/routes/`:

```
routes/
├── route_5.json          # Ruta para repartidor ID 5
├── route_6.json          # Ruta para repartidor ID 6
├── route_7.json          # Ruta para repartidor ID 7
├── route_8.json          # Ruta para repartidor ID 8
└── routes_index.json     # Índice con todas las rutas
```

## Formato de las rutas

Cada archivo `route_X.json` contiene:

```json
{
  "repartidor_id": 5,
  "repartidor_nombre": "Juan Pérez",
  "sucursal": "satelite",
  "vehicle_type": "moto",
  "created_at": "2024-01-15T10:30:00.000Z",
  "status": "active",
  "current_stop_index": 0,
  "total_distance": 15000,
  "total_duration": 1800,
  "stops": [
    {
      "lat": 19.500142,
      "lng": -99.237374,
      "address": "Ubicación de Juan Pérez",
      "order": 0,
      "type": "origin"
    },
    {
      "lat": 19.4327,
      "lng": -99.1333,
      "address": "Av. Reforma 123, CDMX",
      "pedido_id": 1001,
      "order": 1,
      "type": "delivery"
    }
  ],
  "pedidos_count": 5
}
```

## Instalación y uso

1. **Instalar dependencias**:
   ```bash
   cd scripts
   npm install
   ```

2. **Ejecutar el script**:
   ```bash
   npm run optimize
   # o
   node optimize-routes.js
   ```

## Configuración

El script usa la API key de Google Maps configurada en `shared/google-maps-config.ts`.

## Límites de la API

- Google Maps permite máximo 23 waypoints por ruta
- El script incluye pausas de 1 segundo entre solicitudes para evitar límites de rate
- Si hay más de 23 pedidos, se procesarán en lotes

## Integración con el sistema

Las rutas generadas son compatibles con:
- `GoogleRoutesService` en `client/src/lib/google-routes.ts`
- Componentes de mapas en tiempo real
- Sistema de tracking de repartidores

## Notas importantes

- El script solo procesa pedidos con `sta_p = "pendiente"`
- Se filtran coordenadas inválidas (lat/lng = 0)
- En caso de error en la API, se mantiene el orden original de pedidos
- Las rutas se marcan como `status: "active"` y `current_stop_index: 0`

## Troubleshooting

Si hay errores:
1. Verificar que la API key de Google Maps sea válida
2. Comprobar que los archivos CSV existan y tengan el formato correcto
3. Revisar la conectividad a internet para las llamadas a la API 