const pool = require('../../config/database');

/**
 * Serviço para consultar estabelecimentos do OpenStreetMap
 * Utiliza a view 'estabelecimentos_franca' criada pelo script importar-franca.ps1
 */
class OSMEstabelecimentosService {
  
  /**
   * Buscar todos os estabelecimentos OSM com paginação e filtros
   */
  async getAllOSMEstabelecimentos(options = {}) {
    const { page = 1, limit = 20, search, amenity, latitude, longitude, raio } = options;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    let selectColumns = 'nome, amenity, longitude, latitude, geometry_type, osm_id';
    let orderBy = 'nome ASC';

    // Filtro por busca de nome
    if (search) {
      paramCount++;
      whereConditions.push(`nome ILIKE $${paramCount}`);
      queryParams.push(`%${search}%`);
    }

    // Filtro por tipo de estabelecimento (amenity)
    if (amenity) {
      paramCount++;
      whereConditions.push(`amenity = $${paramCount}`);
      queryParams.push(amenity);
    }

    // Busca por proximidade se coordenadas fornecidas
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radius = raio ? parseFloat(raio) : 2000; // 2km por padrão
      
      selectColumns += `, ST_Distance(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($${paramCount + 2}, $${paramCount + 1}), 4326)::geography
      ) AS distancia_metros`;
      
      paramCount += 2;
      whereConditions.push(`ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount - 1}), 4326)::geography,
        $${paramCount + 1}
      )`);
      queryParams.push(lat, lng, radius);
      paramCount++;
      
      orderBy = 'distancia_metros ASC';
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT ${selectColumns}
      FROM estabelecimentos_franca
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(limit, offset);
    
    try {
      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos OSM:', error);
      throw new Error('Erro ao consultar estabelecimentos do OpenStreetMap');
    }
  }

