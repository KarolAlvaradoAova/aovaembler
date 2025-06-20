import { StatusService } from './statusService';

export class AutoStatusUpdater {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutos

  /**
   * Inicia el actualizador automático de estados
   */
  static start() {
    if (this.isRunning) {
      console.log('⚠️ AutoStatusUpdater ya está ejecutándose');
      return;
    }

    console.log('🚀 Iniciando AutoStatusUpdater...');
    this.isRunning = true;

    // Ejecutar inmediatamente la primera vez
    this.performUpdate();

    // Configurar intervalo para ejecuciones periódicas
    this.intervalId = setInterval(() => {
      this.performUpdate();
    }, this.UPDATE_INTERVAL);

    console.log(`✅ AutoStatusUpdater iniciado. Actualizando cada ${this.UPDATE_INTERVAL / 1000} segundos`);
  }

  /**
   * Detiene el actualizador automático de estados
   */
  static stop() {
    if (!this.isRunning) {
      console.log('⚠️ AutoStatusUpdater no está ejecutándose');
      return;
    }

    console.log('🛑 Deteniendo AutoStatusUpdater...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ AutoStatusUpdater detenido');
  }

  /**
   * Ejecuta una actualización manual de estados
   */
  static async performUpdate() {
    try {
      console.log('🔄 Ejecutando actualización automática de estados...');
      const startTime = Date.now();
      
      const result = await StatusService.updateAllRepartidorStatus();
      
      const duration = Date.now() - startTime;
      
      if (result.cambios) {
        console.log(`✅ Actualización automática completada en ${duration}ms. Cambios realizados.`);
      } else {
        console.log(`ℹ️ Actualización automática completada en ${duration}ms. Sin cambios necesarios.`);
      }
      
    } catch (error) {
      console.error('❌ Error en actualización automática:', error);
    }
  }

  /**
   * Obtiene el estado actual del actualizador
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      updateInterval: this.UPDATE_INTERVAL,
      lastUpdate: this.isRunning ? 'Activo' : 'Inactivo'
    };
  }

  /**
   * Cambia el intervalo de actualización
   */
  static setUpdateInterval(intervalMs: number) {
    if (intervalMs < 60000) { // Mínimo 1 minuto
      throw new Error('El intervalo mínimo es de 1 minuto (60000ms)');
    }

    this.UPDATE_INTERVAL = intervalMs;
    
    if (this.isRunning) {
      // Reiniciar con el nuevo intervalo
      this.stop();
      this.start();
    }
    
    console.log(`⏰ Intervalo de actualización cambiado a ${intervalMs / 1000} segundos`);
  }
} 