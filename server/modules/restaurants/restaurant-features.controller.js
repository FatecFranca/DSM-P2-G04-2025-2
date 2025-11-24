const restaurantFeaturesService = require('./restaurant-features.service');

class RestaurantFeaturesController {
  
  // ===== SERVIÇOS =====
  
  // Buscar opções de serviços de um restaurante
  async getRestaurantServices(req, res) {
    try {
      const { restaurantId } = req.params;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      const services = await restaurantFeaturesService.getRestaurantServices(restaurantId);
      res.json({ success: true, services });
      
    } catch (error) {
      console.error('Erro ao buscar serviços do restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar todos os serviços de um restaurante (incluindo personalizados)
  async getAllRestaurantServices(req, res) {
    try {
      const { restaurantId } = req.params;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      const services = await restaurantFeaturesService.getAllRestaurantServices(restaurantId);
      res.json({ success: true, services });
      
    } catch (error) {
      console.error('Erro ao buscar todos os serviços do restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Adicionar novo serviço personalizado
  async addCustomService(req, res) {
    try {
      const { restaurantId } = req.params;
      const { serviceType, serviceLabel } = req.body;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      if (!serviceType || !serviceLabel) {
        return res.status(400).json({ error: 'Tipo e label do serviço são obrigatórios' });
      }
      
      const newService = await restaurantFeaturesService.addCustomService(restaurantId, serviceType, serviceLabel);
      
      res.json({ 
        success: true, 
        message: 'Serviço personalizado adicionado com sucesso',
        service: newService 
      });
      
    } catch (error) {
      console.error('Erro ao adicionar serviço personalizado:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Deletar serviço personalizado
  async deleteCustomService(req, res) {
    try {
      const { restaurantId, serviceType } = req.params;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      if (!serviceType) {
        return res.status(400).json({ error: 'Tipo do serviço é obrigatório' });
      }
      
      const deletedService = await restaurantFeaturesService.deleteCustomService(restaurantId, serviceType);
      
      res.json({ 
        success: true, 
        message: 'Serviço personalizado deletado com sucesso',
        deletedService 
      });
      
    } catch (error) {
      console.error('Erro ao deletar serviço personalizado:', error);
      
      if (error.message.includes('Não é possível deletar serviços padrão')) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error.message.includes('Serviço não encontrado')) {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar opções de serviços
  async updateRestaurantServices(req, res) {
    try {
      const { restaurantId } = req.params;
      const { services } = req.body;
      
      console.log('🔍 Debug - Dados recebidos:', { restaurantId, services });
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      if (!Array.isArray(services)) {
        return res.status(400).json({ error: 'Lista de serviços é obrigatória' });
      }
      
      // Validar estrutura dos serviços
      for (const service of services) {
        if (!service.type || typeof service.isAvailable !== 'boolean') {
          return res.status(400).json({ 
            error: 'Estrutura inválida dos serviços. Cada serviço deve ter "type" e "isAvailable"' 
          });
        }
      }
      
      console.log('✅ Debug - Validação passou, chamando serviço...');
      
      const updatedServices = await restaurantFeaturesService.updateRestaurantServices(restaurantId, services);
      
      console.log('✅ Debug - Serviços atualizados:', updatedServices);
      
      res.json({ 
        success: true, 
        message: 'Serviços atualizados com sucesso',
        services: updatedServices 
      });
      
    } catch (error) {
      console.error('❌ Erro ao atualizar serviços do restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ===== HIGHLIGHTS =====
  
  // Buscar highlights de um restaurante
  async getRestaurantHighlights(req, res) {
    try {
      const { restaurantId } = req.params;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      const highlights = await restaurantFeaturesService.getRestaurantHighlights(restaurantId);
      res.json({ success: true, highlights });
      
    } catch (error) {
      console.error('Erro ao buscar highlights do restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar highlights
  async updateRestaurantHighlights(req, res) {
    try {
      const { restaurantId } = req.params;
      const { highlights } = req.body;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      if (!Array.isArray(highlights)) {
        return res.status(400).json({ error: 'Lista de highlights é obrigatória' });
      }
      
      await restaurantFeaturesService.updateRestaurantHighlights(restaurantId, highlights);
      
      res.json({ 
        success: true, 
        message: 'Highlights atualizados com sucesso',
        highlights 
      });
      
    } catch (error) {
      console.error('Erro ao atualizar highlights do restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ===== HORÁRIOS DE FUNCIONAMENTO =====
  
  // Buscar horários de funcionamento
  async getRestaurantOperatingHours(req, res) {
    try {
      const { restaurantId } = req.params;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      const operatingHours = await restaurantFeaturesService.getRestaurantOperatingHours(restaurantId);
      res.json({ success: true, operatingHours });
      
    } catch (error) {
      console.error('Erro ao buscar horários do restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar horários de funcionamento
  async updateRestaurantOperatingHours(req, res) {
    try {
      const { restaurantId } = req.params;
      const { operatingHours } = req.body;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      if (!Array.isArray(operatingHours)) {
        return res.status(400).json({ error: 'Lista de horários é obrigatória' });
      }
      
      await restaurantFeaturesService.updateRestaurantOperatingHours(restaurantId, operatingHours);
      // Retornar a lista atualizada a partir do banco para refletir normalizações
      const updated = await restaurantFeaturesService.getRestaurantOperatingHours(restaurantId);
      
      res.json({ 
        success: true, 
        message: 'Horários atualizados com sucesso',
        operatingHours: updated 
      });
      
    } catch (error) {
      console.error('Erro ao atualizar horários do restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Verificar se restaurante está aberto
  async isRestaurantOpen(req, res) {
    try {
      const { restaurantId } = req.params;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      const isOpen = await restaurantFeaturesService.isRestaurantOpen(restaurantId);
      res.json({ success: true, isOpen });
      
    } catch (error) {
      console.error('Erro ao verificar se restaurante está aberto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar status completo do restaurante
  async getRestaurantStatus(req, res) {
    try {
      const { restaurantId } = req.params;
      
      if (!restaurantId) {
        return res.status(400).json({ error: 'ID do restaurante é obrigatório' });
      }
      
      const status = await restaurantFeaturesService.getRestaurantStatus(restaurantId);
      res.json({ success: true, status });
      
    } catch (error) {
      console.error('Erro ao buscar status do restaurante:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ===== FUNÇÕES AUXILIARES =====
  
  // Obter dados de referência (dias da semana, tipos de serviços, highlights padrão)
  async getReferenceData(req, res) {
    try {
      const dayNames = restaurantFeaturesService.getDayNames();
      const serviceTypes = restaurantFeaturesService.getServiceTypes();
      const defaultHighlights = restaurantFeaturesService.getDefaultHighlights();
      
      res.json({
        success: true,
        data: {
          dayNames,
          serviceTypes,
          defaultHighlights
        }
      });
      
    } catch (error) {
      console.error('Erro ao buscar dados de referência:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = new RestaurantFeaturesController();
