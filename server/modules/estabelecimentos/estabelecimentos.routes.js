const express = require('express');
const estabelecimentosController = require('./estabelecimentos.controller');

const router = express.Router();

// Rota raiz - informações da API
router.get('/', estabelecimentosController.getApiInfo);

// Rotas de consulta (GET)
router.get('/estabelecimentos', estabelecimentosController.getAllEstabelecimentos);
router.get('/estabelecimentos/estatisticas', estabelecimentosController.getStatistics);
router.get('/estabelecimentos/alteracoes', estabelecimentosController.getRecentUpdates);
router.get('/estabelecimentos/proximos', estabelecimentosController.getNearbyEstabelecimentos);
router.get('/estabelecimentos/busca', estabelecimentosController.advancedSearch);
router.get('/estabelecimentos/nome/:nome', estabelecimentosController.getEstabelecimentosByName);
router.get('/estabelecimentos/tipo/:tipo', estabelecimentosController.getEstabelecimentosByTipo);
router.get('/estabelecimentos/:id', estabelecimentosController.getEstabelecimentoById);

// Rotas de modificação (POST, PUT, DELETE)
router.post('/estabelecimentos', estabelecimentosController.createEstabelecimento);
router.put('/estabelecimentos/:id', estabelecimentosController.updateEstabelecimento);
router.delete('/estabelecimentos/:id', estabelecimentosController.deleteEstabelecimento);

module.exports = router;

