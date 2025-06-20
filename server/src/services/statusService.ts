import { loadPedidos, loadUsers, saveUsers } from '../../database/csvLoader';

export class StatusService {
  
  /**
   * Actualiza automáticamente el estado de todos los repartidores
   * basado en sus pedidos activos
   */
  static async updateAllRepartidorStatus() {
    try {
      console.log('🔄 Iniciando actualización automática de estados de repartidores...');
      
      const [users, pedidos] = await Promise.all([
        loadUsers(),
        loadPedidos()
      ]);

      const repartidores = users.filter((u: any) => u.type_u === 'repartidor');
      const repartidoresActualizados: any[] = [];
      let cambiosRealizados = false;

      for (const repartidor of repartidores) {
        const estadoAnterior = repartidor.sta_u;
        const nuevoEstado = await this.calculateRepartidorStatus(repartidor.id_u, pedidos);
        
        if (estadoAnterior !== nuevoEstado) {
          repartidoresActualizados.push({
            ...repartidor,
            sta_u: nuevoEstado,
            ultima_actualizacion: new Date().toISOString()
          });
          cambiosRealizados = true;
          console.log(`📊 Repartidor ${repartidor.name_u}: ${estadoAnterior} → ${nuevoEstado}`);
        } else {
          repartidoresActualizados.push(repartidor);
        }
      }

      if (cambiosRealizados) {
        // Actualizar solo los repartidores en el array de usuarios
        const updatedUsers = users.map((user: any) => {
          const updatedRepartidor = repartidoresActualizados.find((r: any) => r.id_u === user.id_u);
          return updatedRepartidor || user;
        });
        await saveUsers(updatedUsers);
        console.log('✅ Estados de repartidores actualizados automáticamente');
        return { success: true, cambios: cambiosRealizados };
      } else {
        console.log('ℹ️ No se requieren cambios en los estados');
        return { success: true, cambios: false };
      }

    } catch (error) {
      console.error('❌ Error actualizando estados de repartidores:', error);
      throw error;
    }
  }

  /**
   * Calcula el estado de un repartidor específico basado en sus pedidos
   */
  static async calculateRepartidorStatus(repartidorId: number, pedidos?: any[]): Promise<string> {
    try {
      let pedidosData = pedidos || [];
      if (pedidosData.length === 0) {
        pedidosData = await loadPedidos();
      }

      // Obtener pedidos asignados a este repartidor
      const pedidosRepartidor = pedidosData.filter((p: any) => 
        String(p.del_p) === String(repartidorId)
      );

      if (pedidosRepartidor.length === 0) {
        // No tiene pedidos asignados
        return 'disponible';
      }

      // Verificar si tiene pedidos activos (no entregados)
      const pedidosActivos = pedidosRepartidor.filter((p: any) => 
        !['entregado', 'entregada', 'completed'].includes((p.sta_p || '').toLowerCase())
      );

      if (pedidosActivos.length === 0) {
        // Todos los pedidos están entregados
        return 'disponible';
      }

      // Si tiene cualquier pedido activo (pendiente, en_ruta, recogido, surtido, etc.)
      // entonces está en ruta
      return 'en_ruta';

    } catch (error) {
      console.error(`❌ Error calculando estado del repartidor ${repartidorId}:`, error);
      return 'disponible';
    }
  }

  /**
   * Actualiza el estado de un repartidor específico
   */
  static async updateRepartidorStatus(repartidorId: number): Promise<boolean> {
    try {
      const [users, pedidos] = await Promise.all([
        loadUsers(),
        loadPedidos()
      ]);

      const repartidorIndex = users.findIndex((u: any) => 
        String(u.id_u) === String(repartidorId)
      );

      if (repartidorIndex === -1) {
        console.log(`❌ Repartidor ${repartidorId} no encontrado`);
        return false;
      }

      const estadoAnterior = users[repartidorIndex].sta_u;
      const nuevoEstado = await this.calculateRepartidorStatus(repartidorId, pedidos);

      if (estadoAnterior !== nuevoEstado) {
        users[repartidorIndex] = {
          ...users[repartidorIndex],
          sta_u: nuevoEstado,
          ultima_actualizacion: new Date().toISOString()
        };

        await saveUsers(users);
        console.log(`✅ Repartidor ${repartidorId}: ${estadoAnterior} → ${nuevoEstado}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error(`❌ Error actualizando estado del repartidor ${repartidorId}:`, error);
      return false;
    }
  }

  /**
   * Actualiza el estado de un repartidor cuando se completa una entrega
   */
  static async onDeliveryCompleted(repartidorId: number, pedidoId: number): Promise<void> {
    try {
      console.log(`📦 Entrega completada: Repartidor ${repartidorId}, Pedido ${pedidoId}`);
      
      // Verificar si el repartidor completó toda su ruta
      const pedidos = await loadPedidos();
      const pedidosPendientes = pedidos.filter((p: any) => 
        String(p.del_p) === String(repartidorId) &&
        !['entregado', 'entregada', 'completed'].includes((p.sta_p || '').toLowerCase())
      );

      if (pedidosPendientes.length === 0) {
        // Todos los pedidos están entregados, actualizar estado a disponible
        await this.updateRepartidorStatus(repartidorId);
        console.log(`🎉 Repartidor ${repartidorId} completó toda su ruta`);
      }

    } catch (error) {
      console.error(`❌ Error procesando entrega completada:`, error);
    }
  }

  /**
   * Actualiza el estado de un repartidor cuando inicia una ruta
   */
  static async onRouteStarted(repartidorId: number): Promise<void> {
    try {
      console.log(`🚀 Ruta iniciada: Repartidor ${repartidorId}`);
      
      // Actualizar estado a en_ruta
      const users = await loadUsers();
      const repartidorIndex = users.findIndex((u: any) => 
        String(u.id_u) === String(repartidorId)
      );

      if (repartidorIndex !== -1) {
        users[repartidorIndex] = {
          ...users[repartidorIndex],
          sta_u: 'en_ruta',
          ultima_actualizacion: new Date().toISOString()
        };

        await saveUsers(users);
        console.log(`✅ Repartidor ${repartidorId} marcado como en_ruta`);
      }

    } catch (error) {
      console.error(`❌ Error procesando inicio de ruta:`, error);
    }
  }

  /**
   * Obtiene el estado actual de todos los repartidores
   */
  static async getRepartidoresStatus(): Promise<any[]> {
    try {
      const users = await loadUsers();
      return users
        .filter((u: any) => u.type_u === 'repartidor')
        .map((u: any) => ({
          id: u.id_u,
          nombre: u.name_u,
          estado: u.sta_u,
          sucursal: u.suc_u,
          ultima_actualizacion: u.ultima_actualizacion
        }));
    } catch (error) {
      console.error('❌ Error obteniendo estados de repartidores:', error);
      return [];
    }
  }
} 