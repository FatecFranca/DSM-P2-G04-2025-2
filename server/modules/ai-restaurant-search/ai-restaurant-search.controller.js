const AIRestaurantSearchService = require('./ai-restaurant-search.service');
const EnhancedSearchService = require('./enhanced-search.service');
const RestaurantsService = require('../restaurants/restaurants.service');

class AIRestaurantSearchController {
  // Buscar restaurantes com IA quando não encontrados localmente
  async searchWithAI(req, res) {
    try {
      const { q: searchTerm, lat, lng, city } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          error: 'Termo de busca deve ter pelo menos 2 caracteres'
        });
      }

      // Primeiro, verificar se existe na base local
      const localResults = await RestaurantsService.searchRestaurants(searchTerm.trim(), 5);
      
      if (localResults.length > 0) {
        return res.json({
          searchTerm: searchTerm.trim(),
          source: 'local_database',
          found_in_local: true,
          restaurants: localResults,
          message: 'Restaurantes encontrados na base local'
        });
      }

      // Se não encontrou localmente, usar IA ENHANCED (com Gemini)
      const userLocation = (lat && lng) ? {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        city: city || null
      } : null;

      console.log('🤖 Usando EnhancedSearchService com Gemini AI...');
      const aiResults = await EnhancedSearchService.enhancedSearch(searchTerm.trim(), {
        establishmentType: 'restaurante',
        priceRange: 'qualquer',
        minRating: 3.0
      });

      res.json({
        searchTerm: searchTerm.trim(),
        source: 'ai_search',
        found_in_local: false,
        sources_used: aiResults.sources || [],
        suggestions: aiResults.suggestions || [],
        total_suggestions: (aiResults.suggestions || []).length,
        message: (aiResults.suggestions || []).length > 0 
          ? 'Sugestões encontradas via busca inteligente' 
          : 'Nenhuma sugestão encontrada',
        error: aiResults.error || null
      });

    } catch (error) {
      console.error('Erro no controller de busca IA:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  // Adicionar restaurante selecionado à base de dados
  async addSelectedRestaurant(req, res) {
    try {
      console.log('🚀 Iniciando adição de restaurante via IA...');
      const userId = req.user?.id;
      const restaurantData = req.body;

      console.log('👤 Usuário:', userId);
      console.log('📋 Dados recebidos:', restaurantData);

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Validar dados do restaurante
      console.log('✅ Validando dados do restaurante...');
      const validatedData = AIRestaurantSearchService.validateRestaurantData(restaurantData);
      console.log('✅ Dados validados:', validatedData);

      // Verificar se restaurante já existe (por nome e endereço)
      console.log('🔍 Verificando se restaurante já existe...');
      const existingRestaurant = await this.checkExistingRestaurant(validatedData.name, validatedData.address);
      
      if (existingRestaurant) {
        console.log('⚠️ Restaurante já existe:', existingRestaurant);
        return res.status(409).json({
          error: 'Restaurante já existe na base de dados',
          restaurant: existingRestaurant,
          existing_id: existingRestaurant.id
        });
      }

      // Criar restaurante na base
      console.log('🏗️ Criando novo restaurante na base...');
      const newRestaurant = await RestaurantsService.createRestaurant({
        ...validatedData,
        created_by: userId
      });

      // Registrar log da adição
      console.log(`✅ Novo restaurante adicionado via IA: ${newRestaurant.name} (ID: ${newRestaurant.id}) por usuário ${userId}`);

      res.status(201).json({
        message: 'Restaurante adicionado com sucesso',
        restaurant: newRestaurant,
        source: validatedData.source,
        added_by: userId
      });

    } catch (error) {
      console.error('Erro ao adicionar restaurante:', error);
      res.status(500).json({
        error: 'Erro ao adicionar restaurante',
        details: error.message
      });
    }
  }

  // Verificar se restaurante já existe
  async checkExistingRestaurant(name, address) {
    try {
      console.log('🔍 Verificando restaurante existente:', { name, address });
      const pool = require('../../config/database');
      
      const result = await pool.query(`
        SELECT r.*, 
               COUNT(DISTINCT p.id) as posts_count,
               AVG(p.rating) as average_rating
        FROM restaurants r
        LEFT JOIN posts p ON r.id = p.restaurant_id
        WHERE LOWER(r.name) = LOWER($1) 
           OR (LOWER(r.address) = LOWER($2) AND r.address IS NOT NULL)
        GROUP BY r.id
        LIMIT 1
      `, [name.trim(), address.trim()]);

      console.log('✅ Resultado da verificação:', result.rows[0] ? 'Encontrado' : 'Não encontrado');
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Erro ao verificar restaurante existente:', error);
      return null;
    }
  }

  // Obter detalhes de um restaurante externo antes de adicionar
  async getExternalRestaurantDetails(req, res) {
    try {
      const { place_id, source } = req.params;

      if (!place_id || !source) {
        return res.status(400).json({
          error: 'place_id e source são obrigatórios'
        });
      }

      let details = null;

      if (source === 'google_places_local') {
        const GooglePlacesService = require('../google-places/google-places.service');
        details = await GooglePlacesService.findByPlaceId(place_id);
      } else if (source === 'google_places_api') {
        // Buscar detalhes via Google Places API
        details = await this.getGooglePlaceDetails(place_id);
      }

      if (!details) {
        return res.status(404).json({
          error: 'Detalhes do restaurante não encontrados'
        });
      }

      res.json({
        place_id,
        source,
        details
      });

    } catch (error) {
      console.error('Erro ao obter detalhes do restaurante:', error);
      res.status(500).json({
        error: 'Erro ao obter detalhes',
        details: error.message
      });
    }
  }

  // Buscar detalhes via Google Places API
  async getGooglePlaceDetails(placeId) {
    try {
      const axios = require('axios');
      const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!googleApiKey) {
        throw new Error('Google Places API key não configurada');
      }

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,user_ratings_total,price_level,formatted_phone_number,website,photos,opening_hours,types&key=${googleApiKey}`;

      const response = await axios.get(url);

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API erro: ${response.data.status}`);
      }

      const place = response.data.result;
      
      return {
        place_id: placeId,
        name: place.name,
        address: place.formatted_address,
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        price_level: place.price_level,
        phone_number: place.formatted_phone_number,
        website: place.website,
        opening_hours: place.opening_hours?.weekday_text,
        photos: place.photos ? place.photos.slice(0, 5).map(photo => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${googleApiKey}`
        ) : [],
        types: place.types
      };

    } catch (error) {
      console.error('Erro ao buscar detalhes do Google Places:', error);
      return null;
    }
  }

  // Estatísticas de restaurantes adicionados via IA
  async getAISearchStats(req, res) {
    try {
      const pool = require('../../config/database');
      
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_ai_restaurants,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as added_last_30_days,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as added_last_7_days,
          AVG(CASE WHEN p.rating IS NOT NULL THEN p.rating END) as avg_rating_ai_restaurants
        FROM restaurants r
        LEFT JOIN posts p ON r.id = p.restaurant_id
        WHERE r.external_id IS NOT NULL OR r.source IN ('ai_search', 'google_places_api')
      `);

      const topSources = await pool.query(`
        SELECT 
          COALESCE(source, 'unknown') as source,
          COUNT(*) as count
        FROM restaurants 
        WHERE external_id IS NOT NULL OR source IN ('ai_search', 'google_places_api')
        GROUP BY source
        ORDER BY count DESC
      `);

      res.json({
        statistics: stats.rows[0],
        sources: topSources.rows,
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        error: 'Erro ao obter estatísticas',
        details: error.message
      });
    }
  }
}

module.exports = new AIRestaurantSearchController();
