const osmEstabelecimentosService = require('./osm-estabelecimentos.service');

/**
 * Controller para estabelecimentos do OpenStreetMap
 */
class OSMEstabelecimentosController {

  /**
   * Listar estabelecimentos OSM com paginação e filtros
   * GET /api/osm-estabelecimentos
   */
  async getAllOSMEstabelecimentos(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        amenity,
        latitude,
        longitude,
        raio
      } = req.query;

      // Validar parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // máximo 100 por página

      const options = {
        page: pageNum,
        limit: limitNum,
        search,
        amenity,
        latitude,
        longitude,
        raio
      };

      const [estabelecimentos, total] = await Promise.all([
        osmEstabelecimentosService.getAllOSMEstabelecimentos(options),
        osmEstabelecimentosService.countOSMEstabelecimentos(options)
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: estabelecimentos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters: {
          search,
          amenity,
          latitude,
          longitude,
          raio
        }
      });

    } catch (error) {
      console.error('Erro ao listar estabelecimentos OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Buscar estabelecimentos OSM próximos
   * GET /api/osm-estabelecimentos/nearby
   */
  async getNearbyOSMEstabelecimentos(req, res) {
    try {
      const { latitude, longitude, raio = 2000, limit = 50 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude e longitude são obrigatórias'
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radius = parseInt(raio);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Coordenadas inválidas'
        });
      }

      const estabelecimentos = await osmEstabelecimentosService.findNearbyOSM(
        lat, lng, radius, limitNum
      );

      res.json({
        success: true,
        data: estabelecimentos,
        query: {
          latitude: lat,
          longitude: lng,
          raio: radius,
          limit: limitNum
        },
        count: estabelecimentos.length
      });

    } catch (error) {
      console.error('Erro ao buscar estabelecimentos próximos OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Buscar estabelecimentos OSM por nome
   * GET /api/osm-estabelecimentos/search
   */
  async searchOSMEstabelecimentos(req, res) {
    try {
      const { nome, limit = 20 } = req.query;

      if (!nome || nome.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Nome deve ter pelo menos 2 caracteres'
        });
      }

      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const estabelecimentos = await osmEstabelecimentosService.searchByName(nome.trim(), limitNum);

      res.json({
        success: true,
        data: estabelecimentos,
        query: {
          nome: nome.trim(),
          limit: limitNum
        },
        count: estabelecimentos.length
      });

    } catch (error) {
      console.error('Erro ao buscar estabelecimentos por nome OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Buscar estabelecimentos OSM por tipo (amenity)
   * GET /api/osm-estabelecimentos/amenity/:amenity
   */
  async getOSMEstabelecimentosByAmenity(req, res) {
    try {
      const { amenity } = req.params;
      const { limit = 50 } = req.query;

      const validAmenities = ['restaurant', 'bar', 'cafe', 'fast_food'];
      if (!validAmenities.includes(amenity)) {
        return res.status(400).json({
          success: false,
          message: `Tipo inválido. Tipos válidos: ${validAmenities.join(', ')}`
        });
      }

      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const estabelecimentos = await osmEstabelecimentosService.findByAmenity(amenity, limitNum);

      res.json({
        success: true,
        data: estabelecimentos,
        query: {
          amenity,
          limit: limitNum
        },
        count: estabelecimentos.length
      });

    } catch (error) {
      console.error('Erro ao buscar estabelecimentos por amenity OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Buscar estabelecimento OSM por OSM ID
   * GET /api/osm-estabelecimentos/:osmId
   */
  async getOSMEstabelecimentoById(req, res) {
    try {
      const { osmId } = req.params;

      if (!osmId) {
        return res.status(400).json({
          success: false,
          message: 'OSM ID é obrigatório'
        });
      }

      const estabelecimento = await osmEstabelecimentosService.findByOSMId(osmId);

      if (!estabelecimento) {
        return res.status(404).json({
          success: false,
          message: 'Estabelecimento não encontrado'
        });
      }

      res.json({
        success: true,
        data: estabelecimento
      });

    } catch (error) {
      console.error('Erro ao buscar estabelecimento por OSM ID:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Obter estatísticas dos estabelecimentos OSM
   * GET /api/osm-estabelecimentos/stats
   */
  async getOSMStatistics(req, res) {
    try {
      const stats = await osmEstabelecimentosService.getOSMStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erro ao obter estatísticas OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Verificar status da view OSM
   * GET /api/osm-estabelecimentos/status
   */
  async checkOSMStatus(req, res) {
    try {
      const status = await osmEstabelecimentosService.checkOSMViewStatus();

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Erro ao verificar status OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Obter tipos de amenity disponíveis
   * GET /api/osm-estabelecimentos/amenities
   */
  async getAvailableAmenities(req, res) {
    try {
      const amenities = await osmEstabelecimentosService.getAvailableAmenities();

      res.json({
        success: true,
        data: amenities
      });

    } catch (error) {
      console.error('Erro ao obter amenities disponíveis:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Busca avançada com múltiplos critérios
   * POST /api/osm-estabelecimentos/advanced-search
   */
  async advancedOSMSearch(req, res) {
    try {
      const {
        nome,
        amenity,
        latitude,
        longitude,
        raio,
        geometry_type,
        limit = 50
      } = req.body;

      // Validar coordenadas se fornecidas
      if ((latitude && !longitude) || (!latitude && longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Latitude e longitude devem ser fornecidas juntas'
        });
      }

      if (latitude && longitude) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return res.status(400).json({
            success: false,
            message: 'Coordenadas inválidas'
          });
        }
      }

      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      const criteria = {
        nome,
        amenity,
        lat: latitude,
        lng: longitude,
        raio,
        geometry_type,
        limit: limitNum
      };

      const estabelecimentos = await osmEstabelecimentosService.advancedOSMSearch(criteria);

      res.json({
        success: true,
        data: estabelecimentos,
        criteria,
        count: estabelecimentos.length
      });

    } catch (error) {
      console.error('Erro na busca avançada OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

module.exports = new OSMEstabelecimentosController();


