import React, { useState, useEffect } from 'react';
import { FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const CreateRestaurantModal = ({ isOpen, onClose, onRestaurantCreated }) => {
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    headers: { 'Content-Type': 'application/json' }
  });

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const validate = () => {
    const next = {};
    if (!formData.name.trim()) next.name = 'Nome é obrigatório';
    if (!formData.address.trim()) next.address = 'Endereço é obrigatório';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        description: formData.description?.trim() || undefined
      };
      const res = await api.post('/api/restaurants', payload);
      const created = res.data?.restaurant;
      if (created) {
        if (onRestaurantCreated) onRestaurantCreated(created);
        onClose();
        setFormData({ name: '', address: '', description: '' });
        setErrors({});
      }
    } catch (err) {
      setErrors({ general: err.response?.data?.error || 'Erro ao criar restaurante' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3><FaPlus /> Adicionar Restaurante</h3>
        {errors.general && <div style={{ color: '#b91c1c', marginBottom: 10 }}>{errors.general}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor="name">Nome *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'error' : ''}
                required
                style={{ width: '100%', padding: 10, border: '1px solid #ced4da', borderRadius: 6 }}
              />
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>

            <div>
              <label htmlFor="address">Endereço *</label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={errors.address ? 'error' : ''}
                required
                style={{ width: '100%', padding: 10, border: '1px solid #ced4da', borderRadius: 6 }}
              />
              {errors.address && <div className="error-message">{errors.address}</div>}
            </div>

            <div>
              <label htmlFor="description">Descrição</label>
              <textarea
                id="description"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: 10, border: '1px solid #ced4da', borderRadius: 6 }}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              <FaTimes /> Cancelar
            </button>
            <button type="submit" className="confirm-btn" disabled={loading}>
              {loading ? 'Salvando...' : (<><FaSave /> Salvar</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRestaurantModal;


