const express = require('express');
const router = express.Router();
const pendingRestaurantsController = require('./pending-restaurants.controller');
const auth = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/admin');

// Rotas para administradores
router.get('/', auth, requireAdmin, pendingRestaurantsController.getPendingRestaurants);
router.get('/count', auth, requireAdmin, pendingRestaurantsController.getPendingRestaurantsCount);
router.get('/:id', auth, requireAdmin, pendingRestaurantsController.getPendingRestaurantById);
router.put('/:id/approve', auth, requireAdmin, pendingRestaurantsController.approvePendingRestaurant);
router.put('/:id/reject', auth, requireAdmin, pendingRestaurantsController.rejectPendingRestaurant);

// Rotas para usuários (ver seus próprios restaurantes pendentes)
router.get('/user/me', auth, pendingRestaurantsController.getUserPendingRestaurants);

module.exports = router;
