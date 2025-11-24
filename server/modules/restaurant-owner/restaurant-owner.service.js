const pool = require('../../config/database');

class RestaurantOwnerService {

  /**
   * Obter restaurantes de um proprietário
   */
  async getOwnerRestaurants(ownerId) {
    try {
      const query = `
        SELECT 
          id, name, description, address, logo_url,
          phone_number, website, business_hours,
          cuisine_type, price_range, created_at,
          location
        FROM restaurants 
        WHERE owner_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query, [ownerId]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar restaurantes do proprietário:', error);
      throw error;
    }
  }

  /**
   * Atualizar informações básicas do restaurante
   */
  async updateRestaurantInfo(restaurantId, ownerId, updateData) {
    try {
      // Verificar se o restaurante pertence ao proprietário
      const ownershipQuery = `
        SELECT id, name, owner_id 
        FROM restaurants 
        WHERE id = $1 AND owner_id = $2
      `;
      
      const ownershipResult = await pool.query(ownershipQuery, [restaurantId, ownerId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Restaurante não encontrado ou não pertence ao usuário');
      }

      // Preparar campos para atualização
      const allowedFields = [
        'name', 'description', 'address', 'phone_number', 
        'website', 'business_hours', 'cuisine_type', 'price_range'
      ];

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      for (const [field, value] of Object.entries(updateData)) {
        if (allowedFields.includes(field) && value !== undefined) {
          updateFields.push(`${field} = $${paramCount}`);
          updateValues.push(value);
          paramCount++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo válido para atualização');
      }

      // Adicionar parâmetros para WHERE
      updateValues.push(restaurantId, ownerId);
      paramCount++;

      const updateQuery = `
        UPDATE restaurants 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount - 1} AND owner_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, updateValues);
      
      return {
        success: true,
        message: `Restaurante "${result.rows[0].name}" atualizado com sucesso`,
        restaurant: result.rows[0]
      };
    } catch (error) {
      console.error('Erro ao atualizar restaurante:', error);
      throw error;
    }
  }

  /**
   * Atualizar logo do restaurante
   */
  async updateRestaurantLogo(restaurantId, ownerId, logoUrl) {
    try {
      // Verificar propriedade
      const ownershipQuery = `
        SELECT id, name, owner_id 
        FROM restaurants 
        WHERE id = $1 AND owner_id = $2
      `;
      
      const ownershipResult = await pool.query(ownershipQuery, [restaurantId, ownerId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Restaurante não encontrado ou não pertence ao usuário');
      }

      // Atualizar logo
      const updateQuery = `
        UPDATE restaurants 
        SET logo_url = $1, updated_at = NOW()
        WHERE id = $2 AND owner_id = $3
        RETURNING id, name, logo_url
      `;

      const result = await pool.query(updateQuery, [logoUrl, restaurantId, ownerId]);
      
      return {
        success: true,
        message: `Logo do restaurante "${result.rows[0].name}" atualizada com sucesso`,
        restaurant: result.rows[0]
      };
    } catch (error) {
      console.error('Erro ao atualizar logo:', error);
      throw error;
    }
  }

  /**
   * Atualizar localização do restaurante
   */
  async updateRestaurantLocation(restaurantId, ownerId, latitude, longitude) {
    try {
      // Verificar propriedade
      const ownershipQuery = `
        SELECT id, name, owner_id 
        FROM restaurants 
        WHERE id = $1 AND owner_id = $2
      `;
      
      const ownershipResult = await pool.query(ownershipQuery, [restaurantId, ownerId]);
      
      if (ownershipResult.rows.length === 0) {
        throw new Error('Restaurante não encontrado ou não pertence ao usuário');
      }

      // Validar coordenadas
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Coordenadas inválidas');
      }

      // Atualizar localização
      const updateQuery = `
        UPDATE restaurants 
        SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326), updated_at = NOW()
        WHERE id = $3 AND owner_id = $4
        RETURNING id, name, location
      `;

      const result = await pool.query(updateQuery, [longitude, latitude, restaurantId, ownerId]);
      
      return {
        success: true,
        message: `Localização do restaurante "${result.rows[0].name}" atualizada com sucesso`,
        restaurant: result.rows[0]
      };
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas dos restaurantes do proprietário
   */
  async getOwnerStats(ownerId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_restaurants,
          COUNT(CASE WHEN logo_url IS NOT NULL THEN 1 END) as with_logo,
          COUNT(CASE WHEN phone_number IS NOT NULL THEN 1 END) as with_phone,
          COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as with_website,
          COUNT(CASE WHEN business_hours IS NOT NULL THEN 1 END) as with_hours,
          AVG(price_range) as avg_price_range
        FROM restaurants 
        WHERE owner_id = $1
      `;
      
      const result = await pool.query(query, [ownerId]);
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar estatísticas do proprietário:', error);
      throw error;
    }
  }
}

module.exports = new RestaurantOwnerService();
