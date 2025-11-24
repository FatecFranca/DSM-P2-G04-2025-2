const pool = require('../../config/database');

class AdminService {
  
  /**
   * Obter todos os usuários com suas informações básicas
   */
  async getAllUsers() {
    try {
      const query = `
        SELECT 
          id, username, email, role, created_at,
          CASE 
            WHEN role = 'admin' THEN 'Administrador'
            WHEN role = 'owner' THEN 'Proprietário'
            ELSE 'Usuário'
          END as role_display
        FROM users 
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }

  /**
   * Atualizar role de um usuário
   */
  async updateUserRole(userId, newRole) {
    try {
      const validRoles = ['user', 'owner', 'admin'];
      
      if (!validRoles.includes(newRole)) {
        throw new Error('Role inválida. Use: user, owner, admin');
      }

      const query = `
        UPDATE users 
        SET role = $1 
        WHERE id = $2 
        RETURNING id, username, email, role
      `;
      
      const result = await pool.query(query, [newRole, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao atualizar role do usuário:', error);
      throw error;
    }
  }

  /**
   * Obter todos os restaurantes com informações dos donos
   */
  async getAllRestaurants() {
    try {
      const query = `
        SELECT 
          r.id, r.name, r.description, r.address, r.logo_url,
          r.phone_number, r.website, r.business_hours,
          r.created_at, r.owner_id,
          u.username as owner_username,
          u.email as owner_email,
          CASE 
            WHEN r.owner_id IS NULL THEN 'Sem dono'
            ELSE u.username
          END as owner_display,
          CASE 
            WHEN r.description LIKE '%OSM ID:%' THEN 'OSM'
            ELSE 'Manual'
          END as source_type
        FROM restaurants r
        LEFT JOIN users u ON r.owner_id = u.id
        ORDER BY r.created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error);
      throw error;
    }
  }

  /**
   * Definir dono de um restaurante
   */
  async setRestaurantOwner(restaurantId, ownerId) {
    try {
      // Verificar se o restaurante existe
      const restaurantQuery = `
        SELECT id, name, owner_id 
        FROM restaurants 
        WHERE id = $1
      `;
      
      const restaurantResult = await pool.query(restaurantQuery, [restaurantId]);
      
      if (restaurantResult.rows.length === 0) {
        throw new Error('Restaurante não encontrado');
      }

      const restaurant = restaurantResult.rows[0];

      // Verificar se o usuário existe
      const userQuery = `
        SELECT id, username, email, role 
        FROM users 
        WHERE id = $1
      `;
      
      const userResult = await pool.query(userQuery, [ownerId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      const user = userResult.rows[0];

      // Atualizar dono do restaurante
      const updateQuery = `
        UPDATE restaurants 
        SET owner_id = $1 
        WHERE id = $2 
        RETURNING id, name, owner_id
      `;
      
      const updateResult = await pool.query(updateQuery, [ownerId, restaurantId]);

      // Atualizar role do usuário para 'owner' se não for admin
      if (user.role === 'user') {
        await this.updateUserRole(ownerId, 'owner');
      }

      return {
        restaurant: updateResult.rows[0],
        new_owner: user,
        message: `Dono do restaurante "${restaurant.name}" definido como "${user.username}"`
      };
    } catch (error) {
      console.error('Erro ao definir dono do restaurante:', error);
      throw error;
    }
  }

  /**
   * Remover dono de um restaurante
   */
  async removeRestaurantOwner(restaurantId) {
    try {
      const query = `
        UPDATE restaurants 
        SET owner_id = NULL 
        WHERE id = $1 
        RETURNING id, name, owner_id
      `;
      
      const result = await pool.query(query, [restaurantId]);
      
      if (result.rows.length === 0) {
        throw new Error('Restaurante não encontrado');
      }

      return {
        restaurant: result.rows[0],
        message: `Dono removido do restaurante "${result.rows[0].name}"`
      };
    } catch (error) {
      console.error('Erro ao remover dono do restaurante:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas do sistema
   */
  async getSystemStats() {
    try {
      const queries = await Promise.all([
        // Total de usuários
        pool.query('SELECT COUNT(*) as total FROM users'),
        
        // Usuários por role
        pool.query(`
          SELECT role, COUNT(*) as count 
          FROM users 
          GROUP BY role
        `),
        
        // Total de restaurantes
        pool.query('SELECT COUNT(*) as total FROM restaurants'),
        
        // Restaurantes com e sem dono
        pool.query(`
          SELECT 
            CASE 
              WHEN owner_id IS NULL THEN 'Sem dono'
              ELSE 'Com dono'
            END as status,
            COUNT(*) as count
          FROM restaurants 
          GROUP BY (owner_id IS NULL)
        `),
        
        // Restaurantes por fonte
        pool.query(`
          SELECT 
            CASE 
              WHEN description LIKE '%OSM ID:%' THEN 'OSM'
              ELSE 'Manual'
            END as source,
            COUNT(*) as count
          FROM restaurants 
          GROUP BY (description LIKE '%OSM ID:%')
        `)
      ]);

      return {
        users: {
          total: parseInt(queries[0].rows[0].total),
          by_role: queries[1].rows
        },
        restaurants: {
          total: parseInt(queries[2].rows[0].total),
          by_ownership: queries[3].rows,
          by_source: queries[4].rows
        }
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do sistema:', error);
      throw error;
    }
  }

  /**
   * Obter restaurantes de um usuário específico
   */
  async getUserRestaurants(userId) {
    try {
      const query = `
        SELECT 
          r.id, r.name, r.description, r.address, r.logo_url,
          r.phone_number, r.website, r.business_hours,
          r.created_at
        FROM restaurants r
        WHERE r.owner_id = $1
        ORDER BY r.created_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar restaurantes do usuário:', error);
      throw error;
    }
  }
}

module.exports = new AdminService();
