const express = require('express');
const router = express.Router();
const RestaurantOwnerController = require('./restaurant-owner.controller');
const { requireOwnerOrAdmin } = require('../../middleware/admin');

// Todas as rotas requerem autenticação de proprietário ou administrador
router.use(requireOwnerOrAdmin);

// Obter restaurantes do proprietário
router.get('/my-restaurants', RestaurantOwnerController.getOwnerRestaurants);

// Estatísticas do proprietário
router.get('/stats', RestaurantOwnerController.getOwnerStats);

// Atualizar informações do restaurante
router.put('/restaurants/:restaurantId', RestaurantOwnerController.updateRestaurantInfo);

// Atualizar logo do restaurante
router.put('/restaurants/:restaurantId/logo', RestaurantOwnerController.updateRestaurantLogo);

// Atualizar localização do restaurante
router.put('/restaurants/:restaurantId/location', RestaurantOwnerController.updateRestaurantLocation);

module.exports = router;
