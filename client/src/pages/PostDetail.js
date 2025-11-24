import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CommentsModal from '../components/CommentsModal';
import './PostDetail.css';
import './Home.css';
import { resolveUrl } from '../utils/resolveUrl';
import { FaStar, FaHeart, FaRegHeart, FaComment } from 'react-icons/fa';
import axios from 'axios';

function PostDetail() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentCount, setCommentCount] = useState(0);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Buscar detalhes do post
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/posts/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const postData = await response.json();
          setPost(postData);
          setCommentCount(postData.comments_count || 0);
        } else if (response.status === 404) {
          setError('Post não encontrado');
        } else {
          setError('Erro ao carregar o post');
        }
      } catch (error) {
        console.error('Erro ao buscar post:', error);
        setError('Erro ao carregar o post');
      } finally {
        setLoading(false);
      }
    };

    if (id && token) {
      fetchPost();
    }
  }, [id, token]);

  // Formatar data (igual Home)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderizar estrelas (igual Home)
  const renderStars = (rating = 0) => (
    [...Array(5)].map((_, index) => (
      <FaStar key={index} className={index < rating ? 'star filled' : 'star'} />
    ))
  );

  const handleLike = async () => {
    if (!post || !token) return;
    try {
      if (post.user_liked) {
        const res = await axios.delete(`/api/likes/${post.id}`);
        setPost({ ...post, likes_count: res.data.likes_count, user_liked: false });
      } else {
        const res = await axios.post(`/api/likes/${post.id}`, {});
        setPost({ ...post, likes_count: res.data.likes_count, user_liked: true });
      }
    } catch (err) {
      // silencioso
    }
  };

  const handlePhotoNavigation = (direction) => {
    if (!post?.photos || post.photos.length <= 1) return;
    setCurrentPhotoIndex((prev) => {
      const next = prev + direction;
      if (next < 0 || next >= post.photos.length) return prev;
      return next;
    });
  };

  // Navegar para o restaurante
  const handleRestaurantClick = () => {
    navigate(`/restaurant/${post.restaurant_id}`);
  };

  // Navegar para o perfil do usuário (usar username, não o id)
  const handleUserClick = () => {
    navigate(`/profile/${post.username}`);
  };

  if (loading) {
    return (
      <div className="post-detail-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="post-detail-container">
        <div className="error-container">
          <h2>Erro</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="back-btn">
            Voltar ao Feed
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-container">
        <div className="error-container">
          <h2>Post não encontrado</h2>
          <p>O post que você está procurando não existe ou foi removido.</p>
          <button onClick={() => navigate('/')} className="back-btn">
            Voltar ao Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page post-detail-page">
      {/* Voltar */}
      <div className="back-button-container">
        <button onClick={() => navigate(-1)} className="back-btn">← Voltar</button>
      </div>

      <div className="post-card card hover-lift">
        {/* Cabeçalho - igual Home */}
        <div className="post-header">
          <div className="post-user" onClick={handleUserClick}>
            {post.profile_picture ? (
              <img
                src={resolveUrl(post.profile_picture)}
                alt={post.user_name}
                className="user-avatar"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div className="user-avatar-placeholder" style={{ display: post.profile_picture ? 'none' : 'flex' }}>
              {post.user_name?.charAt(0)}
            </div>
            <div className="user-info">
              <span className="user-name">{post.user_name}</span>
              <span className="post-date">{formatDate(post.created_at)}</span>
            </div>
          </div>
          <div className="post-header-actions">
            <div className="restaurant-link">
              <Link to={`/restaurant/${post.restaurant_id}`}>{post.restaurant_name}</Link>
            </div>
          </div>
        </div>

        {/* Fotos - mesmo padrão do Home */}
        {post.photos && post.photos.length > 0 && (
          <div className="post-images">
            {post.photos.length === 1 ? (
              <img
                src={resolveUrl(post.photos[0].photo_url)}
                alt="Post"
                className="post-image"
              />
            ) : (
              <div className="post-photos-gallery">
                <img
                  src={resolveUrl(post.photos[currentPhotoIndex]?.photo_url || post.photos[0].photo_url)}
                  alt="Post"
                  className="post-image"
                />
                <div className="photo-navigation">
                  <button className="nav-arrow prev-arrow" onClick={() => handlePhotoNavigation(-1)}>‹</button>
                  <span className="photo-counter">{currentPhotoIndex + 1} / {post.photos.length}</span>
                  <button className="nav-arrow next-arrow" onClick={() => handlePhotoNavigation(1)}>›</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo */}
        <div className="post-content">
          {post.title && <h3 className="post-title">{post.title}</h3>}
          <p className="post-text">{post.content}</p>
          <div className="post-rating">
            {renderStars(post.rating)}
            <span className="rating-text">{Number(post.rating || 0).toFixed(1)}/5.0</span>
          </div>
        </div>

        {/* Ações */}
        <div className="post-actions">
          <button className={`action-button ${post.user_liked ? 'liked' : ''}`} onClick={handleLike}>
            {post.user_liked ? <FaHeart className="liked" /> : <FaRegHeart />}
            <span>{Number(post.likes_count || 0)}</span>
          </button>
          <button className="action-button" onClick={() => setIsCommentsModalOpen(true)}>
            <FaComment />
            <span>{Number(commentCount || 0)}</span>
          </button>
        </div>
      </div>

      {/* Modal de comentários */}
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        post={post}
        onCommentAdded={(comment, increment) => {
          if (comment) setCommentCount((prev) => prev + 1);
          else if (increment === -1) setCommentCount((prev) => Math.max(0, prev - 1));
        }}
      />
    </div>
  );
}

export default PostDetail;
