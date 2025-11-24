const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { createNotification } = require('../modules/notifications/notifications.service');

const router = express.Router();

// Dar like em um post
router.post('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Verificar se post existe
    const post = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [postId]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Verificar se já deu like
    const existingLike = await pool.query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingLike.rows.length > 0) {
      return res.status(400).json({ error: 'Você já deu like neste post' });
    }

    // Adicionar like
    await pool.query(
      'INSERT INTO likes (post_id, user_id) VALUES ($1, $2)',
      [postId, userId]
    );

    // Contar total de likes
    const likesCount = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1',
      [postId]
    );

    // Buscar dono do post para notificar
    const ownerResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    const ownerId = ownerResult.rows?.[0]?.user_id;
    if (ownerId) {
      await createNotification({
        userId: ownerId,
        actorId: userId,
        type: 'post_liked',
        postId,
        data: { postId }
      });
    }

    res.json({
      message: 'Like adicionado com sucesso!',
      likes_count: parseInt(likesCount.rows[0].count)
    });

  } catch (error) {
    console.error('Erro ao dar like:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover like de um post
router.delete('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Verificar se like existe
    const like = await pool.query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (like.rows.length === 0) {
      return res.status(404).json({ error: 'Like não encontrado' });
    }

    // Remover like
    await pool.query(
      'DELETE FROM likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    // Contar total de likes
    const likesCount = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1',
      [postId]
    );

    res.json({
      message: 'Like removido com sucesso!',
      likes_count: parseInt(likesCount.rows[0].count)
    });

  } catch (error) {
    console.error('Erro ao remover like:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar se usuário deu like em um post
router.get('/:postId/check', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const like = await pool.query(
      'SELECT id FROM likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    res.json({
      liked: like.rows.length > 0
    });

  } catch (error) {
    console.error('Erro ao verificar like:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Contar likes de um post
router.get('/:postId/count', async (req, res) => {
  try {
    const { postId } = req.params;

    const likesCount = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1',
      [postId]
    );

    res.json({
      likes_count: parseInt(likesCount.rows[0].count)
    });

  } catch (error) {
    console.error('Erro ao contar likes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
