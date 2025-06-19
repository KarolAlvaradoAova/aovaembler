// Configuración de API centralizada
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_PORT = import.meta.env.VITE_API_PORT || '4000';

// URL base para todas las llamadas a la API
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  PORT: API_PORT,
  ENDPOINTS: {
    PEDIDOS: `${API_BASE_URL}/api/pedidos`,
    REPARTIDORES: `${API_BASE_URL}/api/repartidores`,
    SUCURSALES: `${API_BASE_URL}/api/sucursales`,
    ALMACENISTAS: `${API_BASE_URL}/api/almacenistas`,
    CLIENTES: `${API_BASE_URL}/api/clientes`,
    INCIDENCIAS: `${API_BASE_URL}/api/incidencias`,
  }
};

// Función helper para construir URLs de endpoints
export const buildApiUrl = (endpoint: string, params?: string | number) => {
  const baseUrl = `${API_BASE_URL}/api/${endpoint}`;
  return params ? `${baseUrl}/${params}` : baseUrl;
};

// Función helper para llamadas GET
export const apiGet = async (endpoint: string) => {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

// Función helper para llamadas POST
export const apiPost = async (endpoint: string, data: any) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

// Función helper para llamadas PATCH
export const apiPatch = async (endpoint: string, data: any) => {
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

// Funciones para limpieza y sincronización de rutas
export const cleanupOrphanedRoutes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/routes/cleanup-orphaned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error limpiando rutas huérfanas:', error);
    throw error;
  }
};

export const syncAllRoutes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/routes/sync-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error sincronizando rutas:', error);
    throw error;
  }
};

export const syncRepartidorRoute = async (repartidorId: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/routes/sync/${repartidorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error sincronizando ruta del repartidor:', error);
    throw error;
  }
}; 