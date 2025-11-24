import React, { useState, useEffect } from 'react';
import { FaEdit, FaSave, FaTimes, FaMapMarkerAlt, FaGlobe, FaCamera, FaCog, FaStar, FaClock } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
// ImageUpload removido pois não estava sendo utilizado
import RestaurantPhotoManager from './RestaurantPhotoManager';
import RestaurantServicesTab from './RestaurantServicesTab';
import RestaurantHighlightsTab from './RestaurantHighlightsTab';
import RestaurantOperatingHoursTab from './RestaurantOperatingHoursTab';
import RestaurantLinksTab from './RestaurantLinksTab';
import './EditRestaurantModal.css';

const EditRestaurantModal = ({ restaurant, isOpen, onClose, onRestaurantUpdated }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'photos', 'services', 'highlights', 'operating-hours', 'links'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    website: '',
    cuisine_type: '',
    price_range: '',
    source_type: '',
    source_id: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  // Preview de imagem removido pois não estava sendo utilizado

  // Configurar axios com token
  const restaurantAxios = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  useEffect(() => {
    if (token) {
      restaurantAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token, restaurantAxios.defaults.headers.common]);

  useEffect(() => {
    if (restaurant && isOpen) {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        cuisine_type: restaurant.cuisine_type || '',
        price_range: restaurant.price_range || '',
        source_type: restaurant.source_type || 'OSM',
        source_id: restaurant.source_id || ''
      });

      // Configurar previews de imagens existentes - removido pois não estava sendo utilizado
    }
  }, [restaurant, isOpen]);

  // handleInputChange removido pois não estava sendo utilizado

  const handleImageUpload = async (type, file) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);
      formData.append('restaurantId', restaurant.id);

      const response = await restaurantAxios.post('/api/restaurants/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // setImages(prev => ({ // This line was removed as per the edit hint
        //   ...prev,
        //   [type]: file
        // }));
        
        // setImagePreview removido pois não estava sendo utilizado

        // Atualizar o restaurante com a nova URL da imagem
        if (type === 'main_photo') {
          restaurant.main_photo_url = response.data.imageUrl;
        } else if (type === 'logo') {
          restaurant.logo_url = response.data.imageUrl;
        }
      }
    } catch (error) {
      console.error(`Erro ao fazer upload da ${type}:`, error);
      setErrors(prev => ({
        ...prev,
        [type]: 'Erro ao fazer upload da imagem'
      }));
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Endereço é obrigatório';
    }
    
    if (formData.phone && !/^[\d\s()\-+]+$/.test(formData.phone)) {
      newErrors.phone = 'Telefone deve conter apenas números, espaços, parênteses, hífens e +';
    }
    
    // Validação do website movida para a aba de Links
    
    if (formData.price_range && (formData.price_range < 1 || formData.price_range > 5)) {
      newErrors.price_range = 'Faixa de preço deve ser entre 1 e 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const { website: _omitWebsite, ...restForm } = formData;
      const updateData = {
        ...restForm,
        id: restaurant.id,
        // Garantir que price_range seja um número
        price_range: formData.price_range ? parseInt(formData.price_range) : null
      };

      // Debug: log dos dados sendo enviados
      console.log('Dados sendo enviados para atualização:', updateData);
      console.log('Tipo do price_range:', typeof updateData.price_range, 'Valor:', updateData.price_range);

      const response = await restaurantAxios.put(`/api/restaurants/${restaurant.id}`, updateData);
      
      if (response.data.success) {
        // Atualizar o restaurante local
        Object.assign(restaurant, response.data.restaurant);
        
        // Chamar callback para atualizar a interface
        if (onRestaurantUpdated) {
          onRestaurantUpdated(response.data.restaurant);
        }
        
        onClose();
      }
    } catch (error) {
      console.error('Erro ao atualizar restaurante:', error);
      console.error('Resposta do servidor:', error.response?.data);
      setErrors(prev => ({
        ...prev,
        general: error.response?.data?.error || 'Erro ao atualizar restaurante'
      }));
    } finally {
      setLoading(false);
    }
  };

  // handleSourceTypeChange removido pois não estava sendo utilizado

  // renderSourceInfo removido pois não estava sendo utilizado

  // handleRestaurantUpdated removido pois não estava sendo utilizado

  const handlePhotosUpdated = () => {
    // Atualizar as fotos no restaurante sem fechar o modal
    // Apenas recarregar os dados do restaurante se necessário
    console.log('🔄 Fotos atualizadas, mantendo modal aberto');
  };

  if (!isOpen || !restaurant) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Restaurante</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Abas */}
        <div className="modal-tabs">
          <button
            className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <FaEdit />
            Informações
          </button>
          <button
            className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            <FaCamera />
            Fotos ({restaurant.photos ? restaurant.photos.length : 0})
          </button>
          <button
            className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <FaCog />
            Serviços
          </button>
          <button
            className={`tab-button ${activeTab === 'highlights' ? 'active' : ''}`}
            onClick={() => setActiveTab('highlights')}
          >
            <FaStar />
            Highlights
          </button>
          <button
            className={`tab-button ${activeTab === 'operating-hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('operating-hours')}
          >
            <FaClock />
            Horários
          </button>
          <button
            className={`tab-button ${activeTab === 'links' ? 'active' : ''}`}
            onClick={() => setActiveTab('links')}
          >
            <FaGlobe />
            Links
          </button>
        </div>

        {/* Conteúdo das abas */}
        {activeTab === 'info' && (
          <div className="tab-content">
            <div className="edit-form">
              <div className="form-section">
                <h3>
                  <FaEdit />
                  Informações Básicas
                </h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Nome do Restaurante *</label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={errors.name ? 'error' : ''}
                      required
                    />
                    {errors.name && <div className="error-message">{errors.name}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="cuisine_type">Tipo de Culinária</label>
                    <input
                      type="text"
                      id="cuisine_type"
                      value={formData.cuisine_type}
                      onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="address">Endereço</label>
                    <div className="input-with-icon">
                      <FaMapMarkerAlt className="input-icon" />
                      <input
                        type="text"
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className={errors.address ? 'error' : ''}
                      />
                    </div>
                    {errors.address && <div className="error-message">{errors.address}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">Telefone</label>
                    <input
                      type="text"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <div className="error-message">{errors.phone}</div>}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="price_range">Faixa de Preço</label>
                    <select
                      id="price_range"
                      value={formData.price_range}
                      onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      <option value="1">$ - Econômico</option>
                      <option value="2">$$ - Moderado</option>
                      <option value="3">$$$ - Alto</option>
                      <option value="4">$$$$ - Premium</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Descrição</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="4"
                  />
                </div>
              </div>
              
              {/* Informações da Fonte */}
              {restaurant && (restaurant.source_type || restaurant.source_id) && (
                <div className={`source-info ${restaurant.source_type || 'manual'}`}>
                  <span className="source-icon">
                    {restaurant.source_type === 'osm' ? '🗺️' : 
                     restaurant.source_type === 'google' ? '🔍' : '✏️'}
                  </span>
                  <span>
                    Fonte: {restaurant.source_type === 'osm' ? 'OpenStreetMap' : 
                            restaurant.source_type === 'google' ? 'Google Places' : 'Manual'}
                  </span>
                  {restaurant.source_id && (
                    <span className="source-id">ID: {restaurant.source_id}</span>
                  )}
                </div>
              )}
              
              {/* Botões de Ação */}
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  <FaTimes />
                  Cancelar
                </button>
                
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
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
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="tab-content">
            <RestaurantPhotoManager
              restaurant={restaurant}
              onPhotosUpdated={handlePhotosUpdated}
              onClose={onClose}
            />
          </div>
        )}

        {activeTab === 'services' && (
          <div className="tab-content">
            <RestaurantServicesTab
              restaurant={restaurant}
              onServicesUpdated={(services) => {
                console.log('Serviços atualizados:', services);
              }}
            />
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="tab-content">
            <RestaurantHighlightsTab
              restaurant={restaurant}
              onHighlightsUpdated={(highlights) => {
                console.log('Highlights atualizados:', highlights);
              }}
            />
          </div>
        )}

        {activeTab === 'operating-hours' && (
          <div className="tab-content">
            <RestaurantOperatingHoursTab
              restaurant={restaurant}
              onOperatingHoursUpdated={(operatingHours) => {
                console.log('Horários atualizados:', operatingHours);
              }}
            />
          </div>
        )}

        {activeTab === 'links' && (
          <div className="tab-content">
            <RestaurantLinksTab
              restaurant={restaurant}
              onLinksUpdated={(updated) => {
                if (updated && onRestaurantUpdated) {
                  onRestaurantUpdated(updated);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EditRestaurantModal;
