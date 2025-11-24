const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optional-auth');
const { createNotification } = require('../modules/notifications/notifications.service');

const router = express.Router();

const convertToBrasiliaTime = (date) => {
  if (!date) return date;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const brasiliaTime = new Date(dateObj.getTime() + (3 * 60 * 60 * 1000));
  
  return brasiliaTime.toISOString();
};

const processComments = (comments) => {
  return comments.map(comment => ({
    ...comment,
    created_at: convertToBrasiliaTime(comment.created_at)
  }));
};

router.get('/:postId', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id || 0;

    const comments = await pool.query(`
      SELECT 
        c.*, 
        u.username, 
        u.name as user_name, 
        u.profile_picture,
        COUNT(DISTINCT cl.id) as likes_count,
        COUNT(DISTINCT cr.id) as replies_count,
        CASE WHEN clu.id IS NOT NULL THEN true ELSE false END as user_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN comment_likes cl ON c.id = cl.comment_id
      LEFT JOIN comments cr ON c.id = cr.parent_comment_id
      LEFT JOIN comment_likes clu ON c.id = clu.comment_id AND clu.user_id = $4
      WHERE c.post_id = $1 AND c.parent_comment_id IS NULL
      GROUP BY c.id, c.post_id, c.user_id, c.content, c.created_at, c.parent_comment_id, u.username, u.name, u.profile_picture, clu.id
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `, [postId, parseInt(limit), offset, userId]);

    const totalCount = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE post_id = $1 AND parent_comment_id IS NULL',
      [postId]
    );

    res.json({
      comments: processComments(comments.rows),
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:commentId/replies', optionalAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id || 0;

    const replies = await pool.query(`
      SELECT 
        c.*, 
        u.username, 
        u.name as user_name, 
        u.profile_picture,
        COUNT(DISTINCT cl.id) as likes_count,
        CASE WHEN clu.id IS NOT NULL THEN true ELSE false END as user_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN comment_likes cl ON c.id = cl.comment_id
      LEFT JOIN comment_likes clu ON c.id = clu.comment_id AND clu.user_id = $4
      WHERE c.parent_comment_id = $1
      GROUP BY c.id, c.post_id, c.user_id, c.content, c.created_at, c.parent_comment_id, u.username, u.name, u.profile_picture, clu.id
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `, [commentId, parseInt(limit), offset, userId]);

    res.json({
      replies: processComments(replies.rows),
      pagination: {
        current: parseInt(page),
        total: replies.rows.length,
        pages: Math.ceil(replies.rows.length / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar comentário
router.post('/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }

    // Verificar se post existe
    const post = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [postId]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Se for uma resposta, verificar se o comentário pai existe
    if (parentCommentId) {
      const parentComment = await pool.query(
        'SELECT id FROM comments WHERE id = $1',
        [parentCommentId]
      );

      if (parentComment.rows.length === 0) {
        return res.status(404).json({ error: 'Comentário pai não encontrado' });
      }
    }

    // Criar comentário
    const newComment = await pool.query(`
      INSERT INTO comments (post_id, user_id, content, parent_comment_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [postId, userId, content.trim(), parentCommentId || null]);

    // Buscar comentário completo com dados do usuário
    const completeComment = await pool.query(`
      SELECT 
        c.*, 
        u.username, 
        u.name as user_name, 
        u.profile_picture,
        COUNT(cl.id) as likes_count,
        COUNT(cr.id) as replies_count,
        CASE WHEN clu.id IS NOT NULL THEN true ELSE false END as user_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN comment_likes cl ON c.id = cl.comment_id
      LEFT JOIN comments cr ON c.id = cr.parent_comment_id
      LEFT JOIN comment_likes clu ON c.id = clu.comment_id AND clu.user_id = $2
      WHERE c.id = $1
      GROUP BY c.id, c.post_id, c.user_id, c.content, c.created_at, c.parent_comment_id, u.username, u.name, u.profile_picture, clu.id
    `, [newComment.rows[0].id, userId]);

    res.status(201).json({
      message: parentCommentId ? 'Resposta adicionada com sucesso!' : 'Comentário adicionado com sucesso!',
      comment: processComments([completeComment.rows[0]])[0]
    });

    // Notificações (não bloquear resposta)
    try {
      if (parentCommentId) {
        // Notificar autor do comentário pai
        const parent = await pool.query('SELECT user_id FROM comments WHERE id = $1', [parentCommentId]);
        const parentOwnerId = parent.rows?.[0]?.user_id;
        if (parentOwnerId) {
          await createNotification({
            userId: parentOwnerId,
            actorId: userId,
            type: 'comment_replied',
            postId,
            commentId: newComment.rows[0].id,
            data: { postId, commentId: newComment.rows[0].id, parentCommentId }
          });
        }
      } else {
        // Notificar dono do post
        const postOwner = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
        const postOwnerId = postOwner.rows?.[0]?.user_id;
        if (postOwnerId) {
          await createNotification({
            userId: postOwnerId,
            actorId: userId,
            type: 'post_commented',
            postId,
            commentId: newComment.rows[0].id,
            data: { postId, commentId: newComment.rows[0].id }
          });
        }
      }
    } catch (e) {
      console.warn('Falha ao gerar notificação de comentário:', e?.message);
    }

  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Curtir/descurtir comentário
router.post('/:commentId/like', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Verificar se comentário existe
    const comment = await pool.query(
      'SELECT id FROM comments WHERE id = $1',
      [commentId]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    // Verificar se já curtiu
    const existingLike = await pool.query(
      'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (existingLike.rows.length > 0) {
      // Descurtir
      await pool.query(
        'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );

      res.json({ 
        message: 'Like removido com sucesso!',
        liked: false 
      });
    } else {
      // Curtir
      await pool.query(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
        [commentId, userId]
      );

      res.json({ 
        message: 'Comentário curtido com sucesso!',
        liked: true 
      });

      // Notificar autor do comentário curtido (não bloquear resposta)
      try {
        const owner = await pool.query('SELECT user_id, post_id FROM comments WHERE id = $1', [commentId]);
        const ownerId = owner.rows?.[0]?.user_id;
        const postId = owner.rows?.[0]?.post_id;
        if (ownerId) {
          await createNotification({
            userId: ownerId,
            actorId: userId,
            type: 'comment_liked',
            postId,
            commentId,
            data: { commentId, postId }
          });
        }
      } catch (e) {
        console.warn('Falha ao gerar notificação de like no comentário:', e?.message);
      }
    }

  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar se usuário curtiu comentário
router.get('/:commentId/like-status', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const like = await pool.query(
      'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    res.json({ 
      liked: like.rows.length > 0 
    });

  } catch (error) {
    console.error('Erro ao verificar like:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar comentário
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }

    // Verificar se comentário existe e pertence ao usuário
    const comment = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    if (comment.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para editar este comentário' });
    }

    // Atualizar comentário
    const updatedComment = await pool.query(`
      UPDATE comments 
      SET content = $1
      WHERE id = $2
      RETURNING *
    `, [content.trim(), id]);

    res.json({
      message: 'Comentário atualizado com sucesso!',
      comment: updatedComment.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar comentário
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se comentário existe e pertence ao usuário
    const comment = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (comment.rows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    if (comment.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para deletar este comentário' });
    }

    // Deletar comentário
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ message: 'Comentário deletado com sucesso!' });

  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
