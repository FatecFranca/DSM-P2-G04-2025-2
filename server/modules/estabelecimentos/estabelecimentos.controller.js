const estabelecimentosService = require('./estabelecimentos.service');

class EstabelecimentosController {
  // Rota raiz - informações da API
  async getApiInfo(req, res) {
    try {
      const stats = await estabelecimentosService.getStatistics();
      
      res.json({
        message: 'API de Estabelecimentos Gastronômicos - Franca-SP',
        version: '1.0.0',
        endpoints: {
          'GET /': 'Informações da API',
          'GET /estabelecimentos': 'Listar todos (com paginação)',
          'GET /estabelecimentos/:id': 'Buscar por ID',
          'GET /estabelecimentos/nome/:nome': 'Buscar por nome',
          'GET /estabelecimentos/tipo/:tipo': 'Buscar por tipo',
          'GET /estabelecimentos/proximos': 'Buscar próximos (lat, lon, raio)',
          'GET /estabelecimentos/alteracoes': 'Últimas alterações',
          'GET /estabelecimentos/estatisticas': 'Estatísticas gerais',
          'POST /estabelecimentos': 'Criar novo estabelecimento',
          'PUT /estabelecimentos/:id': 'Atualizar estabelecimento',
          'DELETE /estabelecimentos/:id': 'Excluir estabelecimento'
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

  // Buscar todos os estabelecimentos com paginação e filtros
  async getAllEstabelecimentos(req, res) {
    try {
      const { page = 1, limit = 20, search, tipo, cidade } = req.query;
      
      // Validar parâmetros
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({ 
          error: 'Parâmetros inválidos',
          message: 'page deve ser >= 1, limit entre 1 e 100'
        });
      }

      const estabelecimentos = await estabelecimentosService.getAllEstabelecimentos({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        tipo,
        cidade
      });

      // Buscar total para paginação (apenas se necessário)
      const filters = { search, tipo, cidade };
      const hasFilters = Object.values(filters).some(v => v);
      
      res.json({
        estabelecimentos,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_results: estabelecimentos.length,
          has_more: estabelecimentos.length === parseInt(limit)
        },
        filters: hasFilters ? filters : null
      });
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Buscar estabelecimento por ID
  async getEstabelecimentoById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      const estabelecimento = await estabelecimentosService.findById(id);
      
      if (!estabelecimento) {
        return res.status(404).json({ error: 'Estabelecimento não encontrado' });
      }

      res.json(estabelecimento);
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

      const estabelecimentos = await estabelecimentosService.findByName(nome.trim());
      
      res.json({
        query: nome,
        total_results: estabelecimentos.length,
        estabelecimentos
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

      const estabelecimentos = await estabelecimentosService.findByTipo(tipo);
      
      res.json({
        tipo,
        total_results: estabelecimentos.length,
        estabelecimentos
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

      const estabelecimentos = await estabelecimentosService.findNearby(latitude, longitude, raioMetros);
      
      res.json({
        centro: { latitude, longitude },
        raio_metros: raioMetros,
        total_results: estabelecimentos.length,
        estabelecimentos: estabelecimentos.map(est => ({
          ...est,
          distancia_m: Math.round(parseFloat(est.distancia_m))
        }))
      });
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos próximos:', error);
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

      const estabelecimentos = await estabelecimentosService.getRecentUpdates(limitNum);
      
      res.json({
        total_results: estabelecimentos.length,
        estabelecimentos
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
      const stats = await estabelecimentosService.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Criar novo estabelecimento
  async createEstabelecimento(req, res) {
    try {
      const { osm_id, nome, tipo, endereco, telefone, cidade, latitude, longitude } = req.body;

      // Validações básicas
      if (!nome || !tipo) {
        return res.status(400).json({ 
          error: 'Nome e tipo são obrigatórios' 
        });
      }

      if (latitude && longitude) {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return res.status(400).json({ 
            error: 'Coordenadas inválidas' 
          });
        }
      }

      const novoEstabelecimento = await estabelecimentosService.createEstabelecimento({
        osm_id,
        nome: nome.trim(),
        tipo: tipo.trim(),
        endereco: endereco?.trim(),
        telefone: telefone?.trim(),
        cidade: cidade?.trim() || 'Franca',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      });

      res.status(201).json({
        message: 'Estabelecimento criado com sucesso',
        estabelecimento: novoEstabelecimento
      });
    } catch (error) {
      console.error('Erro ao criar estabelecimento:', error);
      
      if (error.code === '23505') { // Violação de constraint unique
        return res.status(409).json({ 
          error: 'Estabelecimento já existe',
          message: 'OSM ID já está cadastrado'
        });
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Atualizar estabelecimento
  async updateEstabelecimento(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      // Validar coordenadas se fornecidas
      if (updateData.latitude && updateData.longitude) {
        const lat = parseFloat(updateData.latitude);
        const lng = parseFloat(updateData.longitude);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return res.status(400).json({ 
            error: 'Coordenadas inválidas' 
          });
        }
      }

      const estabelecimentoAtualizado = await estabelecimentosService.updateEstabelecimento(id, updateData);
      
      if (!estabelecimentoAtualizado) {
        return res.status(404).json({ error: 'Estabelecimento não encontrado' });
      }

      res.json({
        message: 'Estabelecimento atualizado com sucesso',
        estabelecimento: estabelecimentoAtualizado
      });
    } catch (error) {
      console.error('Erro ao atualizar estabelecimento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Excluir estabelecimento
  async deleteEstabelecimento(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      const estabelecimentoExcluido = await estabelecimentosService.deleteEstabelecimento(id);
      
      if (!estabelecimentoExcluido) {
        return res.status(404).json({ error: 'Estabelecimento não encontrado' });
      }

      res.json({
        message: 'Estabelecimento excluído com sucesso',
        estabelecimento: estabelecimentoExcluido
      });
    } catch (error) {
      console.error('Erro ao excluir estabelecimento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }

  // Busca avançada
  async advancedSearch(req, res) {
    try {
      const { nome, tipo, cidade, lat, lng, raio, limit } = req.query;
      
      if (!nome && !tipo && !cidade && !lat && !lng) {
        return res.status(400).json({ 
          error: 'Pelo menos um critério de busca é obrigatório',
          criterios: ['nome', 'tipo', 'cidade', 'lat+lng']
        });
      }

      const estabelecimentos = await estabelecimentosService.advancedSearch({
        nome,
        tipo,
        cidade,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        raio: raio ? parseInt(raio) : null,
        limit: limit ? parseInt(limit) : 50
      });

      res.json({
        criterios: { nome, tipo, cidade, lat, lng, raio },
        total_results: estabelecimentos.length,
        estabelecimentos
      });
    } catch (error) {
      console.error('Erro na busca avançada:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  }
}

module.exports = new EstabelecimentosController();

