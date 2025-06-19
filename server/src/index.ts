// Backend entry point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from '../database/csvLoader';
import { SERVER_CONFIG, validateServerConfig } from '../config';
import pedidosRouter from './routes/pedidos';
import repartidoresRouter from './routes/repartidores';
import sucursalesRouter from './routes/sucursales';
import almacenistasRouter from './routes/almacenistas';
import clientesRouter from './routes/clientes';
import incidenciasRouter from './routes/incidencias';
import routesRouter from './routes/routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar sistema CSV
async function startServer() {
  try {
    // Validar configuración del servidor
    validateServerConfig();
    
    await initDatabase();
    console.log('📊 Sistema CSV inicializado');
    
    app.use('/api/pedidos', pedidosRouter);
    app.use('/api/repartidores', repartidoresRouter);
    app.use('/api/sucursales', sucursalesRouter);
    app.use('/api/almacenistas', almacenistasRouter);
    app.use('/api/clientes', clientesRouter);
    app.use('/api/incidencias', incidenciasRouter);
    app.use('/api/routes', routesRouter);

    const PORT = SERVER_CONFIG.PORT;
    app.listen(PORT, () => {
      console.log(`🚀 Backend listening on port ${PORT}`);
      console.log(`📍 Google Maps tracking APIs disponibles en /api/repartidores/tracking`);
      console.log(`🗺️  Route optimization APIs disponibles en /api/routes`);
      console.log(`🔑 Google Maps API configurada y lista para usar`);
    });

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();
