import React, { useState } from 'react';
import { FaSearch, FaMapMarkerAlt, FaStar, FaRobot, FaPlus, FaCheck, FaSpinner, FaUtensils, FaInfoCircle, FaGlobe, FaHome } from 'react-icons/fa';
import axios from 'axios';
import './AIRestaurantSearch.css';

const AIRestaurantSearch = ({ onRestaurantAdded, show, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [addingRestaurant, setAddingRestaurant] = useState(null);
  const [addedRestaurants, setAddedRestaurants] = useState(new Set());

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim() || searchTerm.length < 2) {
      alert('Digite pelo menos 2 caracteres para buscar');
      return;
    }

    setLoading(true);
    setSearchResults(null);

    try {
      const response = await axios.get('/api/ai-restaurant-search/search', {
        params: {
          q: searchTerm.trim(),
          lat: -20.5386, // Franca-SP
          lng: -47.4008,
          city: 'Franca'
        }
      });

      setSearchResults(response.data);
    } catch (error) {
      console.error('Erro na busca por IA:', error);
      alert('Erro ao buscar restaurantes. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRestaurant = async (suggestion) => {
    const suggestionId = suggestion.place_id || suggestion.id || `temp_${Date.now()}`;
    
    if (addedRestaurants.has(suggestionId)) {
      alert('Este restaurante já foi adicionado!');
      return;
    }

    setAddingRestaurant(suggestionId);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Você precisa estar logado para adicionar restaurantes');
        return;
      }

      // Preparar dados do restaurante
      const restaurantData = {
        name: suggestion.name || 'Restaurante sem nome',
        description: suggestion.description || `${suggestion.cuisine_type || suggestion.establishment_type || 'Estabelecimento'} em Franca-SP`,
        address: suggestion.address || 'Endereço não informado',
        latitude: suggestion.latitude || -20.5386,
        longitude: suggestion.longitude || -47.4008,
        cuisine_type: suggestion.cuisine_type || suggestion.establishment_type || 'Restaurante',
        price_level: suggestion.price_level || 3,
        phone_number: suggestion.phone_number || null,
        website: suggestion.website || null,
        external_id: suggestion.place_id || suggestionId,
        source: suggestion.source || 'ai_search'
      };

      const response = await axios.post('/api/ai-restaurant-search/add-restaurant', restaurantData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Marcar como adicionado
      setAddedRestaurants(prev => new Set([...prev, suggestionId]));
      
      // Notificar componente pai se callback foi fornecido
      if (onRestaurantAdded) {
        onRestaurantAdded(response.data.restaurant);
      }

      alert(`${suggestion.name || 'Restaurante'} foi adicionado com sucesso!`);

    } catch (error) {
      console.error('Erro ao adicionar restaurante:', error);
      
      if (error.response?.status === 409) {
        alert('Este restaurante já existe na base de dados!');
        setAddedRestaurants(prev => new Set([...prev, suggestionId]));
      } else {
        alert('Erro ao adicionar restaurante. Tente novamente.');
      }
    } finally {
      setAddingRestaurant(null);
    }
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="no-rating">Sem avaliação</span>;
    
    const numericRating = parseFloat(rating);
    const roundedRating = Math.round(numericRating * 2) / 2;
    
    return (
      <div className="rating-display">
        {[...Array(5)].map((_, index) => (
          <FaStar
            key={index}
            className={index < roundedRating ? 'star filled' : 'star'}
          />
        ))}
        <span className="rating-number">{numericRating.toFixed(1)}</span>
      </div>
    );
  };

  const renderPriceLevel = (priceLevel) => {
    if (!priceLevel) return 'R$$ (Moderado)';
    const priceLabels = {
      1: 'R$ (Econômico)',
      2: 'R$$ (Acessível)',
      3: 'R$$$ (Moderado)',
      4: 'R$$$$ (Caro)',
      5: 'R$$$$$ (Premium)'
    };
    return priceLabels[priceLevel] || 'R$$$ (Moderado)';
  };

  const getSourceIcon = (source) => {
    if (!source) return <FaUtensils className="source-icon" />;
    if (source.includes('openai') || source.includes('ai')) {
      return <FaRobot className="source-icon ai" />;
    }
    if (source.includes('gemini')) {
      return <FaRobot className="source-icon gemini" />;
    }
    if (source.includes('google')) {
      return <FaMapMarkerAlt className="source-icon google" />;
    }
    if (source.includes('osm') || source.includes('openstreetmap')) {
      return <FaGlobe className="source-icon osm" />;
    }
    if (source.includes('local') || source.includes('fallback')) {
      return <FaHome className="source-icon local" />;
    }
    return <FaUtensils className="source-icon" />;
  };

  const getSourceLabel = (source) => {
    if (!source) return 'Sistema';
    if (source.includes('openai') || source.includes('ai')) {
      return 'OpenAI AI';
    }
    if (source.includes('gemini')) {
      return 'Gemini AI';
    }
    if (source.includes('google')) {
      return 'Google Places';
    }
    if (source.includes('osm') || source.includes('openstreetmap')) {
      return 'OpenStreetMap';
    }
    if (source.includes('local') || source.includes('fallback')) {
      return 'Sugestões Locais';
    }
    if (source.includes('proximity')) {
      return 'Busca por Proximidade';
    }
    return 'Sistema';
  };

  if (!show) return null;

  return (
    <div className="ai-search-modal">
      <div className="ai-search-content">
        <div className="ai-search-header">
          <h2>
            <FaRobot /> Busca Inteligente de Restaurantes
          </h2>
          <p className="search-subtitle">
            🏙️ Focado em <strong>Franca-SP</strong> - Restaurantes, Bares, Lanchonetes e Padarias
          </p>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSearch} className="ai-search-form">
          <div className="search-input-group">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Digite o nome do restaurante que procura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ai-search-input"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="ai-search-button"
              disabled={loading || searchTerm.length < 2}
            >
              {loading ? <FaSpinner className="spinning" /> : 'Buscar com IA'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="loading-section">
            <FaSpinner className="spinning" />
            <p>Buscando restaurantes em Franca-SP...</p>
            <small>Verificando base local, Google Places e gerando sugestões inteligentes</small>
          </div>
        )}

        {searchResults && (
          <div className="search-results-section">
            <div className="results-header">
              <h3>
                Resultados para "{searchResults.searchTerm}" em {searchResults.location || 'Franca-SP'}
              </h3>
              
              {searchResults.found_in_local ? (
                <div className="result-info success">
                  <FaCheck /> Encontrado na base local!
                </div>
              ) : (
                <div className="result-info ai">
                  <FaRobot /> Sugestões encontradas via busca inteligente
                  {searchResults.sources_used && (
                    <small>Fontes: {searchResults.sources_used.map(getSourceLabel).join(', ')}</small>
                  )}
                </div>
              )}
            </div>

            <div className="suggestions-grid">
              {(searchResults.restaurants || searchResults.suggestions || []).map((suggestion, index) => (
                <div key={suggestion.place_id || suggestion.id || index} className="suggestion-card">
                  <div className="suggestion-header">
                    <h4 className="suggestion-name">{suggestion.name || 'Restaurante sem nome'}</h4>
                    <div className="suggestion-source">
                      {getSourceIcon(suggestion.source)}
                      <span>{getSourceLabel(suggestion.source)}</span>
                    </div>
                  </div>

                  <div className="suggestion-details">
                    {suggestion.establishment_category && (
                      <span className="establishment-type">
                        {suggestion.establishment_category}
                      </span>
                    )}
                    
                    {suggestion.cuisine_type && (
                      <span className="cuisine-type">
                        {suggestion.cuisine_type}
                      </span>
                    )}

                    <div className="suggestion-rating">
                      {renderStars(suggestion.rating)}
                      {suggestion.user_ratings_total && (
                        <span className="reviews-count">
                          ({suggestion.user_ratings_total} avaliações)
                        </span>
                      )}
                    </div>

                    <div className="suggestion-price">
                      {renderPriceLevel(suggestion.price_level)}
                    </div>

                    {suggestion.address && (
                      <div className="suggestion-address">
                        <FaMapMarkerAlt />
                        <span>{suggestion.address}</span>
                      </div>
                    )}

                    {suggestion.description && (
                      <p className="suggestion-description">
                        {suggestion.description}
                      </p>
                    )}

                    {suggestion.confidence_score && (
                      <div className="confidence-score">
                        <FaInfoCircle />
                        <span>Confiança: {(suggestion.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>

                  <div className="suggestion-actions">
                    {(() => {
                      const suggestionId = suggestion.place_id || suggestion.id || `temp_${Date.now()}`;
                      return addedRestaurants.has(suggestionId) ? (
                        <button className="added-button" disabled>
                          <FaCheck /> Adicionado
                        </button>
                      ) : (
                        <button
                          className="add-button"
                          onClick={() => handleAddRestaurant(suggestion)}
                          disabled={addingRestaurant === suggestionId}
                        >
                          {addingRestaurant === suggestionId ? (
                            <>
                              <FaSpinner className="spinning" /> Adicionando...
                            </>
                          ) : (
                            <>
                              <FaPlus /> Adicionar à Base
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {(!searchResults.restaurants && !searchResults.suggestions) || 
             (searchResults.restaurants && searchResults.restaurants.length === 0) ||
             (searchResults.suggestions && searchResults.suggestions.length === 0) ? (
              <div className="no-results">
                <FaRobot />
                <h3>Nenhum resultado encontrado</h3>
                <p>Não encontramos restaurantes similares a "{searchResults.searchTerm}" em Franca-SP.</p>
                <small>Tente usar termos diferentes ou mais específicos.</small>
              </div>
            ) : null}
          </div>
        )}

        <div className="ai-search-footer">
          <small>
            <FaInfoCircle /> A busca inteligente combina dados locais, Google Places e sugestões de IA 
            para encontrar os melhores estabelecimentos de Franca-SP
          </small>
        </div>
      </div>
    </div>
  );
};

export default AIRestaurantSearch;
