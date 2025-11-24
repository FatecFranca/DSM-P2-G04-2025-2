const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { requireOwnerOrAdmin } = require('../middleware/admin');
const { upload } = require('../middleware/upload');
const restaurantsController = require('../modules/restaurants/restaurants.controller');

// Função para converter data de UTC para UTC-3 (Brasília)
const convertToBrasiliaTime = (date) => {
  if (!date) return date;
  
  // Se a data já é uma string, converter para Date
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Converter de UTC para UTC-3 (Brasília)
  const brasiliaTime = new Date(dateObj.getTime() + (3 * 60 * 60 * 1000));
  
  return brasiliaTime.toISOString();
};

// Função para processar restaurantes e converter datas
const processRestaurants = (restaurants) => {
  return restaurants.map(restaurant => ({
    ...restaurant,
    created_at: convertToBrasiliaTime(restaurant.created_at),
    average_rating: restaurant.average_rating ? parseFloat(restaurant.average_rating) : null,
    // Mapear colunas de imagem para compatibilidade com o frontend
    image_url: restaurant.main_photo_url || restaurant.logo_url || null,
    main_photo_url: restaurant.main_photo_url || null,
    logo_url: restaurant.logo_url || null
  }));
};

// Rota de teste simples
router.get('/test', (req, res) => {
  res.json({ message: 'Rota de teste funcionando!' });
});

