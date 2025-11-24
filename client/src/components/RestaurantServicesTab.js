import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaTimes, FaSave, FaPlus } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './RestaurantServicesTab.css';

const RestaurantServicesTab = ({ restaurant, onServicesUpdated }) => {
  const { token } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceType, setNewServiceType] = useState('');

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

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await restaurantAxiosRef.current.get(`/api/restaurant-features/${restaurant.id}/services/all`);
      
      if (response.data.success) {
        setServices(response.data.services);
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      setError('Erro ao carregar serviços do restaurante');
    } finally {
      setLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    if (restaurant?.id && token) {
      loadServices();
    }
  }, [restaurant?.id, token, loadServices]);

  const handleServiceToggle = (serviceType) => {
    setServices(prev => 
      prev.map(service => 
        service.service_type === serviceType 
          ? { ...service, is_available: !service.is_available }
          : service
      )
    );
  };

  const handleAddCustomService = async () => {
    if (!newServiceName.trim() || !newServiceType.trim()) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await restaurantAxiosRef.current.post(
        `/api/restaurant-features/${restaurant.id}/services`,
        {
          serviceType: newServiceType,
          serviceLabel: newServiceName
        }
      );

      if (response.data.success) {
        // Adicionar o novo serviço à lista
        const newService = response.data.service;
        setServices(prev => [...prev, newService]);
        
        // Limpar campos
        setNewServiceName('');
        setNewServiceType('');
        setShowAddModal(false);
        
        if (onServicesUpdated) {
          onServicesUpdated([...services, newService]);
        }
        
        alert('Serviço personalizado adicionado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao adicionar serviço personalizado:', error);
      setError('Erro ao adicionar serviço. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomService = async (serviceType) => {
    // Verificar se é um serviço padrão
    const defaultServices = [
      'delivery', 'reservas', 'takeaway', 'dine_in', 'rodizio', 
      'buffet', 'a_la_cart', 'self_service', 'drive_thru', 'catering'
    ];
    
    if (defaultServices.includes(serviceType)) {
      alert('Não é possível deletar serviços padrão do sistema');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja deletar o serviço "${serviceType}"?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await restaurantAxiosRef.current.delete(
        `/api/restaurant-features/${restaurant.id}/services/${serviceType}`
      );

      if (response.data.success) {
        // Remover o serviço da lista
        setServices(prev => prev.filter(s => s.service_type !== serviceType));
        
        if (onServicesUpdated) {
          onServicesUpdated(services.filter(s => s.service_type !== serviceType));
        }
        
        alert('Serviço deletado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Erro ao deletar serviço. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Mapear os dados para o formato esperado pelo backend
      const servicesToSave = services.map(service => ({
        type: service.service_type,
        isAvailable: service.is_available
      }));
      
      const response = await restaurantAxiosRef.current.put(
        `/api/restaurant-features/${restaurant.id}/services`,
        { services: servicesToSave }
      );
      
      if (response.data.success) {
        // Atualizar o estado local com os dados retornados pelo backend
        setServices(response.data.services);
        
        if (onServicesUpdated) {
          onServicesUpdated(response.data.services);
        }
        alert('Serviços atualizados com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar serviços:', error);
      setError('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  // Função removida pois não estava sendo utilizada

  const getServiceLabel = (serviceType) => {
    const labels = {
      delivery: 'Delivery',
      reservas: 'Reservas',
      takeaway: 'Takeaway',
      dine_in: 'Comer no local',
      rodizio: 'Rodízio',
      buffet: 'Buffet',
      a_la_cart: 'À la carte',
      self_service: 'Self-service',
      drive_thru: 'Drive-thru',
      catering: 'Catering'
    };
    if (labels[serviceType]) return labels[serviceType];
    const normalized = (serviceType || '')
      .toString()
      .replace(/_/g, ' ')
      .trim()
      .toLocaleLowerCase('pt-BR');
    // Title-case com suporte a Unicode (acentos)
    return normalized.replace(/(^|\s|\()([\p{L}])/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase('pt-BR'));
  };

  const isDefaultService = (serviceType) => {
    const defaultServices = [
      'delivery', 'reservas', 'takeaway', 'dine_in', 'rodizio', 
      'buffet', 'a_la_cart', 'self_service', 'drive_thru', 'catering'
    ];
    return defaultServices.includes(serviceType);
  };

  if (loading) {
    return (
      <div className="services-loading">
        <div className="spinner"></div>
        <p>Carregando serviços...</p>
      </div>
    );
  }

  return (
    <div className="restaurant-services-tab">
      <div className="services-header">
        <h3>Opções de Serviços</h3>
        <p>Marque as opções de serviços disponíveis no seu restaurante</p>
      </div>

      {error && (
        <div className="error-message">
          <FaTimes />
          {error}
        </div>
      )}

      {/* Botão para adicionar novo serviço */}
      <div className="add-service-section">
        <button 
          className="btn btn-secondary add-service-btn"
          onClick={() => setShowAddModal(true)}
        >
          <FaPlus />
          Adicionar Novo Serviço
        </button>
      </div>

      {/* Lista de serviços */}
      <div className="services-list">
        {services.map((service) => (
          <div key={service.service_type} className="service-item">
            <div className="service-info">
              <input
                type="checkbox"
                id={`service-${service.service_type}`}
                checked={service.is_available}
                onChange={() => handleServiceToggle(service.service_type)}
              />
              <label htmlFor={`service-${service.service_type}`}>
                {getServiceLabel(service.service_type)}
              </label>
            </div>
            
            {/* Botão de deletar apenas para serviços personalizados */}
            {!isDefaultService(service.service_type) && (
              <button
                className="delete-service-btn"
                onClick={() => handleDeleteCustomService(service.service_type)}
                title="Deletar serviço personalizado"
                disabled={saving}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="services-actions">
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

      <div className="services-info">
        <h4>Informações sobre os serviços:</h4>
        <ul>
          <li><strong>Delivery:</strong> Entrega de comida no endereço do cliente</li>
          <li><strong>Reservas:</strong> Possibilidade de fazer reservas antecipadas</li>
          <li><strong>Takeaway:</strong> Retirada de comida no local</li>
          <li><strong>Comer no local:</strong> Serviço de mesa e atendimento no local</li>
          <li><strong>Rodízio:</strong> Serviço de rodízio com variedade de pratos</li>
          <li><strong>Buffet:</strong> Sistema de buffet self-service</li>
          <li><strong>À la carte:</strong> Menu com pratos individuais</li>
          <li><strong>Self-service:</strong> Cliente se serve sozinho</li>
          <li><strong>Drive-thru:</strong> Atendimento pelo carro</li>
          <li><strong>Catering:</strong> Serviço para eventos e festas</li>
        </ul>
      </div>

      {/* Modal para adicionar novo serviço */}
      {showAddModal && (
        <div className="add-service-modal-overlay">
          <div className="add-service-modal">
            <div className="modal-header">
              <h4>Adicionar Novo Serviço</h4>
              <button 
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome do Serviço:</label>
                <input
                  type="text"
                  placeholder="Ex: Rodízio, Buffet, etc."
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Tipo do Serviço (identificador):</label>
                <input
                  type="text"
                  placeholder="Ex: rodizio, buffet, etc."
                  value={newServiceType}
                  onChange={(e) => setNewServiceType(e.target.value)}
                />
                <small>Use apenas letras minúsculas e underscores</small>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddCustomService}
                disabled={!newServiceName.trim() || !newServiceType.trim()}
              >
                <FaPlus />
                Adicionar Serviço
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantServicesTab;
