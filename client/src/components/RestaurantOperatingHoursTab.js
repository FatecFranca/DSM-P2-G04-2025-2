import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaClock, FaSave, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './RestaurantOperatingHoursTab.css';

const RestaurantOperatingHoursTab = ({ restaurant, onOperatingHoursUpdated }) => {
  const { token } = useAuth();
  const [operatingHours, setOperatingHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);

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

  const loadOperatingHours = useCallback(async () => {
    try {
      setLoading(true);
      const response = await restaurantAxiosRef.current.get(`/api/restaurant-features/${restaurant.id}/operating-hours`);
      
      if (response.data.success) {
        setOperatingHours(response.data.operatingHours);
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
      setError('Erro ao carregar horários do restaurante');
    } finally {
      setLoading(false);
    }
  }, [restaurant.id]);

  const loadCurrentStatus = useCallback(async () => {
    try {
      const response = await restaurantAxiosRef.current.get(`/api/restaurant-features/${restaurant.id}/status`);
      
      if (response.data.success) {
        setCurrentStatus(response.data.status);
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  }, [restaurant.id]);

  useEffect(() => {
    if (restaurant?.id && token) {
      loadOperatingHours();
      loadCurrentStatus();
    }
  }, [restaurant?.id, token, loadOperatingHours, loadCurrentStatus]);

  const handleTimeChange = (dayOfWeek, field, value) => {
    setOperatingHours(prev => 
      prev.map(hour => 
        hour.day_of_week === dayOfWeek 
          ? { ...hour, [field]: value }
          : hour
      )
    );
  };

  const handleClosedToggle = (dayOfWeek) => {
    setOperatingHours(prev => 
      prev.map(hour => 
        hour.day_of_week === dayOfWeek 
          ? { ...hour, is_closed: !hour.is_closed }
          : hour
      )
    );
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // Remove segundos se houver
  };

  const getDayName = (dayOfWeek) => {
    const days = [
      'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
      'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];
    return days[dayOfWeek] || `Dia ${dayOfWeek}`;
  };

  const getDayShort = (dayOfWeek) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[dayOfWeek] || `D${dayOfWeek}`;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const hoursToSave = operatingHours.map(hour => ({
        dayOfWeek: hour.day_of_week,
        openTime: hour.open_time,
        closeTime: hour.close_time,
        isClosed: hour.is_closed
      }));
      
      const response = await restaurantAxiosRef.current.put(
        `/api/restaurant-features/${restaurant.id}/operating-hours`,
        { operatingHours: hoursToSave }
      );
      
      if (response.data.success) {
        if (onOperatingHoursUpdated) {
          onOperatingHoursUpdated(response.data.operatingHours);
        }
        alert('Horários atualizados com sucesso!');
        
        // Recarregar status atual
        await loadCurrentStatus();
      }
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      setError('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="operating-hours-loading">
        <div className="spinner"></div>
        <p>Carregando horários...</p>
      </div>
    );
  }

  return (
    <div className="restaurant-operating-hours-tab">
      <div className="operating-hours-header">
        <h3>Horários de Funcionamento</h3>
        <p>Configure os horários de funcionamento do seu restaurante (UTC-3 - Horário de Brasília)</p>
      </div>

      {/* Status atual */}
      {currentStatus && (
        <div className="current-status-section">
          <h4>Status Atual</h4>
          <div className={`status-card ${currentStatus.is_open ? 'open' : 'closed'}`}>
            <div className="status-icon">
              <FaClock />
            </div>
            <div className="status-info">
              <span className="status-text">
                {currentStatus.is_open ? 'Aberto' : 'Fechado'}
              </span>
              <span className="status-details">
                {currentStatus.is_open 
                  ? `Abre às ${currentStatus.open_time}`
                  : `Fechado - Próxima abertura às ${currentStatus.open_time}`
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <FaTimes />
          {error}
        </div>
      )}

      {/* Horários por dia */}
      <div className="operating-hours-section">
        <h4>Configurar Horários</h4>
        <div className="hours-grid">
          {operatingHours.map((hour) => (
            <div key={hour.day_of_week} className="day-hours-card">
              <div className="day-header">
                <h5>{getDayName(hour.day_of_week)}</h5>
                <span className="day-short">{getDayShort(hour.day_of_week)}</span>
              </div>
              
              <div className="hours-content">
                <div className="closed-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={!hour.is_closed}
                      onChange={() => handleClosedToggle(hour.day_of_week)}
                    />
                    <span className="toggle-text">
                      {hour.is_closed ? 'Fechado' : 'Aberto'}
                    </span>
                  </label>
                </div>
                
                {!hour.is_closed && (
                  <div className="time-inputs">
                    <div className="time-input-group">
                      <label>Abre às:</label>
                      <input
                        type="time"
                        value={formatTime(hour.open_time)}
                        onChange={(e) => handleTimeChange(hour.day_of_week, 'open_time', e.target.value)}
                        className="time-input"
                      />
                    </div>
                    
                    <div className="time-input-group">
                      <label>Fecha às:</label>
                      <input
                        type="time"
                        value={formatTime(hour.close_time)}
                        onChange={(e) => handleTimeChange(hour.day_of_week, 'close_time', e.target.value)}
                        className="time-input"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Informações importantes */}
      <div className="operating-hours-info">
        <h4>Informações Importantes</h4>
        <ul>
          <li><strong>Fuso Horário:</strong> Todos os horários são configurados no fuso UTC-3 (Horário de Brasília)</li>
          <li><strong>Status Automático:</strong> O sistema automaticamente mostra se o restaurante está aberto ou fechado</li>
          <li><strong>Flexibilidade:</strong> Você pode configurar horários diferentes para cada dia da semana</li>
          <li><strong>Dias Fechados:</strong> Marque "Fechado" para dias em que o restaurante não funciona</li>
        </ul>
      </div>

      {/* Botão salvar */}
      <div className="operating-hours-actions">
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
              Salvar Horários
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RestaurantOperatingHoursTab;


