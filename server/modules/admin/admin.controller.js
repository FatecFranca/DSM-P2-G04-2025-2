const AdminService = require('./admin.service');

class AdminController {

  /**
   * Obter estatísticas do sistema
   */
  async getSystemStats(req, res) {
    try {
      const stats = await AdminService.getSystemStats();
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Obter todos os usuários
   */
  async getAllUsers(req, res) {
    try {
      const users = await AdminService.getAllUsers();
      res.json({
        success: true,
        users,
        total: users.length
      });
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Atualizar role de um usuário
   */
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { newRole } = req.body;

      if (!newRole) {
        return res.status(400).json({
          error: 'Nova role deve ser fornecida'
        });
      }

      const updatedUser = await AdminService.updateUserRole(userId, newRole);
      
      res.json({
        success: true,
        message: `Role do usuário "${updatedUser.username}" atualizada para "${newRole}"`,
        user: updatedUser
      });
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Obter todos os restaurantes
   */
  async getAllRestaurants(req, res) {
    try {
      const restaurants = await AdminService.getAllRestaurants();
      res.json({
        success: true,
        restaurants,
        total: restaurants.length
      });
    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Definir dono de um restaurante
   */
  async setRestaurantOwner(req, res) {
    try {
      const { restaurantId } = req.params;
      const { ownerId } = req.body;

      if (!ownerId) {
        return res.status(400).json({
          error: 'ID do dono deve ser fornecido'
        });
      }

      const result = await AdminService.setRestaurantOwner(restaurantId, ownerId);
      
      res.json({
        success: true,
        message: result.message,
        restaurant: result.restaurant,
        new_owner: result.new_owner
      });
    } catch (error) {
      console.error('Erro ao definir dono:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Remover dono de um restaurante
   */
  async removeRestaurantOwner(req, res) {
    try {
      const { restaurantId } = req.params;
      
      const result = await AdminService.removeRestaurantOwner(restaurantId);
      
      res.json({
        success: true,
        message: result.message,
        restaurant: result.restaurant
      });
    } catch (error) {
      console.error('Erro ao remover dono:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Obter restaurantes de um usuário específico
   */
  async getUserRestaurants(req, res) {
    try {
      const { userId } = req.params;
      
      const restaurants = await AdminService.getUserRestaurants(userId);
      
      res.json({
        success: true,
        restaurants,
        total: restaurants.length
      });
    } catch (error) {
      console.error('Erro ao buscar restaurantes do usuário:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
}

module.exports = new AdminController();
