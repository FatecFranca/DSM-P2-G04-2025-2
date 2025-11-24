const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const AIRestaurantSearchController = require('./ai-restaurant-search.controller');

// Buscar restaurantes com IA quando não encontrados localmente
router.get('/search', AIRestaurantSearchController.searchWithAI);

// Adicionar restaurante selecionado à base de dados (requer autenticação)
router.post('/add-restaurant', auth, AIRestaurantSearchController.addSelectedRestaurant);

// Obter detalhes de um restaurante externo antes de adicionar
router.get('/details/:source/:place_id', AIRestaurantSearchController.getExternalRestaurantDetails);

// Estatísticas de restaurantes adicionados via IA (requer autenticação)
router.get('/stats', auth, AIRestaurantSearchController.getAISearchStats);

module.exports = router;
