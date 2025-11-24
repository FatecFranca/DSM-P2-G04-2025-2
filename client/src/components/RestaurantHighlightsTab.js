import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaPlus, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './RestaurantHighlightsTab.css';

const RestaurantHighlightsTab = ({ restaurant, onHighlightsUpdated }) => {
  const { token } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [availableHighlights, setAvailableHighlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newHighlight, setNewHighlight] = useState('');

  // Configurar axios com token
  const restaurantAxiosRef = useRef(axios.create({
    baseURL: 'http://localhost:5000',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  }));

  useEffect(() => {
    if (token) {
      restaurantAxiosRef.current.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete restaurantAxiosRef.current.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const loadHighlights = useCallback(async () => {
    try {
      setLoading(true);
      const response = await restaurantAxiosRef.current.get(`/api/restaurant-features/${restaurant.id}/highlights`);
      
      if (response.data.success) {
        setHighlights(response.data.highlights);
      }
    } catch (error) {
      console.error('Erro ao carregar highlights:', error);
      setError('Erro ao carregar highlights do restaurante');
    } finally {
      setLoading(false);
    }
  }, [restaurant.id]);

  const loadAvailableHighlights = useCallback(async () => {
    try {
      const response = await restaurantAxiosRef.current.get('/api/restaurant-features/reference-data');
      
      if (response.data.success) {
        setAvailableHighlights(response.data.data.defaultHighlights);
      }
    } catch (error) {
      console.error('Erro ao carregar highlights disponíveis:', error);
    }
  }, []);

  useEffect(() => {
    if (restaurant?.id && token) {
      loadHighlights();
      loadAvailableHighlights();
    }
  }, [restaurant?.id, token, loadHighlights, loadAvailableHighlights]);

  const addHighlight = (highlightText) => {
    if (!highlightText.trim()) return;
    
    const newHighlightObj = {
      id: Date.now(), // ID temporário
      highlight_text: highlightText,
      is_active: true,
      isNew: true
    };
    
    setHighlights(prev => [...prev, newHighlightObj]);
    setNewHighlight('');
  };

  const removeHighlight = (highlightId) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  };

  const toggleHighlight = (highlightId) => {
    setHighlights(prev => 
      prev.map(h => 
        h.id === highlightId 
          ? { ...h, is_active: !h.is_active }
          : h
      )
    );
  };

  const addFromAvailable = (highlight) => {
    // Verificar se já existe
    const exists = highlights.some(h => h.highlight_text === highlight.text);
    if (exists) return;
    
    const newHighlightObj = {
      id: Date.now(),
      highlight_text: highlight.text,
      is_active: true,
      isNew: true
    };
    
    setHighlights(prev => [...prev, newHighlightObj]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const highlightsToSave = highlights.map(h => ({
        text: h.highlight_text,
        isActive: h.is_active
      }));
      
      const response = await restaurantAxiosRef.current.put(
        `/api/restaurant-features/${restaurant.id}/highlights`,
        { highlights: highlightsToSave }
      );
      
      if (response.data.success) {
        if (onHighlightsUpdated) {
          onHighlightsUpdated(response.data.highlights);
        }
        alert('Highlights atualizados com sucesso!');
        
        // Recarregar highlights para obter IDs reais
        await loadHighlights();
      }
    } catch (error) {
      console.error('Erro ao salvar highlights:', error);
      setError('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="highlights-loading">
        <div className="spinner"></div>
        <p>Carregando highlights...</p>
      </div>
    );
  }

  return (
    <div className="restaurant-highlights-tab">
      <div className="highlights-header">
        <h3>Pontos Positivos (Highlights)</h3>
        <p>Gerencie os pontos positivos que destacam seu restaurante</p>
      </div>

             {error && (
         <div className="error-message">
           <FaTimes />
           {error}
         </div>
       )}

      {/* Adicionar novo highlight */}
      <div className="add-highlight-section">
        <div className="add-highlight-input">
          <input
            type="text"
            placeholder="Digite um novo ponto positivo..."
            value={newHighlight}
            onChange={(e) => setNewHighlight(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addHighlight(newHighlight)}
          />
          <button 
            className="btn btn-primary add-btn"
            onClick={() => addHighlight(newHighlight)}
            disabled={!newHighlight.trim()}
          >
            <FaPlus />
            Adicionar
          </button>
        </div>
      </div>

      {/* Highlights disponíveis */}
      <div className="available-highlights-section">
        <h4>Highlights Disponíveis</h4>
        <div className="available-highlights-grid">
          {availableHighlights.map((highlight, index) => (
            <button
              key={index}
              className="available-highlight-btn"
              onClick={() => addFromAvailable(highlight)}
              disabled={highlights.some(h => h.highlight_text === highlight.text)}
            >
              <span className="highlight-icon">{highlight.icon}</span>
              <span className="highlight-text">{highlight.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Highlights ativos */}
      <div className="active-highlights-section">
        <h4>Highlights Ativos</h4>
        {highlights.length === 0 ? (
          <div className="no-highlights">
            <p>Nenhum highlight configurado ainda.</p>
            <p>Adicione alguns pontos positivos para destacar seu restaurante!</p>
          </div>
        ) : (
          <div className="highlights-list">
            {highlights.map((highlight) => (
              <div 
                key={highlight.id} 
                className={`highlight-item ${highlight.is_active ? 'active' : 'inactive'}`}
              >
                <div className="highlight-content">
                  <span className="highlight-text">{highlight.highlight_text}</span>
                  <span className="highlight-status">
                    {highlight.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="highlight-actions">
                  <button
                    className={`toggle-btn ${highlight.is_active ? 'active' : 'inactive'}`}
                    onClick={() => toggleHighlight(highlight.id)}
                    title={highlight.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {highlight.is_active ? '✓' : '○'}
                  </button>
                  <button
                    className="remove-btn"
                    onClick={() => removeHighlight(highlight.id)}
                    title="Remover"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão salvar */}
      <div className="highlights-actions">
        <button 
          className="btn btn-primary save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="spinner"></div>
              Salvando...
            </>
          ) : (
            <>
              <FaSave />
              Salvar Alterações
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RestaurantHighlightsTab;


