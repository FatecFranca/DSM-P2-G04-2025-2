import React, { useState } from 'react';
import { FaCamera, FaImages, FaPlay } from 'react-icons/fa';
import RestaurantPhotoGallery from './RestaurantPhotoGallery';
import './RestaurantPhotos.css';

const RestaurantPhotos = ({ photos = [], restaurantName = '', restaurantId }) => {
  const [showGallery, setShowGallery] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Se não há fotos, mostrar placeholder
  if (!photos || photos.length === 0) {
    return (
      <div className="restaurant-photos no-photos">
        <div className="no-photos-content">
          <FaCamera className="no-photos-icon" />
          <h3>Nenhuma foto disponível</h3>
          <p>Este restaurante ainda não possui fotos</p>
        </div>
      </div>
    );
  }

  // Foto principal (primeira foto ou foto marcada como principal)
  const mainPhoto = photos.find(photo => photo.is_main) || photos[0];
  
  // Outras fotos (excluindo a principal)
  const otherPhotos = photos.filter(photo => photo.id !== mainPhoto.id).slice(0, 3);

  const openGallery = (photoIndex = 0) => {
    setSelectedPhotoIndex(photoIndex);
    setShowGallery(true);
  };

  const closeGallery = () => {
    setShowGallery(false);
  };

  return (
    <div className="restaurant-photos">
      {/* Foto principal */}
      <div className="main-photo-section">
        <div className="main-photo-container" onClick={() => openGallery(0)}>
          <img 
            src={mainPhoto.photo_url} 
            alt={mainPhoto.caption || `Foto principal de ${restaurantName}`}
            className="main-photo"
            loading="lazy"
          />
          
          {/* Overlay com informações */}
          <div className="photo-overlay">
            <div className="overlay-content">
              <FaImages className="overlay-icon" />
              <span className="overlay-text">Ver todas as fotos</span>
            </div>
          </div>
          
          {/* Badge de foto principal */}
          {mainPhoto.is_main && (
            <div className="main-photo-badge">
              ⭐ Principal
            </div>
          )}
          
          {/* Contador de fotos */}
          <div className="photo-count-badge">
            {photos.length} foto{photos.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Outras fotos */}
      {otherPhotos.length > 0 && (
        <div className="other-photos-section">
          <div className="other-photos-grid">
            {otherPhotos.map((photo, index) => (
              <div 
                key={photo.id}
                className="other-photo-container"
                onClick={() => openGallery(photos.findIndex(p => p.id === photo.id))}
              >
                <img 
                  src={photo.photo_url} 
                  alt={photo.caption || `Foto ${index + 2} de ${restaurantName}`}
                  className="other-photo"
                  loading="lazy"
                />
                
                {/* Overlay sutil */}
                <div className="photo-overlay subtle">
                  <FaPlay className="overlay-icon small" />
                </div>
              </div>
            ))}
            
            {/* Botão para ver mais fotos se houver mais de 4 */}
            {photos.length > 4 && (
              <div 
                className="more-photos-button"
                onClick={() => openGallery(0)}
              >
                <div className="more-photos-content">
                  <FaImages className="more-photos-icon" />
                  <span className="more-photos-text">
                    +{photos.length - 4} mais
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão para abrir galeria completa */}
      <div className="gallery-button-container">
        <button 
          className="gallery-button"
          onClick={() => openGallery(0)}
        >
          <FaImages className="gallery-button-icon" />
          <span>Ver Galeria Completa</span>
          <span className="photo-count">({photos.length} fotos)</span>
        </button>
      </div>

      {/* Galeria modal */}
      <RestaurantPhotoGallery
        photos={photos}
        restaurantName={restaurantName}
        isOpen={showGallery}
        onClose={closeGallery}
        initialPhotoIndex={selectedPhotoIndex}
      />
    </div>
  );
};

export default RestaurantPhotos;

