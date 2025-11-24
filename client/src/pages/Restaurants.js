import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStar, FaSearch, FaMapMarkerAlt, FaFilter } from 'react-icons/fa';
import axios from 'axios';
import './Restaurants.css';

const Restaurants = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cuisineType, setCuisineType] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [restaurantsPerPage] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [totalRestaurants, setTotalRestaurants] = useState(0);

  // Calcular índices para paginação
  const indexOfLastRestaurant = currentPage * restaurantsPerPage;
  const indexOfFirstRestaurant = indexOfLastRestaurant - restaurantsPerPage;
  const currentRestaurants = filteredRestaurants.slice(indexOfFirstRestaurant, indexOfLastRestaurant);

  // Função para buscar restaurantes da API
  const fetchRestaurants = useCallback(async (search = '', page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50', // Buscar mais para ter dados para filtrar
        ...(search && { search })
      });

      const response = await axios.get(`/api/restaurants?${params}`);
      
      console.log('Resposta da API:', response.data);
      
      if (response.data.restaurants) {
        console.log('Restaurantes recebidos:', response.data.restaurants);
        setRestaurants(response.data.restaurants);
        setFilteredRestaurants(response.data.restaurants);
        setTotalRestaurants(response.data.restaurants.length);
        setTotalPages(Math.ceil(response.data.restaurants.length / restaurantsPerPage));
      }
    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error);
      setRestaurants([]);
      setFilteredRestaurants([]);
      setTotalRestaurants(0);
    } finally {
      setLoading(false);
    }
  }, [restaurantsPerPage]);

  // Função para buscar restaurantes
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setFilteredRestaurants(restaurants);
      setTotalRestaurants(restaurants.length);
      setTotalPages(Math.ceil(restaurants.length / restaurantsPerPage));
      setCurrentPage(1);
      return;
    }

    const filtered = restaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (restaurant.description && restaurant.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (restaurant.address && restaurant.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredRestaurants(filtered);
    setTotalRestaurants(filtered.length);
    setTotalPages(Math.ceil(filtered.length / restaurantsPerPage));
    setCurrentPage(1);
  };

  // Função para aplicar filtros
  const applyFilters = () => {
    let filtered = restaurants.filter(restaurant => {
      const matchesCuisine = !cuisineType || 
        (restaurant.cuisine_type && restaurant.cuisine_type.toLowerCase() === cuisineType.toLowerCase());
      const matchesPrice = !priceRange || restaurant.price_range === parseInt(priceRange);
      return matchesCuisine && matchesPrice;
    });

    // Aplicar ordenação
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => (a.price_range || 0) - (b.price_range || 0));
    }

    setFilteredRestaurants(filtered);
    setTotalRestaurants(filtered.length);
    setTotalPages(Math.ceil(filtered.length / restaurantsPerPage));
    setCurrentPage(1);
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setCuisineType('');
    setPriceRange('');
    setSortBy('name');
    setFilteredRestaurants(restaurants);
    setTotalRestaurants(restaurants.length);
    setTotalPages(Math.ceil(restaurants.length / restaurantsPerPage));
    setCurrentPage(1);
  };

  // Função para limpar busca
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredRestaurants(restaurants);
    setTotalRestaurants(restaurants.length);
    setTotalPages(Math.ceil(restaurants.length / restaurantsPerPage));
    setCurrentPage(1);
  };

  // Função para mudar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Função para ir para próxima página
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Função para ir para página anterior
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Função para gerar números de página
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // renderStars removido pois não estava sendo utilizado

  // Função para renderizar faixa de preço
  const renderPriceRange = (price) => {
    if (!price || price < 1 || price > 5) {
      return 'Preço não informado';
    }
    return '$'.repeat(price);
  };

  // Função para navegar para a página do restaurante
  const handleRestaurantClick = (restaurantId) => {
    navigate(`/restaurant/${restaurantId}`);
  };

  // Carregar restaurantes ao montar o componente
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando restaurantes...</p>
      </div>
    );
  }

  return (
    <div className="restaurants-page">
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">Descubra os Melhores Restaurantes</h1>
        <p className="hero-subtitle">
          Explore uma variedade incrível de sabores e experiências gastronômicas
        </p>
      </div>

      {/* Busca e Filtros */}
      <div className="search-and-filters">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar restaurantes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="search-button">
            Buscar
          </button>
        </form>

        {searchTerm && (
          <button onClick={clearSearch} className="clear-search-btn">
            Limpar Busca
          </button>
        )}

        <div className="action-buttons">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
          >
            <FaFilter />
            Filtros
          </button>
        </div>
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label htmlFor="cuisine-filter">Tipo de Cozinha</label>
            <select
              id="cuisine-filter"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos os tipos</option>
              <option value="Italiana">Italiana</option>
              <option value="Japonesa">Japonesa</option>
              <option value="Brasileira">Brasileira</option>
              <option value="Padaria">Padaria</option>
              <option value="Fast Food">Fast Food</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="price-filter">Faixa de Preço</label>
            <select
              id="price-filter"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="filter-select"
            >
              <option value="">Todas as faixas</option>
              <option value="1">R$ (Econômico)</option>
              <option value="2">R$R$ (Acessível)</option>
              <option value="3">R$R$R$ (Moderado)</option>
              <option value="4">R$R$R$R$ (Alto)</option>
              <option value="5">R$R$R$R$R$ (Premium)</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-filter">Ordenar por</label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="name">Nome</option>
              <option value="rating">Avaliação</option>
              <option value="price">Preço</option>
            </select>
          </div>

          <button onClick={applyFilters} className="search-button">
            Aplicar Filtros
          </button>

          <button onClick={clearFilters} className="clear-filters">
            Limpar Filtros
          </button>
        </div>
      )}

      {/* Grid de restaurantes */}
      <div className="restaurants-grid">
        {currentRestaurants.map(restaurant => {
          console.log('Renderizando restaurante:', restaurant);
          return (
            <div 
              key={restaurant.id} 
              className="restaurant-card"
              onClick={() => handleRestaurantClick(restaurant.id)}
            >
              {/* Header do card com informações principais */}
              <div className="restaurant-header-main">
                {/* Nome do restaurante em destaque */}
                <h3 className="restaurant-name-main">
                  {restaurant.name || 'Nome não informado'}
                </h3>
                
                {/* Tipo de cozinha */}
                {restaurant.cuisine_type && (
                  <span className="restaurant-cuisine-main">
                    {restaurant.cuisine_type}
                  </span>
                )}
              </div>
              
              {/* Informações de avaliação e popularidade */}
              <div className="restaurant-stats">
                {/* Avaliação */}
                <div className="stat-item">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {restaurant.average_rating ? `${restaurant.average_rating}/5.0` : 'Sem avaliação'}
                    </div>
                    <div className="stat-label">
                      {restaurant.posts_count ? `${restaurant.posts_count} avaliações` : 'Nenhuma avaliação'}
                    </div>
                  </div>
                </div>
                
                {/* Favoritos */}
                <div className="stat-item">
                  <div className="stat-icon">❤️</div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {restaurant.favorites_count || 0}
                    </div>
                    <div className="stat-label">Favoritos</div>
                  </div>
                </div>
                
                {/* Faixa de preço */}
                <div className="stat-item">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {renderPriceRange(restaurant.price_range)}
                    </div>
                    <div className="stat-label">Faixa de preço</div>
                  </div>
                </div>
              </div>
              
              {/* Endereço */}
              {restaurant.address && (
                <div className="restaurant-location-main">
                  <FaMapMarkerAlt className="location-icon" />
                  <span className="location-text">{restaurant.address}</span>
                </div>
              )}
              
              {/* Descrição */}
              {restaurant.description && (
                <div className="restaurant-description-main">
                  <p>{restaurant.description}</p>
                </div>
              )}
              
              {/* Botão de ação */}
              <div className="restaurant-footer">
                <button 
                  className="view-restaurant-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestaurantClick(restaurant.id);
                  }}
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Informações dos resultados */}
      {filteredRestaurants.length > 0 && (
        <div className="results-info">
          <p>
            Mostrando {currentRestaurants.length} de {totalRestaurants} restaurantes
            {searchTerm && ` para "${searchTerm}"`}
            {(cuisineType || priceRange) && ` com filtros aplicados`}
            {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
          </p>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Anterior
          </button>

          <div className="page-numbers">
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="pagination-dots">...</span>
                ) : (
                  <button
                    onClick={() => handlePageChange(page)}
                    className={`page-btn ${page === currentPage ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Mensagem quando não há resultados */}
      {filteredRestaurants.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🍽️</div>
          <h3>Nenhum restaurante encontrado</h3>
          <p>
            {searchTerm 
              ? `Não encontramos restaurantes para "${searchTerm}"`
              : 'Tente ajustar os filtros ou fazer uma nova busca'
            }
          </p>
          <button onClick={clearSearch} className="search-button">
            Ver Todos os Restaurantes
          </button>
        </div>
      )}
    </div>
  );
};

export default Restaurants;
