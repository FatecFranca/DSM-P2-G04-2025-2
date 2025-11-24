import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaUpload, FaTrash, FaEye, FaTimes, FaImage } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './RestaurantPhotoManager.css';

// Criar axios fora do componente para evitar recriação
const createPhotoAxios = (token) => {
  const instance = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  return instance;
};

const RestaurantPhotoManager = ({ restaurant, onPhotosUpdated, onClose }) => {
  const { token } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true); // Começar como true
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Memoizar axios para evitar recriação
  const photoAxios = useMemo(() => createPhotoAxios(token), [token]);

  console.log('🚀 RestaurantPhotoManager renderizado:', { 
    restaurantId: restaurant?.id, 
    token: !!token,
    loading,
    photosCount: photos.length 
  });

  // Declarar fetchPhotos com useCallback para evitar recriação
  const fetchPhotos = useCallback(async () => {
    try {
      console.log('🔄 fetchPhotos iniciado...');
      const response = await photoAxios.get(`/api/restaurant-photos/restaurants/${restaurant.id}/photos`);
      console.log('🔍 fetchPhotos - resposta completa:', response.data);
      console.log('🔍 fetchPhotos - fotos recebidas:', response.data.photos);
      setPhotos(response.data.photos || []);
      console.log('✅ Fotos definidas no estado:', response.data.photos || []);
    } catch (error) {
      console.error('❌ Erro ao buscar fotos:', error);
    } finally {
      console.log('🔄 Definindo loading como false');
      setLoading(false);
    }
  }, [restaurant.id, photoAxios]);

  // Buscar fotos quando o componente montar ou restaurant mudar
  useEffect(() => {
    if (restaurant && restaurant.id && token) {
      console.log('🔄 useEffect executando - buscando fotos...');
      fetchPhotos();
    }
  }, [restaurant, token, fetchPhotos]);

  // Monitorar mudanças no estado loading
  useEffect(() => {
    console.log('🔄 Estado loading mudou para:', loading);
  }, [loading]);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('photos', file);
      });

      const response = await photoAxios.post(
        `/api/restaurant-photos/restaurants/${restaurant.id}/photos/multiple`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        await fetchPhotos();
        if (onPhotosUpdated) {
          onPhotosUpdated();
        }
      }
    } catch (error) {
      console.error('Erro ao fazer upload das fotos:', error);
      alert('Erro ao fazer upload das fotos. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta foto?')) return;

    try {
      setLoading(true);
      await photoAxios.delete(`/api/restaurant-photos/restaurants/${restaurant.id}/photos/${photoId}`);
      await fetchPhotos();
      if (onPhotosUpdated) {
        onPhotosUpdated();
      }
    } catch (error) {
      console.error('Erro ao excluir foto:', error);
      alert('Erro ao excluir foto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };



  const handleDragStart = (e, index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;

    try {
      setLoading(true);
      const newOrder = [...photos];
      const [draggedPhoto] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, draggedPhoto);

      const photoIds = newOrder.map(photo => photo.id);
      await photoAxios.put(`/api/restaurant-photos/restaurants/${restaurant.id}/photos/reorder`, {
        photoOrder: photoIds
      });

      await fetchPhotos();
      if (onPhotosUpdated) {
        onPhotosUpdated();
      }
    } catch (error) {
      console.error('Erro ao reordenar fotos:', error);
      alert('Erro ao reordenar fotos. Tente novamente.');
    } finally {
      setLoading(false);
      setDragIndex(null);
    }
  };

  const handlePreviewPhoto = (photo) => {
    setPreviewPhoto(photo);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewPhoto(null);
  };

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    // Usar a URL completa do backend - garantir que não há duplicação de barras
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
    const fullUrl = `http://localhost:5000${cleanPath}`;
    console.log('🔍 getPhotoUrl:', { photoPath, cleanPath, fullUrl });
    return fullUrl;
  };

  console.log('🔄 Renderizando RestaurantPhotoManager:', { loading, photosCount: photos.length, photos });
  
  if (loading) {
    console.log('⏳ Mostrando loading...');
    return (
      <div className="photo-manager-loading">
        <div className="loading-spinner"></div>
        <p>Carregando fotos...</p>
        <p>Estado: loading={loading.toString()}, fotos={photos.length}</p>
      </div>
    );
  }

  return (
    <div className="restaurant-photo-manager">
      <div className="photo-manager-header">
        <h3>Gerenciar Fotos do Restaurante</h3>
        <div className="photo-upload-section">
          <label className="photo-upload-btn">
            <FaUpload />
            <span>Adicionar Fotos</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
          {uploading && <span className="uploading-text">Fazendo upload...</span>}
        </div>
      </div>

      <div className="photo-grid">
        {photos.length === 0 ? (
          <div className="no-photos">
            <FaImage />
            <p>Nenhuma foto cadastrada</p>
            <p>Adicione fotos para mostrar seu restaurante!</p>
          </div>
        ) : (
          photos.map((photo, index) => (
            <div
              key={photo.id}
              className={`photo-item ${dragIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="photo-image-container">
                <img
                  src={getPhotoUrl(photo.photo_url)}
                  alt={photo.caption || `Foto ${index + 1}`}
                  className="photo-image"
                />
                <div className="photo-overlay">
                  <button
                    className="photo-action-btn preview-btn"
                    onClick={() => handlePreviewPhoto(photo)}
                    title="Visualizar foto"
                  >
                    <FaEye />
                  </button>

                  <button
                    className="photo-action-btn delete-btn"
                    onClick={() => handleDeletePhoto(photo.id)}
                    title="Excluir foto"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              
              <div className="photo-info">
                <div className="photo-caption">
                  {photo.caption || `Foto ${index + 1}`}
                </div>
                <div className="photo-order">
                  Ordem: {photo.photo_order + 1}
                </div>
                
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Preview */}
      {showPreview && previewPhoto && (
        <div className="photo-preview-modal" onClick={closePreview}>
          <div className="photo-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close-btn" onClick={closePreview}>
              <FaTimes />
            </button>
            <img
              src={getPhotoUrl(previewPhoto.photo_url)}
              alt={previewPhoto.caption || 'Foto do restaurante'}
              className="preview-image"
            />
            <div className="preview-info">
              <h4>{previewPhoto.caption || 'Foto do restaurante'}</h4>
              <p>Upload em: {new Date(previewPhoto.created_at).toLocaleDateString('pt-BR')}</p>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantPhotoManager;
