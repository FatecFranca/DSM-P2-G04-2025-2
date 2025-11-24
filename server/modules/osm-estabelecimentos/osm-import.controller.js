const osmImportService = require('./osm-import.service');

/**
 * Controller para importação de estabelecimentos OSM
 */
class OSMImportController {

  /**
   * Importar estabelecimentos OSM para a tabela restaurants
   * POST /api/osm-estabelecimentos/import
   */
  async importOSMToRestaurants(req, res) {
    try {
      const {
        amenityFilter = ['restaurant', 'bar', 'cafe', 'fast_food'],
        overwrite = false
      } = req.body;

      // TODO: Usar ID do usuário autenticado quando o sistema de auth estiver integrado
      const adminUserId = req.user?.id || null;

      // Validar filtros de amenity
      const validAmenities = ['restaurant', 'bar', 'cafe', 'fast_food'];
      const invalidAmenities = amenityFilter.filter(a => !validAmenities.includes(a));
      
      if (invalidAmenities.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Tipos inválidos: ${invalidAmenities.join(', ')}. Válidos: ${validAmenities.join(', ')}`
        });
      }

      const result = await osmImportService.importOSMToRestaurants({
        amenityFilter,
        overwrite,
        adminUserId
      });

      res.json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Erro ao importar estabelecimentos OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Verificar status da importação OSM
   * GET /api/osm-estabelecimentos/import/status
   */
  async getImportStatus(req, res) {
    try {
      const status = await osmImportService.getImportStatus();

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Erro ao obter status da importação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Sincronizar estabelecimentos OSM com restaurants
   * POST /api/osm-estabelecimentos/import/sync
   */
  async syncOSMToRestaurants(req, res) {
    try {
      // TODO: Usar ID do usuário autenticado
      const adminUserId = req.user?.id || null;

      const result = await osmImportService.syncOSMToRestaurants(adminUserId);

      res.json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Erro ao sincronizar estabelecimentos OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Remover estabelecimentos OSM da tabela restaurants
   * DELETE /api/osm-estabelecimentos/import
   */
  async removeOSMFromRestaurants(req, res) {
    try {
      const { confirm } = req.body;

      if (!confirm) {
        return res.status(400).json({
          success: false,
          message: 'Confirmação necessária. Envie { "confirm": true } no body da requisição.'
        });
      }

      const result = await osmImportService.removeOSMFromRestaurants();

      res.json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Erro ao remover estabelecimentos OSM:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Importação rápida - apenas restaurantes
   * POST /api/osm-estabelecimentos/import/quick
   */
  async quickImportRestaurants(req, res) {
    try {
      const result = await osmImportService.importOSMToRestaurants({
        amenityFilter: ['restaurant'],
        overwrite: false,
        adminUserId: req.user?.id || null
      });

      res.json({
        success: true,
        data: result,
        message: `Importação rápida concluída! ${result.import_summary.newly_imported} restaurantes adicionados.`
      });

    } catch (error) {
      console.error('Erro na importação rápida:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Importação completa - todos os tipos
   * POST /api/osm-estabelecimentos/import/full
   */
  async fullImportAllTypes(req, res) {
    try {
      const result = await osmImportService.importOSMToRestaurants({
        amenityFilter: ['restaurant', 'bar', 'cafe', 'fast_food'],
        overwrite: false,
        adminUserId: req.user?.id || null
      });

      res.json({
        success: true,
        data: result,
        message: `Importação completa concluída! ${result.import_summary.newly_imported} estabelecimentos adicionados.`
      });

    } catch (error) {
      console.error('Erro na importação completa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Reimportação - substitui estabelecimentos existentes
   * POST /api/osm-estabelecimentos/import/reimport
   */
  async reimportOSM(req, res) {
    try {
      const { 
        amenityFilter = ['restaurant', 'bar', 'cafe', 'fast_food'],
        confirm = false
      } = req.body;

      if (!confirm) {
        return res.status(400).json({
          success: false,
          message: 'Reimportação irá substituir estabelecimentos existentes. Envie { "confirm": true } para confirmar.'
        });
      }

      const result = await osmImportService.importOSMToRestaurants({
        amenityFilter,
        overwrite: true,
        adminUserId: req.user?.id || null
      });

      res.json({
        success: true,
        data: result,
        message: `Reimportação concluída! ${result.import_summary.newly_imported} estabelecimentos substituídos.`
      });

    } catch (error) {
      console.error('Erro na reimportação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}

module.exports = new OSMImportController();


