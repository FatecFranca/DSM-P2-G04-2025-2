const restaurantsService = require('./restaurants.service');

class RestaurantsController {
  // Criar novo restaurante
  async createRestaurant(req, res) {
    try {
      const restaurantData = req.body;

      // Validações básicas
      if (!restaurantData.name || restaurantData.name.trim().length < 2) {
        return res.status(400).json({ error: 'Nome do restaurante deve ter pelo menos 2 caracteres' });
      }

      const newRestaurant = await restaurantsService.createRestaurant(restaurantData);

      res.status(201).json({
        message: 'Restaurante criado com sucesso!',
        restaurant: newRestaurant
      });

    } catch (error) {
      console.error('Erro ao criar restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar restaurante por ID
  async getRestaurant(req, res) {
    try {
      console.log('🚀 getRestaurant INICIADO');
      const { id } = req.params;
      const { includePhotos = 'true' } = req.query;

      console.log('🔍 getRestaurant chamado para ID:', id);
      console.log('🔍 includePhotos:', includePhotos);

      let restaurant;
      if (includePhotos === 'true') {
        console.log('🔍 Chamando findRestaurantByIdWithPhotos...');
        restaurant = await restaurantsService.findRestaurantByIdWithPhotos(id);
      } else {
        console.log('🔍 Chamando findRestaurantById...');
        restaurant = await restaurantsService.findRestaurantById(id);
      }

      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurante não encontrado' });
      }

      // Normalizar estrutura de dados para consistência com lista de restaurantes
      if (restaurant.main_photo && restaurant.main_photo.photo_url) {
        restaurant.main_photo_url = restaurant.main_photo.photo_url;
      }

      res.json({ restaurant });

    } catch (error) {
      console.error('Erro ao buscar restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar todos os restaurantes
  async getAllRestaurants(req, res) {
    try {
      const { limit = 20, page = 1, sort_by } = req.query;
      
      const limitNum = parseInt(limit);
      const pageNum = parseInt(page);
      const offset = (pageNum - 1) * limitNum;
      
      const filters = {};
      if (sort_by) filters.sort_by = sort_by;

      const [restaurants, total] = await Promise.all([
        restaurantsService.getAllRestaurants(
          limitNum, 
          offset, 
          filters
        ),
        restaurantsService.getTotalRestaurants(filters)
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.json({ 
        restaurants, 
        total,
        pagination: {
          current: pageNum,
          total: total,
          pages: totalPages,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });

    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar restaurantes próximos
  async getNearbyRestaurants(req, res) {
    try {
      const { latitude, longitude, radius = 5000, limit = 20 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ 
          error: 'Latitude e longitude são obrigatórias para busca por proximidade' 
        });
      }

      const restaurants = await restaurantsService.getNearbyRestaurants(
        parseFloat(latitude),
        parseFloat(longitude),
        parseInt(radius),
        parseInt(limit)
      );

      res.json({ restaurants });

    } catch (error) {
      console.error('Erro ao buscar restaurantes próximos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar restaurantes por termo
  async searchRestaurants(req, res) {
    try {
      const { q, limit = 20, offset = 0 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({ 
          error: 'Termo de busca deve ter pelo menos 2 caracteres' 
        });
      }

      const restaurants = await restaurantsService.searchRestaurants(
        q.trim(), 
        parseInt(limit), 
        parseInt(offset)
      );

      res.json({ restaurants });

    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar restaurante
  async updateRestaurant(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validações básicas
      if (updateData.name && updateData.name.trim().length < 2) {
        return res.status(400).json({ error: 'Nome do restaurante deve ter pelo menos 2 caracteres' });
      }

      const updatedRestaurant = await restaurantsService.updateRestaurant(id, updateData);
      if (!updatedRestaurant) {
        return res.status(404).json({ error: 'Restaurante não encontrado' });
      }

      res.json({
        message: 'Restaurante atualizado com sucesso!',
        restaurant: updatedRestaurant
      });

    } catch (error) {
      console.error('Erro ao atualizar restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Deletar restaurante
  async deleteRestaurant(req, res) {
    try {
      const { id } = req.params;

      const deletedRestaurant = await restaurantsService.deleteRestaurant(id);
      if (!deletedRestaurant) {
        return res.status(404).json({ error: 'Restaurante não encontrado' });
      }

      res.json({ message: 'Restaurante deletado com sucesso!' });

    } catch (error) {
      console.error('Erro ao deletar restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar tipos de culinária
  async getCuisineTypes(req, res) {
    try {
      const cuisineTypes = await restaurantsService.getCuisineTypes();

      res.json({ cuisineTypes });

    } catch (error) {
      console.error('Erro ao buscar tipos de culinária:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar faixas de preço
  async getPriceRanges(req, res) {
    try {
      const priceRanges = await restaurantsService.getPriceRanges();

      res.json({ priceRanges });

    } catch (error) {
      console.error('Erro ao buscar faixas de preço:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar favoritos do usuário
  async getUserFavorites(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      const favorites = await restaurantsService.getUserFavorites(
        userId, 
        parseInt(limit), 
        parseInt(offset)
      );

      res.json({ favorites });

    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Adicionar aos favoritos
  async addToFavorites(req, res) {
    try {
      const userId = req.user.id;
      const { restaurantId } = req.body;

      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }

      // Verificar se restaurante existe
      const restaurant = await restaurantsService.findRestaurantById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurante não encontrado' });
      }

      // Verificar se já está nos favoritos
      const isFavorite = await restaurantsService.isUserFavorite(userId, restaurantId);
      if (isFavorite) {
        return res.status(400).json({ error: 'Restaurante já está nos favoritos' });
      }

      await restaurantsService.addToFavorites(userId, restaurantId);

      res.json({ message: 'Restaurante adicionado aos favoritos!' });

    } catch (error) {
      console.error('Erro ao adicionar aos favoritos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Verificar se restaurante é favorito
  async checkIfFavorite(req, res) {
    try {
      const userId = req.user.id;
      const { id: restaurantId } = req.params;

      const isFavorite = await restaurantsService.isUserFavorite(userId, restaurantId);

      res.json({ isFavorite });

    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Remover dos favoritos
  async removeFromFavorites(req, res) {
    try {
      const userId = req.user.id;
      const { restaurantId } = req.params;

      // Verificar se está nos favoritos
      const isFavorite = await restaurantsService.isUserFavorite(userId, restaurantId);
      if (!isFavorite) {
        return res.status(400).json({ error: 'Restaurante não está nos favoritos' });
      }

      await restaurantsService.removeFromFavorites(userId, restaurantId);

      res.json({ message: 'Restaurante removido dos favoritos!' });

    } catch (error) {
      console.error('Erro ao remover dos favoritos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = new RestaurantsController();
