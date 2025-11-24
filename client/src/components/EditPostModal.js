import React, { useState, useEffect } from 'react';
import { FaTimes, FaStar, FaCamera, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './EditPostModal.css';

const EditPostModal = ({ post, isOpen, onClose, onPostUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rating: 0
  });
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (post && isOpen) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
        rating: post.rating || 0
      });
      setExistingPhotos(post.photos || []);
      setPhotos([]);
      setError('');
    }
  }, [post, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const removeExistingPhoto = (index) => {
    setExistingPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const uploadPhotos = async () => {
    const uploadedPhotos = [];
    
    for (const photo of photos) {
      const formData = new FormData();
      formData.append('photo', photo.file);
      
      try {
        const response = await axios.post('/api/posts/upload-photo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        uploadedPhotos.push(response.data.photoUrl);
      } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        throw new Error('Erro ao fazer upload das fotos');
      }
    }
    
    return uploadedPhotos;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let allPhotoUrls = [...existingPhotos.map(p => p.photo_url)];
      
      if (photos.length > 0) {
        const newPhotoUrls = await uploadPhotos();
        allPhotoUrls = [...allPhotoUrls, ...newPhotoUrls];
      }

      const response = await axios.put(`/api/posts/${post.id}`, {
        title: formData.title,
        content: formData.content,
        rating: formData.rating,
        photos: allPhotoUrls
      });

      onPostUpdated(response.data.post);
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
      setError(error.response?.data?.error || 'Erro ao atualizar post');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={`star ${index < rating ? 'filled' : ''}`}
        onClick={() => handleRatingChange(index + 1)}
      />
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Avaliação</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-post-form">
          <div className="form-group">
            <label htmlFor="title">Título (opcional)</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Título da sua avaliação"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Avaliação *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Conte-nos sobre sua experiência..."
              required
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="form-group">
            <label>Avaliação *</label>
            <div className="rating-input">
              {renderStars(formData.rating)}
              <span className="rating-text">{formData.rating}/5</span>
            </div>
          </div>

          <div className="form-group">
            <label>Fotos</label>
            <div className="photo-upload">
              <label htmlFor="photo-upload" className="upload-button">
                <FaCamera />
                Adicionar Fotos
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </div>
            
            {existingPhotos.length > 0 && (
              <div className="existing-photos">
                <h4>Fotos atuais:</h4>
                <div className="photo-grid">
                  {existingPhotos.map((photo, index) => (
                    <div key={index} className="photo-item">
                      <img src={photo.photo_url} alt={`Foto ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-photo"
                        onClick={() => removeExistingPhoto(index)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {photos.length > 0 && (
              <div className="new-photos">
                <h4>Novas fotos:</h4>
                <div className="photo-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-item">
                      <img src={photo.preview} alt={`Nova foto ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-photo"
                        onClick={() => removePhoto(index)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;
