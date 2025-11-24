import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight, FaTimes, FaExpand, FaCompress } from 'react-icons/fa';
import './RestaurantPhotoGallery.css';

const RestaurantPhotoGallery = ({ photos = [], restaurantName = '', onClose, isOpen }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Resetar índice quando as fotos mudarem
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [photos]);

  // Navegar para a próxima foto
  const nextPhoto = () => {
    setCurrentPhotoIndex((prevIndex) => 
      prevIndex === photos.length - 1 ? 0 : prevIndex + 1
    );
  };

  // Navegar para a foto anterior
  const previousPhoto = () => {
    setCurrentPhotoIndex((prevIndex) => 
      prevIndex === 0 ? photos.length - 1 : prevIndex - 1
    );
  };

  // Navegar para uma foto específica
  const goToPhoto = (index) => {
    setCurrentPhotoIndex(index);
  };

  // Alternar tela cheia
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Fechar galeria
  const handleClose = () => {
    setIsFullscreen(false);
    onClose();
  };

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          previousPhoto();
          break;
        case 'ArrowRight':
          nextPhoto();
          break;
        case 'Escape':
          handleClose();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, photos.length]);

  // Se não há fotos, não mostrar nada
  if (!photos || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <div className={`restaurant-photo-gallery ${isOpen ? 'open' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Overlay de fundo */}
      <div className="gallery-overlay" onClick={handleClose}></div>
      
      {/* Container principal */}
      <div className="gallery-container">
        {/* Header da galeria */}
        <div className="gallery-header">
          <div className="gallery-info">
            <h3>{restaurantName}</h3>
            <span className="photo-counter">
              {currentPhotoIndex + 1} de {photos.length}
            </span>
          </div>
          
          <div className="gallery-controls">
            <button 
              className="control-button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
            <button 
              className="control-button close-button"
              onClick={handleClose}
              title="Fechar (ESC)"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Foto principal */}
        <div className="main-photo-container">
          {/* Botão anterior */}
          {photos.length > 1 && (
            <button 
              className="nav-button nav-button-left"
              onClick={previousPhoto}
              title="Foto anterior (←)"
            >
              <FaChevronLeft />
            </button>
          )}

          {/* Foto atual */}
          <div className="main-photo">
            <img 
              src={currentPhoto.photo_url} 
              alt={currentPhoto.caption || `Foto ${currentPhotoIndex + 1} de ${restaurantName}`}
              loading="lazy"
            />
            
            {/* Caption da foto */}
            {currentPhoto.caption && (
              <div className="photo-caption">
                <p>{currentPhoto.caption}</p>
              </div>
            )}
          </div>

          {/* Botão próximo */}
          {photos.length > 1 && (
            <button 
              className="nav-button nav-button-right"
              onClick={nextPhoto}
              title="Próxima foto (→)"
            >
              <FaChevronRight />
            </button>
          )}
        </div>

        {/* Miniaturas das fotos */}
        {photos.length > 1 && (
          <div className="photo-thumbnails">
            {photos.map((photo, index) => (
              <div 
                key={photo.id}
                className={`thumbnail ${index === currentPhotoIndex ? 'active' : ''}`}
                onClick={() => goToPhoto(index)}
              >
                <img 
                  src={photo.photo_url} 
                  alt={`Miniatura ${index + 1}`}
                  loading="lazy"
                />
                {photo.is_main && (
                  <div className="main-photo-badge" title="Foto principal">
                    ⭐
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Indicadores de navegação */}
        {photos.length > 1 && (
          <div className="photo-indicators">
            {photos.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentPhotoIndex ? 'active' : ''}`}
                onClick={() => goToPhoto(index)}
                title={`Ir para foto ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Informações da foto */}
        <div className="photo-info">
          <div className="photo-details">
            <span className="photo-date">
              {new Date(currentPhoto.created_at).toLocaleDateString('pt-BR')}
            </span>
            {currentPhoto.is_main && (
              <span className="main-photo-label">Foto Principal</span>
            )}
          </div>
        </div>
      </div>

      {/* Instruções de navegação */}
      {photos.length > 1 && (
        <div className="navigation-hints">
          <p>Use as setas ← → para navegar ou clique nas miniaturas</p>
          <p>Pressione F para tela cheia, ESC para fechar</p>
        </div>
      )}
    </div>
  );
};

export default RestaurantPhotoGallery;

