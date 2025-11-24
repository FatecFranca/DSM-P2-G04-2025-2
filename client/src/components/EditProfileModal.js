import React, { useState } from 'react';
import ImageUpload from './ImageUpload';
import './EditProfileModal.css';

const EditProfileModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  user, 
  onImageUpload 
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    profile_picture: user?.profile_picture || '',
    cover_picture: user?.cover_picture || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (type, imageUrl) => {
    setFormData(prev => ({
      ...prev,
      [type === 'avatar' ? 'profile_picture' : 'cover_picture']: imageUrl
    }));
    
    if (onImageUpload) {
      onImageUpload(type, imageUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Perfil</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="form-section">
            <h3>Foto de Perfil</h3>
            <div className="avatar-upload-container">
              <ImageUpload
                type="avatar"
                currentImage={formData.profile_picture}
                onUploadSuccess={(imageUrl) => handleImageUpload('avatar', imageUrl)}
                onUploadError={(error) => console.error('Erro no upload:', error)}
                className="avatar-upload"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Foto de Capa</h3>
            <ImageUpload
              type="cover"
              currentImage={formData.cover_picture}
              onUploadSuccess={(imageUrl) => handleImageUpload('cover', imageUrl)}
              onUploadError={(error) => console.error('Erro no upload:', error)}
              className="cover-upload"
            />
          </div>

          <div className="form-section">
            <h3>Informações Pessoais</h3>
            
            <div className="form-group">
              <label htmlFor="name">Nome</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Seu nome completo"
                maxLength="50"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">Biografia</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Conte um pouco sobre você..."
                maxLength="500"
                rows="4"
              />
              <span className="char-count">{formData.bio.length}/500</span>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
