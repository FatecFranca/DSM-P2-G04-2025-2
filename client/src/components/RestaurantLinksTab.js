import React, { useEffect, useState } from 'react';
import { FaGlobe, FaInstagram, FaSave } from 'react-icons/fa';
import { SiIfood } from 'react-icons/si';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const RestaurantLinksTab = ({ restaurant, onLinksUpdated }) => {
  const { token } = useAuth();
  const [form, setForm] = useState({
    website: '',
    instagram: '',
    ifood: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const http = axios.create({ baseURL: 'http://localhost:5000' });

  useEffect(() => {
    if (token) {
      http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token, http.defaults.headers.common]);

  useEffect(() => {
    if (!restaurant) return;
    setForm({
      website: restaurant.website || restaurant.menu_url || restaurant.cardapio_url || '',
      instagram: restaurant.instagram || restaurant.instagram_url || restaurant.social_instagram || '',
      ifood: restaurant.ifood || restaurant.ifood_url || restaurant.social_ifood || ''
    });
  }, [restaurant]);

  const normalizeInstagram = (value) => {
    if (!value) return '';
    let v = String(value).trim();
    if (/^@[A-Za-z0-9._-]+$/.test(v)) v = v.slice(1);
    return v;
  };

  const validate = () => {
    const v = {};
    if (form.website && !/^https?:\/\//i.test(form.website)) {
      v.website = 'Website deve começar com http:// ou https://';
    }
    // Instagram pode ser @user ou URL completa
    const ig = form.instagram?.trim();
    if (ig && /\s/.test(ig)) {
      v.instagram = 'Instagram não deve conter espaços';
    }
    if (form.ifood && !/^https?:\/\//i.test(form.ifood)) {
      v.ifood = 'Link do iFood deve começar com http:// ou https://';
    }
    setErrors(v);
    return Object.keys(v).length === 0;
  };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!validate()) return;
    try {
      setSaving(true);
      const payload = {
        website: form.website?.trim() || null,
        instagram: normalizeInstagram(form.instagram),
        ifood: form.ifood?.trim() || null
      };
      // Converter string vazia para null
      if (!payload.instagram) payload.instagram = null;

      const res = await http.put(`/api/restaurants/${restaurant.id}`, payload);
      if (res.data?.success && onLinksUpdated) {
        onLinksUpdated(res.data.restaurant);
      }
    } catch (err) {
      console.error('Erro ao salvar links do restaurante:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-form">
      <div className="form-section">
        <h3>
          <FaGlobe />
          Links do Restaurante
        </h3>

        {/* Instagram */}
        <div className="form-row links-row">
          <div className="form-group">
            <label htmlFor="instagram">Instagram</label>
            <div className="input-with-icon">
              <FaInstagram className="input-icon" />
              <input
                id="instagram"
                type="text"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className={errors.instagram ? 'error' : ''}
                placeholder="@usuario ou https://instagram.com/usuario"
              />
            </div>
            {errors.instagram && <div className="error-message">{errors.instagram}</div>}
          </div>
        </div>

        {/* iFood */}
        <div className="form-row links-row">
          <div className="form-group">
            <label htmlFor="ifood">iFood</label>
            <div className="input-with-icon">
              <SiIfood className="input-icon" />
              <input
                id="ifood"
                type="url"
                value={form.ifood}
                onChange={(e) => setForm({ ...form, ifood: e.target.value })}
                className={errors.ifood ? 'error' : ''}
                placeholder="https://www.ifood.com.br/..."
              />
            </div>
            {errors.ifood && <div className="error-message">{errors.ifood}</div>}
          </div>
        </div>

        {/* Website */}
        <div className="form-row links-row">
          <div className="form-group">
            <label htmlFor="website">Website / Cardápio</label>
            <div className="input-with-icon">
              <FaGlobe className="input-icon" />
              <input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className={errors.website ? 'error' : ''}
                placeholder="https://..."
              />
            </div>
            {errors.website && <div className="error-message">{errors.website}</div>}
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : (<><FaSave /> Salvar Links</>)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantLinksTab;


