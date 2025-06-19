# 🎨 Frontend - Embler 2.0

Frontend de la aplicación Embler 2.0, desarrollado con React + TypeScript + Vite.

## 🛠️ Tecnologías

- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de CSS utility-first
- **Radix UI** - Componentes accesibles
- **React Router DOM** - Enrutamiento
- **Google Maps API** - Mapas y geolocalización
- **Chart.js & Recharts** - Gráficos y visualizaciones

## 📁 Estructura

```
src/
├── components/           # Componentes React
│   ├── ui/              # Componentes base de UI
│   ├── routes/          # Vistas principales
│   ├── layout.tsx       # Layout principal
│   └── ...
├── hooks/               # Hooks personalizados
├── lib/                 # Utilidades y configuraciones
├── config/              # Configuraciones específicas
├── App.tsx              # Componente principal
├── main.tsx             # Punto de entrada
└── index.css            # Estilos globales
```

## 🚀 Comandos

```bash
# Desarrollo
npm run dev          # Inicia el servidor de desarrollo (puerto 5173)

# Build
npm run build        # Construye la aplicación para producción
npm run preview      # Preview de la build de producción

# Calidad de código
npm run lint         # Ejecuta ESLint
```

## 🎯 Funcionalidades

### 🔐 Sistema de Autenticación
- Login multi-rol (Admin, Almacenista, Repartidor)
- Gestión de sesiones con localStorage
- Rutas protegidas por rol

### 📊 Dashboard Admin
- Métricas en tiempo real
- Gráficos interactivos
- Tracking de repartidores
- Optimización de rutas

### 📱 Vista Repartidor
- Interfaz optimizada para móvil
- Lista de pedidos asignados
- Desglose detallado de productos
- Estados de entrega

### 🏪 Vista Almacenista
- Gestión de inventario
- Preparación de pedidos
- Control de stock por sucursal

## 🗺️ Integración con Google Maps

- Mapas interactivos en tiempo real
- Tracking GPS de repartidores
- Optimización de rutas de entrega
- Marcadores dinámicos con estados

## 🎨 Sistema de Diseño

- **Tema**: Dark mode con acentos amarillos (#FFD600)
- **Tipografía**: Inter
- **Componentes**: Radix UI con estilización personalizada
- **Responsive**: Mobile-first design
- **Animaciones**: Tailwind CSS Animate

## ⚙️ Configuración

### Variables de Entorno

```env
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
VITE_TRACKING_UPDATE_INTERVAL=5000
VITE_WS_URL=ws://localhost:4001
VITE_API_BASE_URL=http://localhost:4000
```

### Archivos de Configuración

- `vite.config.ts` - Configuración de Vite
- `tailwind.config.js` - Configuración de Tailwind CSS
- `tsconfig.json` - Configuración de TypeScript
- `eslint.config.js` - Configuración de ESLint
- `components.json` - Configuración de componentes UI

## 🔄 Flujo de Datos

1. **Autenticación** → localStorage → Context
2. **API Calls** → fetch → Estado local
3. **Real-time** → WebSockets → Actualización de UI
4. **Routing** → React Router → Vistas por rol

## 📱 Responsive Design

- **Desktop**: Dashboard completo con sidebar
- **Tablet**: Layout adaptado con navigation drawer
- **Mobile**: Interfaz optimizada para repartidores

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm run test
```

## 🚀 Deploy

```bash
# Build para producción
npm run build

# Los archivos estáticos se generan en dist/
```

---

Para más información sobre el backend, consulta [../server/README.md](../server/README.md) 