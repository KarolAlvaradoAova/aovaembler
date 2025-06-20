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
import statusRouter from './routes/status';
import routesRoutes from './routes/routes';
import { AutoStatusUpdater } from './services/autoStatusUpdater';
// import routesRouter from './routes/routes'; // Comentado temporalmente

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
    app.use('/api/status', statusRouter);
    app.use('/api/routes', routesRoutes);
    // app.use('/api/routes', routesRouter); // Comentado temporalmente para evitar procesos obsoletos

    const PORT = SERVER_CONFIG.PORT;
    app.listen(PORT, () => {
      console.log(`🚀 Backend listening on port ${PORT}`);
      console.log(`📍 Google Maps tracking APIs disponibles en /api/repartidores/tracking`);
      console.log(`🗺️  Route optimization APIs disponibles en /api/routes`);
      console.log(`📊 Status management APIs disponibles en /api/status`);
      console.log(`🔑 Google Maps API configurada y lista para usar`);
      
      // ✅ NUEVO: Iniciar actualizador automático de estados
      try {
        AutoStatusUpdater.start();
        console.log('🔄 AutoStatusUpdater iniciado automáticamente');
      } catch (error) {
        console.error('❌ Error iniciando AutoStatusUpdater:', error);
      }
    });

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful del servidor
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  AutoStatusUpdater.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  AutoStatusUpdater.stop();
  process.exit(0);
});

startServer();
