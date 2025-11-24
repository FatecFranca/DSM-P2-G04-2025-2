const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optional-auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

const convertToBrasiliaTime = (date) => {
  if (!date) return date;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const brasiliaTime = new Date(dateObj.getTime() + (3 * 60 * 60 * 1000));
  
  return brasiliaTime.toISOString();
};

const processPosts = (posts) => {
  return posts.map(post => ({
    ...post,
    created_at: convertToBrasiliaTime(post.created_at)
  }));
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, restaurant_id, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user?.id || 0;

    let query = `
      SELECT p.*, 
             u.username, u.name as user_name, u.profile_picture,
             r.name as restaurant_name, r.address,
             COUNT(DISTINCT l.user_id) as likes_count,
             COUNT(DISTINCT CASE WHEN c.parent_comment_id IS NULL THEN c.id END) as comments_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN restaurants r ON p.restaurant_id = r.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.is_suggestion = FALSE
    `;

    const queryParams = [userId];
    let paramIndex = 2;

    if (restaurant_id) {
      query += ` AND p.restaurant_id = $${paramIndex}`;
      queryParams.push(restaurant_id);
      paramIndex++;
    }

    if (user_id) {
      query += ` AND p.user_id = $${paramIndex}`;
      queryParams.push(user_id);
      paramIndex++;
    }

    query += `
      GROUP BY p.id, u.username, u.name, u.profile_picture, r.name, r.address
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(parseInt(limit), offset);

    console.log('Query final:', query);
    console.log('Parâmetros:', queryParams);
    const posts = await pool.query(query, queryParams);
    console.log('Posts retornados:', posts.rows.length);
    console.log('Primeiro post:', posts.rows[0]);

    for (let post of posts.rows) {
      const photos = await pool.query(
        'SELECT id, photo_url FROM post_photos WHERE post_id = $1 ORDER BY uploaded_at ASC',
        [post.id]
      );
      post.photos = photos.rows;
    }

    let countQuery = `SELECT COUNT(*) FROM posts p WHERE p.is_suggestion = FALSE`;
    const countParams = [];
    let countParamIndex = 1;

    if (restaurant_id) {
      countQuery += ` AND p.restaurant_id = $${countParamIndex}`;
      countParams.push(restaurant_id);
      countParamIndex++;
    }

    if (user_id) {
      countQuery += ` AND p.user_id = $${countParamIndex}`;
      countParams.push(user_id);
    }

    const totalCount = await pool.query(countQuery, countParams);

    res.json({
      posts: processPosts(posts.rows),
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar post por ID (com autenticação opcional para calcular user_liked)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 0;

    const post = await pool.query(`
      SELECT p.*, 
             u.username, u.name as user_name, u.profile_picture,
             COALESCE(r.name, 'Sugestão de Restaurante') as restaurant_name,
             COALESCE(r.address, pr.address) as address,
             COUNT(DISTINCT l.user_id) as likes_count,
             COUNT(DISTINCT CASE WHEN c.parent_comment_id IS NULL THEN c.id END) as comments_count,
             EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN restaurants r ON p.restaurant_id = r.id
      LEFT JOIN pending_restaurants pr ON p.pending_restaurant_id = pr.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.id = $2
      GROUP BY p.id, u.username, u.name, u.profile_picture, r.name, r.address, pr.address
    `, [userId, id]);

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    // Buscar fotos (retornar objetos { id, photo_url } para consistência)
    const photos = await pool.query(
      'SELECT id, photo_url FROM post_photos WHERE post_id = $1 ORDER BY uploaded_at ASC',
      [id]
    );

    post.rows[0].photos = photos.rows;

    // Converter datas para o padrão usado no feed
    res.json(processPosts([post.rows[0]])[0]);

  } catch (error) {
    console.error('Erro ao buscar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para inserir fotos
async function insertPostPhotos(postId, photos) {
  console.log('=== DEBUG INSERT PHOTOS ===');
  console.log('postId:', postId);
  console.log('photos:', photos);
  console.log('tipo photos:', typeof photos);
  console.log('é array?', Array.isArray(photos));
  console.log('length:', photos ? photos.length : 'undefined');
  
  if (photos && Array.isArray(photos) && photos.length > 0) {
    console.log('Fotos recebidas:', photos);
    for (let i = 0; i < photos.length; i++) {
      const photoUrl = photos[i];
      console.log(`Foto ${i + 1}:`, photoUrl);
      
      if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
        console.error(`Foto ${i + 1} inválida:`, photoUrl);
        continue;
      }
      
      try {
        // Verificar se a foto já existe na tabela
        const existingPhoto = await pool.query(
          'SELECT id FROM post_photos WHERE post_id = $1 AND photo_url = $2',
          [postId, photoUrl.trim()]
        );
        
        if (existingPhoto.rows.length > 0) {
          console.log(`Foto ${i + 1} já existe, pulando inserção`);
          continue;
        }
        
        await pool.query(
          'INSERT INTO post_photos (post_id, photo_url) VALUES ($1, $2)',
          [postId, photoUrl.trim()]
        );
        console.log(`Foto ${i + 1} inserida com sucesso`);
      } catch (error) {
        console.error(`Erro ao inserir foto ${i + 1}:`, error);
        // Não interromper o processo se uma foto falhar
        console.error('Continuando com outras fotos...');
      }
    }
  } else {
    console.log('Nenhuma foto fornecida ou formato inválido');
  }
  console.log('=== FIM DEBUG INSERT PHOTOS ===');
}

// Criar novo post
router.post('/', auth, async (req, res) => {
  try {
    const { restaurant_id, content, rating, photos, restaurant_suggestion } = req.body;
    const userId = req.user.id;
    
    console.log('Dados recebidos:', { restaurant_id, content, rating, photos, restaurant_suggestion });
    console.log('Tipo de photos:', typeof photos);
    console.log('Photos é array?', Array.isArray(photos));
    console.log('Photos length:', photos ? photos.length : 'undefined');
    console.log('Photos conteúdo:', photos);

    if (!content || !rating) {
      return res.status(400).json({ error: 'Conteúdo e avaliação são obrigatórios' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5' });
    }

    let postId;
    let isSuggestion = false;

    // Se for uma sugestão de restaurante
    if (restaurant_suggestion && !restaurant_id) {
      console.log('Criando sugestão de restaurante...');
      const { name, description, address, latitude, longitude, cuisine_type, price_range, phone_number, website } = restaurant_suggestion;
      
      if (!name || !address) {
        return res.status(400).json({ error: 'Nome e endereço do restaurante são obrigatórios para sugestões' });
      }

      // Criar post como sugestão (sem restaurant_id)
      const newPost = await pool.query(`
        INSERT INTO posts (user_id, content, rating, is_suggestion)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [userId, content, rating, true]);

      postId = newPost.rows[0].id;
      isSuggestion = true;

      // Adicionar fotos se fornecidas
      console.log('=== ANTES DE INSERIR FOTOS (SUGESTÃO) ===');
      console.log('postId:', postId);
      console.log('photos recebidas:', photos);
      console.log('tipo photos:', typeof photos);
      console.log('é array?', Array.isArray(photos));
      console.log('length:', photos ? photos.length : 'undefined');
      
      await insertPostPhotos(postId, photos);
      
      console.log('=== APÓS INSERIR FOTOS (SUGESTÃO) ===');
      // Verificar se as fotos foram inseridas
      const checkPhotos = await pool.query(
        'SELECT * FROM post_photos WHERE post_id = $1',
        [postId]
      );
      console.log('Fotos inseridas na tabela:', checkPhotos.rows);

      // Criar restaurante pendente
      console.log('Criando restaurante pendente...');
      const pendingRestaurantsService = require('../modules/pending-restaurants/pending-restaurants.service');
      const pendingRestaurant = await pendingRestaurantsService.createPendingRestaurant(
        restaurant_suggestion,
        postId,
        userId
      );
      console.log('Restaurante pendente criado:', pendingRestaurant);

      // Atualizar o post com o ID do restaurante pendente
      await pool.query(
        'UPDATE posts SET pending_restaurant_id = $1 WHERE id = $2',
        [pendingRestaurant.id, postId]
      );
      console.log('Post atualizado com pending_restaurant_id:', postId);

      // Buscar post completo com fotos
      const completePost = await pool.query(`
        SELECT p.*, 
               u.username, u.name as user_name, u.profile_picture,
               'Sugestão de Restaurante' as restaurant_name,
               $1 as address
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $2
      `, [address, postId]);

      const postPhotos = await pool.query(
        'SELECT * FROM post_photos WHERE post_id = $1 ORDER BY uploaded_at ASC',
        [postId]
      );

      completePost.rows[0].photos = postPhotos.rows;
      completePost.rows[0].is_suggestion = true;

      res.status(201).json({
        message: 'Sugestão de restaurante criada com sucesso! Aguardando aprovação de um administrador.',
        post: processPosts([completePost.rows[0]])[0],
        is_suggestion: true
      });

    } else {
      // Post normal com restaurante existente
      if (!restaurant_id) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório para posts normais' });
      }

      // Verificar se restaurante existe
      const restaurant = await pool.query(
        'SELECT id FROM restaurants WHERE id = $1',
        [restaurant_id]
      );

      if (restaurant.rows.length === 0) {
        return res.status(404).json({ error: 'Restaurante não encontrado' });
      }

      // Criar post
      const newPost = await pool.query(`
        INSERT INTO posts (user_id, restaurant_id, content, rating)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [userId, restaurant_id, content, rating]);

      postId = newPost.rows[0].id;

      // Adicionar fotos se fornecidas
      console.log('=== ANTES DE INSERIR FOTOS (POST NORMAL) ===');
      console.log('postId:', postId);
      console.log('photos recebidas:', photos);
      console.log('tipo photos:', typeof photos);
      console.log('é array?', Array.isArray(photos));
      console.log('length:', photos ? photos.length : 'undefined');
      
      await insertPostPhotos(postId, photos);
      
      console.log('=== APÓS INSERIR FOTOS (POST NORMAL) ===');
      // Verificar se as fotos foram inseridas
      const checkPhotos = await pool.query(
        'SELECT * FROM post_photos WHERE post_id = $1',
        [postId]
      );
      console.log('Fotos inseridas na tabela:', checkPhotos.rows);

      // Buscar post completo com fotos
      const completePost = await pool.query(`
        SELECT p.*, 
               u.username, u.name as user_name, u.profile_picture,
               r.name as restaurant_name, r.address
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN restaurants r ON p.restaurant_id = r.id
        WHERE p.id = $1
      `, [postId]);

      const postPhotos = await pool.query(
        'SELECT * FROM post_photos WHERE post_id = $1 ORDER BY uploaded_at ASC',
        [postId]
      );

      completePost.rows[0].photos = postPhotos.rows;

      res.status(201).json({
        message: 'Post criado com sucesso!',
        post: processPosts([completePost.rows[0]])[0]
      });
    }

  } catch (error) {
    console.error('Erro ao criar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar post
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, rating, photos } = req.body;
    const userId = req.user.id;

    // Verificar se usuário criou o post
    const post = await pool.query(
      'SELECT user_id FROM posts WHERE id = $1',
      [id]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    if (post.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para editar este post' });
    }

    // Atualizar post
    const updatedPost = await pool.query(`
      UPDATE posts 
      SET content = $1, rating = $2
      WHERE id = $3
      RETURNING *
    `, [content, rating, id]);

    // Atualizar fotos se fornecidas
    if (photos) {
      // Remover fotos antigas
      await pool.query('DELETE FROM post_photos WHERE post_id = $1', [id]);
      
      // Adicionar novas fotos
      for (let photoUrl of photos) {
        await pool.query(
          'INSERT INTO post_photos (post_id, photo_url) VALUES ($1, $2)',
          [id, photoUrl]
        );
      }
    }

    // Buscar post completo com fotos atualizadas
    const completePost = await pool.query(`
      SELECT p.*, 
             u.username, u.name as user_name, u.profile_picture,
             r.name as restaurant_name, r.address
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN restaurants r ON p.restaurant_id = r.id
      WHERE p.id = $1
    `, [id]);

    const postPhotos = await pool.query(
      'SELECT * FROM post_photos WHERE post_id = $1 ORDER BY uploaded_at ASC',
      [id]
    );

    completePost.rows[0].photos = postPhotos.rows;

    res.json({
      message: 'Post atualizado com sucesso!',
      post: processPosts([completePost.rows[0]])[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar post
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se usuário criou o post
    const post = await pool.query(
      'SELECT user_id FROM posts WHERE id = $1',
      [id]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    if (post.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para deletar este post' });
    }

    // Deletar post (cascade deletará fotos, likes e comentários)
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);

    res.json({ message: 'Post deletado com sucesso!' });

  } catch (error) {
    console.error('Erro ao deletar post:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de fotos para posts
router.post('/upload-photo', auth, upload.single('photo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma foto foi enviada' });
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      message: 'Foto enviada com sucesso!',
      photoUrl: photoUrl
    });

  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
