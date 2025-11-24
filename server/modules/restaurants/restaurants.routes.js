const express = require('express');
const restaurantsController = require('./restaurants.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

// Rotas públicas
router.get('/', restaurantsController.getAllRestaurants.bind(restaurantsController));
router.get('/nearby', restaurantsController.getNearbyRestaurants.bind(restaurantsController));
router.get('/search', restaurantsController.searchRestaurants.bind(restaurantsController));
router.get('/cuisine-types', restaurantsController.getCuisineTypes.bind(restaurantsController));
router.get('/price-ranges', restaurantsController.getPriceRanges.bind(restaurantsController));
router.get('/:id', restaurantsController.getRestaurant.bind(restaurantsController));

// Rotas protegidas
router.post('/', auth, restaurantsController.createRestaurant.bind(restaurantsController));
router.put('/:id', auth, restaurantsController.updateRestaurant.bind(restaurantsController));
router.delete('/:id', auth, restaurantsController.deleteRestaurant.bind(restaurantsController));

// Rotas de favoritos
router.get('/user/favorites', auth, restaurantsController.getUserFavorites.bind(restaurantsController));
router.get('/:id/favorite', auth, restaurantsController.checkIfFavorite.bind(restaurantsController));
router.post('/favorites', auth, restaurantsController.addToFavorites.bind(restaurantsController));
router.delete('/favorites/:restaurantId', auth, restaurantsController.removeFromFavorites.bind(restaurantsController));

module.exports = router;
