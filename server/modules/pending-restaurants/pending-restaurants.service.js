const pool = require('../../config/database');
const { createNotification } = require('../notifications/notifications.service');

class PendingRestaurantsService {
  // Criar sugestão de restaurante pendente
  async createPendingRestaurant(restaurantData, postId, suggestedBy) {
    const {
      name,
      description,
      address,
      latitude,
      longitude,
      cuisine_type,
      price_range,
      phone_number,
      website
    } = restaurantData;

    const query = `
      INSERT INTO pending_restaurants (
        name, description, address, location, cuisine_type, 
        price_range, phone_number, website, suggested_by, post_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    let locationValue = null;
    if (latitude && longitude) {
      locationValue = `POINT(${longitude} ${latitude})`;
    }

    const values = [
      name,
      description,
      address,
      locationValue,
      cuisine_type,
      price_range,
      phone_number,
      website,
      suggestedBy,
      postId
    ];

    const result = await pool.query(query, values);
    const pendingRestaurant = result.rows[0];

    // Notificar administradores sobre nova sugestão
    try {
      await this.notifyAdminsAboutPendingRestaurant(pendingRestaurant);
    } catch (error) {
      console.error('Erro ao notificar administradores:', error);
      // Continuar mesmo se a notificação falhar
    }

    return pendingRestaurant;
  }

  // Buscar restaurantes pendentes
  async getPendingRestaurants(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT pr.*, 
             u.username as suggested_by_username,
             u.name as suggested_by_name,
             u.profile_picture as suggested_by_profile_picture,
             p.title as post_title,
             p.content as post_content,
             p.rating as post_rating,
             COUNT(pp.id) as photos_count
      FROM pending_restaurants pr
      JOIN users u ON pr.suggested_by = u.id
      JOIN posts p ON pr.post_id = p.id
      LEFT JOIN post_photos pp ON p.id = pp.post_id
      WHERE pr.status = 'pending'
      GROUP BY pr.id, u.username, u.name, u.profile_picture, p.title, p.content, p.rating
      ORDER BY pr.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // Buscar restaurante pendente por ID
  async getPendingRestaurantById(id) {
    const query = `
      SELECT pr.*, 
             u.username as suggested_by_username,
             u.name as suggested_by_name,
             u.profile_picture as suggested_by_profile_picture,
             p.title as post_title,
             p.content as post_content,
             p.rating as post_rating,
             p.id as post_id,
             p.user_id as post_user_id
      FROM pending_restaurants pr
      JOIN users u ON pr.suggested_by = u.id
      JOIN posts p ON pr.post_id = p.id
      WHERE pr.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Aprovar restaurante pendente
  async approvePendingRestaurant(pendingRestaurantId, adminId, adminNotes = '') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar dados do restaurante pendente
      const pendingRestaurant = await this.getPendingRestaurantById(pendingRestaurantId);
      if (!pendingRestaurant) {
        throw new Error('Restaurante pendente não encontrado');
      }

      // Criar restaurante na tabela principal
      console.log('=== DEBUG APPROVE RESTAURANT ===');
      console.log('Dados do restaurante pendente:', pendingRestaurant);
      
      const createRestaurantQuery = `
        INSERT INTO restaurants (
          name, description, address, location, cuisine_type, 
          price_range, phone_number, website, created_by, 
          status, approved_by, approved_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, NOW())
        RETURNING id
      `;

      // Converter price_range para número se for string
      let priceRange = pendingRestaurant.price_range;
      if (typeof priceRange === 'string') {
        if (priceRange === '$') priceRange = 1;
        else if (priceRange === '$$') priceRange = 2;
        else if (priceRange === '$$$') priceRange = 3;
        else if (priceRange === '$$$$') priceRange = 4;
        else if (priceRange === '$$$$$') priceRange = 5;
        else priceRange = 3; // valor padrão
      }

      // Tratar location se for string PostGIS
      let locationValue = pendingRestaurant.location;
      if (typeof locationValue === 'string' && locationValue.startsWith('POINT')) {
        // Manter como está se já for formato PostGIS
      } else if (locationValue) {
        // Se não for PostGIS, definir como NULL por enquanto
        locationValue = null;
      }

      const restaurantValues = [
        pendingRestaurant.name,
        pendingRestaurant.description,
        pendingRestaurant.address,
        locationValue,
        pendingRestaurant.cuisine_type,
        priceRange,
        pendingRestaurant.phone_number,
        pendingRestaurant.website,
        pendingRestaurant.suggested_by,
        adminId
      ];
      
      console.log('Query de criação:', createRestaurantQuery);
      console.log('Valores:', restaurantValues);
      console.log('priceRange convertido:', priceRange);
      console.log('locationValue tratado:', locationValue);

      let newRestaurantId;
      try {
        const restaurantResult = await client.query(createRestaurantQuery, restaurantValues);
        newRestaurantId = restaurantResult.rows[0].id;
        console.log('Restaurante criado com sucesso, ID:', newRestaurantId);
      } catch (error) {
        console.error('Erro ao criar restaurante:', error);
        throw error;
      }

      // Atualizar o post para referenciar o restaurante aprovado
      await client.query(
        'UPDATE posts SET restaurant_id = $1, pending_restaurant_id = NULL, is_suggestion = FALSE WHERE id = $2',
        [newRestaurantId, pendingRestaurant.post_id]
      );

      // Atualizar status do restaurante pendente
      await client.query(
        'UPDATE pending_restaurants SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $4',
        ['approved', adminNotes, adminId, pendingRestaurantId]
      );

      // Notificar o usuário que sugeriu o restaurante
      try {
        await createNotification({
          userId: pendingRestaurant.suggested_by,
          actorId: adminId,
          type: 'restaurant_approved',
          postId: pendingRestaurant.post_id,
          data: {
            restaurant_name: pendingRestaurant.name,
            restaurant_id: newRestaurantId
          }
        });
      } catch (error) {
        console.error('Erro ao criar notificação:', error);
        // Continuar mesmo se a notificação falhar
      }

      await client.query('COMMIT');

      return {
        success: true,
        restaurant_id: newRestaurantId,
        message: 'Restaurante aprovado com sucesso!'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Rejeitar restaurante pendente
  async rejectPendingRestaurant(pendingRestaurantId, adminId, adminNotes = '') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar dados do restaurante pendente
      const pendingRestaurant = await this.getPendingRestaurantById(pendingRestaurantId);
      if (!pendingRestaurant) {
        throw new Error('Restaurante pendente não encontrado');
      }

      // Atualizar status do restaurante pendente
      await client.query(
        'UPDATE pending_restaurants SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW() WHERE id = $4',
        ['rejected', adminNotes, adminId, pendingRestaurantId]
      );

      // Marcar o post como rejeitado
      await client.query(
        'UPDATE posts SET is_suggestion = FALSE WHERE id = $1',
        [pendingRestaurant.post_id]
      );

      // Notificar o usuário que sugeriu o restaurante
      try {
        await createNotification({
          userId: pendingRestaurant.suggested_by,
          actorId: adminId,
          type: 'restaurant_rejected',
          postId: pendingRestaurant.post_id,
          data: {
            restaurant_name: pendingRestaurant.name,
            admin_notes: adminNotes
          }
        });
      } catch (error) {
        console.error('Erro ao criar notificação:', error);
        // Continuar mesmo se a notificação falhar
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Restaurante rejeitado com sucesso!'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Contar restaurantes pendentes
  async getPendingRestaurantsCount() {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM pending_restaurants WHERE status = $1',
      ['pending']
    );
    return parseInt(result.rows[0].count);
  }

  // Notificar administradores sobre nova sugestão
  async notifyAdminsAboutPendingRestaurant(pendingRestaurant) {
    try {
      console.log('=== DEBUG NOTIFICAR ADMINS ===');
      console.log('Restaurante pendente:', pendingRestaurant);
      
      // Buscar todos os administradores
      const adminsResult = await pool.query(
        'SELECT id FROM users WHERE role IN ($1, $2)',
        ['admin', 'moderator']
      );
      
      console.log('Administradores encontrados:', adminsResult.rows);

      // Criar notificação para cada administrador
      for (const admin of adminsResult.rows) {
        try {
          console.log(`Criando notificação para admin ${admin.id}...`);
          const notification = await createNotification({
            userId: admin.id,
            actorId: pendingRestaurant.suggested_by,
            type: 'new_restaurant_suggestion',
            postId: pendingRestaurant.post_id,
            data: {
              restaurant_name: pendingRestaurant.name,
              suggested_by: pendingRestaurant.suggested_by,
              pending_restaurant_id: pendingRestaurant.id
            }
          });
          console.log(`Notificação criada para admin ${admin.id}:`, notification);
        } catch (error) {
          console.error(`Erro ao criar notificação para admin ${admin.id}:`, error);
          // Continuar mesmo se a notificação falhar
        }
      }
      console.log('=== FIM DEBUG NOTIFICAR ADMINS ===');
    } catch (error) {
      console.error('Erro ao notificar administradores:', error);
    }
  }

  // Buscar restaurantes pendentes por usuário
  async getPendingRestaurantsByUser(userId) {
    const query = `
      SELECT pr.*, 
             p.title as post_title,
             p.content as post_content,
             p.rating as post_rating
      FROM pending_restaurants pr
      JOIN posts p ON pr.post_id = p.id
      WHERE pr.suggested_by = $1
      ORDER BY pr.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}

module.exports = new PendingRestaurantsService();
