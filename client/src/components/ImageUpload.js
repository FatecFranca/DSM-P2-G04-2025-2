import React, { useState, useRef } from 'react';
import axios from 'axios';
import defaultAvatar from '../assets/default-avatar.svg';
import defaultCover from '../assets/default-cover.svg';
import './ImageUpload.css';

const ImageUpload = ({ 
  onUploadSuccess, 
  onUploadError, 
  type = 'avatar', // 'avatar', 'cover', 'main_photo', 'logo'
  currentImage,
  className = '',
  restaurantId = null,
  axiosInstance = null
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Determinar imagem padrão baseada no tipo
  const defaultImage = type === 'avatar' ? defaultAvatar : defaultCover;
  // displayImage removido pois não estava sendo utilizado

  const resolveUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const isDevClient = typeof window !== 'undefined' && window.location && window.location.port === '3000';
    const normalized = url.startsWith('/') ? url : `/${url}`;
    return `${isDevClient ? 'http://localhost:5000' : ''}${normalized}`;
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validação do arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      onUploadError('Formato de arquivo não suportado. Use JPG, PNG ou WebP.');
      return;
    }

    // Validação do tamanho (5MB para avatar, 10MB para capa)
    const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      onUploadError(`Arquivo muito grande. Máximo: ${type === 'avatar' ? '5MB' : '10MB'}`);
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload automático
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      // Determinar endpoint baseado no tipo
      let endpoint;
      if (type === 'main_photo' || type === 'logo') {
        endpoint = '/api/restaurants/upload-image';
        formData.append('restaurantId', restaurantId);
      } else {
        endpoint = '/api/users/upload-image';
      }

      // Usar axiosInstance se fornecido, senão usar axios padrão
      const client = axiosInstance || axios;
      const response = await client.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onUploadSuccess(response.data.imageUrl);
      setPreview(null);
    } catch (error) {
      console.error('Erro no upload:', error);
      onUploadError(error.response?.data?.error || 'Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getUploadText = () => {
    if (type === 'avatar') {
      return dragActive ? 'Solte aqui para alterar o avatar' : 'Clique ou arraste para alterar o avatar';
    } else {
      return dragActive ? 'Solte aqui para alterar a capa' : 'Clique ou arraste para alterar a capa';
    }
  };

  return (
    <div className={`image-upload ${className}`}>
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${type}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="upload-loading">
            <div className="spinner"></div>
            <span>Fazendo upload...</span>
          </div>
        ) : preview ? (
          <div className="image-preview">
            <img src={preview} alt="Preview" />
            <div className="preview-overlay">
              <span>Clique para confirmar</span>
            </div>
          </div>
        ) : currentImage ? (
          <div className="current-image">
            <img src={resolveUrl(currentImage)} alt="Imagem atual" />
            <div className="image-overlay">
              <div className="upload-icon">
                {type === 'avatar' ? '📷' : '🖼️'}
              </div>
              <p className="upload-text">{getUploadText()}</p>
            </div>
          </div>
        ) : (
          <div className="upload-content">
            <div className="default-image">
              <img src={defaultImage} alt="Imagem padrão" />
            </div>
            <div className="upload-info">
              <div className="upload-icon">
                {type === 'avatar' ? '📷' : '🖼️'}
              </div>
              <p className="upload-text">{getUploadText()}</p>
              <p className="upload-hint">
                {type === 'avatar' ? 'JPG, PNG ou WebP • Máx. 5MB' : 'JPG, PNG ou WebP • Máx. 10MB'}
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files[0])}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ImageUpload;
