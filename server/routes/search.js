const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Função para processar restaurantes e converter average_rating para número
const processRestaurants = (restaurants) => {
  return restaurants.map(restaurant => ({
    ...restaurant,
    average_rating: restaurant.average_rating ? parseFloat(restaurant.average_rating) : null
  }));
};

// Busca geral - restaurantes e usuários
router.get('/', async (req, res) => {
  try {
    const { q: query, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Query de busca deve ter pelo menos 2 caracteres' 
      });
    }

    const searchTerm = `%${query.trim()}%`;
    let results = {};

    // Buscar restaurantes
    if (!type || type === 'restaurants' || type === 'all') {
      const restaurantsQuery = `
        SELECT r.*, 
               u.username as created_by_username,
               COUNT(DISTINCT p.id) as posts_count,
               CAST(COALESCE(AVG(p.rating), 0) AS DECIMAL(3,2)) as average_rating,
               COUNT(DISTINCT f.user_id) as favorites_count
        FROM restaurants r
        LEFT JOIN users u ON r.created_by = u.id
        LEFT JOIN posts p ON r.id = p.restaurant_id
        LEFT JOIN favorites f ON r.id = f.restaurant_id
        WHERE r.name ILIKE $1 
           OR r.description ILIKE $1 
           OR r.address ILIKE $1
        GROUP BY r.id, r.name, r.description, r.address, r.location, r.created_by, r.created_at, u.username
        ORDER BY 
          CASE 
            WHEN r.name ILIKE $1 THEN 1
            WHEN r.description ILIKE $1 THEN 2
            WHEN r.address ILIKE $1 THEN 3
            ELSE 4
          END,
          r.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const restaurants = await pool.query(restaurantsQuery, [
        searchTerm, 
        parseInt(limit), 
        offset
      ]);

      // Contar total de restaurantes
      const restaurantsCountQuery = `
        SELECT COUNT(DISTINCT r.id) as count
        FROM restaurants r
        WHERE r.name ILIKE $1 
           OR r.description ILIKE $1 
           OR r.address ILIKE $1
      `;

      const restaurantsCount = await pool.query(restaurantsCountQuery, [searchTerm]);

      results.restaurants = {
        items: processRestaurants(restaurants.rows),
        pagination: {
          current: parseInt(page),
          total: parseInt(restaurantsCount.rows[0].count),
          pages: Math.ceil(restaurantsCount.rows[0].count / limit)
        }
      };
    }

    // Buscar usuários
    if (!type || type === 'users' || type === 'all') {
      const usersQuery = `
        SELECT u.id, u.name, u.username, u.bio, u.profile_picture, u.created_at,
               COUNT(DISTINCT f1.follower_id) as followers_count,
               COUNT(DISTINCT f2.following_id) as following_count,
               COUNT(DISTINCT p.id) as posts_count
        FROM users u
        LEFT JOIN follows f1 ON u.id = f1.following_id
        LEFT JOIN follows f2 ON u.id = f2.follower_id
        LEFT JOIN posts p ON u.id = p.user_id
        WHERE u.name ILIKE $1 
           OR u.username ILIKE $1 
           OR u.bio ILIKE $1
        GROUP BY u.id
        ORDER BY 
          CASE 
            WHEN u.username ILIKE $1 THEN 1
            WHEN u.name ILIKE $1 THEN 2
            WHEN u.bio ILIKE $1 THEN 3
            ELSE 4
          END,
          u.username ASC
        LIMIT $2 OFFSET $3
      `;

      const users = await pool.query(usersQuery, [
        searchTerm, 
        parseInt(limit), 
        offset
      ]);

      // Contar total de usuários
      const usersCountQuery = `
        SELECT COUNT(DISTINCT u.id) as count
        FROM users u
        WHERE u.name ILIKE $1 
           OR u.username ILIKE $1 
           OR u.bio ILIKE $1
      `;

      const usersCount = await pool.query(usersCountQuery, [searchTerm]);

      results.users = {
        items: users.rows,
        pagination: {
          current: parseInt(page),
          total: parseInt(usersCount.rows[0].count),
          pages: Math.ceil(usersCount.rows[0].count / limit)
        }
      };
    }

    // Adicionar informações da busca
    results.searchInfo = {
      query: query.trim(),
      type: type || 'all',
      totalResults: (results.restaurants?.pagination.total || 0) + (results.users?.pagination.total || 0)
    };

    res.json(results);

  } catch (error) {
    console.error('Erro na busca geral:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

module.exports = router;
