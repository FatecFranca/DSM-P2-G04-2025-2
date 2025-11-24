import React, { useEffect, useRef, useState } from 'react';
import { FaHeart, FaRegHeart, FaInstagram, FaGlobe } from 'react-icons/fa';
import { SiIfood } from 'react-icons/si';
import './RestaurantCard.css';

const RestaurantCard = ({ restaurant, onEdit, onToggleFavorite, onHoursClick, canEdit = false, isLoggedIn = false }) => {
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowMore, setShouldShowMore] = useState(false);
  const descriptionRef = useRef(null);
  const servicesRef = useRef(null);
  const highlightsRef = useRef(null);
  
  const {
    name = "Restaurante Exemplo",
    rating = 4.4,
    reviewCount = "2.4k",
    cuisine = "Brasileira",
    address = "Av. Exemplo, 123 - Bairro, Cidade - SP",
    phone = "(16) 99999-9999",
    description = "Descrição do restaurante com pratos especiais e ambiente acolhedor",
    serviceOptions = ["Buffet à vontade", "Delivery", "Reservas"],
    highlights = [], // Removido valor padrão hardcoded
    status = "Fechado",
    nextOpen = "Abre às 11:00",
    photos = [],
    isFavorite = false,
    favoritesCount = 0,
    social = {}
  } = restaurant || {};

  const { instagram, ifood, website } = social;

  const normalizeUrl = (value, type) => {
    if (!value) return null;
    let url = String(value).trim();
    if (type === 'instagram' && !/^https?:\/\//i.test(url)) {
      if (/^@[A-Za-z0-9._-]+$/.test(url)) url = url.slice(1);
      if (/^[A-Za-z0-9._-]+$/.test(url)) {
        url = `https://instagram.com/${url}`;
      }
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    return url;
  };

  const instagramUrl = normalizeUrl(instagram, 'instagram');
  const ifoodUrl = normalizeUrl(ifood, 'ifood');
  const websiteUrl = normalizeUrl(website, 'website');

  // Debug: log das fotos recebidas
  console.log('🔍 RestaurantCard - photos recebidas:', photos);
  console.log('🔍 RestaurantCard - primeira foto:', photos[0]);
  console.log('🔍 RestaurantCard - tipo da primeira foto:', typeof photos[0]);

  // Função para mapear tipos de serviço para nomes legíveis
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
    return normalized.replace(/(^|\s|\()([\p{L}])/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase('pt-BR'));
  };

  // Função para construir URL completa das fotos
  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    // Garantir que a URL seja construída corretamente
    return `http://localhost:5000${photoPath}`;
  };

  // Verificar se algum bloco está truncado para exibir o botão "Ver mais"
  useEffect(() => {
    const checkOverflow = () => {
      const descEl = descriptionRef.current;
      const servEl = servicesRef.current;
      const highEl = highlightsRef.current;
      const descOverflow = descEl ? descEl.scrollHeight - 2 > descEl.clientHeight : false;
      const servOverflow = servEl ? servEl.scrollHeight - 2 > servEl.clientHeight : false;
      const highOverflow = highEl ? highEl.scrollHeight - 2 > highEl.clientHeight : false;
      setShouldShowMore(descOverflow || servOverflow || highOverflow);
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [description, serviceOptions, highlights]);

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star full">★</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">☆</span>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }
    
    return stars;
  };

  const openPhotoModal = (index = 0) => {
    setCurrentPhotoIndex(index);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closePhotoModal();
    } else if (e.key === 'ArrowRight') {
      nextPhoto();
    } else if (e.key === 'ArrowLeft') {
      prevPhoto();
    }
  };

  return (
    <>
      <div className="restaurant-card">
        {/* Header Section */}
        <div className="restaurant-header">
          <div className="header-content">
            <div className="restaurant-title">
              <h1 className="restaurant-name">{name}</h1>
              {isFavorite && (
                <span className="favorite-chip" title="Este restaurante está nos seus favoritos">
                  <FaHeart />
                  Favorito
                </span>
              )}
            </div>
            <div className="rating-section">
              <div className="rating-stars">
                {renderStars(rating)}
              </div>
              <span className="rating-number">{rating}</span>
              <span className="review-count">{reviewCount} avaliações</span>
              <span className="favorites-count" title="Número de usuários que favoritaram">
                <FaHeart style={{ verticalAlign: 'middle' }} /> {favoritesCount || 0} favoritos
              </span>
            </div>
          </div>
          
          <div className="header-actions">
            {canEdit && (
              <button 
                className="btn-edit"
                onClick={onEdit}
                title="Editar restaurante"
              >
                <span className="icon">✏️</span>
                Editar
              </button>
            )}
            {isLoggedIn && (
              <button 
                className={`btn-favorite ${isFavorite ? 'active' : ''}`}
                onClick={onToggleFavorite}
                title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <span className={`icon-heart ${isFavorite ? 'filled' : 'outline'}`}>
                  {isFavorite ? <FaHeart /> : <FaRegHeart />}
                </span>
                <span>{isFavorite ? 'Favorito' : 'Favoritar'}</span>
              </button>
            )}
            <div className="header-social">
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  className="social-link instagram"
                  title="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaInstagram />
                </a>
              ) : (
                <span className="social-link instagram disabled" title="Instagram não informado">
                  <FaInstagram />
                </span>
              )}
              {ifoodUrl ? (
                <a
                  href={ifoodUrl}
                  className="social-link ifood"
                  title="iFood"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SiIfood />
                </a>
              ) : (
                <span className="social-link ifood disabled" title="iFood não informado">
                  <SiIfood />
                </span>
              )}
              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  className="social-link website"
                  title="Website / Cardápio"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaGlobe />
                </a>
              ) : (
                <span className="social-link website disabled" title="Website/Cardápio não informado">
                  <FaGlobe />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Layout Horizontal Compacto */}
        <div className="restaurant-content">
          {/* 1. Photos Section */}
          <div className="photos-section">
            <div 
              className="main-photo"
              onClick={() => openPhotoModal(0)}
              title="Clique para ampliar"
            >
              <img 
                src={getPhotoUrl(photos[0]) || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop&crop=center"} 
                alt={name}
                className="restaurant-image"
                onError={(e) => {
                  console.error('❌ Erro ao carregar foto principal:', photos[0]);
                  e.target.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop&crop=center";
                }}
              />
              <div className="photo-badge main">Principal ⭐</div>
              <div className="photo-count">{photos.length || 1} foto</div>
            </div>
            
            <button 
              className="btn-gallery"
              onClick={() => openPhotoModal(0)}
            >
              <span className="icon">📷</span>
              Ver Galeria Completa ({photos.length || 1} fotos)
            </button>
          </div>

          {/* 2. Description Section - Seção central compacta */}
          <div className={`description-section ${isExpanded ? 'expanded' : ''}`}>
            <div className={`description-box ${!isExpanded && shouldShowMore ? 'description-fade' : ''}`}>
              <p ref={descriptionRef} className={`description-text ${isExpanded ? 'expanded' : ''}`}>{description}</p>
              
              <div className="service-options">
                <h4>Opções de serviço:</h4>
                <ul ref={servicesRef}>
                  {serviceOptions.map((option, index) => (
                    <li key={index}>{getServiceLabel(option)}</li>
                  ))}
                </ul>
              </div>

              <div ref={highlightsRef} className="highlights">
                {highlights.map((highlight, index) => (
                  <span key={index} className="highlight-tag">{highlight}</span>
                ))}
              </div>
              {shouldShowMore && (
                <div className="show-more-container">
                  <button
                    type="button"
                    className="show-more-btn"
                    onClick={() => setIsExpanded(prev => !prev)}
                  >
                    {isExpanded ? 'Ver menos' : 'Ver mais'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3. Details Section - Tipo, Endereço, Telefone */}
          <div className="details-section">
            <div className="detail-item">
              <span className="icon">🍽️</span>
              <span className="text">{cuisine}</span>
            </div>
            
            <div className="detail-item">
              <span className="icon">📍</span>
              <span className="text">{address}</span>
            </div>
            
            <div className="detail-item">
              <span className="icon">📞</span>
              <span className="text">{phone}</span>
            </div>
          </div>

          {/* 4. Status Section - Horário e Avaliações */}
          <div className="status-section">
            <div className="status-box" onClick={onHoursClick} style={{ cursor: 'pointer' }}>
              <div className="status-header">
                <span>Horário</span>
                <span className="arrow">→</span>
              </div>
              <div className={`status ${status.toLowerCase() === 'aberto' ? 'open' : 'closed'}`}>
                {status}
              </div>
              <div className="next-open">{nextOpen}</div>
            </div>

            <div className="reviews-box">
              <div className="reviews-header">
                <span>Avaliações</span>
                <span className="arrow">→</span>
              </div>
              <div className="reviews-content">
                <div className="rating-display">
                  {rating} {renderStars(rating)}
                </div>
                <div className="reviews-count">{reviewCount} avaliações</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div 
          className="photo-modal-overlay"
          onClick={closePhotoModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closePhotoModal}>
              ✕
            </button>
            
            <div className="modal-photo-container">
              <img 
                src={getPhotoUrl(photos[currentPhotoIndex]) || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&crop=center"} 
                alt={`${name} - Foto ${currentPhotoIndex + 1}`}
                className="modal-photo"
                onError={(e) => {
                  console.error('❌ Erro ao carregar foto:', photos[currentPhotoIndex]);
                  e.target.src = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop&crop=center";
                }}
              />
            </div>
            
            {photos.length > 1 && (
              <>
                <button 
                  className="modal-nav-btn modal-prev-btn"
                  onClick={prevPhoto}
                  aria-label="Foto anterior"
                >
                  ‹
                </button>
                <button 
                  className="modal-nav-btn modal-next-btn"
                  onClick={nextPhoto}
                  aria-label="Próxima foto"
                >
                  ›
                </button>
                
                <div className="modal-photo-counter">
                  {currentPhotoIndex + 1} de {photos.length}
                </div>
              </>
            )}
            
            <div className="modal-photo-info">
              <h3>{name}</h3>
              <p>Foto {currentPhotoIndex + 1} de {photos.length}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RestaurantCard;