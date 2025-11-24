const express = require('express');
const router = express.Router();
const AdminController = require('./admin.controller');
const { requireAdmin } = require('../../middleware/admin');

// Todas as rotas requerem autenticação de administrador
router.use(requireAdmin);

// Estatísticas do sistema
router.get('/stats', AdminController.getSystemStats);

// Gestão de usuários
router.get('/users', AdminController.getAllUsers);
router.put('/users/:userId/role', AdminController.updateUserRole);

// Gestão de restaurantes
router.get('/restaurants', AdminController.getAllRestaurants);
router.put('/restaurants/:restaurantId/owner', AdminController.setRestaurantOwner);
router.delete('/restaurants/:restaurantId/owner', AdminController.removeRestaurantOwner);
router.get('/users/:userId/restaurants', AdminController.getUserRestaurants);

module.exports = router;
