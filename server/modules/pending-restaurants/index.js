const pendingRestaurantsRoutes = require('./pending-restaurants.routes');
const pendingRestaurantsService = require('./pending-restaurants.service');
const pendingRestaurantsController = require('./pending-restaurants.controller');

module.exports = {
  routes: pendingRestaurantsRoutes,
  service: pendingRestaurantsService,
  controller: pendingRestaurantsController
};
