const pool = require('../../config/database');

class RestaurantFeaturesService {
  
  async ensureOperatingHoursTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS restaurant_operating_hours (
          id SERIAL PRIMARY KEY,
          restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
          day_of_week INT NOT NULL,
          open_time TIME NULL,
          close_time TIME NULL,
          is_closed BOOLEAN DEFAULT true
        );
      `);
      // Índice para busca rápida por restaurante/dia
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_operating_hours_unique 
        ON restaurant_operating_hours (restaurant_id, day_of_week);
      `);
    } catch (error) {
      console.error('Erro ao garantir tabela restaurant_operating_hours:', error);
      // Não lançar para não quebrar fluxo em produção; o SELECT subsequente indicará falha
    }
  }
  
  // ===== SERVIÇOS =====
  
  // Buscar opções de serviços de um restaurante
  async getRestaurantServices(restaurantId) {
    try {
      const result = await pool.query(
        'SELECT * FROM restaurant_services WHERE restaurant_id = $1 ORDER BY service_type',
        [restaurantId]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar serviços do restaurante:', error);
      throw error;
    }
  }

  // Atualizar opções de serviços
  async updateRestaurantServices(restaurantId, services) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remover serviços existentes
      await client.query(
        'DELETE FROM restaurant_services WHERE restaurant_id = $1',
        [restaurantId]
      );
      
      // Inserir novos serviços
      for (const service of services) {
        await client.query(
          'INSERT INTO restaurant_services (restaurant_id, service_type, is_available) VALUES ($1, $2, $3)',
          [restaurantId, service.type, service.isAvailable]
        );
      }
      
      await client.query('COMMIT');
      
      // Retornar os serviços atualizados
      const result = await pool.query(
        'SELECT * FROM restaurant_services WHERE restaurant_id = $1 ORDER BY service_type',
        [restaurantId]
      );
      
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar serviços do restaurante:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== HIGHLIGHTS =====
  
  // Buscar highlights de um restaurante
  async getRestaurantHighlights(restaurantId) {
    try {
      const result = await pool.query(
        'SELECT * FROM restaurant_highlights WHERE restaurant_id = $1 AND is_active = true ORDER BY created_at',
        [restaurantId]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar highlights do restaurante:', error);
      throw error;
    }
  }

  // Atualizar highlights
  async updateRestaurantHighlights(restaurantId, highlights) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Desativar todos os highlights existentes
      await client.query(
        'UPDATE restaurant_highlights SET is_active = false WHERE restaurant_id = $1',
        [restaurantId]
      );
      
      // Ativar/inserir novos highlights
      for (const highlight of highlights) {
        if (highlight.isActive) {
          // Verificar se já existe
          const existing = await client.query(
            'SELECT id FROM restaurant_highlights WHERE restaurant_id = $1 AND highlight_text = $2',
            [restaurantId, highlight.text]
          );
          
          if (existing.rows.length > 0) {
            // Ativar existente
            await client.query(
              'UPDATE restaurant_highlights SET is_active = true WHERE id = $1',
              [existing.rows[0].id]
            );
          } else {
            // Inserir novo
            await client.query(
              'INSERT INTO restaurant_highlights (restaurant_id, highlight_text, is_active) VALUES ($1, $2, true)',
              [restaurantId, highlight.text]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar highlights do restaurante:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== HORÁRIOS DE FUNCIONAMENTO =====
  
  // Buscar horários de funcionamento
  async getRestaurantOperatingHours(restaurantId) {
    try {
      // Garantir que a tabela exista
      await this.ensureOperatingHoursTable();
      // Buscar registros existentes
      const result = await pool.query(
        'SELECT * FROM restaurant_operating_hours WHERE restaurant_id = $1 ORDER BY day_of_week',
        [restaurantId]
      );

      // Se não houver registros, inicializar padrão (todos fechados)
      if (!result.rows || result.rows.length === 0) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (let day = 0; day <= 6; day += 1) {
            await client.query(
              `INSERT INTO restaurant_operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
               VALUES ($1, $2, $3, $4, true)`,
              [restaurantId, day, '00:00:00', '00:00:00']
            );
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }

        // Buscar novamente após inicializar
        const seeded = await pool.query(
          'SELECT * FROM restaurant_operating_hours WHERE restaurant_id = $1 ORDER BY day_of_week',
          [restaurantId]
        );
        return seeded.rows;
      }

      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar horários do restaurante:', error);
      throw error;
    }
  }

  // Atualizar horários de funcionamento
  async updateRestaurantOperatingHours(restaurantId, operatingHours) {
    const client = await pool.connect();
    try {
      // Garantir que a tabela exista
      await this.ensureOperatingHoursTable();
      await client.query('BEGIN');
      
      // Atualizar horários existentes
      for (const hour of operatingHours) {
        await client.query(
          `UPDATE restaurant_operating_hours 
           SET open_time = $1, close_time = $2, is_closed = $3
           WHERE restaurant_id = $4 AND day_of_week = $5`,
          [hour.openTime, hour.closeTime, hour.isClosed, restaurantId, hour.dayOfWeek]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar horários do restaurante:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Verificar se restaurante está aberto
  async isRestaurantOpen(restaurantId) {
    try {
      // 1) Buscar horários cadastrados
      const hoursResult = await pool.query(
        'SELECT day_of_week, open_time, close_time, is_closed FROM restaurant_operating_hours WHERE restaurant_id = $1',
        [restaurantId]
      );

      const operatingHours = hoursResult.rows;
      if (!operatingHours || operatingHours.length === 0) {
        // Sem horários cadastrados, considerar fechado
        return false;
      }

      // 2) Obter data/hora atual no fuso de Brasília
      const nowInSaoPaulo = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
      );
      const currentDay = nowInSaoPaulo.getDay(); // 0 = Domingo

      const timeString = nowInSaoPaulo
        .toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
        .split(':');
      const currentMinutes = parseInt(timeString[0], 10) * 60 + parseInt(timeString[1], 10);

      // 3) Encontrar horário do dia atual
      const todayHours = operatingHours.find(h => h.day_of_week === currentDay);
      if (!todayHours || todayHours.is_closed) {
        return false;
      }

      // 4) Comparar horário atual com janela de funcionamento
      const [openH, openM] = String(todayHours.open_time).split(':').map(v => parseInt(v, 10));
      const [closeH, closeM] = String(todayHours.close_time).split(':').map(v => parseInt(v, 10));
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      // Caso padrão (não cruza meia-noite)
      if (closeMinutes > openMinutes) {
        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
      }

      // Caso cruza a meia-noite (ex.: 22:00 -> 02:00)
      // Aberto se agora >= open ou agora < close
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    } catch (error) {
      console.error('Erro ao verificar se restaurante está aberto:', error);
      // Em caso de falha, tentar usar a função SQL (se existir) como último recurso
      try {
        const fallback = await pool.query(
          'SELECT is_restaurant_open($1) as is_open',
          [restaurantId]
        );
        return fallback.rows?.[0]?.is_open ?? false;
      } catch (innerErr) {
        console.error('Falha no fallback is_restaurant_open:', innerErr);
        return false;
      }
    }
  }

  // Buscar status completo do restaurante
  async getRestaurantStatus(restaurantId) {
    try {
      const result = await pool.query(
        'SELECT * FROM restaurant_status WHERE id = $1',
        [restaurantId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar status do restaurante:', error);
      throw error;
    }
  }

  // ===== FUNÇÕES AUXILIARES =====
  
  // Obter nomes dos dias da semana
  getDayNames() {
    return [
      { value: 0, name: 'Domingo', short: 'Dom' },
      { value: 1, name: 'Segunda-feira', short: 'Seg' },
      { value: 2, name: 'Terça-feira', short: 'Ter' },
      { value: 3, name: 'Quarta-feira', short: 'Qua' },
      { value: 4, name: 'Quinta-feira', short: 'Qui' },
      { value: 5, name: 'Sexta-feira', short: 'Sex' },
      { value: 6, name: 'Sábado', short: 'Sáb' }
    ];
  }

  // Obter tipos de serviços disponíveis
  getServiceTypes() {
    return [
      { value: 'delivery', label: 'Delivery', icon: '🚚' },
      { value: 'reservas', label: 'Reservas', icon: '📅' },
      { value: 'takeaway', label: 'Takeaway', icon: '📦' },
      { value: 'dine_in', label: 'Comer no local', icon: '🍽️' },
      { value: 'rodizio', label: 'Rodízio', icon: '🔄' },
      { value: 'buffet', label: 'Buffet', icon: '🍱' },
      { value: 'a_la_cart', label: 'À la carte', icon: '📋' },
      { value: 'self_service', label: 'Self-service', icon: '🥗' },
      { value: 'drive_thru', label: 'Drive-thru', icon: '🚗' },
      { value: 'catering', label: 'Catering', icon: '🎉' }
    ];
  }

  // Buscar todos os serviços de um restaurante (incluindo personalizados)
  async getAllRestaurantServices(restaurantId) {
    try {
      const result = await pool.query(
        'SELECT * FROM restaurant_services WHERE restaurant_id = $1 ORDER BY service_type',
        [restaurantId]
      );
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar todos os serviços do restaurante:', error);
      throw error;
    }
  }

  // Adicionar novo serviço personalizado
  async addCustomService(restaurantId, serviceType, serviceLabel) {
    try {
      const result = await pool.query(
        'INSERT INTO restaurant_services (restaurant_id, service_type, is_available) VALUES ($1, $2, true) RETURNING *',
        [restaurantId, serviceType]
      );
      
      // Retornar o serviço criado com todos os campos
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao adicionar serviço personalizado:', error);
      throw error;
    }
  }

  // Deletar serviço personalizado
  async deleteCustomService(restaurantId, serviceType) {
    try {
      // Verificar se é um serviço padrão (não permitir deletar)
      const defaultServices = this.getServiceTypes().map(s => s.value);
      if (defaultServices.includes(serviceType)) {
        throw new Error('Não é possível deletar serviços padrão do sistema');
      }
      
      const result = await pool.query(
        'DELETE FROM restaurant_services WHERE restaurant_id = $1 AND service_type = $2 RETURNING *',
        [restaurantId, serviceType]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Serviço não encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao deletar serviço personalizado:', error);
      throw error;
    }
  }

  // Obter highlights padrão
  getDefaultHighlights() {
    return [
      { text: 'Ambiente familiar', icon: '👨‍👩‍👧‍👦' },
      { text: 'Boa localização', icon: '📍' },
      { text: 'Estacionamento', icon: '🚗' },
      { text: 'Wi-Fi gratuito', icon: '📶' },
      { text: 'Acessibilidade', icon: '♿' },
      { text: 'Vista para a cidade', icon: '🏙️' },
      { text: 'Terraço', icon: '🌆' },
      { text: 'Música ao vivo', icon: '🎵' }
    ];
  }
}

module.exports = new RestaurantFeaturesService();
