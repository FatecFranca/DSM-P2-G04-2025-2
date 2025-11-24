const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { createNotification } = require('../modules/notifications/notifications.service');

const router = express.Router();

// Seguir usuário
router.post('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    if (parseInt(userId) === followerId) {
      return res.status(400).json({ error: 'Você não pode seguir a si mesmo' });
    }

    // Verificar se usuário a ser seguido existe
    const userToFollow = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userToFollow.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se já está seguindo
    const existingFollow = await pool.query(
      'SELECT follower_id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, userId]
    );

    if (existingFollow.rows.length > 0) {
      return res.status(400).json({ error: 'Você já está seguindo este usuário' });
    }

    // Seguir usuário
    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, userId]
    );

    // Notificar usuário seguido
    try {
      await createNotification({
        userId: parseInt(userId),
        actorId: followerId,
        type: 'user_followed',
        data: {}
      });
    } catch (e) {
      console.warn('Falha ao gerar notificação de follow:', e?.message);
    }

    res.json({
      message: 'Usuário seguido com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao seguir usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deixar de seguir usuário
router.delete('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    // Verificar se está seguindo
    const follow = await pool.query(
      'SELECT follower_id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, userId]
    );

    if (follow.rows.length === 0) {
      return res.status(404).json({ error: 'Você não está seguindo este usuário' });
    }

    // Deixar de seguir
    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, userId]
    );

    res.json({
      message: 'Deixou de seguir o usuário com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao deixar de seguir:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar se está seguindo
router.get('/:userId/check', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.id;

    const follow = await pool.query(
      'SELECT follower_id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, userId]
    );

    res.json({
      is_following: follow.rows.length > 0
    });

  } catch (error) {
    console.error('Erro ao verificar follow:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar seguidores de um usuário
router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const followers = await pool.query(`
      SELECT u.id, u.username, u.name, u.profile_picture, u.bio, f.created_at as followed_at
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), offset]);

    // Contar total de seguidores
    const totalCount = await pool.query(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = $1',
      [userId]
    );

    res.json({
      followers: followers.rows,
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar seguidores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar usuários que um usuário está seguindo
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const following = await pool.query(`
      SELECT u.id, u.username, u.name, u.profile_picture, u.bio, f.created_at as followed_at
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), offset]);

    // Contar total de seguindo
    const totalCount = await pool.query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1',
      [userId]
    );

    res.json({
      following: following.rows,
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar seguindo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Contar seguidores e seguindo
router.get('/:userId/counts', async (req, res) => {
  try {
    const { userId } = req.params;

    const followersCount = await pool.query(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = $1',
      [userId]
    );

    const followingCount = await pool.query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1',
      [userId]
    );

    res.json({
      followers_count: parseInt(followersCount.rows[0].count),
      following_count: parseInt(followingCount.rows[0].count)
    });

  } catch (error) {
    console.error('Erro ao contar follows:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
