const express = require('express');
const googlePlacesController = require('./google-places.controller');

const router = express.Router();

// Rota raiz - informações da API Google Places
router.get('/', googlePlacesController.getApiInfo);

// Rotas de consulta (GET)
router.get('/estabelecimentos', googlePlacesController.getAllGooglePlaces);
router.get('/estabelecimentos/estatisticas', googlePlacesController.getStatistics);
router.get('/estabelecimentos/alteracoes', googlePlacesController.getRecentUpdates);
router.get('/estabelecimentos/proximos', googlePlacesController.getNearbyEstabelecimentos);
router.get('/estabelecimentos/busca', googlePlacesController.advancedSearch);
router.get('/estabelecimentos/unificados', googlePlacesController.getUnifiedEstablishments);
router.get('/estabelecimentos/comparar', googlePlacesController.compareDataSources);
router.get('/estabelecimentos/nome/:nome', googlePlacesController.getEstabelecimentosByName);
router.get('/estabelecimentos/tipo/:tipo', googlePlacesController.getEstabelecimentosByTipo);
router.get('/estabelecimentos/rating/:min', googlePlacesController.getEstabelecimentosByRating);
router.get('/estabelecimentos/preco/:level', googlePlacesController.getEstabelecimentosByPriceLevel);
router.get('/estabelecimentos/:place_id', googlePlacesController.getEstabelecimentoByPlaceId);

module.exports = router;