// Buscar todos os restaurantes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', lat, lng, radius = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Query corrigida - sem referenciar f.id
    let query = `
      SELECT r.*, u.username as created_by_username,
             COUNT(DISTINCT p.id) as posts_count,
             CAST(COALESCE(AVG(p.rating), 0) AS DECIMAL(3,2)) as average_rating,
             COUNT(DISTINCT f.user_id) as favorites_count
      FROM restaurants r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN posts p ON r.id = p.restaurant_id
      LEFT JOIN favorites f ON r.id = f.restaurant_id
    `;

    const whereConditions = [];
    const queryParams = [];

    // Busca por nome, descrição ou endereço
    if (search) {
      whereConditions.push(`(r.name ILIKE $${queryParams.length + 1} OR r.description ILIKE $${queryParams.length + 1} OR r.address ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }

    // Busca por proximidade (PostGIS) - comentada temporariamente
    /*
    if (lat && lng) {
      whereConditions.push(`
        ST_DWithin(
          r.location::geography, 
          ST_SetSRID(ST_MakePoint($${queryParams.length + 1}, $${queryParams.length + 2}), 4326)::geography, 
          $${queryParams.length + 3} * 1000
        )
      `);
      queryParams.push(parseFloat(lng), parseFloat(lat), parseFloat(radius));
    }
    */

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += `
      GROUP BY r.id, u.username
      ORDER BY r.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(parseInt(limit), offset);

    console.log('Query executada:', query);
    console.log('Parâmetros:', queryParams);

    const restaurants = await pool.query(query, queryParams);

    console.log('Resultado da query:', restaurants.rows);

    // Contar total para paginação
    let countQuery = `
      SELECT COUNT(*) 
      FROM restaurants r
    `;
    
    if (whereConditions.length > 0) {
      countQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const totalCount = await pool.query(countQuery, queryParams.slice(0, -2));

    res.json({
      restaurants: processRestaurants(restaurants.rows),
      pagination: {
        current: parseInt(page),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar restaurantes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// Criar novo restaurante
router.post('/', auth, async (req, res) => {
  try {
    const { name, address, description } = req.body;
    const created_by = req.user.id;

    // Validações básicas
    if (!name || !address) {
      return res.status(400).json({ 
        error: 'Nome e endereço são obrigatórios' 
      });
    }

    // Verificar se já existe um restaurante com o mesmo nome e endereço
    const existingRestaurant = await pool.query(
      'SELECT id FROM restaurants WHERE name = $1 AND address = $2',
      [name, address]
    );

    if (existingRestaurant.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Já existe um restaurante com este nome e endereço' 
      });
    }

    // Inserir novo restaurante
    const insertQuery = `
      INSERT INTO restaurants (name, address, description, created_by, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      name, 
      address, 
      description || 'Sem descrição', 
      created_by
    ]);

    const newRestaurant = result.rows[0];

    res.status(201).json({
      message: 'Restaurante criado com sucesso!',
      restaurant: processRestaurants([newRestaurant])[0]
    });

  } catch (error) {
    console.error('Erro ao criar restaurante:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// ROTAS DE FAVORITOS - DEVEM vir ANTES da rota /:id
router.get('/:id/favorite', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: restaurantId } = req.params;

    const result = await pool.query(
      'SELECT user_id FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
      [userId, restaurantId]
    );

    res.json({ isFavorite: result.rows.length > 0 });

  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/favorites', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
    }

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
      'SELECT user_id FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
      [userId, restaurantId]
    );

    if (existingFavorite.rows.length > 0) {
      return res.status(400).json({ error: 'Restaurante já está nos favoritos' });
    }

    // Adicionar aos favoritos
    await pool.query(
      'INSERT INTO favorites (user_id, restaurant_id, created_at) VALUES ($1, $2, NOW())',
      [userId, restaurantId]
    );

    res.json({ message: 'Restaurante adicionado aos favoritos!' });

  } catch (error) {
    console.error('Erro ao adicionar aos favoritos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/favorites/:restaurantId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    // Verificar se está nos favoritos
    const existingFavorite = await pool.query(
      'SELECT user_id FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
      [userId, restaurantId]
    );

    if (existingFavorite.rows.length === 0) {
      return res.status(400).json({ error: 'Restaurante não está nos favoritos' });
    }

    // Remover dos favoritos
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
      [userId, restaurantId]
    );

    res.json({ message: 'Restaurante removido dos favoritos!' });

  } catch (error) {
    console.error('Erro ao remover dos favoritos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar restaurante por ID - DEVE vir DEPOIS das rotas específicas
router.get('/:id', restaurantsController.getRestaurant);

// Rota para atualizar restaurante (requer ser dono OU admin)
router.put('/:id', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    // Debug: log dos dados recebidos
    console.log('Atualizando restaurante ID:', id);
    console.log('Dados recebidos:', updateData);
    console.log('Usuário:', req.user);

    // Verificar se o restaurante existe
    const existingRestaurant = await pool.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [id]
    );

    if (existingRestaurant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Restaurante não encontrado'
      });
    }

    const restaurant = existingRestaurant.rows[0];
    console.log('Restaurante existente:', restaurant);

    // Se não for admin, verificar se é o dono
    if (req.user.role !== 'admin' && restaurant.owner_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas o dono do restaurante ou administradores podem editar.'
      });
    }

    // Preparar campos para atualização de forma mais robusta
    const allowedFields = [
      'name', 'description', 'address', 'phone', 'website',
      'instagram', 'ifood',
      'cuisine_type', 'price_range', 'source_type', 'source_id'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Adicionar apenas campos que foram fornecidos
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== null) {
        updateFields.push(`${field} = $${paramCount}`);
        updateValues.push(updateData[field]);
        paramCount++;
      }
    });

    // Debug: log dos campos e valores
    console.log('Campos para atualização:', updateFields);
    console.log('Valores para atualização:', updateValues);

    // Se não há campos para atualizar, retornar erro
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo válido para atualização'
      });
    }

    // Adicionar updated_at
    updateFields.push('updated_at = $' + paramCount);
    updateValues.push(new Date());
    paramCount++;

    // Adicionar ID para WHERE
    updateValues.push(id);

    const updateQuery = `
      UPDATE restaurants 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    // Debug: log da query final
    console.log('Query final:', updateQuery);
    console.log('Valores finais:', updateValues);

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Restaurante atualizado com sucesso',
      restaurant: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar restaurante:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para upload de imagens (requer ser dono OU admin)
router.post('/upload-image', requireOwnerOrAdmin, upload.single('image'), async (req, res) => {
  try {
    const { type, restaurantId } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada'
      });
    }

    if (!type || !restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de imagem e ID do restaurante são obrigatórios'
      });
    }

    // Verificar se o restaurante existe
    const existingRestaurant = await pool.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [restaurantId]
    );

    if (existingRestaurant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Restaurante não encontrado'
      });
    }

    const restaurant = existingRestaurant.rows[0];

    // Se não for admin, verificar se é o dono
    if (req.user.role !== 'admin' && restaurant.owner_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas o dono do restaurante ou administradores podem fazer upload.'
      });
    }

    // Validar tipo de imagem
    const validTypes = ['main_photo', 'logo'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de imagem inválido'
      });
    }

    // Usar o nome do arquivo gerado pelo multer
    const fileName = req.file.filename;
    
    // Construir URL da imagem
    const imageUrl = `/uploads/${fileName}`;

    // Atualizar o campo correspondente no banco
    const updateField = type === 'main_photo' ? 'main_photo_url' : 'logo_url';
    
    await pool.query(
      `UPDATE restaurants SET ${updateField} = $1, updated_at = $2 WHERE id = $3`,
      [imageUrl, new Date(), restaurantId]
    );

    res.json({
      success: true,
      message: 'Imagem enviada com sucesso',
      imageUrl: imageUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para deletar restaurante (requer ser dono OU admin)
router.delete('/:id', requireOwnerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o restaurante existe
    const existingRestaurant = await pool.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [id]
    );

    if (existingRestaurant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Restaurante não encontrado'
      });
    }

    const restaurant = existingRestaurant.rows[0];

    // Se não for admin, verificar se é o dono
    if (req.user.role !== 'admin' && restaurant.owner_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas o dono do restaurante ou administradores podem deletar.'
      });
    }

    // Deletar o restaurante
    await pool.query('DELETE FROM restaurants WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Restaurante deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar restaurante:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
