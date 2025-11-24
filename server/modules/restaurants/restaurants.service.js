const pool = require('../../config/database');

class RestaurantsService {
  // Criar novo restaurante
  async createRestaurant(restaurantData) {
    const { 
      name, 
      description, 
      address, 
      latitude, 
      longitude, 
      cuisine_type, 
      price_range, 
      phone_number, 
      website, 
      external_id, 
      source,
      created_by 
    } = restaurantData;
    
    let location = null;
    if (latitude && longitude) {
      location = `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;
    }

    const query = `
      INSERT INTO restaurants (
        name, description, address, location, cuisine_type, 
        price_range, phone_number, website, external_id, source, created_by
      )
      VALUES ($1, $2, $3, ${location}, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      name, 
      description, 
      address, 
      cuisine_type, 
      price_range, 
      phone_number, 
      website, 
      external_id, 
      source, 
      created_by
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Buscar restaurante por ID
  async findRestaurantById(id) {
    const result = await pool.query(
      `SELECT r.*, 
              COUNT(DISTINCT p.id) as posts_count,
              COUNT(DISTINCT f.user_id) as favorites_count,
              AVG(p.rating) as average_rating
       FROM restaurants r
       LEFT JOIN posts p ON r.id = p.restaurant_id
       LEFT JOIN favorites f ON r.id = f.restaurant_id
       WHERE r.id = $1
       GROUP BY r.id`,
      [id]
    );
    
    return result.rows[0] || null;
  }

  // Buscar restaurante por ID com fotos
  async findRestaurantByIdWithPhotos(id) {
    console.log('🔍 findRestaurantByIdWithPhotos chamado para ID:', id);
    
    const result = await pool.query(
      `SELECT r.*, 
              COUNT(DISTINCT p.id) as posts_count,
              COUNT(DISTINCT f.user_id) as favorites_count,
              AVG(p.rating) as average_rating
       FROM restaurants r
       LEFT JOIN posts p ON r.id = p.restaurant_id
       LEFT JOIN favorites f ON r.id = f.restaurant_id
       WHERE r.id = $1
       GROUP BY r.id`,
      [id]
    );
    
    if (!result.rows[0]) {
      console.log('❌ Restaurante não encontrado');
      return null;
    }
    
    const restaurant = result.rows[0];
    console.log('✅ Restaurante encontrado:', restaurant.name);
    console.log('🔍 Dados do restaurante antes das fotos:', {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      address: restaurant.address
    });
    
    // Buscar fotos do restaurante
    console.log('🔍 Buscando fotos...');
    const photosResult = await pool.query(
      `SELECT id, photo_url, photo_order, caption, created_at
       FROM restaurant_photos 
       WHERE restaurant_id = $1 
       ORDER BY photo_order ASC, created_at ASC`,
      [id]
    );
    
    console.log('📸 Fotos encontradas:', photosResult.rows.length);
    console.log('📸 Dados das fotos:', photosResult.rows);
    
    restaurant.photos = photosResult.rows;
    restaurant.main_photo = photosResult.rows[0] || null;
    
    console.log('✅ Fotos atribuídas ao restaurante:', restaurant.photos ? restaurant.photos.length : 'undefined');
    console.log('✅ Main photo:', restaurant.main_photo ? restaurant.main_photo.photo_url : 'undefined');
    console.log('🔍 Estrutura final do restaurante:', {
      id: restaurant.id,
      name: restaurant.name,
      photos_count: restaurant.photos ? restaurant.photos.length : 'undefined',
      photos_structure: restaurant.photos ? restaurant.photos.map(p => ({ id: p.id, photo_url: p.photo_url, photo_order: p.photo_order })) : 'undefined'
    });
    
    return restaurant;
  }

  // Buscar todos os restaurantes com paginação
  async getAllRestaurants(limit = 20, offset = 0, filters = {}) {
    let whereClause = '';
    const values = [];
    let valueIndex = 1;

    // Determinar ordenação
    let orderClause = 'ORDER BY r.created_at DESC';
    if (filters.sort_by) {
      switch (filters.sort_by) {
        case 'name':
          orderClause = 'ORDER BY r.name ASC';
          break;
        case 'rating':
          orderClause = 'ORDER BY average_rating DESC NULLS LAST, r.name ASC';
          break;
        case 'created_at':
          orderClause = 'ORDER BY r.created_at DESC';
          break;
        default:
          orderClause = 'ORDER BY r.created_at DESC';
      }
    }

    const query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.address,
        r.location,
        r.created_by,
        r.created_at,
        r.owner_id,
        r.phone_number,
        r.website,
        r.business_hours,
        r.phone,
        r.cuisine_type,
        r.price_range,
        r.source_type,
        r.source_id,
        r.updated_at,
        r.instagram,
        r.ifood,
        r.external_id,
        r.source,
        r.status,
        r.approved_by,
        r.approved_at,
        COUNT(DISTINCT p.id) as posts_count,
        COUNT(DISTINCT f.user_id) as favorites_count,
        AVG(p.rating) as average_rating,
        mp.photo_url AS main_photo_url,
        mp.photo_url AS image_url
       FROM restaurants r
       LEFT JOIN posts p ON r.id = p.restaurant_id
       LEFT JOIN favorites f ON r.id = f.restaurant_id
       LEFT JOIN LATERAL (
         SELECT photo_url
         FROM restaurant_photos rp
         WHERE rp.restaurant_id = r.id
         ORDER BY rp.photo_order ASC, rp.created_at ASC
         LIMIT 1
       ) mp ON TRUE
       ${whereClause}
       GROUP BY 
        r.id, r.name, r.description, r.address, r.location, r.created_by, r.created_at,
        r.owner_id, r.phone_number, r.website, r.business_hours,
        r.phone, r.cuisine_type, r.price_range, r.source_type,
        r.source_id, r.updated_at, r.instagram, r.ifood, r.external_id, r.source,
        r.status, r.approved_by, r.approved_at, mp.photo_url
       ${orderClause}
       LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;

    values.push(limit, offset);
    const result = await pool.query(query, values);
    
    return result.rows;
  }

  // Buscar total de restaurantes com filtros
  async getTotalRestaurants(filters = {}) {
    let whereClause = '';
    const values = [];
    let valueIndex = 1;

    const query = `
      SELECT COUNT(*) as total
      FROM restaurants r
      ${whereClause}
    `;

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].total);
  }

  // Buscar restaurantes próximos usando PostGIS
  async getNearbyRestaurants(latitude, longitude, radiusMeters = 5000, limit = 20) {
    try {
      const result = await pool.query(
        `SELECT r.*, 
                COUNT(DISTINCT p.id) as posts_count,
                COUNT(DISTINCT f.user_id) as favorites_count,
                AVG(p.rating) as average_rating,
                ST_Distance(
                  r.location::geography,
                  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) as distance_meters
         FROM restaurants r
         LEFT JOIN posts p ON r.id = p.restaurant_id
         LEFT JOIN favorites f ON r.id = f.restaurant_id
         WHERE ST_DWithin(
           r.location::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           $3
         )
         GROUP BY r.id, r.location
         ORDER BY distance_meters
         LIMIT $4`,
        [longitude, latitude, radiusMeters, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar restaurantes próximos:', error);
      // Fallback para busca sem geolocalização
      return this.getAllRestaurants(limit);
    }
  }

  // Buscar restaurantes por texto
  async searchRestaurants(searchTerm, limit = 20) {
    const query = `
      SELECT r.*, 
              COUNT(DISTINCT p.id) as posts_count,
              COUNT(DISTINCT f.user_id) as favorites_count,
              AVG(p.rating) as average_rating
       FROM restaurants r
       LEFT JOIN posts p ON r.id = p.restaurant_id
       LEFT JOIN favorites f ON r.id = f.restaurant_id
       WHERE r.name ILIKE $1 OR r.description ILIKE $1
       GROUP BY r.id
       ORDER BY 
         CASE 
           WHEN r.name ILIKE $1 THEN 1
           WHEN r.description ILIKE $1 THEN 2
           ELSE 3
         END,
         r.name ASC
       LIMIT $2
    `;

    const result = await pool.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  // Atualizar restaurante
  async updateRestaurant(id, updateData) {
    const { name, description, address, latitude, longitude } = updateData;
    
    let location = null;
    if (latitude && longitude) {
      location = `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;
    }

    const query = `
      UPDATE restaurants 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          address = COALESCE($3, address),
          location = COALESCE(${location}, location)
      WHERE id = $4
      RETURNING *
    `;

    const values = [name, description, address, id];
    const result = await pool.query(query, values);
    
    return result.rows[0] || null;
  }

  // Deletar restaurante
  async deleteRestaurant(id) {
    const result = await pool.query(
      'DELETE FROM restaurants WHERE id = $1 RETURNING id',
      [id]
    );
    
    return result.rows[0] || null;
  }

  // Buscar tipos de culinária disponíveis
  async getCuisineTypes() {
    // Como cuisine_type não existe na tabela, retornar array vazio
    return [];
  }

  // Buscar faixas de preço disponíveis
  async getPriceRanges() {
    // Como price_range não existe na tabela, retornar array vazio
    return [];
  }

  // Buscar restaurantes favoritados por um usuário
  async getUserFavorites(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT r.*, 
              COUNT(DISTINCT p.id) as posts_count,
              COUNT(DISTINCT f2.user_id) as favorites_count,
              AVG(p.rating) as average_rating
       FROM favorites f
       JOIN restaurants r ON f.restaurant_id = r.id
       LEFT JOIN posts p ON r.id = p.restaurant_id
       LEFT JOIN favorites f2 ON r.id = f2.restaurant_id
       WHERE f.user_id = $1
       GROUP BY r.id
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  }

  // Verificar se usuário favoritou restaurante
  async isUserFavorite(userId, restaurantId) {
    const result = await pool.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
      [userId, restaurantId]
    );
    
    return result.rows.length > 0;
  }

  // Adicionar aos favoritos
  async addToFavorites(userId, restaurantId) {
    const result = await pool.query(
      `INSERT INTO favorites (user_id, restaurant_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, restaurant_id) DO NOTHING
       RETURNING id`,
      [userId, restaurantId]
    );
    
    return result.rows[0];
  }

  // Remover dos favoritos
  async removeFromFavorites(userId, restaurantId) {
    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND restaurant_id = $2 RETURNING id',
      [userId, restaurantId]
    );
    
    return result.rows[0];
  }
}

module.exports = new RestaurantsService();
