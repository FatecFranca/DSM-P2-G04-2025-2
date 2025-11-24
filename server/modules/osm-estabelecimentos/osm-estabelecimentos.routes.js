const express = require('express');
const router = express.Router();
const osmEstabelecimentosController = require('./osm-estabelecimentos.controller');
const osmImportController = require('./osm-import.controller');

/**
 * Rotas para estabelecimentos do OpenStreetMap
 * Base: /api/osm-estabelecimentos
 */

// Verificar status da view OSM
router.get('/status', osmEstabelecimentosController.checkOSMStatus);

// Obter estatísticas dos estabelecimentos OSM
router.get('/stats', osmEstabelecimentosController.getOSMStatistics);

// Obter tipos de amenity disponíveis
router.get('/amenities', osmEstabelecimentosController.getAvailableAmenities);

// Buscar estabelecimentos próximos
router.get('/nearby', osmEstabelecimentosController.getNearbyOSMEstabelecimentos);

// Buscar estabelecimentos por nome
router.get('/search', osmEstabelecimentosController.searchOSMEstabelecimentos);

// Busca avançada (POST para permitir body com múltiplos parâmetros)
router.post('/advanced-search', osmEstabelecimentosController.advancedOSMSearch);

// === ROTAS DE IMPORTAÇÃO ===
// Status da importação
router.get('/import/status', osmImportController.getImportStatus);

// Importação personalizada
router.post('/import', osmImportController.importOSMToRestaurants);

// Importação rápida (apenas restaurantes)
router.post('/import/quick', osmImportController.quickImportRestaurants);

// Importação completa (todos os tipos)
router.post('/import/full', osmImportController.fullImportAllTypes);

// Sincronização (atualizar + importar novos)
router.post('/import/sync', osmImportController.syncOSMToRestaurants);

// Reimportação (substituir existentes)
router.post('/import/reimport', osmImportController.reimportOSM);

// Remover estabelecimentos OSM importados
router.delete('/import', osmImportController.removeOSMFromRestaurants);

// Buscar estabelecimentos por tipo (amenity)
router.get('/amenity/:amenity', osmEstabelecimentosController.getOSMEstabelecimentosByAmenity);

// Buscar estabelecimento por OSM ID
router.get('/:osmId', osmEstabelecimentosController.getOSMEstabelecimentoById);

// Listar todos os estabelecimentos (deve ficar por último para não interferir com outras rotas)
router.get('/', osmEstabelecimentosController.getAllOSMEstabelecimentos);

module.exports = router;
