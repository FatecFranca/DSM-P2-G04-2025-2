import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './CommentModal.css';

const CommentModal = ({ isOpen, onClose, post, onCommentAdded }) => {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { user, token } = useAuth();

  // Fechar modal com ESC
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Prevenir scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Limpar comentário e resetar índice da foto quando modal abre
  useEffect(() => {
    if (isOpen) {
      setNewComment('');
      setCurrentPhotoIndex(0);
    }
  }, [isOpen]);

  // Fechar modal ao clicar fora
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Navegar entre fotos
  const handlePhotoNavigation = (direction) => {
    if (!post.photos) return;
    
    const newIndex = currentPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < post.photos.length) {
      setCurrentPhotoIndex(newIndex);
    }
  };

  // Adicionar comentário
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/comments/${post.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setNewComment('');
        
        // Notificar componente pai sobre o novo comentário
        if (onCommentAdded) {
          onCommentAdded(data.comment);
        }
        
        // Fechar modal após comentário adicionado
        onClose();
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comment-modal-overlay" onClick={handleBackdropClick}>
      <div className="comment-modal">
        {/* Header do modal */}
        <div className="comment-modal-header">
          <h3>Adicionar Comentário</h3>
          <button 
            className="comment-modal-close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ×
          </button>
        </div>

        {/* Conteúdo do post */}
        <div className="comment-modal-post">
          <div className="post-preview">
            <div className="post-author-preview">
              <div className="author-avatar-preview">
                {post.profile_picture ? (
                  <img 
                    src={post.profile_picture} 
                    alt={post.user_name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="author-avatar-placeholder-preview"
                  style={{ display: post.profile_picture ? 'none' : 'flex' }}
                >
                  {post.user_name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="author-info-preview">
                <span className="author-name-preview">{post.user_name}</span>
                <span className="post-date-preview">
                  {formatDate(post.created_at)}
                </span>
              </div>
            </div>

            <div className="post-content-preview">
              {post.title && (
                <h4 className="post-title-preview">{post.title}</h4>
              )}
              <p className="post-text-preview">{post.content}</p>
              
              {/* Fotos do post com navegação */}
              {post.photos && post.photos.length > 0 && (
                <div className="post-photos-preview">
                  <div className="photo-navigation-container">
                    {/* Seta esquerda */}
                    {post.photos.length > 1 && currentPhotoIndex > 0 && (
                      <button 
                        className="photo-nav-btn photo-nav-left"
                        onClick={() => handlePhotoNavigation(-1)}
                        aria-label="Foto anterior"
                      >
                        <FaChevronLeft />
                      </button>
                    )}
                    
                    {/* Foto atual */}
                    <div className="current-photo-container">
                      <img 
                        src={post.photos[currentPhotoIndex].photo_url} 
                        alt={`Foto ${currentPhotoIndex + 1}`}
                        className="current-photo"
                      />
                      
                      {/* Indicador de posição */}
                      {post.photos.length > 1 && (
                        <div className="photo-indicator">
                          {currentPhotoIndex + 1} / {post.photos.length}
                        </div>
                      )}
                    </div>
                    
                    {/* Seta direita */}
                    {post.photos.length > 1 && currentPhotoIndex < post.photos.length - 1 && (
                      <button 
                        className="photo-nav-btn photo-nav-right"
                        onClick={() => handlePhotoNavigation(1)}
                        aria-label="Próxima foto"
                      >
                        <FaChevronRight />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formulário de comentário */}
        <div className="comment-modal-form">
          <form onSubmit={handleSubmitComment}>
            <div className="comment-input-container">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="comment-modal-input"
                rows="3"
                maxLength="500"
                autoFocus
              />
              <div className="comment-form-footer">
                <span className="comment-char-count">
                  {newComment.length}/500
                </span>
                <div className="comment-form-actions">
                  <button 
                    type="button"
                    className="comment-cancel-btn"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="comment-submit-btn"
                    disabled={!newComment.trim() || loading}
                  >
                    {loading ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Função para formatar data
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Agora mesmo';
  } else if (diffInHours < 24) {
    return `há ${diffInHours}h`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `há ${diffInDays}d`;
  }
};

export default CommentModal;
