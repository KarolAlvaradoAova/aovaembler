// Tipos compartidos entre frontend y backend

export interface User {
  username: string;
  type: 'admin' | 'repartidor' | 'almacenista';
  nombre: string;
}

export interface Repartidor {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  activo: boolean;
  tipo_vehiculo: string;
  lat?: number;
  lng?: number;
  status?: 'disponible' | 'en_ruta' | 'entregando';
  velocidad?: number;
  ultima_actualizacion?: string;
}

export interface Pedido {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  direccion_entrega: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  repartidor_id: number;
  repartidor_nombre: string;
  sucursal: string;
  productos: number;
  total: number;
  estado_pedido: 'pendiente' | 'preparando' | 'en_ruta' | 'entregado' | 'cancelado';
  fecha_creacion: string;
  fecha_entrega?: string;
  lat?: number;
  lng?: number;
}

export interface Producto {
  clave: string;
  nombre: string;
  precio: number;
  stock_satelite: number;
  stock_metepec: number;
  stock_lindavista: number;
  stock_total: number;
  activo: boolean;
}

export interface PedidoProducto {
  id: number;
  pedido_id: number;
  clave_producto: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  gerente: string;
  lat: number;
  lng: number;
}

export interface Incidencia {
  id: number;
  tipo: 'retraso' | 'direccion_incorrecta' | 'cliente_ausente' | 'producto_dañado' | 'otro';
  descripcion: string;
  pedido_id: number;
  repartidor_id: number;
  lat?: number;
  lng?: number;
  fecha_creacion: string;
  resuelto: boolean;
}

// === NUEVOS TIPOS PARA SISTEMA DE RUTAS PERSISTENTES ===

export interface RouteStop {
  id: string;
  pedido_id: number;
  order: number;
  address: string;
  coordinates: { lat: number; lng: number };
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimated_arrival: string;
  actual_arrival?: string;
  delivery_notes?: string;
  delivery_evidence?: string; // URL de imagen
  distance_from_previous: number;
  time_from_previous: number;
}

export interface ActiveRoute {
  id: string;
  repartidor_id: number;
  repartidor_nombre: string;
  sucursal_origen: string;
  vehicle_type: string;
  status: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  current_stop_index: number;
  total_stops: number;
  total_distance: number;
  total_estimated_time: number;
  actual_time?: number;
  efficiency_score?: number;
  stops: RouteStop[];
  metadata: {
    optimization_method: 'manual' | 'automatic' | 'google_api';
    auto_optimized: boolean;
    optimization_timestamp: string;
    google_maps_url?: string;
  };
}

export interface RouteOptimizationRequest {
  repartidor_id: number;
  sucursal_origen: string;
  pedido_ids: number[];
  vehicle_type?: string;
  force_reoptimize?: boolean;
  optimization_method?: 'distance' | 'time' | 'mixed' | 'google_api';
}

export interface RouteOptimizationResult {
  success: boolean;
  route: ActiveRoute;
  original_distance?: number;
  optimized_distance: number;
  time_saved: number;
  efficiency_improvement: number;
  google_maps_url: string;
}

// === TIPOS EXISTENTES ACTUALIZADOS ===

export interface RouteOptimization {
  repartidor_id: number;
  sucursal_origen: string;
  pedidos: number[];
  ruta_optimizada: {
    orden: number;
    pedido_id: number;
    direccion: string;
    distancia_km: number;
    tiempo_estimado_min: number;
  }[];
  distancia_total_km: number;
  tiempo_total_min: number;
}

export interface LocationUpdate {
  repartidor_id: number;
  lat: number;
  lng: number;
  status: 'disponible' | 'en_ruta' | 'entregando';
  velocidad?: number;
  timestamp: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Metrics types
export interface DeliveryMetrics {
  entregas_dia: number;
  repartidores_activos: number;
  tiempo_promedio_entrega: number;
  eficiencia_rutas: number;
  incidencias_pendientes: number;
  ingresos_dia: number;
}

export interface RepartidorStats {
  id: number;
  nombre: string;
  entregas_completadas: number;
  tiempo_promedio: number;
  distancia_recorrida: number;
  rating: number;
  incidencias: number;
}

// === TIPOS PARA ACCESO MODULAR ===

export interface RouteAccessInterface {
  getRepartidorActiveRoute(repartidorId: number): Promise<ActiveRoute | null>;
  getAllActiveRoutes(): Promise<ActiveRoute[]>;
  getRouteProgress(routeId: string): Promise<{ completed: number; total: number; percentage: number }>;
  getRouteETA(routeId: string): Promise<{ nextStop: string; totalRoute: string }>;
  getRouteStatus(repartidorId: number): Promise<'no_route' | 'planned' | 'active' | 'paused' | 'completed'>;
} 