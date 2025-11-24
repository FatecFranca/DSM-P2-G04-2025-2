const axios = require('axios');
const GooglePlacesService = require('../google-places/google-places.service');

class AIRestaurantSearchService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  }

  // Buscar restaurantes usando IA quando não encontrados na base local
  // Foco específico em Franca-SP: restaurantes, bares, lanchonetes, padarias
  async searchWithAI(searchTerm, userLocation = null) {
    try {
      console.log(`🤖 Iniciando busca com IA para: ${searchTerm} em Franca-SP`);
      
      // Garantir que a busca seja sempre em Franca-SP
      const francaLocation = {
        lat: -20.5386,
        lng: -47.4008,
        city: 'Franca',
        state: 'SP'
      };

      const results = {
        searchTerm,
        location: 'Franca-SP',
        sources: [],
        suggestions: []
      };

      // 1. Primeiro, tentar no Google Places existente na base (filtrado para Franca)
      const googlePlacesResults = await this.searchInGooglePlacesFranca(searchTerm);
      if (googlePlacesResults.length > 0) {
        results.sources.push('google_places_local_franca');
        results.suggestions.push(...googlePlacesResults);
      }

      // 2. Se não encontrou suficientes resultados, buscar via Google Places API em Franca
      if (results.suggestions.length < 3) {
        const externalGoogleResults = await this.searchExternalGooglePlacesFranca(searchTerm);
        if (externalGoogleResults.length > 0) {
          results.sources.push('google_places_api_franca');
          results.suggestions.push(...externalGoogleResults);
        }
      }

      // 3. Se ainda não temos resultados, usar OpenAI para sugerir estabelecimentos em Franca
      if (results.suggestions.length === 0) {
        const aiSuggestions = await this.getAISuggestionsFranca(searchTerm);
        if (aiSuggestions.length > 0) {
          results.sources.push('openai_suggestions_franca');
          results.suggestions.push(...aiSuggestions);
        }
      }

      // 4. Processar e normalizar resultados (apenas de Franca)
      results.suggestions = this.normalizeResultsFranca(results.suggestions);
      
      console.log(`✅ Busca IA concluída para Franca-SP. ${results.suggestions.length} sugestões encontradas de: ${results.sources.join(', ')}`);
      return results;

    } catch (error) {
      console.error('❌ Erro na busca com IA:', error);
      return {
        searchTerm,
        location: 'Franca-SP',
        sources: [],
        suggestions: [],
        error: error.message
      };
    }
  }

  // Buscar na base local do Google Places especificamente em Franca-SP
  async searchInGooglePlacesFranca(searchTerm) {
    try {
      const results = await GooglePlacesService.findByName(searchTerm);
      
      // Filtrar apenas estabelecimentos de Franca e tipos específicos
      const francaResults = results.filter(place => {
        const isFranca = place.cidade && place.cidade.toLowerCase().includes('franca');
        const isValidType = this.isValidEstablishmentType(place.tipo);
        return isFranca && isValidType;
      });

      return francaResults.map(place => ({
        source: 'google_places_local_franca',
        place_id: place.place_id,
        name: place.nome,
        address: place.endereco,
        city: 'Franca',
        state: 'SP',
        latitude: parseFloat(place.latitude),
        longitude: parseFloat(place.longitude),
        rating: parseFloat(place.rating) || null,
        user_ratings_total: parseInt(place.user_ratings_total) || null,
        price_level: parseInt(place.price_level) || null,
        phone_number: place.phone_number,
        website: place.website,
        cuisine_type: this.normalizeEstablishmentType(place.tipo),
        description: `${this.normalizeEstablishmentType(place.tipo)} em Franca-SP com ${place.user_ratings_total || 0} avaliações`
      }));
    } catch (error) {
      console.error('Erro ao buscar no Google Places local (Franca):', error);
      return [];
    }
  }

  // Buscar na base local do Google Places (método original mantido para compatibilidade)
  async searchInGooglePlaces(searchTerm, userLocation = null) {
    try {
      const results = await GooglePlacesService.findByName(searchTerm);
      return results.map(place => ({
        source: 'google_places_local',
        place_id: place.place_id,
        name: place.nome,
        address: place.endereco,
        city: place.cidade,
        latitude: parseFloat(place.latitude),
        longitude: parseFloat(place.longitude),
        rating: parseFloat(place.rating) || null,
        user_ratings_total: parseInt(place.user_ratings_total) || null,
        price_level: parseInt(place.price_level) || null,
        phone_number: place.phone_number,
        website: place.website,
        cuisine_type: place.tipo,
        description: `Restaurante ${place.tipo} com ${place.user_ratings_total || 0} avaliações`
      }));
    } catch (error) {
      console.error('Erro ao buscar no Google Places local:', error);
      return [];
    }
  }

  // Buscar via Google Places API especificamente em Franca-SP
  async searchExternalGooglePlacesFranca(searchTerm) {
    if (!this.googleApiKey) {
      console.log('⚠️ Google Places API key não configurada');
      return [];
    }

    try {
      // Coordenadas de Franca-SP
      const francaLat = -20.5386;
      const francaLng = -47.4008;
      const radiusKm = 15; // 15km de raio para cobrir Franca e região

      // Buscar por diferentes tipos de estabelecimentos
      const establishmentTypes = ['restaurant', 'meal_takeaway', 'cafe', 'bakery', 'bar'];
      let allResults = [];

      for (const type of establishmentTypes) {
        const query = `${searchTerm} ${type} Franca SP`;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${francaLat},${francaLng}&radius=${radiusKm * 1000}&key=${this.googleApiKey}`;

        try {
          const response = await axios.get(url);
          
          if (response.data.status === 'OK' && response.data.results) {
            // Filtrar apenas resultados em Franca
            const francaResults = response.data.results.filter(place => {
              const address = place.formatted_address || '';
              return address.toLowerCase().includes('franca') && address.toLowerCase().includes('sp');
            });

            allResults.push(...francaResults.slice(0, 3)); // Máximo 3 por tipo
          }
        } catch (typeError) {
          console.error(`Erro ao buscar tipo ${type}:`, typeError.message);
        }
      }

      // Remover duplicatas por place_id
      const uniqueResults = allResults.filter((place, index, self) =>
        index === self.findIndex(p => p.place_id === place.place_id)
      );

      return uniqueResults.slice(0, 8).map(place => ({
        source: 'google_places_api_franca',
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        city: 'Franca',
        state: 'SP',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating || null,
        user_ratings_total: place.user_ratings_total || null,
        price_level: place.price_level || null,
        cuisine_type: this.extractEstablishmentType(place.types),
        description: `${this.extractEstablishmentType(place.types)} em Franca-SP`,
        photos: place.photos ? place.photos.slice(0, 3).map(photo => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.googleApiKey}`
        ) : []
      }));

    } catch (error) {
      console.error('Erro ao buscar no Google Places API (Franca):', error);
      return [];
    }
  }

  // Buscar via Google Places API externa (método original mantido)
  async searchExternalGooglePlaces(searchTerm, userLocation = null) {
    if (!this.googleApiKey) {
      console.log('⚠️ Google Places API key não configurada');
      return [];
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchTerm + ' restaurante')}&type=restaurant&key=${this.googleApiKey}`;
      
      if (userLocation && userLocation.lat && userLocation.lng) {
        url += `&location=${userLocation.lat},${userLocation.lng}&radius=50000`;
      }

      const response = await axios.get(url);
      
      if (response.data.status !== 'OK') {
        console.log('⚠️ Google Places API retornou status:', response.data.status);
        return [];
      }

      return response.data.results.slice(0, 5).map(place => ({
        source: 'google_places_api',
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating || null,
        user_ratings_total: place.user_ratings_total || null,
        price_level: place.price_level || null,
        cuisine_type: this.extractCuisineType(place.types),
        description: `${place.name} - ${place.formatted_address}`,
        photos: place.photos ? place.photos.slice(0, 3).map(photo => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.googleApiKey}`
        ) : []
      }));

    } catch (error) {
      console.error('Erro ao buscar no Google Places API:', error);
      return [];
    }
  }

  // Obter sugestões usando OpenAI especificamente para Franca-SP
  async getAISuggestionsFranca(searchTerm) {
    if (!this.openaiApiKey) {
      console.log('⚠️ OpenAI API key não configurada');
      return [];
    }

    try {
      const prompt = `
Preciso de sugestões de estabelecimentos gastronômicos similares a "${searchTerm}" especificamente na cidade de Franca-SP.

IMPORTANTE: Focar apenas em RESTAURANTES, BARES, LANCHONETES e PADARIAS que existem ou poderiam existir em Franca-SP.

Por favor, forneça 3-5 sugestões seguindo este formato JSON:

{
  "suggestions": [
    {
      "name": "Nome do Estabelecimento",
      "establishment_type": "Restaurante|Bar|Lanchonete|Padaria",
      "cuisine_type": "Tipo específico (ex: Italiana, Brasileira, Lanches, Pães e Doces)",
      "description": "Descrição breve focada no que oferece",
      "address": "Endereço realista em Franca-SP (use bairros reais como Centro, Jardim Lima, Vila Raycos)",
      "price_range": 2,
      "estimated_rating": 4.1
    }
  ]
}

Critérios para Franca-SP:
- Nomes realistas que combinem com a cultura local
- Endereços em bairros reais de Franca-SP
- Preço entre 1-5 (considere economia local)
- Rating entre 3.5-5.0
- Tipos: Restaurante, Bar, Lanchonete, Padaria
- Descrição em português brasileiro
`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em gastronomia de Franca-SP. Conhece os bairros, cultura local e tipos de estabelecimentos da cidade. Sempre responda em JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.8
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data.choices[0].message.content;
      const parsedResponse = JSON.parse(aiResponse);

      return parsedResponse.suggestions.map((suggestion, index) => ({
        source: 'openai_suggestions_franca',
        place_id: `ai_franca_${Date.now()}_${index}`,
        name: suggestion.name,
        establishment_type: suggestion.establishment_type,
        cuisine_type: suggestion.cuisine_type,
        description: suggestion.description,
        address: suggestion.address,
        city: 'Franca',
        state: 'SP',
        price_level: suggestion.price_range,
        rating: suggestion.estimated_rating,
        latitude: -20.5386, // Coordenadas de Franca-SP
        longitude: -47.4008,
        is_ai_suggestion: true,
        is_franca_sp: true
      }));

    } catch (error) {
      console.error('Erro ao obter sugestões da OpenAI (Franca):', error);
      return [];
    }
  }

  // Obter sugestões usando OpenAI (método original mantido)
  async getAISuggestions(searchTerm, userLocation = null) {
    if (!this.openaiApiKey) {
      console.log('⚠️ OpenAI API key não configurada');
      return [];
    }

    try {
      const locationContext = userLocation ? 
        `na região de ${userLocation.city || 'localização fornecida'}` : 
        'no Brasil';

      const prompt = `
Preciso de sugestões de restaurantes similares a "${searchTerm}" ${locationContext}.

Por favor, forneça 3-5 sugestões de restaurantes reais que existem ou poderiam existir, seguindo este formato JSON:

{
  "suggestions": [
    {
      "name": "Nome do Restaurante",
      "cuisine_type": "Tipo de culinária",
      "description": "Descrição breve do restaurante",
      "address": "Endereço aproximado",
      "price_range": 2,
      "estimated_rating": 4.2
    }
  ]
}

Critérios:
- Restaurantes que realmente existem ou nomes realistas
- Preço entre 1-5 (1=muito barato, 5=muito caro)
- Rating entre 3.0-5.0
- Descrição em português
- Foco em qualidade e relevância
`;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em gastronomia brasileira. Forneça sempre respostas em JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data.choices[0].message.content;
      const parsedResponse = JSON.parse(aiResponse);

      return parsedResponse.suggestions.map((suggestion, index) => ({
        source: 'openai_suggestions',
        place_id: `ai_suggestion_${Date.now()}_${index}`,
        name: suggestion.name,
        cuisine_type: suggestion.cuisine_type,
        description: suggestion.description,
        address: suggestion.address,
        price_level: suggestion.price_range,
        rating: suggestion.estimated_rating,
        latitude: userLocation?.lat || null,
        longitude: userLocation?.lng || null,
        is_ai_suggestion: true
      }));

    } catch (error) {
      console.error('Erro ao obter sugestões da OpenAI:', error);
      return [];
    }
  }

  // Verificar se é um tipo de estabelecimento válido para Franca-SP
  isValidEstablishmentType(tipo) {
    if (!tipo) return false;
    
    const validTypes = [
      'restaurant', 'bar', 'cafe', 'bakery', 'meal_takeaway',
      'food', 'establishment', 'point_of_interest',
      // Tipos em português (base local)
      'restaurante', 'bar', 'lanchonete', 'padaria', 'pizzaria',
      'churrascaria', 'lancheria', 'confeitaria', 'sorveteria'
    ];

    return validTypes.some(validType => 
      tipo.toLowerCase().includes(validType.toLowerCase())
    );
  }

  // Normalizar tipo de estabelecimento para Franca-SP
  normalizeEstablishmentType(tipo) {
    if (!tipo) return 'Restaurante';

    const typeMapping = {
      // Google Places types
      'restaurant': 'Restaurante',
      'bar': 'Bar',
      'cafe': 'Café',
      'bakery': 'Padaria',
      'meal_takeaway': 'Lanchonete',
      'food': 'Alimentação',
      
      // Tipos específicos em português
      'restaurante': 'Restaurante',
      'lanchonete': 'Lanchonete',
      'padaria': 'Padaria',
      'pizzaria': 'Pizzaria',
      'churrascaria': 'Churrascaria',
      'lancheria': 'Lanchonete',
      'confeitaria': 'Confeitaria',
      'sorveteria': 'Sorveteria'
    };

    // Verificar correspondência exata
    for (const [key, value] of Object.entries(typeMapping)) {
      if (tipo.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return 'Restaurante';
  }

  // Extrair tipo de estabelecimento dos types do Google Places (específico para Franca)
  extractEstablishmentType(types) {
    const establishmentMapping = {
      // Restaurantes
      'restaurant': 'Restaurante',
      'chinese_restaurant': 'Restaurante Chinês',
      'italian_restaurant': 'Restaurante Italiano',
      'japanese_restaurant': 'Restaurante Japonês',
      'mexican_restaurant': 'Restaurante Mexicano',
      'brazilian_restaurant': 'Restaurante Brasileiro',
      'pizza_restaurant': 'Pizzaria',
      'seafood_restaurant': 'Restaurante de Frutos do Mar',
      'steak_house': 'Churrascaria',
      'vegetarian_restaurant': 'Restaurante Vegetariano',
      'fast_food_restaurant': 'Fast Food',
      
      // Outros estabelecimentos
      'bar': 'Bar',
      'night_club': 'Bar/Balada',
      'cafe': 'Café',
      'bakery': 'Padaria',
      'meal_takeaway': 'Lanchonete',
      'meal_delivery': 'Delivery',
      'food': 'Alimentação'
    };

    for (const type of types) {
      if (establishmentMapping[type]) {
        return establishmentMapping[type];
      }
    }
    
    // Se não encontrar um tipo específico, verificar categoria geral
    if (types.includes('restaurant') || types.includes('food') || types.includes('establishment')) {
      return 'Restaurante';
    }
    
    return 'Estabelecimento';
  }

  // Extrair tipo de culinária dos types do Google Places
  extractCuisineType(types) {
    const cuisineMapping = {
      'chinese_restaurant': 'Chinesa',
      'italian_restaurant': 'Italiana',
      'japanese_restaurant': 'Japonesa',
      'mexican_restaurant': 'Mexicana',
      'indian_restaurant': 'Indiana',
      'thai_restaurant': 'Tailandesa',
      'french_restaurant': 'Francesa',
      'american_restaurant': 'Americana',
      'brazilian_restaurant': 'Brasileira',
      'pizza_restaurant': 'Pizzaria',
      'seafood_restaurant': 'Frutos do Mar',
      'steak_house': 'Churrascaria',
      'vegetarian_restaurant': 'Vegetariana',
      'fast_food_restaurant': 'Fast Food'
    };

    for (const type of types) {
      if (cuisineMapping[type]) {
        return cuisineMapping[type];
      }
    }
    
    return 'Restaurante';
  }

  // Normalizar resultados específicos para Franca-SP
  normalizeResultsFranca(suggestions) {
    return suggestions.map(suggestion => ({
      ...suggestion,
      rating: suggestion.rating ? parseFloat(suggestion.rating.toFixed(1)) : null,
      price_level: suggestion.price_level ? parseInt(suggestion.price_level) : 3,
      user_ratings_total: suggestion.user_ratings_total || null,
      is_new_restaurant: true,
      is_franca_sp: true,
      city: 'Franca',
      state: 'SP',
      confidence_score: this.calculateConfidenceScoreFranca(suggestion),
      establishment_category: this.categorizeEstablishment(suggestion)
    }));
  }

  // Normalizar resultados de diferentes fontes (método original)
  normalizeResults(suggestions) {
    return suggestions.map(suggestion => ({
      ...suggestion,
      rating: suggestion.rating ? parseFloat(suggestion.rating.toFixed(1)) : null,
      price_level: suggestion.price_level ? parseInt(suggestion.price_level) : 3,
      user_ratings_total: suggestion.user_ratings_total || null,
      is_new_restaurant: true,
      confidence_score: this.calculateConfidenceScore(suggestion)
    }));
  }

  // Calcular score de confiança específico para Franca-SP
  calculateConfidenceScoreFranca(suggestion) {
    let score = 0.5; // Score base

    // Aumentar score baseado na fonte (específico para Franca)
    if (suggestion.source === 'google_places_local_franca') score += 0.4;
    else if (suggestion.source === 'google_places_api_franca') score += 0.3;
    else if (suggestion.source === 'openai_suggestions_franca') score += 0.2;

    // Aumentar score se tem rating
    if (suggestion.rating && suggestion.rating > 3.5) score += 0.2;

    // Aumentar score se tem muitas avaliações
    if (suggestion.user_ratings_total && suggestion.user_ratings_total > 20) score += 0.1;

    // Aumentar score se está em Franca-SP
    if (suggestion.is_franca_sp || (suggestion.city && suggestion.city.includes('Franca'))) score += 0.15;

    // Aumentar score se é tipo válido (restaurante, bar, lanchonete, padaria)
    if (suggestion.establishment_type && this.isValidEstablishmentType(suggestion.establishment_type)) score += 0.1;

    return Math.min(score, 1.0);
  }

  // Categorizar estabelecimento
  categorizeEstablishment(suggestion) {
    const establishmentType = suggestion.establishment_type || suggestion.cuisine_type || '';
    
    if (establishmentType.toLowerCase().includes('bar')) return 'Bar';
    if (establishmentType.toLowerCase().includes('padaria') || establishmentType.toLowerCase().includes('bakery')) return 'Padaria';
    if (establishmentType.toLowerCase().includes('lanchonete') || establishmentType.toLowerCase().includes('lanche')) return 'Lanchonete';
    if (establishmentType.toLowerCase().includes('café') || establishmentType.toLowerCase().includes('cafe')) return 'Café';
    
    return 'Restaurante';
  }

  // Calcular score de confiança (método original)
  calculateConfidenceScore(suggestion) {
    let score = 0.5; // Score base

    // Aumentar score baseado na fonte
    if (suggestion.source === 'google_places_local') score += 0.4;
    else if (suggestion.source === 'google_places_api') score += 0.3;
    else if (suggestion.source === 'openai_suggestions') score += 0.1;

    // Aumentar score se tem rating
    if (suggestion.rating && suggestion.rating > 3.5) score += 0.2;

    // Aumentar score se tem muitas avaliações
    if (suggestion.user_ratings_total && suggestion.user_ratings_total > 50) score += 0.1;

    return Math.min(score, 1.0);
  }

  // Validar dados do restaurante antes de inserir
  validateRestaurantData(restaurantData) {
    console.log('🔍 Validando dados do restaurante:', restaurantData);
    
    const required = ['name', 'address'];
    const missing = required.filter(field => !restaurantData[field]);
    
    if (missing.length > 0) {
      console.log('❌ Campos obrigatórios faltando:', missing);
      throw new Error(`Campos obrigatórios faltando: ${missing.join(', ')}`);
    }

    const validated = {
      name: restaurantData.name.trim(),
      description: restaurantData.description || `Restaurante ${restaurantData.cuisine_type || ''}`.trim(),
      address: restaurantData.address.trim(),
      latitude: restaurantData.latitude || null,
      longitude: restaurantData.longitude || null,
      cuisine_type: restaurantData.cuisine_type || null,
      price_range: restaurantData.price_level || 3,
      phone_number: restaurantData.phone_number || null,
      website: restaurantData.website || null,
      external_id: restaurantData.place_id || null,
      source: restaurantData.source || 'ai_search'
    };
    
    console.log('✅ Dados validados:', validated);
    return validated;
  }
}

module.exports = new AIRestaurantSearchService();
