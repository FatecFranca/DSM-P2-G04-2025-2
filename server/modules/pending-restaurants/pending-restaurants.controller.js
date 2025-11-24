const pendingRestaurantsService = require('./pending-restaurants.service');

class PendingRestaurantsController {
  // Buscar restaurantes pendentes (apenas para admins)
  async getPendingRestaurants(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const pendingRestaurants = await pendingRestaurantsService.getPendingRestaurants(
        parseInt(page),
        parseInt(limit)
      );

      const totalCount = await pendingRestaurantsService.getPendingRestaurantsCount();

      res.json({
        success: true,
        pendingRestaurants,
        pagination: {
          current: parseInt(page),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('Erro ao buscar restaurantes pendentes:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Buscar restaurante pendente por ID
  async getPendingRestaurantById(req, res) {
    try {
      const { id } = req.params;
      
      const pendingRestaurant = await pendingRestaurantsService.getPendingRestaurantById(id);
      
      if (!pendingRestaurant) {
        return res.status(404).json({ 
          success: false,
          error: 'Restaurante pendente não encontrado' 
        });
      }

      res.json({
        success: true,
        pendingRestaurant
      });

    } catch (error) {
      console.error('Erro ao buscar restaurante pendente:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Aprovar restaurante pendente
  async approvePendingRestaurant(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes = '' } = req.body;
      const adminId = req.user.id;

      const result = await pendingRestaurantsService.approvePendingRestaurant(
        id,
        adminId,
        adminNotes
      );

      res.json({
        success: true,
        message: result.message,
        restaurant_id: result.restaurant_id
      });

    } catch (error) {
      console.error('Erro ao aprovar restaurante:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  }

  // Rejeitar restaurante pendente
  async rejectPendingRestaurant(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes = '' } = req.body;
      const adminId = req.user.id;

      const result = await pendingRestaurantsService.rejectPendingRestaurant(
        id,
        adminId,
        adminNotes
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Erro ao rejeitar restaurante:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Erro interno do servidor' 
      });
    }
  }

  // Contar restaurantes pendentes
  async getPendingRestaurantsCount(req, res) {
    try {
      const count = await pendingRestaurantsService.getPendingRestaurantsCount();
      
      res.json({
        success: true,
        count
      });

    } catch (error) {
      console.error('Erro ao contar restaurantes pendentes:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
      });
    }
  }

  // Buscar restaurantes pendentes do usuário
  async getUserPendingRestaurants(req, res) {
    try {
      const userId = req.user.id;
      
      const pendingRestaurants = await pendingRestaurantsService.getPendingRestaurantsByUser(userId);
      
      res.json({
        success: true,
        pendingRestaurants
      });

    } catch (error) {
      console.error('Erro ao buscar restaurantes pendentes do usuário:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
      });
    }
  }
}

module.exports = new PendingRestaurantsController();
