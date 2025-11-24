const pool = require('../../config/database');

class GooglePlacesService {
  // Buscar todos os estabelecimentos do Google Places com paginação
  async getAllGooglePlaces(options = {}) {
    const { page = 1, limit = 20, search, tipo, cidade, incluir_fechados = false } = options;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Filtro para estabelecimentos abertos
    if (!incluir_fechados) {
      whereConditions.push('NOT permanently_closed AND business_status = \'OPERATIONAL\'');
    }

    // Filtro por busca de nome
    if (search) {
      paramCount++;
      whereConditions.push(`nome ILIKE $${paramCount}`);
      queryParams.push(`%${search}%`);
    }

    // Filtro por tipo
    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo = $${paramCount}`);
      queryParams.push(tipo);
    }

    // Filtro por cidade
    if (cidade) {
      paramCount++;
      whereConditions.push(`cidade = $${paramCount}`);
      queryParams.push(cidade);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        place_id, nome, tipo, endereco, cidade, latitude, longitude, 
        rating, user_ratings_total, price_level, phone_number, website,
        business_status, atualizado_em
      FROM estabelecimentos_google
      ${whereClause}
      ORDER BY rating DESC NULLS LAST, user_ratings_total DESC NULLS LAST, nome
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  // Buscar por nome com similaridade
  async findByName(nome) {
    const query = `
      SELECT 
        place_id, nome, tipo, endereco, cidade, latitude, longitude,
        rating, user_ratings_total, price_level, phone_number, website
      FROM estabelecimentos_google
      WHERE nome ILIKE $1 AND NOT permanently_closed
      ORDER BY similarity(nome, $2) DESC, rating DESC NULLS LAST
      LIMIT 50
    `;
    
    const result = await pool.query(query, [`%${nome}%`, nome]);
    return result.rows;
  }

  // Buscar por tipo
  async findByTipo(tipo) {
    const query = `
      SELECT 
        place_id, nome, tipo, endereco, cidade, latitude, longitude,
        rating, user_ratings_total, price_level, phone_number, website
      FROM estabelecimentos_google
      WHERE tipo = $1 AND NOT permanently_closed AND business_status = 'OPERATIONAL'
      ORDER BY rating DESC NULLS LAST, user_ratings_total DESC NULLS LAST, nome
      LIMIT 100
    `;
    
    const result = await pool.query(query, [tipo]);
    return result.rows;
  }

  // Buscar estabelecimentos próximos usando função PostgreSQL
  async findNearby(latitude, longitude, raio = 2000) {
    const query = `
      SELECT * FROM buscar_estabelecimentos_proximos($1, $2, $3, 100)
      WHERE fonte = 'google'
    `;
    
    const result = await pool.query(query, [latitude, longitude, raio]);
    return result.rows;
  }

  // Buscar por rating mínimo
  async findByMinRating(minRating = 4.0, limit = 50) {
    const query = `
      SELECT 
        place_id, nome, tipo, endereco, cidade, latitude, longitude,
        rating, user_ratings_total, price_level, phone_number, website
      FROM estabelecimentos_google
      WHERE rating >= $1 AND NOT permanently_closed AND business_status = 'OPERATIONAL'
      ORDER BY rating DESC, user_ratings_total DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [minRating, limit]);
    return result.rows;
  }

  // Buscar por faixa de preço
  async findByPriceLevel(priceLevel) {
    const query = `
      SELECT 
        place_id, nome, tipo, endereco, cidade, latitude, longitude,
        rating, user_ratings_total, price_level, phone_number, website
      FROM estabelecimentos_google
      WHERE price_level = $1 AND NOT permanently_closed AND business_status = 'OPERATIONAL'
      ORDER BY rating DESC NULLS LAST, user_ratings_total DESC NULLS LAST
      LIMIT 100
    `;
    
    const result = await pool.query(query, [priceLevel]);
    return result.rows;
  }

  // Buscar últimas atualizações
  async getRecentUpdates(limit = 20) {
    const query = `
      SELECT 
        place_id, nome, tipo, endereco, rating, user_ratings_total, atualizado_em
      FROM estabelecimentos_google
      WHERE NOT permanently_closed
      ORDER BY atualizado_em DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Buscar por ID do Google Places
  async findByPlaceId(placeId) {
    const query = `
      SELECT 
        place_id, nome, tipo, endereco, cidade, estado, latitude, longitude,
        rating, user_ratings_total, price_level, photo_reference,
        phone_number, website, google_url, business_status, opening_hours,
        criado_em, atualizado_em
      FROM estabelecimentos_google
      WHERE place_id = $1
    `;
    
    const result = await pool.query(query, [placeId]);
    return result.rows[0];
  }

  // Obter estatísticas
  async getStatistics() {
    const queries = await Promise.all([
      // Total de estabelecimentos
      pool.query('SELECT COUNT(*) as total FROM estabelecimentos_google WHERE NOT permanently_closed'),
      
      // Por tipo
      pool.query(`
        SELECT tipo, COUNT(*) as quantidade 
        FROM estabelecimentos_google 
        WHERE NOT permanently_closed
        GROUP BY tipo 
        ORDER BY quantidade DESC
      `),
      
      // Por faixa de rating
      pool.query(`
        SELECT 
          CASE 
            WHEN rating >= 4.5 THEN 'Excelente (4.5+)'
            WHEN rating >= 4.0 THEN 'Muito Bom (4.0-4.4)'
            WHEN rating >= 3.5 THEN 'Bom (3.5-3.9)'
            WHEN rating >= 3.0 THEN 'Regular (3.0-3.4)'
            WHEN rating IS NOT NULL THEN 'Abaixo de 3.0'
            ELSE 'Sem avaliação'
          END as faixa_rating,
          COUNT(*) as quantidade
        FROM estabelecimentos_google 
        WHERE NOT permanently_closed
        GROUP BY (CASE 
            WHEN rating >= 4.5 THEN 'Excelente (4.5+)'
            WHEN rating >= 4.0 THEN 'Muito Bom (4.0-4.4)'
            WHEN rating >= 3.5 THEN 'Bom (3.5-3.9)'
            WHEN rating >= 3.0 THEN 'Regular (3.0-3.4)'
            WHEN rating IS NOT NULL THEN 'Abaixo de 3.0'
            ELSE 'Sem avaliação'
          END)
        ORDER BY quantidade DESC
      `),
      
      // Estabelecimentos com mais avaliações
      pool.query(`
        SELECT nome, rating, user_ratings_total
        FROM estabelecimentos_google 
        WHERE NOT permanently_closed AND user_ratings_total IS NOT NULL
        ORDER BY user_ratings_total DESC
        LIMIT 10
      `),
      
      // Atualizações recentes (últimos 7 dias)
      pool.query(`
        SELECT COUNT(*) as recentes 
        FROM estabelecimentos_google 
        WHERE atualizado_em >= NOW() - INTERVAL '7 days' AND NOT permanently_closed
      `)
    ]);

    return {
      total: parseInt(queries[0].rows[0].total),
      por_tipo: queries[1].rows,
      por_rating: queries[2].rows,
      mais_avaliados: queries[3].rows,
      atualizacoes_recentes: parseInt(queries[4].rows[0].recentes)
    };
  }

  // Busca avançada combinada
  async advancedSearch(criteria) {
    const { 
      nome, tipo, cidade, lat, lng, raio, 
      min_rating, max_rating, price_level, 
      limit = 50 
    } = criteria;
    
    let whereConditions = ['NOT permanently_closed', 'business_status = \'OPERATIONAL\''];
    let queryParams = [];
    let paramCount = 0;

    if (nome) {
      paramCount++;
      whereConditions.push(`nome ILIKE $${paramCount}`);
      queryParams.push(`%${nome}%`);
    }

    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo = $${paramCount}`);
      queryParams.push(tipo);
    }

    if (cidade) {
      paramCount++;
      whereConditions.push(`cidade = $${paramCount}`);
      queryParams.push(cidade);
    }

    if (min_rating) {
      paramCount++;
      whereConditions.push(`rating >= $${paramCount}`);
      queryParams.push(parseFloat(min_rating));
    }

    if (max_rating) {
      paramCount++;
      whereConditions.push(`rating <= $${paramCount}`);
      queryParams.push(parseFloat(max_rating));
    }

    if (price_level) {
      paramCount++;
      whereConditions.push(`price_level = $${paramCount}`);
      queryParams.push(parseInt(price_level));
    }

    // Busca por proximidade se coordenadas fornecidas
    let distanceSelect = '';
    let orderBy = 'rating DESC NULLS LAST, user_ratings_total DESC NULLS LAST, nome';
    
    if (lat && lng) {
      distanceSelect = `, ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($${paramCount + 2}, $${paramCount + 1}), 4326)::geography) AS distancia_m`;
      
      if (raio) {
        paramCount += 2;
        whereConditions.push(`ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount - 1}), 4326)::geography, $${paramCount + 1})`);
        queryParams.push(lat, lng, raio);
        paramCount++;
      } else {
        queryParams.push(lat, lng);
        paramCount += 2;
      }
      
      orderBy = 'distancia_m ASC, rating DESC NULLS LAST';
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        place_id, nome, tipo, endereco, cidade, latitude, longitude,
        rating, user_ratings_total, price_level, phone_number, website${distanceSelect}
      FROM estabelecimentos_google
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount + 1}
    `;
    
    queryParams.push(limit);
    
    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  // Buscar estabelecimentos unificados (manual + Google Places)
  async getUnifiedEstablishments(options = {}) {
    const { page = 1, limit = 20, search, tipo, lat, lng, raio } = options;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`nome ILIKE $${paramCount}`);
      queryParams.push(`%${search}%`);
    }

    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo = $${paramCount}`);
      queryParams.push(tipo);
    }

    // Busca por proximidade
    let distanceSelect = '';
    let orderBy = 'rating DESC NULLS LAST, nome';
    
    if (lat && lng) {
      distanceSelect = `, ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($${paramCount + 2}, $${paramCount + 1}), 4326)::geography) AS distancia_m`;
      
      if (raio) {
        paramCount += 2;
        whereConditions.push(`ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount - 1}), 4326)::geography, $${paramCount + 1})`);
        queryParams.push(lat, lng, raio);
        paramCount++;
      } else {
        queryParams.push(lat, lng);
        paramCount += 2;
      }
      
      orderBy = 'distancia_m ASC';
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        fonte, identificador, nome, tipo, endereco, cidade,
        latitude, longitude, rating, telefone, website${distanceSelect}
      FROM estabelecimentos_unificados
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  // Comparar estabelecimentos manuais vs Google Places
  async compareDataSources() {
    const query = `
      SELECT 
        fonte,
        COUNT(*) as total,
        COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as com_rating,
        ROUND(AVG(rating), 2) as rating_medio,
        COUNT(CASE WHEN telefone IS NOT NULL THEN 1 END) as com_telefone,
        COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as com_website
      FROM estabelecimentos_unificados
      GROUP BY fonte
      ORDER BY fonte
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = new GooglePlacesService();
