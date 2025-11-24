const axios = require('axios');
const pool = require('../../config/database');

class EnhancedSearchService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyBCIDv49Nc6MSKLVUeN8Hgk3ABkh_mSxgc';
    this.francaCoordinates = {
      lat: -20.5386,
      lng: -47.4008,
      radius: 20000 // 20km para cobrir toda Franca e região
    };
    
    // Sugestões locais como fallback quando OpenAI não estiver disponível
    this.localSuggestions = {
      'pizza': [
        {
          name: 'Pizzaria Bella Vista',
          establishment_type: 'Restaurante',
          cuisine_type: 'Pizzaria Italiana',
          description: 'Pizzaria tradicional com forno a lenha e massas artesanais',
          address: 'Rua das Flores, 123, Centro, Franca-SP',
          price_range: 3,
          estimated_rating: 4.2,
          specialties: ['Pizza Margherita', 'Pizza Quatro Queijos', 'Pizza Calabresa'],
          atmosphere: 'Familiar'
        },
        {
          name: 'Cantina do Chef',
          establishment_type: 'Restaurante',
          cuisine_type: 'Italiana',
          description: 'Restaurante italiano com ambiente romântico e pratos autênticos',
          address: 'Av. Presidente Vargas, 456, Jardim Consolação, Franca-SP',
          price_range: 4,
          estimated_rating: 4.5,
          specialties: ['Pizza Napolitana', 'Lasanha à Bolonhesa', 'Risoto de Funghi'],
          atmosphere: 'Romântico'
        },
        {
          name: 'Pizzaria Express',
          establishment_type: 'Lanchonete',
          cuisine_type: 'Fast Food',
          description: 'Pizzaria de delivery com pizzas rápidas e saborosas',
          address: 'Rua São João, 789, Vila Raycos, Franca-SP',
          price_range: 2,
          estimated_rating: 3.8,
          specialties: ['Pizza de Frango', 'Pizza Portuguesa', 'Pizza de Calabresa'],
          atmosphere: 'Casual'
        }
      ],
      'hamburguer': [
        {
          name: 'Burger House Franca',
          establishment_type: 'Lanchonete',
          cuisine_type: 'Hambúrgueres',
          description: 'Especializada em hambúrgueres artesanais e batatas fritas',
          address: 'Rua XV de Novembro, 321, Centro, Franca-SP',
          price_range: 3,
          estimated_rating: 4.1,
          specialties: ['X-Bacon', 'X-Tudo', 'X-Salada'],
          atmosphere: 'Casual'
        },
        {
          name: 'Lanchonete do Zé',
          establishment_type: 'Lanchonete',
          cuisine_type: 'Lanches Tradicionais',
          description: 'Lanchonete tradicional com os melhores lanches da cidade',
          address: 'Av. Brasil, 654, Jardim Lima, Franca-SP',
          price_range: 2,
          estimated_rating: 4.0,
          specialties: ['X-Burger', 'X-Egg', 'X-Frango'],
          atmosphere: 'Familiar'
        }
      ],
      'sushi': [
        {
          name: 'Sushi Bar Franca',
          establishment_type: 'Restaurante',
          cuisine_type: 'Japonesa',
          description: 'Restaurante japonês com sushi fresco e ambiente elegante',
          address: 'Rua das Palmeiras, 987, Jardim Consolação, Franca-SP',
          price_range: 4,
          estimated_rating: 4.3,
          specialties: ['Sushi Combo', 'Temaki', 'Sashimi'],
          atmosphere: 'Elegante'
        },
        {
          name: 'Temaki Express',
          establishment_type: 'Lanchonete',
          cuisine_type: 'Japonesa',
          description: 'Especializada em temakis e pratos japoneses rápidos',
          address: 'Av. São Paulo, 147, Vila Raycos, Franca-SP',
          price_range: 3,
          estimated_rating: 3.9,
          specialties: ['Temaki de Salmão', 'Temaki de Atum', 'Temaki de Camarão'],
          atmosphere: 'Casual'
        }
      ],
      'churrasco': [
        {
          name: 'Churrascaria Gaúcha',
          establishment_type: 'Restaurante',
          cuisine_type: 'Churrascaria',
          description: 'Churrascaria tradicional com rodízio de carnes e buffet',
          address: 'Rua dos Bandeirantes, 258, Jardim Consolação, Franca-SP',
          price_range: 4,
          estimated_rating: 4.4,
          specialties: ['Picanha', 'Costela', 'Linguiça'],
          atmosphere: 'Familiar'
        },
        {
          name: 'Fogo de Chão',
          establishment_type: 'Restaurante',
          cuisine_type: 'Churrascaria',
          description: 'Churrascaria premium com carnes nobres e ambiente sofisticado',
          address: 'Av. Presidente Vargas, 369, Centro, Franca-SP',
          price_range: 5,
          estimated_rating: 4.6,
          specialties: ['Picanha Premium', 'Maminha', 'Alcatra'],
          atmosphere: 'Elegante'
        }
      ],
      'padaria': [
        {
          name: 'Padaria São José',
          establishment_type: 'Padaria',
          cuisine_type: 'Pães e Doces',
          description: 'Padaria tradicional com pães frescos e doces caseiros',
          address: 'Rua São José, 741, Centro, Franca-SP',
          price_range: 1,
          estimated_rating: 4.0,
          specialties: ['Pão Francês', 'Pão de Queijo', 'Bolo de Chocolate'],
          atmosphere: 'Familiar'
        },
        {
          name: 'Confeitaria Doce Lar',
          establishment_type: 'Padaria',
          cuisine_type: 'Doces e Confeitaria',
          description: 'Especializada em doces finos e bolos decorados',
          address: 'Av. das Flores, 852, Jardim Consolação, Franca-SP',
          price_range: 2,
          estimated_rating: 4.2,
          specialties: ['Bolo de Aniversário', 'Doces Finos', 'Tortas'],
          atmosphere: 'Elegante'
        }
      ],
      'bar': [
        {
          name: 'Bar do Zé',
          establishment_type: 'Bar',
          cuisine_type: 'Bar e Petiscos',
          description: 'Bar tradicional com petiscos e ambiente descontraído',
          address: 'Rua das Laranjeiras, 963, Centro, Franca-SP',
          price_range: 2,
          estimated_rating: 4.1,
          specialties: ['Petiscos', 'Chopp', 'Drinks'],
          atmosphere: 'Casual'
        },
        {
          name: 'Pub Irlandês',
          establishment_type: 'Bar',
          cuisine_type: 'Bar Internacional',
          description: 'Pub com ambiente irlandês e cervejas importadas',
          address: 'Av. São Paulo, 258, Jardim Consolação, Franca-SP',
          price_range: 3,
          estimated_rating: 4.3,
          specialties: ['Cervejas Importadas', 'Hambúrgueres', 'Drinks'],
          atmosphere: 'Internacional'
        }
      ]
    };
  }

  // Busca principal aprimorada
  async enhancedSearch(searchTerm, filters = {}) {
    try {
      console.log(`🔍 Iniciando busca aprimorada para: ${searchTerm} em Franca-SP`);
      
      const results = {
        searchTerm,
        location: 'Franca-SP',
        sources: [],
        restaurants: [],
        suggestions: [],
        totalFound: 0,
        searchTime: Date.now()
      };

      // 1. Busca na base local com filtros avançados
      const localResults = await this.searchLocalDatabase(searchTerm, filters);
      if (localResults.length > 0) {
        results.sources.push('local_database');
        results.restaurants.push(...localResults);
      }

      // 2. Busca expandida no Google Places API
      const googleResults = await this.searchGooglePlacesEnhanced(searchTerm, filters);
      if (googleResults.length > 0) {
        results.sources.push('google_places_api');
        results.suggestions.push(...googleResults);
      }

      // 3. Busca no OpenStreetMap
      const osmResults = await this.searchOpenStreetMap(searchTerm, filters);
      if (osmResults.length > 0) {
        results.sources.push('openstreetmap');
        results.suggestions.push(...osmResults);
      }

      // 4. Busca por proximidade geográfica
      const proximityResults = await this.searchByProximity(searchTerm, filters);
      if (proximityResults.length > 0) {
        results.sources.push('proximity_search');
        results.suggestions.push(...proximityResults);
      }

      // 5. Se não encontrou resultados suficientes, usar sugestões locais
      if (results.suggestions.length < 3) {
        const localSuggestions = this.getLocalSuggestions(searchTerm, filters);
        if (localSuggestions.length > 0) {
          results.sources.push('local_suggestions');
          results.suggestions.push(...localSuggestions);
        }
      }

      // 6. Se ainda não tem resultados, tentar OpenAI (opcional)
      if (results.restaurants.length === 0 && results.suggestions.length === 0) {
        try {
          const aiSuggestions = await this.getAISuggestionsEnhanced(searchTerm, filters);
          if (aiSuggestions.length > 0) {
            results.sources.push('ai_suggestions');
            results.suggestions.push(...aiSuggestions);
          }
        } catch (aiError) {
          console.log('⚠️ OpenAI não disponível, tentando Gemini AI...');
          try {
            const geminiSuggestions = await this.getGeminiSuggestions(searchTerm, filters);
            if (geminiSuggestions.length > 0) {
              results.sources.push('gemini_suggestions');
              results.suggestions.push(...geminiSuggestions);
            }
          } catch (geminiError) {
            console.log('⚠️ Gemini AI também não disponível, usando apenas sugestões locais');
            // Fallback para sugestões locais mais genéricas
            const fallbackSuggestions = this.getFallbackSuggestions(searchTerm);
            if (fallbackSuggestions.length > 0) {
              results.sources.push('fallback_suggestions');
              results.suggestions.push(...fallbackSuggestions);
            }
          }
        }
      }

      // 7. Processar e normalizar resultados
      results.suggestions = this.normalizeAndDeduplicate(results.suggestions);
      results.totalFound = results.restaurants.length + results.suggestions.length;
      results.searchTime = Date.now() - results.searchTime;

      console.log(`✅ Busca aprimorada concluída: ${results.totalFound} resultados de ${results.sources.join(', ')}`);
      return results;

    } catch (error) {
      console.error('❌ Erro na busca aprimorada:', error);
      // Em caso de erro, retornar pelo menos sugestões locais
      const fallbackResults = this.getFallbackSuggestions(searchTerm);
      return {
        searchTerm,
        location: 'Franca-SP',
        sources: ['fallback_suggestions'],
        restaurants: [],
        suggestions: fallbackResults,
        totalFound: fallbackResults.length,
        error: error.message,
        fallback: true
      };
    }
  }

  // Busca na base local com filtros avançados
  async searchLocalDatabase(searchTerm, filters) {
    try {
      let query = `
        SELECT r.*, 
               COUNT(DISTINCT p.id) as posts_count,
               COUNT(DISTINCT f.user_id) as favorites_count,
               AVG(p.rating) as average_rating,
               ST_Distance(
                 r.location::geography,
                 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
               ) as distance_meters
        FROM restaurants r
        LEFT JOIN posts p ON r.id = p.restaurant_id
        LEFT JOIN favorites f ON r.id = f.restaurant_id
        WHERE 1=1
      `;

      const values = [this.francaCoordinates.lng, this.francaCoordinates.lat];
      let valueIndex = 3;

      // Filtro por termo de busca
      if (searchTerm) {
        query += ` AND (r.name ILIKE $${valueIndex} OR r.description ILIKE $${valueIndex} OR r.cuisine_type ILIKE $${valueIndex})`;
        values.push(`%${searchTerm}%`);
        valueIndex++;
      }

      // Filtro por tipo de estabelecimento
      if (filters.establishmentType) {
        query += ` AND r.cuisine_type ILIKE $${valueIndex}`;
        values.push(`%${filters.establishmentType}%`);
        valueIndex++;
      }

      // Filtro por faixa de preço
      if (filters.priceRange) {
        query += ` AND r.price_range = $${valueIndex}`;
        values.push(filters.priceRange);
        valueIndex++;
      }

      // Filtro por rating mínimo
      if (filters.minRating) {
        query += ` AND (SELECT AVG(rating) FROM posts WHERE restaurant_id = r.id) >= $${valueIndex}`;
        values.push(filters.minRating);
        valueIndex++;
      }

      // Filtro por distância máxima
      if (filters.maxDistance) {
        query += ` AND ST_DWithin(
          r.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $${valueIndex}
        )`;
        values.push(filters.maxDistance);
        valueIndex++;
      }

      query += `
        GROUP BY r.id, r.location
        ORDER BY 
          CASE WHEN r.name ILIKE $${searchTerm ? 3 : 1} THEN 1 ELSE 2 END,
          distance_meters ASC,
          average_rating DESC NULLS LAST
        LIMIT 20
      `;

      const result = await pool.query(query, values);
      return result.rows.map(row => ({
        ...row,
        source: 'local_database',
        is_local: true
      }));

    } catch (error) {
      console.error('Erro na busca local:', error);
      return [];
    }
  }

  // Busca expandida no Google Places API
  async searchGooglePlacesEnhanced(searchTerm, filters) {
    if (!this.googleApiKey) {
      console.log('⚠️ Google Places API key não configurada');
      return [];
    }

    try {
      const establishmentTypes = [
        'restaurant', 'meal_takeaway', 'cafe', 'bakery', 'bar',
        'food', 'establishment', 'point_of_interest'
      ];

      let allResults = [];

      // Busca por texto com diferentes combinações
      const searchQueries = [
        `${searchTerm} restaurante Franca SP`,
        `${searchTerm} bar Franca SP`,
        `${searchTerm} lanchonete Franca SP`,
        `${searchTerm} padaria Franca SP`
      ];

      for (const query of searchQueries) {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${this.francaCoordinates.lat},${this.francaCoordinates.lng}&radius=${this.francaCoordinates.radius}&type=restaurant&key=${this.googleApiKey}`;
          
          const response = await axios.get(url);
          
          if (response.data.status === 'OK' && response.data.results) {
            // Filtrar apenas resultados em Franca
            const francaResults = response.data.results.filter(place => {
              const address = place.formatted_address || '';
              return address.toLowerCase().includes('franca') && address.toLowerCase().includes('sp');
            });

            allResults.push(...francaResults.slice(0, 5));
          }
        } catch (queryError) {
          console.error(`Erro na busca por "${query}":`, queryError.message);
        }
      }

      // Busca por tipo específico se solicitado
      if (filters.establishmentType) {
        for (const type of establishmentTypes) {
          if (type.toLowerCase().includes(filters.establishmentType.toLowerCase())) {
            try {
              const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchTerm} ${type} Franca SP&location=${this.francaCoordinates.lat},${this.francaCoordinates.lng}&radius=${this.francaCoordinates.radius}&key=${this.googleApiKey}`;
              
              const response = await axios.get(url);
              
              if (response.data.status === 'OK' && response.data.results) {
                const francaResults = response.data.results.filter(place => {
                  const address = place.formatted_address || '';
                  return address.toLowerCase().includes('franca') && address.toLowerCase().includes('sp');
                });

                allResults.push(...francaResults.slice(0, 3));
              }
            } catch (typeError) {
              console.error(`Erro na busca por tipo ${type}:`, typeError.message);
            }
          }
        }
      }

      // Remover duplicatas e normalizar
      const uniqueResults = allResults.filter((place, index, self) =>
        index === self.findIndex(p => p.place_id === place.place_id)
      );

      return uniqueResults.slice(0, 15).map(place => ({
        source: 'google_places_api',
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        city: 'Franca',
        state: 'SP',
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        rating: place.rating || null,
        user_ratings_total: place.user_ratings_total || null,
        price_level: place.price_level || null,
        cuisine_type: this.extractEstablishmentType(place.types),
        description: `${this.extractEstablishmentType(place.types)} em Franca-SP`,
        photos: place.photos ? place.photos.slice(0, 3).map(photo => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.googleApiKey}`
        ) : [],
        types: place.types,
        opening_hours: place.opening_hours?.weekday_text || null,
        website: place.website || null,
        phone_number: place.formatted_phone_number || null
      }));

    } catch (error) {
      console.error('Erro na busca Google Places:', error);
      return [];
    }
  }

  // Busca no OpenStreetMap
  async searchOpenStreetMap(searchTerm, filters) {
    try {
      // Query Overpass API para Franca-SP
      const overpassQuery = `
        [out:json][timeout:25];
        area["name"="Franca"]["admin_level"="8"]["boundary"="administrative"]->.franca;
        (
          node["amenity"~"restaurant|bar|cafe|fast_food"](area.franca);
          way["amenity"~"restaurant|bar|cafe|fast_food"](area.franca);
          relation["amenity"~"restaurant|bar|cafe|fast_food"](area.franca);
        );
        out body;
        >;
        out skel qt;
      `;

      const response = await axios.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
      
      if (!response.data.elements) return [];

      const restaurants = [];
      const nodes = new Map();
      const ways = new Map();

      // Processar elementos OSM
      response.data.elements.forEach(element => {
        if (element.type === 'node') {
          nodes.set(element.id, element);
        } else if (element.type === 'way') {
          ways.set(element.id, element);
        }
      });

      // Processar restaurantes
      response.data.elements.forEach(element => {
        if (element.tags && element.tags.amenity) {
          const amenity = element.tags.amenity;
          
          if (['restaurant', 'bar', 'cafe', 'fast_food'].includes(amenity)) {
            let lat, lon, name, address;

            if (element.type === 'node') {
              lat = element.lat;
              lon = element.lon;
            } else if (element.type === 'way') {
              // Para ways, usar o primeiro nó como referência
              const firstNode = nodes.get(element.nodes[0]);
              if (firstNode) {
                lat = firstNode.lat;
                lon = firstNode.lon;
              }
            }

            if (lat && lon) {
              name = element.tags.name || element.tags['name:pt'] || 'Estabelecimento sem nome';
              address = this.buildOSMAddress(element.tags);

              // Filtrar por termo de busca se fornecido
              if (!searchTerm || 
                  name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  address.toLowerCase().includes(searchTerm.toLowerCase())) {
                
                restaurants.push({
                  source: 'openstreetmap',
                  place_id: `osm_${element.type}_${element.id}`,
                  name,
                  address,
                  city: 'Franca',
                  state: 'SP',
                  latitude: lat,
                  longitude: lon,
                  cuisine_type: this.mapOSMCuisineType(amenity),
                  description: `${this.mapOSMCuisineType(amenity)} em Franca-SP`,
                  establishment_type: amenity,
                  is_osm: true,
                  osm_id: element.id,
                  osm_type: element.type,
                  tags: element.tags
                });
              }
            }
          }
        }
      });

      return restaurants.slice(0, 10);

    } catch (error) {
      console.error('Erro na busca OSM:', error);
      return [];
    }
  }

  // Busca por proximidade geográfica
  async searchByProximity(searchTerm, filters) {
    try {
      const query = `
        SELECT r.*, 
               COUNT(DISTINCT p.id) as posts_count,
               COUNT(DISTINCT f.user_id) as favorites_count,
               AVG(p.rating) as average_rating,
               ST_Distance(
                 r.location::geography,
                 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
               ) as distance_meters
        FROM restaurants r
        LEFT JOIN posts p ON r.id = p.restaurant_id
        LEFT JOIN favorites f ON r.id = f.restaurant_id
        WHERE ST_DWithin(
          r.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        GROUP BY r.id, r.location
        ORDER BY distance_meters ASC, average_rating DESC NULLS LAST
        LIMIT 15
      `;

      const maxDistance = filters.maxDistance || 10000; // 10km padrão
      const result = await pool.query(query, [
        this.francaCoordinates.lng, 
        this.francaCoordinates.lat, 
        maxDistance
      ]);

      return result.rows.map(row => ({
        ...row,
        source: 'proximity_search',
        is_proximity: true
      }));

    } catch (error) {
      console.error('Erro na busca por proximidade:', error);
      return [];
    }
  }

  // Obter sugestões locais baseadas no termo de busca
  getLocalSuggestions(searchTerm, filters) {
    const normalizedTerm = searchTerm.toLowerCase().trim();
    
    // Buscar sugestões específicas
    for (const [key, suggestions] of Object.entries(this.localSuggestions)) {
      if (normalizedTerm.includes(key)) {
        return suggestions.map(suggestion => ({
          ...suggestion,
          source: 'local_suggestions',
          place_id: `local_${Date.now()}_${Math.random()}`,
          latitude: this.francaCoordinates.lat + (Math.random() - 0.5) * 0.01,
          longitude: this.francaCoordinates.lng + (Math.random() - 0.5) * 0.01,
          is_local_suggestion: true,
          is_franca_sp: true
        }));
      }
    }

    // Se não encontrou correspondência específica, retornar sugestões genéricas
    return this.getFallbackSuggestions(searchTerm);
  }

  // Sugestões de fallback genéricas
  getFallbackSuggestions(searchTerm) {
    const normalizedTerm = searchTerm.toLowerCase().trim();
    
    // Determinar tipo de estabelecimento baseado no termo
    let establishmentType = 'Restaurante';
    let cuisineType = 'Variada';
    
    if (normalizedTerm.includes('pizza') || normalizedTerm.includes('italiana')) {
      establishmentType = 'Restaurante';
      cuisineType = 'Italiana';
    } else if (normalizedTerm.includes('hamburguer') || normalizedTerm.includes('lanche')) {
      establishmentType = 'Lanchonete';
      cuisineType = 'Lanches';
    } else if (normalizedTerm.includes('sushi') || normalizedTerm.includes('japonesa')) {
      establishmentType = 'Restaurante';
      cuisineType = 'Japonesa';
    } else if (normalizedTerm.includes('churrasco') || normalizedTerm.includes('churrascaria')) {
      establishmentType = 'Restaurante';
      cuisineType = 'Churrascaria';
    } else if (normalizedTerm.includes('padaria') || normalizedTerm.includes('pão')) {
      establishmentType = 'Padaria';
      cuisineType = 'Pães e Doces';
    } else if (normalizedTerm.includes('bar') || normalizedTerm.includes('cerveja')) {
      establishmentType = 'Bar';
      cuisineType = 'Bar e Petiscos';
    }

    // Gerar sugestões baseadas no tipo
    const suggestions = [];
    const bairros = ['Centro', 'Jardim Consolação', 'Jardim Lima', 'Vila Raycos', 'Jardim América'];
    
    for (let i = 1; i <= 3; i++) {
      const bairro = bairros[Math.floor(Math.random() * bairros.length)];
      const rua = `Rua ${['das Flores', 'São João', 'XV de Novembro', 'das Palmeiras', 'São José'][Math.floor(Math.random() * 5)]}`;
      const numero = Math.floor(Math.random() * 200) + 1;
      
      suggestions.push({
        source: 'fallback_suggestions',
        place_id: `fallback_${Date.now()}_${i}`,
        name: `${establishmentType} ${this.generateRestaurantName(normalizedTerm, i)}`,
        establishment_type: establishmentType,
        cuisine_type: cuisineType,
        description: `${establishmentType} especializado em ${cuisineType.toLowerCase()} em Franca-SP`,
        address: `${rua}, ${numero}, ${bairro}, Franca-SP`,
        city: 'Franca',
        state: 'SP',
        price_level: Math.floor(Math.random() * 3) + 2, // 2-4
        rating: (Math.random() * 1.5) + 3.5, // 3.5-5.0
        latitude: this.francaCoordinates.lat + (Math.random() - 0.5) * 0.01,
        longitude: this.francaCoordinates.lng + (Math.random() - 0.5) * 0.01,
        is_fallback: true,
        is_franca_sp: true
      });
    }

    return suggestions;
  }

  // Gerar nome de restaurante baseado no termo de busca
  generateRestaurantName(searchTerm, index) {
    const names = {
      'pizza': ['Bella Vista', 'Napoli', 'Toscana', 'Roma', 'Milano'],
      'hamburguer': ['Burger House', 'Lanche Express', 'Fast Food', 'Lanchonete do Zé'],
      'sushi': ['Sushi Bar', 'Temaki Express', 'Japão', 'Oriente', 'Sakura'],
      'churrasco': ['Gaúcha', 'Fogo de Chão', 'Pampa', 'Sul', 'Brasil'],
      'padaria': ['São José', 'Doce Lar', 'Pão Quente', 'Confeitaria', 'Dulce'],
      'bar': ['do Zé', 'Irlandês', 'Pub', 'Cantina', 'Taverna']
    };

    const normalizedTerm = searchTerm.toLowerCase().trim();
    
    for (const [key, nameList] of Object.entries(names)) {
      if (normalizedTerm.includes(key)) {
        return nameList[index % nameList.length];
      }
    }

    // Nomes genéricos
    const genericNames = ['Central', 'Popular', 'Tradicional', 'Especial', 'Premium'];
    return genericNames[index % genericNames.length];
  }

  // Sugestões de IA aprimoradas (opcional)
  async getAISuggestionsEnhanced(searchTerm, filters) {
    if (!this.openaiApiKey) {
      console.log('⚠️ OpenAI API key não configurada');
      return [];
    }

    try {
      const prompt = `
        Preciso de sugestões de estabelecimentos gastronômicos similares a "${searchTerm}" especificamente na cidade de Franca-SP.

        IMPORTANTE: Focar apenas em RESTAURANTES, BARES, LANCHONETES e PADARIAS que existem ou poderiam existir em Franca-SP.

        Filtros aplicados:
        - Tipo: ${filters.establishmentType || 'Qualquer'}
        - Faixa de preço: ${filters.priceRange || 'Qualquer'}
        - Rating mínimo: ${filters.minRating || 'Qualquer'}

        Por favor, forneça 5-8 sugestões seguindo este formato JSON:

        {
          "suggestions": [
            {
              "name": "Nome do Estabelecimento",
              "establishment_type": "Restaurante|Bar|Lanchonete|Padaria",
              "cuisine_type": "Tipo específico (ex: Italiana, Brasileira, Lanches, Pães e Doces)",
              "description": "Descrição breve focada no que oferece",
              "address": "Endereço realista em Franca-SP (use bairros reais como Centro, Jardim Lima, Vila Raycos, Jardim Consolação)",
              "price_range": 2,
              "estimated_rating": 4.1,
              "specialties": ["Prato 1", "Prato 2"],
              "atmosphere": "Familiar|Romântico|Casual|Elegante"
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
        - Especialidades típicas da região
        - Atmosfera apropriada para o tipo de estabelecimento
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
        max_tokens: 1500,
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
        source: 'ai_suggestions',
        place_id: `ai_enhanced_${Date.now()}_${index}`,
        name: suggestion.name,
        establishment_type: suggestion.establishment_type,
        cuisine_type: suggestion.cuisine_type,
        description: suggestion.description,
        address: suggestion.address,
        city: 'Franca',
        state: 'SP',
        price_level: suggestion.price_range,
        rating: suggestion.estimated_rating,
        latitude: this.francaCoordinates.lat + (Math.random() - 0.5) * 0.01, // Variação pequena
        longitude: this.francaCoordinates.lng + (Math.random() - 0.5) * 0.01,
        specialties: suggestion.specialties || [],
        atmosphere: suggestion.atmosphere || 'Casual',
        is_ai_suggestion: true,
        is_franca_sp: true
      }));

    } catch (error) {
      console.error('Erro ao obter sugestões da OpenAI:', error);
      throw error; // Re-throw para tentar Gemini
    }
  }

  // Sugestões do Gemini AI (alternativa à OpenAI)
  async getGeminiSuggestions(searchTerm, filters) {
    if (!this.geminiApiKey) {
      console.log('⚠️ Gemini API key não configurada');
      return [];
    }

    try {
      const prompt = `
        Preciso de sugestões de estabelecimentos gastronômicos similares a "${searchTerm}" especificamente na cidade de Franca-SP.

        IMPORTANTE: Focar apenas em RESTAURANTES, BARES, LANCHONETES e PADARIAS que existem ou poderiam existir em Franca-SP.

        Filtros aplicados:
        - Tipo: ${filters.establishmentType || 'Qualquer'}
        - Faixa de preço: ${filters.priceRange || 'Qualquer'}
        - Rating mínimo: ${filters.minRating || 'Qualquer'}

        Por favor, forneça 5-8 sugestões seguindo este formato JSON:

        {
          "suggestions": [
            {
              "name": "Nome do Estabelecimento",
              "establishment_type": "Restaurante|Bar|Lanchonete|Padaria",
              "cuisine_type": "Tipo específico (ex: Italiana, Brasileira, Lanches, Pães e Doces)",
              "description": "Descrição breve focada no que oferece",
              "address": "Endereço realista em Franca-SP (use bairros reais como Centro, Jardim Lima, Vila Raycos, Jardim Consolação)",
              "price_range": 2,
              "estimated_rating": 4.1,
              "specialties": ["Prato 1", "Prato 2"],
              "atmosphere": "Familiar|Romântico|Casual|Elegante"
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
        - Especialidades típicas da região
        - Atmosfera apropriada para o tipo de estabelecimento
      `;

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
        contents: [
          {
            parts: [
              {
                text: `Você é um especialista em gastronomia de Franca-SP. Conhece os bairros, cultura local e tipos de estabelecimentos da cidade. Sempre responda em JSON válido.

${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1500
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const geminiResponse = response.data.candidates[0].content.parts[0].text;
      
      // Extrair JSON da resposta do Gemini
      const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta do Gemini não contém JSON válido');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      return parsedResponse.suggestions.map((suggestion, index) => ({
        source: 'gemini_suggestions',
        place_id: `gemini_${Date.now()}_${index}`,
        name: suggestion.name,
        establishment_type: suggestion.establishment_type,
        cuisine_type: suggestion.cuisine_type,
        description: suggestion.description,
        address: suggestion.address,
        city: 'Franca',
        state: 'SP',
        price_level: suggestion.price_range,
        rating: suggestion.estimated_rating,
        latitude: this.francaCoordinates.lat + (Math.random() - 0.5) * 0.01,
        longitude: this.francaCoordinates.lng + (Math.random() - 0.5) * 0.01,
        specialties: suggestion.specialties || [],
        atmosphere: suggestion.atmosphere || 'Casual',
        is_gemini_suggestion: true,
        is_franca_sp: true
      }));

    } catch (error) {
      console.error('Erro ao obter sugestões do Gemini:', error);
      throw error; // Re-throw para usar fallback local
    }
  }

  // Normalizar e remover duplicatas
  normalizeAndDeduplicate(suggestions) {
    const normalized = suggestions.map(suggestion => ({
      ...suggestion,
      rating: suggestion.rating ? parseFloat(suggestion.rating.toFixed(1)) : null,
      price_level: suggestion.price_level ? parseInt(suggestion.price_level) : 3,
      user_ratings_total: suggestion.user_ratings_total || null,
      confidence_score: this.calculateConfidenceScore(suggestion),
      establishment_category: this.categorizeEstablishment(suggestion)
    }));

    // Remover duplicatas por nome e endereço similar
    const unique = [];
    const seen = new Set();

    normalized.forEach(suggestion => {
      const key = `${suggestion.name.toLowerCase()}_${suggestion.address.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      }
    });

    return unique;
  }

  // Calcular score de confiança
  calculateConfidenceScore(suggestion) {
    let score = 0.5; // Score base

    // Aumentar score baseado na fonte
    if (suggestion.source === 'local_database') score += 0.4;
    else if (suggestion.source === 'google_places_api') score += 0.3;
    else if (suggestion.source === 'openstreetmap') score += 0.25;
    else if (suggestion.source === 'proximity_search') score += 0.2;
    else if (suggestion.source === 'local_suggestions') score += 0.15;
    else if (suggestion.source === 'fallback_suggestions') score += 0.1;
    else if (suggestion.source === 'ai_suggestions') score += 0.1;
    else if (suggestion.source === 'gemini_suggestions') score += 0.1; // Adicionar score para Gemini

    // Aumentar score se tem rating
    if (suggestion.rating && suggestion.rating > 3.5) score += 0.2;

    // Aumentar score se tem muitas avaliações
    if (suggestion.user_ratings_total && suggestion.user_ratings_total > 20) score += 0.1;

    // Aumentar score se está em Franca-SP
    if (suggestion.is_franca_sp || (suggestion.city && suggestion.city.includes('Franca'))) score += 0.15;

    // Aumentar score se é tipo válido
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

  // Verificar se é tipo válido
  isValidEstablishmentType(tipo) {
    if (!tipo) return false;
    
    const validTypes = [
      'restaurant', 'bar', 'cafe', 'bakery', 'meal_takeaway',
      'food', 'establishment', 'point_of_interest',
      'restaurante', 'lanchonete', 'padaria', 'pizzaria',
      'churrascaria', 'lancheria', 'confeitaria', 'sorveteria'
    ];

    return validTypes.some(validType => 
      tipo.toLowerCase().includes(validType.toLowerCase())
    );
  }

  // Extrair tipo de estabelecimento
  extractEstablishmentType(types) {
    const establishmentMapping = {
      'restaurant': 'Restaurante',
      'bar': 'Bar',
      'cafe': 'Café',
      'bakery': 'Padaria',
      'meal_takeaway': 'Lanchonete',
      'food': 'Alimentação'
    };

    for (const type of types) {
      if (establishmentMapping[type]) {
        return establishmentMapping[type];
      }
    }
    
    return 'Estabelecimento';
  }

  // Mapear tipos OSM para tipos de culinária
  mapOSMCuisineType(amenity) {
    const mapping = {
      'restaurant': 'Restaurante',
      'bar': 'Bar',
      'cafe': 'Café',
      'fast_food': 'Lanchonete'
    };

    return mapping[amenity] || 'Estabelecimento';
  }

  // Construir endereço a partir de tags OSM
  buildOSMAddress(tags) {
    const parts = [];
    
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
    
    if (parts.length === 0) {
      return 'Franca-SP';
    }
    
    return `${parts.join(', ')}, Franca-SP`;
  }

  // Busca por filtros avançados
  async searchByAdvancedFilters(filters) {
    try {
      const query = `
        SELECT r.*, 
               COUNT(DISTINCT p.id) as posts_count,
               COUNT(DISTINCT f.user_id) as favorites_count,
               AVG(p.rating) as average_rating,
               ST_Distance(
                 r.location::geography,
                 ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
               ) as distance_meters
        FROM restaurants r
        LEFT JOIN posts p ON r.id = p.restaurant_id
        LEFT JOIN favorites f ON r.id = f.restaurant_id
        WHERE 1=1
      `;

      const values = [this.francaCoordinates.lng, this.francaCoordinates.lat];
      let valueIndex = 3;

      // Aplicar filtros
      if (filters.cuisineType) {
        query += ` AND r.cuisine_type ILIKE $${valueIndex}`;
        values.push(`%${filters.cuisineType}%`);
        valueIndex++;
      }

      if (filters.priceRange) {
        query += ` AND r.price_range = $${valueIndex}`;
        values.push(filters.priceRange);
        valueIndex++;
      }

      if (filters.minRating) {
        query += ` AND (SELECT AVG(rating) FROM posts WHERE restaurant_id = r.id) >= $${valueIndex}`;
        values.push(filters.minRating);
        valueIndex++;
      }

      if (filters.maxDistance) {
        query += ` AND ST_DWithin(
          r.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $${valueIndex}
        )`;
        values.push(filters.maxDistance);
        valueIndex++;
      }

      if (filters.hasPhotos) {
        query += ` AND r.photos IS NOT NULL AND array_length(r.photos, 1) > 0`;
      }

      if (filters.isOpen) {
        query += ` AND r.opening_hours IS NOT NULL`;
      }

      query += `
        GROUP BY r.id, r.location
        ORDER BY 
          average_rating DESC NULLS LAST,
          distance_meters ASC,
          posts_count DESC
        LIMIT ${filters.limit || 20}
      `;

      const result = await pool.query(query, values);
      return result.rows.map(row => ({
        ...row,
        source: 'advanced_filters',
        is_advanced: true
      }));

    } catch (error) {
      console.error('Erro na busca por filtros avançados:', error);
      return [];
    }
  }
}

module.exports = new EnhancedSearchService();
