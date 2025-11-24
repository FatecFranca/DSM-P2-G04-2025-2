const express = require('express');
const router = express.Router();
const restaurantFeaturesController = require('./restaurant-features.controller');
const auth = require('../../middleware/auth');

// ===== ROTAS PARA SERVIÇOS =====

// Buscar opções de serviços de um restaurante
router.get('/:restaurantId/services', restaurantFeaturesController.getRestaurantServices.bind(restaurantFeaturesController));

// Buscar todos os serviços de um restaurante (incluindo personalizados)
router.get('/:restaurantId/services/all', restaurantFeaturesController.getAllRestaurantServices.bind(restaurantFeaturesController));

// Adicionar novo serviço personalizado (requer autenticação)
router.post('/:restaurantId/services', auth, restaurantFeaturesController.addCustomService.bind(restaurantFeaturesController));

// Deletar serviço personalizado (requer autenticação)
router.delete('/:restaurantId/services/:serviceType', auth, restaurantFeaturesController.deleteCustomService.bind(restaurantFeaturesController));

// Atualizar opções de serviços (requer autenticação)
router.put('/:restaurantId/services', auth, restaurantFeaturesController.updateRestaurantServices.bind(restaurantFeaturesController));

// ===== ROTAS PARA HIGHLIGHTS =====

// Buscar highlights de um restaurante
router.get('/:restaurantId/highlights', restaurantFeaturesController.getRestaurantHighlights.bind(restaurantFeaturesController));

// Atualizar highlights (requer autenticação)
router.put('/:restaurantId/highlights', auth, restaurantFeaturesController.updateRestaurantHighlights.bind(restaurantFeaturesController));

// ===== ROTAS PARA HORÁRIOS DE FUNCIONAMENTO =====

// Buscar horários de funcionamento
router.get('/:restaurantId/operating-hours', restaurantFeaturesController.getRestaurantOperatingHours.bind(restaurantFeaturesController));

// Atualizar horários de funcionamento (requer autenticação)
router.put('/:restaurantId/operating-hours', auth, restaurantFeaturesController.updateRestaurantOperatingHours.bind(restaurantFeaturesController));

// ===== ROTAS PARA STATUS =====

// Verificar se restaurante está aberto
router.get('/:restaurantId/status', restaurantFeaturesController.isRestaurantOpen.bind(restaurantFeaturesController));

// Buscar status completo do restaurante
router.get('/:restaurantId/status-full', restaurantFeaturesController.getRestaurantStatus.bind(restaurantFeaturesController));

// ===== ROTAS AUXILIARES =====

// Obter dados de referência (dias da semana, tipos de serviços, highlights padrão)
router.get('/reference-data', restaurantFeaturesController.getReferenceData.bind(restaurantFeaturesController));

module.exports = router;
