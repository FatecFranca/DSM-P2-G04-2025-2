const pool = require('../../config/database');

/**
 * Serviço para importar estabelecimentos OSM para a tabela restaurants principal
 */
class OSMImportService {

  /**
   * Importar estabelecimentos OSM para a tabela restaurants
   */
  async importOSMToRestaurants(options = {}) {
    const { 
      amenityFilter = ['restaurant', 'bar', 'cafe', 'fast_food'],
      overwrite = false,
      adminUserId = null
    } = options;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Verificar quantos estabelecimentos OSM existem
      const osmCountQuery = `
        SELECT COUNT(*) as total 
        FROM estabelecimentos_franca 
        WHERE amenity = ANY($1)
      `;
      const osmCount = await client.query(osmCountQuery, [amenityFilter]);
      const totalOSM = parseInt(osmCount.rows[0].total);

      if (totalOSM === 0) {
        throw new Error('Nenhum estabelecimento OSM encontrado para importar');
      }

      // 2. Verificar estabelecimentos já importados (baseado em osm_id)
      let existingQuery = `
        SELECT COUNT(*) as existing 
        FROM restaurants r
        WHERE r.description LIKE '%OSM ID:%'
      `;
      
      if (!overwrite) {
        existingQuery += ` AND r.description ~ 'OSM ID: [0-9]+'`;
      }

      const existingCount = await client.query(existingQuery);
      const alreadyImported = parseInt(existingCount.rows[0].existing);

      // 3. Definir estratégia de importação
      let importQuery;
      let importParams;

      if (overwrite && alreadyImported > 0) {
        // Deletar estabelecimentos OSM existentes antes de reimportar
        await client.query(`
          DELETE FROM restaurants 
          WHERE description LIKE '%OSM ID:%'
        `);
      }

      // 4. Importar estabelecimentos OSM
      importQuery = `
        INSERT INTO restaurants (name, description, address, location, created_by, created_at)
        SELECT 
          nome,
          CONCAT(
            'Estabelecimento importado do OpenStreetMap',
            E'\n\n',
            'Tipo: ', 
            CASE amenity 
              WHEN 'restaurant' THEN 'Restaurante'
              WHEN 'bar' THEN 'Bar'
              WHEN 'cafe' THEN 'Café'
              WHEN 'fast_food' THEN 'Lanchonete'
              ELSE amenity
            END,
            E'\n',
            'Geometria: ', geometry_type,
            E'\n',
            'OSM ID: ', osm_id
          ) as description,
          CONCAT(
            CASE 
              WHEN latitude BETWEEN -20.5286 AND -20.5486 AND longitude BETWEEN -47.3908 AND -47.4108 THEN 'Centro'
              WHEN latitude BETWEEN -20.5350 AND -20.5550 AND longitude BETWEEN -47.3850 AND -47.4050 THEN 'Jardim Consolação'
              WHEN latitude BETWEEN -20.5400 AND -20.5600 AND longitude BETWEEN -47.4000 AND -47.4200 THEN 'Jardim Lima'
              WHEN latitude BETWEEN -20.5200 AND -20.5400 AND longitude BETWEEN -47.3800 AND -47.4000 THEN 'Vila Raycos'
              WHEN latitude BETWEEN -20.5500 AND -20.5700 AND longitude BETWEEN -47.3900 AND -47.4100 THEN 'Jardim América'
              WHEN latitude BETWEEN -20.5100 AND -20.5300 AND longitude BETWEEN -47.4100 AND -47.4300 THEN 'Jardim Paulista'
              WHEN latitude BETWEEN -20.5250 AND -20.5450 AND longitude BETWEEN -47.4050 AND -47.4250 THEN 'Vila Santos'
              WHEN latitude BETWEEN -20.5450 AND -20.5650 AND longitude BETWEEN -47.3850 AND -47.4050 THEN 'Jardim Bela Vista'
              WHEN latitude BETWEEN -20.5150 AND -20.5350 AND longitude BETWEEN -47.3950 AND -47.4150 THEN 'Vila Nova'
              WHEN latitude BETWEEN -20.5300 AND -20.5500 AND longitude BETWEEN -47.4150 AND -47.4350 THEN 'Jardim Progresso'
              ELSE 'Centro'
            END,
            ', Franca-SP'
          ) as address,
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) as location,
          $2,
          NOW()
        FROM estabelecimentos_franca
        WHERE amenity = ANY($1)
        ${!overwrite ? `
          AND osm_id NOT IN (
            SELECT SUBSTRING(description FROM 'OSM ID: ([0-9]+)')::bigint 
            FROM restaurants 
            WHERE description LIKE '%OSM ID:%'
            AND SUBSTRING(description FROM 'OSM ID: ([0-9]+)') IS NOT NULL
          )
        ` : ''}
        ORDER BY amenity, nome
      `;

      importParams = [amenityFilter, adminUserId];
      const importResult = await client.query(importQuery, importParams);
      const importedCount = importResult.rowCount;

      // 5. Obter estatísticas finais
      const finalStatsQuery = `
        SELECT 
          COUNT(*) as total_restaurants,
          COUNT(CASE WHEN description LIKE '%OSM ID:%' THEN 1 END) as osm_restaurants,
          COUNT(CASE WHEN description NOT LIKE '%OSM ID:%' THEN 1 END) as manual_restaurants
        FROM restaurants
      `;
      const finalStats = await client.query(finalStatsQuery);

      // 6. Obter estatísticas por tipo OSM
      const osmTypeStatsQuery = `
        SELECT 
          SUBSTRING(description FROM 'Tipo: ([^\\n]+)') as tipo,
          COUNT(*) as quantidade
        FROM restaurants 
        WHERE description LIKE '%OSM ID:%'
        GROUP BY SUBSTRING(description FROM 'Tipo: ([^\\n]+)')
        ORDER BY quantidade DESC
      `;
      const osmTypeStats = await client.query(osmTypeStatsQuery);

      await client.query('COMMIT');

      return {
        success: true,
        import_summary: {
          total_osm_available: totalOSM,
          already_imported_before: alreadyImported,
          newly_imported: importedCount,
          overwrite_mode: overwrite
        },
        final_statistics: {
          total_restaurants: parseInt(finalStats.rows[0].total_restaurants),
          osm_restaurants: parseInt(finalStats.rows[0].osm_restaurants),
          manual_restaurants: parseInt(finalStats.rows[0].manual_restaurants)
        },
        osm_types: osmTypeStats.rows,
        message: `Importação concluída! ${importedCount} estabelecimentos OSM foram adicionados.`
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro na importação OSM:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verificar status da importação OSM
   */
  async getImportStatus() {
    try {
      const queries = await Promise.all([
        // Total de estabelecimentos OSM disponíveis
        pool.query('SELECT COUNT(*) as total FROM estabelecimentos_franca'),
        
        // Total de restaurantes na tabela principal
        pool.query('SELECT COUNT(*) as total FROM restaurants'),
        
        // Restaurantes importados do OSM
        pool.query(`
          SELECT COUNT(*) as total 
          FROM restaurants 
          WHERE description LIKE '%OSM ID:%'
        `),
        
        // Últimos estabelecimentos importados
        pool.query(`
          SELECT name, created_at, 
                 SUBSTRING(description FROM 'Tipo: ([^\\n]+)') as tipo,
                 SUBSTRING(description FROM 'OSM ID: ([0-9]+)') as osm_id
          FROM restaurants 
          WHERE description LIKE '%OSM ID:%'
          ORDER BY created_at DESC
          LIMIT 10
        `),

        // Estatísticas por tipo OSM importado
        pool.query(`
          SELECT 
            SUBSTRING(description FROM 'Tipo: ([^\\n]+)') as tipo,
            COUNT(*) as quantidade
          FROM restaurants 
          WHERE description LIKE '%OSM ID:%'
          GROUP BY SUBSTRING(description FROM 'Tipo: ([^\\n]+)')
          ORDER BY quantidade DESC
        `)
      ]);

      return {
        osm_available: parseInt(queries[0].rows[0].total),
        total_restaurants: parseInt(queries[1].rows[0].total),
        osm_imported: parseInt(queries[2].rows[0].total),
        manual_restaurants: parseInt(queries[1].rows[0].total) - parseInt(queries[2].rows[0].total),
        last_imported: queries[3].rows,
        import_stats_by_type: queries[4].rows,
        import_percentage: queries[0].rows[0].total > 0 ? 
          Math.round((parseInt(queries[2].rows[0].total) / parseInt(queries[0].rows[0].total)) * 100) : 0
      };

    } catch (error) {
      console.error('Erro ao obter status da importação:', error);
      throw new Error('Erro ao verificar status da importação OSM');
    }
  }

  /**
   * Sincronizar estabelecimentos OSM com restaurants
   * Atualiza dados se já existirem, importa novos se não existirem
   */
  async syncOSMToRestaurants(adminUserId = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Atualizar estabelecimentos já importados
      const updateQuery = `
        UPDATE restaurants 
        SET 
          name = osm.nome,
          description = CONCAT(
            'Estabelecimento importado do OpenStreetMap',
            E'\n\n',
            'Tipo: ', 
            CASE osm.amenity 
              WHEN 'restaurant' THEN 'Restaurante'
              WHEN 'bar' THEN 'Bar'
              WHEN 'cafe' THEN 'Café'
              WHEN 'fast_food' THEN 'Lanchonete'
              ELSE osm.amenity
            END,
            E'\n',
            'Geometria: ', osm.geometry_type,
            E'\n',
            'OSM ID: ', osm.osm_id,
            E'\n\n',
            'Última sincronização: ', NOW()
          ),
          address = CONCAT(
            'Franca-SP (', 
            ROUND(osm.latitude::numeric, 6), 
            ', ', 
            ROUND(osm.longitude::numeric, 6), 
            ')'
          ),
          location = ST_SetSRID(ST_MakePoint(osm.longitude, osm.latitude), 4326)
        FROM estabelecimentos_franca osm
        WHERE SUBSTRING(restaurants.description FROM 'OSM ID: ([0-9]+)')::bigint = osm.osm_id
        AND restaurants.description LIKE '%OSM ID:%'
      `;

      const updateResult = await client.query(updateQuery);
      const updatedCount = updateResult.rowCount;

      // Importar novos estabelecimentos
      const newImportResult = await this.importOSMToRestaurants({
        overwrite: false,
        adminUserId
      });

      await client.query('COMMIT');

      return {
        success: true,
        sync_summary: {
          updated_existing: updatedCount,
          newly_imported: newImportResult.import_summary.newly_imported,
          total_processed: updatedCount + newImportResult.import_summary.newly_imported
        },
        final_statistics: newImportResult.final_statistics,
        message: `Sincronização concluída! ${updatedCount} atualizados, ${newImportResult.import_summary.newly_imported} importados.`
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro na sincronização OSM:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remover estabelecimentos OSM da tabela restaurants
   */
  async removeOSMFromRestaurants() {
    try {
      // Contar antes da remoção
      const beforeCountResult = await pool.query(`
        SELECT COUNT(*) as total FROM restaurants WHERE description LIKE '%OSM ID:%'
      `);
      const beforeCount = parseInt(beforeCountResult.rows[0].total);

      if (beforeCount === 0) {
        return {
          success: true,
          removed_count: 0,
          message: 'Nenhum estabelecimento OSM encontrado para remover'
        };
      }

      // Remover estabelecimentos OSM
      const deleteResult = await pool.query(`
        DELETE FROM restaurants WHERE description LIKE '%OSM ID:%'
      `);
      const removedCount = deleteResult.rowCount;

      return {
        success: true,
        removed_count: removedCount,
        message: `${removedCount} estabelecimentos OSM foram removidos da tabela restaurants`
      };

    } catch (error) {
      console.error('Erro ao remover estabelecimentos OSM:', error);
      throw new Error('Erro ao remover estabelecimentos OSM da tabela restaurants');
    }
  }

  /**
   * Mapear estabelecimento OSM para formato de restaurant
   */
  mapOSMToRestaurant(osmData) {
    const typeMap = {
      'restaurant': 'Restaurante',
      'bar': 'Bar', 
      'cafe': 'Café',
      'fast_food': 'Lanchonete'
    };

    return {
      name: osmData.nome,
      description: `Estabelecimento importado do OpenStreetMap\n\nTipo: ${typeMap[osmData.amenity] || osmData.amenity}\nGeometria: ${osmData.geometry_type}\nOSM ID: ${osmData.osm_id}`,
      address: `Franca-SP (${osmData.latitude.toFixed(6)}, ${osmData.longitude.toFixed(6)})`,
      latitude: osmData.latitude,
      longitude: osmData.longitude,
      osm_id: osmData.osm_id,
      amenity: osmData.amenity,
      geometry_type: osmData.geometry_type
    };
  }

  /**
   * Gerar endereço amigável baseado nas coordenadas de Franca-SP
   */
  generateFriendlyAddress(latitude, longitude, amenity) {
    // Bairros conhecidos de Franca-SP com suas coordenadas aproximadas
    const bairros = [
      { name: 'Centro', lat: -20.5386, lng: -47.4008, radius: 0.01 },
      { name: 'Jardim Consolação', lat: -20.5450, lng: -47.3950, radius: 0.015 },
      { name: 'Jardim Lima', lat: -20.5500, lng: -47.4100, radius: 0.015 },
      { name: 'Vila Raycos', lat: -20.5300, lng: -47.3900, radius: 0.015 },
      { name: 'Jardim América', lat: -20.5600, lng: -47.4000, radius: 0.015 },
      { name: 'Jardim Paulista', lat: -20.5200, lng: -47.4200, radius: 0.015 },
      { name: 'Vila Santos', lat: -20.5350, lng: -47.4150, radius: 0.015 },
      { name: 'Jardim Bela Vista', lat: -20.5550, lng: -47.3950, radius: 0.015 },
      { name: 'Vila Nova', lat: -20.5250, lng: -47.4050, radius: 0.015 },
      { name: 'Jardim Progresso', lat: -20.5400, lng: -47.4250, radius: 0.015 }
    ];

    // Encontrar o bairro mais próximo
    let nearestBairro = 'Centro';
    let minDistance = Infinity;

    for (const bairro of bairros) {
      const distance = Math.sqrt(
        Math.pow(latitude - bairro.lat, 2) + 
        Math.pow(longitude - bairro.lng, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestBairro = bairro.name;
      }
    }

    // Gerar endereço baseado no tipo de estabelecimento
    const establishmentType = this.getEstablishmentTypeName(amenity);
    
    // Gerar número de rua aleatório mas realista
    const streetNumber = Math.floor(Math.random() * 900) + 100;
    
    // Rua baseada no bairro
    const streetNames = {
      'Centro': ['Rua XV de Novembro', 'Rua das Flores', 'Rua São João', 'Rua Major Fidélis'],
      'Jardim Consolação': ['Rua das Palmeiras', 'Av. Presidente Vargas', 'Rua das Acácias'],
      'Jardim Lima': ['Av. Brasil', 'Rua das Margaridas', 'Rua das Rosas'],
      'Vila Raycos': ['Rua São João', 'Rua das Violetas', 'Rua das Orquídeas'],
      'Jardim América': ['Av. São Paulo', 'Rua das Azaleias', 'Rua das Camélias'],
      'Jardim Paulista': ['Rua das Begônias', 'Av. Paulista', 'Rua das Dálias'],
      'Vila Santos': ['Rua das Crisântemos', 'Rua das Tulipas', 'Rua das Gardênias'],
      'Jardim Bela Vista': ['Rua das Hortênsias', 'Rua das Magnólias', 'Rua das Petúnias'],
      'Vila Nova': ['Rua das Primaveras', 'Rua das Margaridas', 'Rua das Rosas'],
      'Jardim Progresso': ['Rua do Progresso', 'Av. da Liberdade', 'Rua da Paz']
    };

    const streets = streetNames[nearestBairro] || ['Rua Principal'];
    const streetName = streets[Math.floor(Math.random() * streets.length)];

    return `${streetName}, ${streetNumber}, ${nearestBairro}, Franca-SP`;
  }

  /**
   * Obter nome amigável do tipo de estabelecimento
   */
  getEstablishmentTypeName(amenity) {
    const typeMapping = {
      'restaurant': 'Restaurante',
      'bar': 'Bar',
      'cafe': 'Café',
      'fast_food': 'Lanchonete',
      'bakery': 'Padaria',
      'pizzeria': 'Pizzaria',
      'churrascaria': 'Churrascaria'
    };
    
    return typeMapping[amenity] || amenity;
  }
}

module.exports = new OSMImportService();
