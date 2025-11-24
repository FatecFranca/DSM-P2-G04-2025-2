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

// Adicionar restaurante aos favoritos
router.post('/:restaurantId', auth, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    // Verificar se restaurante existe
    const restaurant = await pool.query(
      'SELECT id FROM restaurants WHERE id = $1',
      [restaurantId]
    );

    if (restaurant.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurante não encontrado' });
    }

    // Verificar se já está nos favoritos
    const existingFavorite = await pool.query(
      'SELECT user_id FROM favorites WHERE restaurant_id = $1 AND user_id = $2',
      [restaurantId, userId]
    );

    if (existingFavorite.rows.length > 0) {
      return res.status(400).json({ error: 'Restaurante já está nos seus favoritos' });
    }

    // Adicionar aos favoritos
    await pool.query(
      'INSERT INTO favorites (user_id, restaurant_id) VALUES ($1, $2)',
      [userId, restaurantId]
    );

    res.json({
      message: 'Restaurante adicionado aos favoritos com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover restaurante dos favoritos
router.delete('/:restaurantId', auth, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    // Verificar se favorito existe
    const favorite = await pool.query(
      'SELECT user_id FROM favorites WHERE restaurant_id = $1 AND user_id = $2',
      [restaurantId, userId]
    );

    if (favorite.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurante não está nos seus favoritos' });
    }

    // Remover dos favoritos
    await pool.query(
      'DELETE FROM favorites WHERE restaurant_id = $1 AND user_id = $2',
      [restaurantId, userId]
    );

    res.json({
      message: 'Restaurante removido dos favoritos com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar se restaurante está nos favoritos
router.get('/:restaurantId/check', auth, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    const favorite = await pool.query(
      'SELECT user_id FROM favorites WHERE restaurant_id = $1 AND user_id = $2',
      [restaurantId, userId]
    );

    res.json({
      is_favorite: favorite.rows.length > 0
    });

  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar restaurantes favoritos do usuário
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const favorites = await pool.query(`
      SELECT r.*, 
             COUNT(DISTINCT p.id) as posts_count,
             CAST(COALESCE(AVG(p.rating), 0) AS DECIMAL(3,2)) as average_rating,
             COUNT(DISTINCT f2.user_id) as favorites_count
      FROM favorites f
      JOIN restaurants r ON f.restaurant_id = r.id
      LEFT JOIN posts p ON r.id = p.restaurant_id
      LEFT JOIN favorites f2 ON r.id = f2.restaurant_id
      WHERE f.user_id = $1
      GROUP BY r.id, f.created_at
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), offset]);

    // Contar total de favoritos
    const totalCount = await pool.query(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = $1',
      [userId]
    );

    res.json({
      favorites: processRestaurants(favorites.rows),
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar favoritos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Contar favoritos de um restaurante
router.get('/:restaurantId/count', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const favoritesCount = await pool.query(
      'SELECT COUNT(*) as count FROM favorites WHERE restaurant_id = $1',
      [restaurantId]
    );

    res.json({
      favorites_count: parseInt(favoritesCount.rows[0].count)
    });

  } catch (error) {
    console.error('Erro ao contar favoritos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
