// Utilitário para mapear dados da API de estabelecimentos para o formato esperado pelo frontend

export const mapEstablishmentToRestaurant = (establishment) => {
  // Mapear tipos de estabelecimentos para categorias de cozinha
  const typeToCategory = {
    'restaurant': 'Restaurante',
    'cafe': 'Café',
    'fast_food': 'Fast Food',
    'bar': 'Bar',
    'bakery': 'Padaria',
    'ice_cream': 'Sorveteria',
    'pub': 'Pub',
    'bistro': 'Bistrô'
  };

  // Gerar rating baseado no nome (para consistência)
  const generateRating = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Gerar rating entre 3.0 e 5.0
    return 3.0 + (Math.abs(hash) % 20) / 10;
  };

  // Gerar preço baseado no tipo e localização
  const generatePriceRange = (type, address) => {
    const typeBasePrices = {
      'restaurant': 3,
      'cafe': 2,
      'fast_food': 1,
      'bar': 2,
      'bakery': 1,
      'ice_cream': 1,
      'pub': 3,
      'bistro': 4
    };

    let basePrice = typeBasePrices[type] || 2;
    
    // Ajustar preço baseado na localização
    if (address && (address.includes('Centro') || address.includes('Av.'))) {
      basePrice = Math.min(basePrice + 1, 5);
    }

    return basePrice;
  };

  return {
    id: establishment.osm_id || establishment.id,
    name: establishment.nome,
    address: establishment.endereco || 'Endereço não informado',
    description: establishment.endereco ? 
      `${typeToCategory[establishment.tipo] || establishment.tipo} localizado em ${establishment.endereco}` :
      `${typeToCategory[establishment.tipo] || establishment.tipo} em ${establishment.cidade}`,
    cuisine_type: typeToCategory[establishment.tipo] || establishment.tipo,
    average_rating: generateRating(establishment.nome),
    price_range: generatePriceRange(establishment.tipo, establishment.endereco),
    image_url: null, // Placeholder para imagens futuras
    phone: establishment.telefone,
    latitude: establishment.latitude,
    longitude: establishment.longitude,
    city: establishment.cidade,
    state: 'SP',
    // Campos adicionais específicos dos estabelecimentos
    establishment_type: establishment.tipo,
    created_at: establishment.created_at || establishment.atualizado_em
  };
};

export const mapEstablishmentsToRestaurants = (establishments) => {
  if (!Array.isArray(establishments)) {
    return [];
  }
  
  return establishments.map(mapEstablishmentToRestaurant);
};

// Mapear filtros do frontend para parâmetros da API de estabelecimentos
export const mapFiltersToApiParams = (filters) => {
  const params = new URLSearchParams();
  
  if (filters.limit) {
    params.append('limit', filters.limit);
  }
  
  if (filters.page) {
    params.append('page', filters.page);
  }
  
  if (filters.search) {
    params.append('search', filters.search);
  }
  
  // Mapear tipos de cozinha para tipos de estabelecimentos
  const cuisineToTypeMapping = {
    'Italiana': 'restaurant',
    'Japonesa': 'restaurant',
    'Chinesa': 'restaurant',
    'Mexicana': 'restaurant',
    'Indiana': 'restaurant',
    'Francesa': 'restaurant',
    'Tailandesa': 'restaurant',
    'Brasileira': 'restaurant',
    'Árabe': 'restaurant',
    'Americana': 'restaurant',
    'Mediterrânea': 'restaurant',
    'Vegetariana': 'restaurant',
    'Vegana': 'restaurant',
    'Fast Food': 'fast_food',
    'Doces': 'bakery',
    'Restaurante': 'restaurant',
    'Café': 'cafe',
    'Bar': 'bar',
    'Padaria': 'bakery',
    'Sorveteria': 'ice_cream'
  };
  
  if (filters.cuisineType && cuisineToTypeMapping[filters.cuisineType]) {
    params.append('tipo', cuisineToTypeMapping[filters.cuisineType]);
  }
  
  if (filters.city) {
    params.append('cidade', filters.city);
  }
  
  return params;
};

// Tipos de cozinha disponíveis baseados nos estabelecimentos reais
export const getAvailableCuisineTypes = () => [
  'Restaurante',
  'Café', 
  'Fast Food',
  'Bar',
  'Padaria',
  'Sorveteria',
  'Pub',
  'Bistrô'
];

// Função para buscar estabelecimentos próximos (usando coordenadas)
export const buildProximityParams = (latitude, longitude, radius = 2000) => {
  const params = new URLSearchParams();
  params.append('lat', latitude);
  params.append('lon', longitude);
  params.append('raio', radius);
  return params;
};

