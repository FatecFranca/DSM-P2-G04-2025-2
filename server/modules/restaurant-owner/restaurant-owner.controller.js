const RestaurantOwnerService = require('./restaurant-owner.service');

class RestaurantOwnerController {

  /**
   * Obter restaurantes do proprietário
   */
  async getOwnerRestaurants(req, res) {
    try {
      const ownerId = req.user.id;
      const restaurants = await RestaurantOwnerService.getOwnerRestaurants(ownerId);
      
      res.json({
        success: true,
        restaurants,
        total: restaurants.length
      });
    } catch (error) {
      console.error('Erro ao buscar restaurantes do proprietário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Atualizar informações do restaurante
   */
  async updateRestaurantInfo(req, res) {
    try {
      const ownerId = req.user.id;
      const { restaurantId } = req.params;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'Nenhum dado fornecido para atualização'
        });
      }

      const result = await RestaurantOwnerService.updateRestaurantInfo(
        restaurantId, 
        ownerId, 
        updateData
      );
      
      res.json({
        success: true,
        message: result.message,
        restaurant: result.restaurant
      });
    } catch (error) {
      console.error('Erro ao atualizar restaurante:', error);
      
      if (error.message.includes('não pertence ao usuário')) {
        return res.status(403).json({
          error: 'Acesso negado. Este restaurante não pertence a você.'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Atualizar logo do restaurante
   */
  async updateRestaurantLogo(req, res) {
    try {
      const ownerId = req.user.id;
      const { restaurantId } = req.params;
      const { logoUrl } = req.body;

      if (!logoUrl) {
        return res.status(400).json({
          error: 'URL da logo deve ser fornecida'
        });
      }

      const result = await RestaurantOwnerService.updateRestaurantLogo(
        restaurantId, 
        ownerId, 
        logoUrl
      );
      
      res.json({
        success: true,
        message: result.message,
        restaurant: result.restaurant
      });
    } catch (error) {
      console.error('Erro ao atualizar logo:', error);
      
      if (error.message.includes('não pertence ao usuário')) {
        return res.status(403).json({
          error: 'Acesso negado. Este restaurante não pertence a você.'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Atualizar localização do restaurante
   */
  async updateRestaurantLocation(req, res) {
    try {
      const ownerId = req.user.id;
      const { restaurantId } = req.params;
      const { latitude, longitude } = req.body;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          error: 'Latitude e longitude devem ser fornecidas'
        });
      }

      const result = await RestaurantOwnerService.updateRestaurantLocation(
        restaurantId, 
        ownerId, 
        latitude, 
        longitude
      );
      
      res.json({
        success: true,
        message: result.message,
        restaurant: result.restaurant
      });
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      
      if (error.message.includes('não pertence ao usuário')) {
        return res.status(403).json({
          error: 'Acesso negado. Este restaurante não pertence a você.'
        });
      }
      
      if (error.message.includes('Coordenadas inválidas')) {
        return res.status(400).json({
          error: 'Coordenadas fornecidas são inválidas'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Obter estatísticas do proprietário
   */
  async getOwnerStats(req, res) {
    try {
      const ownerId = req.user.id;
      const stats = await RestaurantOwnerService.getOwnerStats(ownerId);
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do proprietário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
}

module.exports = new RestaurantOwnerController();
