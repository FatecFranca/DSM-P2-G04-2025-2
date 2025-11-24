const pool = require('../../config/database');

class EstabelecimentosService {
  // Buscar todos os estabelecimentos com paginação
  async getAllEstabelecimentos(options = {}) {
    const { page = 1, limit = 20, search, tipo, cidade } = options;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

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
      SELECT osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude, updated_at as atualizado_em, main_photo_url, image_url
      FROM estabelecimentos
      ${whereClause}
      ORDER BY nome
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  // Buscar por nome com similaridade
  async findByName(nome) {
    const query = `
      SELECT osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude, main_photo_url, image_url
      FROM estabelecimentos
      WHERE nome ILIKE $1
      ORDER BY similarity(nome, $2) DESC, nome
      LIMIT 50
    `;
    
    const result = await pool.query(query, [`%${nome}%`, nome]);
    return result.rows;
  }

  // Buscar por tipo
  async findByTipo(tipo) {
    const query = `
      SELECT osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude, main_photo_url, image_url
      FROM estabelecimentos
      WHERE tipo = $1
      ORDER BY nome
    `;
    
    const result = await pool.query(query, [tipo]);
    return result.rows;
  }

  // Buscar estabelecimentos próximos a um ponto
  async findNearby(latitude, longitude, raio = 2000) {
    const query = `
      SELECT 
        osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude, main_photo_url, image_url,
        ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distancia_m
      FROM estabelecimentos
      WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
      ORDER BY distancia_m ASC
      LIMIT 100
    `;
    
    const result = await pool.query(query, [latitude, longitude, raio]);
    return result.rows;
  }

  // Buscar últimas alterações
  async getRecentUpdates(limit = 20) {
    const query = `
      SELECT osm_id, nome, tipo, endereco, updated_at as atualizado_em, main_photo_url, image_url
      FROM estabelecimentos
      ORDER BY updated_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Buscar por ID
  async findById(id) {
    const query = `
      SELECT osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude, main_photo_url, image_url,
             created_at, updated_at as atualizado_em
      FROM estabelecimentos
      WHERE id = $1 OR osm_id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Criar novo estabelecimento
  async createEstabelecimento(data) {
    const { osm_id, nome, tipo, endereco, telefone, cidade = 'Franca', latitude, longitude } = data;
    
    const query = `
      INSERT INTO estabelecimentos (osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Atualizar estabelecimento
  async updateEstabelecimento(id, data) {
    const { nome, tipo, endereco, telefone, cidade, latitude, longitude } = data;
    
    const query = `
      UPDATE estabelecimentos 
      SET nome = COALESCE($2, nome),
          tipo = COALESCE($3, tipo),
          endereco = COALESCE($4, endereco),
          telefone = COALESCE($5, telefone),
          cidade = COALESCE($6, cidade),
          latitude = COALESCE($7, latitude),
          longitude = COALESCE($8, longitude),
          updated_at = NOW()
      WHERE id = $1 OR osm_id = $1
      RETURNING *
    `;
    
    const values = [id, nome, tipo, endereco, telefone, cidade, latitude, longitude];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Excluir estabelecimento
  async deleteEstabelecimento(id) {
    const query = `DELETE FROM estabelecimentos WHERE id = $1 OR osm_id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Obter estatísticas
  async getStatistics() {
    const queries = await Promise.all([
      // Total de estabelecimentos
      pool.query('SELECT COUNT(*) as total FROM estabelecimentos'),
      
      // Por tipo
      pool.query(`
        SELECT tipo, COUNT(*) as quantidade 
        FROM estabelecimentos 
        GROUP BY tipo 
        ORDER BY quantidade DESC
      `),
      
      // Por cidade
      pool.query(`
        SELECT cidade, COUNT(*) as quantidade 
        FROM estabelecimentos 
        GROUP BY cidade 
        ORDER BY quantidade DESC
      `),
      
      // Atualizações recentes (últimos 7 dias)
      pool.query(`
        SELECT COUNT(*) as recentes 
        FROM estabelecimentos 
        WHERE updated_at >= NOW() - INTERVAL '7 days'
      `)
    ]);

    return {
      total: parseInt(queries[0].rows[0].total),
      por_tipo: queries[1].rows,
      por_cidade: queries[2].rows,
      atualizacoes_recentes: parseInt(queries[3].rows[0].recentes)
    };
  }

  // Busca avançada com múltiplos critérios
  async advancedSearch(criteria) {
    const { nome, tipo, cidade, lat, lng, raio, limit = 50 } = criteria;
    
    let whereConditions = [];
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

    // Busca por proximidade se coordenadas fornecidas
    let distanceSelect = '';
    let orderBy = 'nome';
    
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
      SELECT osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude${distanceSelect}
      FROM estabelecimentos
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount + 1}
    `;
    
    queryParams.push(limit);
    
    const result = await pool.query(query, queryParams);
    return result.rows;
  }
}

module.exports = new EstabelecimentosService();