  /**
   * Contar total de estabelecimentos OSM com filtros
   */
  async countOSMEstabelecimentos(options = {}) {
    const { search, amenity, latitude, longitude, raio } = options;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`nome ILIKE $${paramCount}`);
      queryParams.push(`%${search}%`);
    }

    if (amenity) {
      paramCount++;
      whereConditions.push(`amenity = $${paramCount}`);
      queryParams.push(amenity);
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radius = raio ? parseFloat(raio) : 2000;
      
      paramCount += 3;
      whereConditions.push(`ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($${paramCount - 1}, $${paramCount - 2}), 4326)::geography,
        $${paramCount}
      )`);
      queryParams.push(lat, lng, radius);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `SELECT COUNT(*) as total FROM estabelecimentos_franca ${whereClause}`;
    
    try {
      const result = await pool.query(query, queryParams);
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Erro ao contar estabelecimentos OSM:', error);
      throw new Error('Erro ao contar estabelecimentos do OpenStreetMap');
    }
  }

  /**
   * Buscar estabelecimentos OSM próximos a um ponto
   */
  async findNearbyOSM(latitude, longitude, raio = 2000, limit = 50) {
    const query = `
      SELECT 
        nome, amenity, longitude, latitude, geometry_type, osm_id,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) AS distancia_metros
      FROM estabelecimentos_franca
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      ORDER BY distancia_metros ASC
      LIMIT $4
    `;
    
    try {
      const result = await pool.query(query, [latitude, longitude, raio, limit]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos próximos OSM:', error);
      throw new Error('Erro ao buscar estabelecimentos próximos no OpenStreetMap');
    }
  }

  /**
   * Buscar estabelecimentos OSM por nome
   */
  async searchByName(nome, limit = 20) {
    const query = `
      SELECT nome, amenity, longitude, latitude, geometry_type, osm_id
      FROM estabelecimentos_franca
      WHERE nome ILIKE $1
      ORDER BY 
        CASE 
          WHEN nome ILIKE $2 THEN 1
          WHEN nome ILIKE $1 THEN 2
          ELSE 3
        END,
        nome ASC
      LIMIT $3
    `;
    
    try {
      const result = await pool.query(query, [`%${nome}%`, `${nome}%`, limit]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos por nome OSM:', error);
      throw new Error('Erro ao buscar estabelecimentos por nome no OpenStreetMap');
    }
  }

  /**
   * Buscar estabelecimentos OSM por tipo (amenity)
   */
  async findByAmenity(amenity, limit = 50) {
    const query = `
      SELECT nome, amenity, longitude, latitude, geometry_type, osm_id
      FROM estabelecimentos_franca
      WHERE amenity = $1
      ORDER BY nome ASC
      LIMIT $2
    `;
    
    try {
      const result = await pool.query(query, [amenity, limit]);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos por amenity OSM:', error);
      throw new Error('Erro ao buscar estabelecimentos por tipo no OpenStreetMap');
    }
  }

  /**
   * Buscar estabelecimento OSM por OSM ID
   */
  async findByOSMId(osmId) {
    const query = `
      SELECT nome, amenity, longitude, latitude, geometry_type, osm_id
      FROM estabelecimentos_franca
      WHERE osm_id = $1
    `;
    
    try {
      const result = await pool.query(query, [osmId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erro ao buscar estabelecimento por OSM ID:', error);
      throw new Error('Erro ao buscar estabelecimento por ID do OpenStreetMap');
    }
  }

  /**
   * Obter estatísticas dos estabelecimentos OSM
   */
  async getOSMStatistics() {
    try {
      const queries = await Promise.all([
        // Total de estabelecimentos
        pool.query('SELECT COUNT(*) as total FROM estabelecimentos_franca'),
        
        // Por tipo (amenity)
        pool.query(`
          SELECT amenity, COUNT(*) as quantidade 
          FROM estabelecimentos_franca 
          GROUP BY amenity 
          ORDER BY quantidade DESC
        `),
        
        // Por tipo de geometria
        pool.query(`
          SELECT geometry_type, COUNT(*) as quantidade 
          FROM estabelecimentos_franca 
          GROUP BY geometry_type 
          ORDER BY quantidade DESC
        `),
        
        // Estabelecimentos com nome vs sem nome
        pool.query(`
          SELECT 
            CASE 
              WHEN nome = 'Sem nome' THEN 'Sem nome'
              ELSE 'Com nome'
            END as tem_nome,
            COUNT(*) as quantidade
          FROM estabelecimentos_franca 
          GROUP BY 
            CASE 
              WHEN nome = 'Sem nome' THEN 'Sem nome'
              ELSE 'Com nome'
            END
          ORDER BY quantidade DESC
        `)
      ]);

      return {
        total: parseInt(queries[0].rows[0].total),
        por_amenity: queries[1].rows,
        por_geometria: queries[2].rows,
        por_nome: queries[3].rows
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas OSM:', error);
      throw new Error('Erro ao obter estatísticas do OpenStreetMap');
    }
  }

  /**
   * Verificar se a view estabelecimentos_franca existe e tem dados
   */
  async checkOSMViewStatus() {
    try {
      // Verificar se a view existe
      const viewExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_name = 'estabelecimentos_franca'
        ) as view_exists
      `;
      
      const viewResult = await pool.query(viewExistsQuery);
      const viewExists = viewResult.rows[0].view_exists;

      if (!viewExists) {
        return {
          view_exists: false,
          message: 'View estabelecimentos_franca não existe. Execute o script importar-franca.ps1'
        };
      }

      // Contar registros na view
      const countResult = await pool.query('SELECT COUNT(*) as total FROM estabelecimentos_franca');
      const total = parseInt(countResult.rows[0].total);

      return {
        view_exists: true,
        total_records: total,
        message: total > 0 ? 'View disponível com dados' : 'View existe mas não tem dados'
      };

    } catch (error) {
      console.error('Erro ao verificar status da view OSM:', error);
      return {
        view_exists: false,
        error: error.message,
        message: 'Erro ao verificar view estabelecimentos_franca'
      };
    }
  }

  /**
   * Obter tipos de amenity disponíveis
   */
  async getAvailableAmenities() {
    const query = `
      SELECT amenity, COUNT(*) as quantidade
      FROM estabelecimentos_franca
      GROUP BY amenity
      ORDER BY quantidade DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erro ao obter amenities disponíveis:', error);
      throw new Error('Erro ao obter tipos de estabelecimentos disponíveis');
    }
  }

  /**
   * Busca avançada combinando múltiplos critérios
   */
  async advancedOSMSearch(criteria) {
    const { nome, amenity, lat, lng, raio, geometry_type, limit = 50 } = criteria;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    let selectColumns = 'nome, amenity, longitude, latitude, geometry_type, osm_id';
    let orderBy = 'nome ASC';

    if (nome) {
      paramCount++;
      whereConditions.push(`nome ILIKE $${paramCount}`);
      queryParams.push(`%${nome}%`);
    }

    if (amenity) {
      paramCount++;
      whereConditions.push(`amenity = $${paramCount}`);
      queryParams.push(amenity);
    }

    if (geometry_type) {
      paramCount++;
      whereConditions.push(`geometry_type = $${paramCount}`);
      queryParams.push(geometry_type);
    }

    // Busca por proximidade
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radius = raio ? parseFloat(raio) : 2000;
      
      selectColumns += `, ST_Distance(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($${paramCount + 2}, $${paramCount + 1}), 4326)::geography
      ) AS distancia_metros`;
      
      paramCount += 2;
      whereConditions.push(`ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount - 1}), 4326)::geography,
        $${paramCount + 1}
      )`);
      queryParams.push(latitude, longitude, radius);
      paramCount++;
      
      orderBy = 'distancia_metros ASC';
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT ${selectColumns}
      FROM estabelecimentos_franca
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount + 1}
    `;
    
    queryParams.push(limit);
    
    try {
      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Erro na busca avançada OSM:', error);
      throw new Error('Erro na busca avançada de estabelecimentos OSM');
    }
  }
}

module.exports = new OSMEstabelecimentosService();


