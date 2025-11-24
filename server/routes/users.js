const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Buscar perfil do usuário por username
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const user = await pool.query(`
      SELECT u.id, u.name, u.username, u.email, u.bio, u.profile_picture, u.created_at,
             COUNT(DISTINCT f1.follower_id) as followers_count,
             COUNT(DISTINCT f2.following_id) as following_count,
             COUNT(DISTINCT p.id) as posts_count
      FROM users u
      LEFT JOIN follows f1 ON u.id = f1.following_id
      LEFT JOIN follows f2 ON u.id = f2.follower_id
      LEFT JOIN posts p ON u.id = p.user_id
      WHERE u.username = $1
      GROUP BY u.id
    `, [username]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      user: user.rows[0]
    });

  } catch (error) {
    console.error('Erro ao buscar usuário por username:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar perfil do usuário
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await pool.query(`
      SELECT u.id, u.name, u.username, u.email, u.bio, u.profile_picture, u.created_at,
             COUNT(DISTINCT f1.follower_id) as followers_count,
             COUNT(DISTINCT f2.following_id) as following_count,
             COUNT(DISTINCT p.id) as posts_count
      FROM users u
      LEFT JOIN follows f1 ON u.id = f1.following_id
      LEFT JOIN follows f2 ON u.id = f2.follower_id
      LEFT JOIN posts p ON u.id = p.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [id]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user.rows[0]);

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do usuário
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, username, email, bio, profile_picture } = req.body;
    const userId = req.user.id;

    // Verificar se username ou email já existem (exceto para o usuário atual)
    if (username) {
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, userId]
      );

      if (existingUsername.rows.length > 0) {
        return res.status(400).json({ error: 'Username já está em uso' });
      }
    }

    if (email) {
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }
    }

    // Atualizar usuário
    const updatedUser = await pool.query(`
      UPDATE users 
      SET name = COALESCE($1, name),
          username = COALESCE($2, username),
          email = COALESCE($3, email),
          bio = COALESCE($4, bio),
          profile_picture = COALESCE($5, profile_picture)
      WHERE id = $6
      RETURNING id, name, username, email, bio, profile_picture, created_at
    `, [name, username, email, bio, profile_picture, userId]);

    res.json({
      message: 'Perfil atualizado com sucesso!',
      user: updatedUser.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar senha
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar senha atual
    const user = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(currentPassword, user.rows[0].password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Senha alterada com sucesso!' });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar usuários (para busca)
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const users = await pool.query(`
      SELECT u.id, u.name, u.username, u.bio, u.profile_picture,
             COUNT(DISTINCT f1.follower_id) as followers_count,
             COUNT(DISTINCT f2.following_id) as following_count
      FROM users u
      LEFT JOIN follows f1 ON u.id = f1.following_id
      LEFT JOIN follows f2 ON u.id = f2.follower_id
      WHERE u.name ILIKE $1 OR u.username ILIKE $1
      GROUP BY u.id
      ORDER BY u.username ASC
      LIMIT $2 OFFSET $3
    `, [`%${query}%`, parseInt(limit), offset]);

    // Contar total de usuários encontrados
    const totalCount = await pool.query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.name ILIKE $1 OR u.username ILIKE $1
    `, [`%${query}%`]);

    res.json({
      users: users.rows,
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de imagem de usuário
router.post('/upload-image', auth, async (req, res) => {
  try {
    // Esta rota será implementada com middleware de upload
    // Por enquanto, retornar erro indicando que precisa ser implementada
    res.status(501).json({ error: 'Upload de imagem ainda não implementado' });
  } catch (error) {
    console.error('Erro no upload de imagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar seguidores de um usuário por username
router.get('/profile/:username/followers', async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Primeiro buscar o ID do usuário pelo username
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userId = userResult.rows[0].id;

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
    console.error('Erro ao buscar seguidores do usuário por username:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar posts de um usuário por username
router.get('/profile/:username/posts', async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Primeiro buscar o ID do usuário pelo username
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userId = userResult.rows[0].id;

    const posts = await pool.query(`
      SELECT p.*, u.name as user_name, u.profile_picture as user_profile_picture,
             r.name as restaurant_name, r.address,
             COUNT(DISTINCT l.user_id) as likes_count,
             COUNT(DISTINCT c.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN restaurants r ON p.restaurant_id = r.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = l.post_id
      WHERE p.user_id = $1
      GROUP BY p.id, u.name, u.profile_picture, r.name, r.address
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), offset]);

    // Buscar fotos para cada post
    for (let post of posts.rows) {
      const photos = await pool.query(
        'SELECT * FROM post_photos WHERE post_id = $1 ORDER BY uploaded_at ASC',
        [post.id]
      );
      post.photos = photos.rows;
    }

    // Contar total de posts
    const totalCount = await pool.query(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = $1',
      [userId]
    );

    res.json({
      posts: posts.rows,
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar posts do usuário por username:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar posts de um usuário
router.get('/:id/posts', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const posts = await pool.query(`
      SELECT p.*, u.name as user_name, u.profile_picture as user_profile_picture,
             r.name as restaurant_name, r.address,
             COUNT(DISTINCT l.user_id) as likes_count,
             COUNT(DISTINCT c.id) as comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN restaurants r ON p.restaurant_id = r.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.user_id = $1
      GROUP BY p.id, u.name, u.profile_picture, r.name, r.address
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), offset]);

    // Buscar fotos para cada post
    for (let post of posts.rows) {
      const photos = await pool.query(
        'SELECT * FROM post_photos WHERE post_id = $1 ORDER BY uploaded_at ASC',
        [post.id]
      );
      post.photos = photos.rows;
    }

    // Contar total de posts
    const totalCount = await pool.query(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = $1',
      [id]
    );

    res.json({
      posts: posts.rows,
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar posts do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
