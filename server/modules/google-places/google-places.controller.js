const googlePlacesService = require('./google-places.service');

class GooglePlacesController {
  // Rota raiz - informações da API Google Places
  async getApiInfo(req, res) {
    try {
      const stats = await googlePlacesService.getStatistics();
      
      res.json({
        message: 'API de Estabelecimentos Google Places - Franca-SP',
        version: '1.0.0',
        fonte: 'Google Places API',
        endpoints: {
          'GET /': 'Informações da API',
          'GET /estabelecimentos': 'Listar todos (com paginação)',
          'GET /estabelecimentos/:place_id': 'Buscar por Place ID',
          'GET /estabelecimentos/nome/:nome': 'Buscar por nome',
          'GET /estabelecimentos/tipo/:tipo': 'Buscar por tipo',
          'GET /estabelecimentos/proximos': 'Buscar próximos (lat, lon, raio)',
          'GET /estabelecimentos/rating/:min': 'Buscar por rating mínimo',
          'GET /estabelecimentos/preco/:level': 'Buscar por faixa de preço',
          'GET /estabelecimentos/alteracoes': 'Últimas alterações',
          'GET /estabelecimentos/estatisticas': 'Estatísticas gerais',
          'GET /estabelecimentos/busca': 'Busca avançada',
          'GET /estabelecimentos/unificados': 'Busca unificada (manual + Google)',
          'GET /estabelecimentos/comparar': 'Comparar fontes de dados'
        },
        estatisticas: stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar todos os estabelecimentos Google Places com paginação e filtros
  async getAllGooglePlaces(req, res) {
    try {
      const { page = 1, limit = 20, search, tipo, cidade, incluir_fechados } = req.query;
      
      // Validar parâmetros
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({ 
          error: 'Parâmetros inválidos',
          message: 'page deve ser >= 1, limit entre 1 e 100'
        });
      }

      const estabelecimentos = await googlePlacesService.getAllGooglePlaces({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        tipo,
        cidade,
        incluir_fechados: incluir_fechados === 'true'
      });

      res.json({
        estabelecimentos,
        fonte: 'Google Places API',
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_results: estabelecimentos.length,
          has_more: estabelecimentos.length === parseInt(limit)
        },
        filters: { search, tipo, cidade, incluir_fechados }
      });
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos Google Places:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar estabelecimento por Place ID
  async getEstabelecimentoByPlaceId(req, res) {
    try {
      const { place_id } = req.params;
      
      if (!place_id) {
        return res.status(400).json({ error: 'Place ID é obrigatório' });
      }

      const estabelecimento = await googlePlacesService.findByPlaceId(place_id);
      
      if (!estabelecimento) {
        return res.status(404).json({ error: 'Estabelecimento não encontrado' });
      }

      res.json({
        estabelecimento,
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro ao buscar estabelecimento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar por nome
  async getEstabelecimentosByName(req, res) {
    try {
      const { nome } = req.params;
      
      if (!nome || nome.trim().length < 2) {
        return res.status(400).json({ 
          error: 'Nome deve ter pelo menos 2 caracteres' 
        });
      }

      const estabelecimentos = await googlePlacesService.findByName(nome.trim());
      
      res.json({
        query: nome,
        total_results: estabelecimentos.length,
        estabelecimentos,
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro ao buscar por nome:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar por tipo
  async getEstabelecimentosByTipo(req, res) {
    try {
      const { tipo } = req.params;
      
      if (!tipo) {
        return res.status(400).json({ error: 'Tipo é obrigatório' });
      }

      const estabelecimentos = await googlePlacesService.findByTipo(tipo);
      
      res.json({
        tipo,
        total_results: estabelecimentos.length,
        estabelecimentos,
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro ao buscar por tipo:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar estabelecimentos próximos
  async getNearbyEstabelecimentos(req, res) {
    try {
      const { lat, lon, raio = 2000 } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({ 
          error: 'Parâmetros lat e lon são obrigatórios',
          example: '/estabelecimentos/proximos?lat=-20.5386&lon=-47.4008&raio=1000'
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const raioMetros = parseInt(raio);

      // Validar coordenadas
      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
          error: 'Coordenadas inválidas',
          message: 'lat deve estar entre -90 e 90, lon entre -180 e 180'
        });
      }

      if (isNaN(raioMetros) || raioMetros < 100 || raioMetros > 50000) {
        return res.status(400).json({ 
          error: 'Raio inválido',
          message: 'raio deve estar entre 100 e 50000 metros'
        });
      }

      const estabelecimentos = await googlePlacesService.findNearby(latitude, longitude, raioMetros);
      
      res.json({
        centro: { latitude, longitude },
        raio_metros: raioMetros,
        total_results: estabelecimentos.length,
        estabelecimentos: estabelecimentos.map(est => ({
          ...est,
          distancia_m: Math.round(parseFloat(est.distancia_metros))
        })),
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos próximos:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar por rating mínimo
  async getEstabelecimentosByRating(req, res) {
    try {
      const { min } = req.params;
      const { limit = 50 } = req.query;
      
      const minRating = parseFloat(min);
      if (isNaN(minRating) || minRating < 0 || minRating > 5) {
        return res.status(400).json({ 
          error: 'Rating mínimo deve estar entre 0 e 5' 
        });
      }

      const estabelecimentos = await googlePlacesService.findByMinRating(minRating, parseInt(limit));
      
      res.json({
        rating_minimo: minRating,
        total_results: estabelecimentos.length,
        estabelecimentos,
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro ao buscar por rating:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar por faixa de preço
  async getEstabelecimentosByPriceLevel(req, res) {
    try {
      const { level } = req.params;
      
      const priceLevel = parseInt(level);
      if (isNaN(priceLevel) || priceLevel < 0 || priceLevel > 4) {
        return res.status(400).json({ 
          error: 'Nível de preço deve estar entre 0 e 4',
          info: '0 = Grátis, 1 = Barato, 2 = Moderado, 3 = Caro, 4 = Muito Caro'
        });
      }

      const estabelecimentos = await googlePlacesService.findByPriceLevel(priceLevel);
      
      const priceLabels = {
        0: 'Grátis',
        1: 'Barato',
        2: 'Moderado', 
        3: 'Caro',
        4: 'Muito Caro'
      };
      
      res.json({
        price_level: priceLevel,
        price_label: priceLabels[priceLevel],
        total_results: estabelecimentos.length,
        estabelecimentos,
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro ao buscar por preço:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar últimas alterações
  async getRecentUpdates(req, res) {
    try {
      const { limit = 20 } = req.query;
      const limitNum = parseInt(limit);

      if (limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ 
          error: 'Limit deve estar entre 1 e 100' 
        });
      }

      const estabelecimentos = await googlePlacesService.getRecentUpdates(limitNum);
      
      res.json({
        total_results: estabelecimentos.length,
        estabelecimentos,
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro ao buscar alterações recentes:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Obter estatísticas
  async getStatistics(req, res) {
    try {
      const stats = await googlePlacesService.getStatistics();
      res.json({
        ...stats,
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Busca avançada
  async advancedSearch(req, res) {
    try {
      const { 
        nome, tipo, cidade, lat, lng, raio, 
        min_rating, max_rating, price_level, limit 
      } = req.query;
      
      if (!nome && !tipo && !cidade && !lat && !lng && !min_rating && !max_rating && !price_level) {
        return res.status(400).json({ 
          error: 'Pelo menos um critério de busca é obrigatório',
          criterios: ['nome', 'tipo', 'cidade', 'lat+lng', 'min_rating', 'max_rating', 'price_level']
        });
      }

      const estabelecimentos = await googlePlacesService.advancedSearch({
        nome,
        tipo,
        cidade,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        raio: raio ? parseInt(raio) : null,
        min_rating: min_rating ? parseFloat(min_rating) : null,
        max_rating: max_rating ? parseFloat(max_rating) : null,
        price_level: price_level ? parseInt(price_level) : null,
        limit: limit ? parseInt(limit) : 50
      });

      res.json({
        criterios: { nome, tipo, cidade, lat, lng, raio, min_rating, max_rating, price_level },
        total_results: estabelecimentos.length,
        estabelecimentos,
        fonte: 'Google Places API'
      });
    } catch (error) {
      console.error('Erro na busca avançada:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Busca unificada (dados manuais + Google Places)
  async getUnifiedEstablishments(req, res) {
    try {
      const { page = 1, limit = 20, search, tipo, lat, lng, raio } = req.query;
      
      const estabelecimentos = await googlePlacesService.getUnifiedEstablishments({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        tipo,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        raio: raio ? parseInt(raio) : null
      });

      res.json({
        estabelecimentos,
        fonte: 'Dados Unificados (Manual + Google Places)',
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_results: estabelecimentos.length,
          has_more: estabelecimentos.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Erro na busca unificada:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Comparar fontes de dados
  async compareDataSources(req, res) {
    try {
      const comparacao = await googlePlacesService.compareDataSources();
      
      res.json({
        message: 'Comparação entre fontes de dados',
        comparacao,
        observacoes: {
          manual: 'Dados inseridos manualmente no sistema',
          google: 'Dados importados do Google Places API'
        }
      });
    } catch (error) {
      console.error('Erro ao comparar fontes:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }
}

module.exports = new GooglePlacesController();

