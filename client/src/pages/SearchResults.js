import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaUtensils, FaUser, FaStar, FaHeart, FaMapMarkerAlt, FaSearch } from 'react-icons/fa';
import axios from 'axios';
import './SearchResults.css';
import './Restaurants.css';

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q');
  const trimmedQuery = (query || '').trim();
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Sincroniza a aba ativa com o parâmetro `type` da URL
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const normalized = (typeParam === 'users' || typeParam === 'restaurants') ? typeParam : 'all';
    if (normalized !== activeTab) {
      setActiveTab(normalized);
      setCurrentPage(1);
    }
  }, [searchParams, activeTab]);

  const performSearch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        q: trimmedQuery,
        type: activeTab,
        page: currentPage,
        limit: 20
      };

      const response = await axios.get('/api/search', { params });
      setSearchResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro na busca');
      console.error('Erro na busca:', err);
    } finally {
      setLoading(false);
    }
  }, [trimmedQuery, activeTab, currentPage]);

  useEffect(() => {
    if (trimmedQuery && trimmedQuery.length >= 2) {
      performSearch();
    }
  }, [trimmedQuery, activeTab, currentPage, performSearch]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    // Atualiza a URL para refletir a aba selecionada
    const next = new URLSearchParams(searchParams);
    next.set('q', query || '');
    if (tab === 'all') {
      next.delete('type');
    } else {
      next.set('type', tab);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="star filled star" />);
    }

    if (hasHalfStar) {
      stars.push(<FaStar key="half" className="star half star" />);
    }

    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaStar key={`empty-${i}`} className="star empty star" />);
    }

    return stars;
  };

  const renderPriceRange = (price) => {
    if (!price || price < 1 || price > 5) {
      return 'Preço não informado';
    }
    return '$'.repeat(price);
  };

  const renderRestaurantCard = (restaurant) => (
    <div key={restaurant.id} className="restaurant-card">
      <div className="restaurant-header-main">
        <h3 className="restaurant-name-main">{restaurant.name || 'Nome não informado'}</h3>
        {restaurant.cuisine_type && (
          <span className="restaurant-cuisine-main">{restaurant.cuisine_type}</span>
        )}
      </div>

      <div className="restaurant-stats">
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
        <div className="stat-item">
          <div className="stat-icon">❤️</div>
          <div className="stat-content">
            <div className="stat-value">{restaurant.favorites_count || 0}</div>
            <div className="stat-label">Favoritos</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{renderPriceRange(restaurant.price_range)}</div>
            <div className="stat-label">Faixa de preço</div>
          </div>
        </div>
      </div>

      {restaurant.address && (
        <div className="restaurant-location-main">
          <FaMapMarkerAlt className="location-icon" />
          <span className="location-text">{restaurant.address}</span>
        </div>
      )}

      {restaurant.description && (
        <div className="restaurant-description-main">
          <p>{restaurant.description}</p>
        </div>
      )}

      <div className="restaurant-footer">
        <Link to={`/restaurant/${restaurant.id}`} className="view-restaurant-btn">
          Ver Detalhes
        </Link>
      </div>
    </div>
  );

  const renderUserCard = (user) => (
    <div key={user.id} className="user-card">
      <div className="user-header">
        <div className="user-avatar">
          {user.profile_picture ? (
            <img 
              src={user.profile_picture} 
              alt={user.name}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="avatar-placeholder" style={{ display: user.profile_picture ? 'none' : 'flex' }}>
            {user.name?.charAt(0)}
          </div>
        </div>
        <div className="user-info">
          <h3 className="user-name">
            <Link to={`/profile/${user.username}`}>
              {user.name}
            </Link>
          </h3>
          <p className="user-username">@{user.username}</p>
        </div>
      </div>
      
      {user.bio && (
        <p className="user-bio">{user.bio}</p>
      )}
      
      <div className="user-stats">
        <span className="stat">
          <FaUser /> {user.followers_count || 0} seguidores
        </span>
        <span className="stat">
          <FaUser /> {user.following_count || 0} seguindo
        </span>
        <span className="stat">
          <FaUtensils /> {user.posts_count || 0} posts
        </span>
      </div>
    </div>
  );

  const renderPagination = (pagination, type) => {
    if (!pagination || pagination.pages <= 1) return null;

    const pages = [];
    const maxPages = 5;
    let startPage = Math.max(1, pagination.current - Math.floor(maxPages / 2));
    let endPage = Math.min(pagination.pages, startPage + maxPages - 1);

    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination">
        {pagination.current > 1 && (
          <button 
            onClick={() => handlePageChange(pagination.current - 1)}
            className="page-btn"
          >
            Anterior
          </button>
        )}
        
        {pages.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`page-btn ${page === pagination.current ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        {pagination.current < pagination.pages && (
          <button 
            onClick={() => handlePageChange(pagination.current + 1)}
            className="page-btn"
          >
            Próxima
          </button>
        )}
      </div>
    );
  };

  if (!trimmedQuery) {
    return (
      <div className="search-results-container">
        <div className="no-query">
          <FaSearch className="search-icon" />
          <h2>Digite algo para buscar</h2>
          <p>Use a barra de busca para encontrar restaurantes e usuários</p>
        </div>
      </div>
    );
  }

  if (trimmedQuery.length < 2) {
    return (
      <div className="search-results-container">
        <div className="no-query">
          <FaSearch className="search-icon" />
          <h2>Digite pelo menos 2 caracteres</h2>
          <p>Sua busca atual tem apenas {trimmedQuery.length} caractere{trimmedQuery.length !== 1 ? 's' : ''}.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="search-results-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Buscando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results-container">
        <div className="error">
          <h2>Erro na busca</h2>
          <p>{error}</p>
          <button onClick={performSearch} className="retry-btn">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const totalResults = searchResults?.searchInfo?.totalResults || 0;
  const hasRestaurants = searchResults?.restaurants?.items?.length > 0;
  const hasUsers = searchResults?.users?.items?.length > 0;

  return (
    <div className="search-results-container">
      <div className="search-header">
        <h1>Resultados da Busca</h1>
        <p className="search-query">
          Buscando por: <strong>"{trimmedQuery}"</strong>
        </p>
        <p className="total-results">
          {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="search-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <FaSearch /> Todos ({totalResults})
        </button>
        <button
          className={`tab-btn ${activeTab === 'restaurants' ? 'active' : ''}`}
          onClick={() => handleTabChange('restaurants')}
        >
          <FaUtensils /> Restaurantes ({searchResults?.restaurants?.pagination?.total || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => handleTabChange('users')}
        >
          <FaUser /> Usuários ({searchResults?.users?.pagination?.total || 0})
        </button>
      </div>

      <div className="search-content">
        {activeTab === 'all' && (
          <>
            {hasRestaurants && (
              <div className="results-section">
                <h2 className="section-title">
                  <FaUtensils /> Restaurantes
                </h2>
                <div className="results-grid">
                  {searchResults.restaurants.items.map(renderRestaurantCard)}
                </div>
                {renderPagination(searchResults.restaurants.pagination, 'restaurants')}
              </div>
            )}

            {hasUsers && (
              <div className="results-section">
                <h2 className="section-title">
                  <FaUser /> Usuários
                </h2>
                <div className="results-grid">
                  {searchResults.users.items.map(renderUserCard)}
                </div>
                {renderPagination(searchResults.users.pagination, 'users')}
              </div>
            )}
          </>
        )}

        {activeTab === 'restaurants' && hasRestaurants && (
          <div className="results-section">
            <h2 className="section-title">
              <FaUtensils /> Restaurantes
            </h2>
            <div className="results-grid">
              {searchResults.restaurants.items.map(renderRestaurantCard)}
            </div>
            {renderPagination(searchResults.restaurants.pagination, 'restaurants')}
          </div>
        )}

        {activeTab === 'users' && hasUsers && (
          <div className="results-section">
            <h2 className="section-title">
              <FaUser /> Usuários
            </h2>
            <div className="results-grid">
              {searchResults.users.items.map(renderUserCard)}
            </div>
            {renderPagination(searchResults.users.pagination, 'users')}
          </div>
        )}

        {!hasRestaurants && !hasUsers && (
          <div className="no-results">
            <FaSearch className="no-results-icon" />
            <h2>Nenhum resultado encontrado</h2>
            <p>Tente usar termos diferentes ou verificar a ortografia</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResults;
