# 🚀 Embler 2.0 - Sistema de Gestión Logística

Sistema integral de gestión logística para empresas de reparto y distribución, desarrollado con React/TypeScript y Node.js/Express.

## 📁 Estructura del Proyecto

```
📦 Embler 2.0/
├── 🎨 client/          # Frontend (React + TypeScript)
│   ├── src/            # Código fuente del frontend
│   ├── public/         # Archivos estáticos
│   └── ...config       # Archivos de configuración (package.json, vite.config.ts, etc.)
├── 🖥️ server/          # Backend (Node.js + Express)
│   ├── src/            # Código fuente del backend
│   ├── database/       # Archivos CSV y scripts de carga
│   └── ...config       # Archivos de configuración del backend
├── 📚 docs/            # Documentación
│   ├── GOOGLE_MAPS_SETUP.md
│   ├── PRODUCTOS_RENOVACION.md
│   └── ...más docs
├── 🔧 scripts/         # Scripts de utilidad y testing
│   ├── update_products.ts
│   ├── test_*.js
│   └── ...más scripts
├── 🤝 shared/          # Tipos y utilidades compartidas
└── ...                # Archivos de configuración del proyecto
```

## 🚀 Inicio Rápido

### Prerequisitos
- Node.js 18+
- npm o yarn

### Setup Automatizado (Recomendado)

```bash
# Ejecutar script de setup
node scripts/setup.js

# O manualmente:
npm run install:all
```

### Instalación Manual

1. **Instalar dependencias**
   ```bash
   npm install              # Dependencias principales
   cd client && npm install # Frontend
   cd ../server && npm install # Backend
   ```

2. **Configurar variables de entorno**
   ```bash
   # Copiar y editar archivos de ejemplo
   cp env.example client/.env
   cp env.example server/.env
   ```

3. **Inicializar base de datos**
   ```bash
   cd server
   npm run migrate
   ```

### Ejecución

```bash
# Iniciar ambos servidores (recomendado)
npm run dev

# O individualmente:
npm run dev:client       # Frontend (puerto 5173)
npm run dev:server       # Backend (puerto 4000)
```

## 👥 Usuarios de Prueba

| Rol | Usuario | Contraseña | Descripción |
|-----|---------|------------|-------------|
| **Admin** | `admin` | `admin123` | Dashboard completo, gestión de rutas |
| **Almacenista** | `pedro` | `almacen1` | Gestión de inventario |
| **Repartidor** | `juan` | `reparto1` | Vista móvil de entregas |

## 🛠️ Tecnologías

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + Radix UI
- Google Maps API
- React Router DOM

### Backend
- Node.js + Express + TypeScript
- Sistema de archivos CSV para almacenamiento de datos
- Google Maps Services API
- WebSockets para tracking en tiempo real

## 🌟 Funcionalidades

- 🗺️ **Tracking en tiempo real** de repartidores
- 🎯 **Optimización de rutas** con Google Maps
- 📊 **Dashboard** con métricas y KPIs
- 📱 **Vista móvil** optimizada para repartidores
- 📦 **Gestión de inventario** por sucursales
- 🚨 **Sistema de incidencias**

## 📝 Documentación

- [Configuración de Google Maps](./docs/GOOGLE_MAPS_SETUP.md)
- [Renovación de Productos](./docs/PRODUCTOS_RENOVACION.md)
- [Sistema de Archivos CSV](./docs/DATABASE_README.md)

## 🤝 Contribución

El proyecto está organizado de manera modular para facilitar el desarrollo y mantenimiento:

- **client/**: Todo lo relacionado con el frontend
- **server/**: Todo lo relacionado con el backend
- **docs/**: Documentación del proyecto
- **scripts/**: Scripts de utilidad y testing
- **shared/**: Tipos y utilidades compartidas (futuro)

---

**Embler 2.0** - Sistema de gestión logística moderno y escalable. 