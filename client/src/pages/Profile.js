import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaEdit, FaTrash, FaHeart, FaRegHeart, FaComment, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import axios from 'axios';
import ImageUpload from '../components/ImageUpload';
import EditProfileModal from '../components/EditProfileModal';
import CreatePostModal from '../components/CreatePostModal';
import EditPostModal from '../components/EditPostModal';
import CommentsModal from '../components/CommentsModal';
import FollowButton from '../components/FollowButton';
import FollowListModal from '../components/FollowListModal';
import defaultCover from '../assets/default-cover.svg';
import './Profile.css';
import './Home.css';

function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [postToComment, setPostToComment] = useState(null);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState('followers');
  const [pendingRestaurants, setPendingRestaurants] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [showPendingRestaurantsModal, setShowPendingRestaurantsModal] = useState(false);

  const resolveUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const isDevClient = typeof window !== 'undefined' && window.location && window.location.port === '3000';
    const normalized = url.startsWith('/') ? url : `/${url}`;
    return `${isDevClient ? 'http://localhost:5000' : ''}${normalized}`;
  };

  const targetUsername = username || currentUser?.username;
  const isOwnProfile = !username || username === currentUser?.username;
  const displayUser = isOwnProfile ? (profileUser || currentUser) : profileUser;

  const fetchUserProfile = useCallback(async () => {
    if (!targetUsername) {
      console.log('Sem targetUsername, aguardando...');
      return;
    }
    
    try {
      console.log('Buscando perfil para:', targetUsername);
      
      const response = await axios.get(`/api/users/profile/${targetUsername}`);
      console.log('Perfil recebido:', response.data);
      
      setProfileUser(response.data.user);
      setUserPosts(response.data.posts || []);
      setFollowersCount(response.data.user.followers_count || 0);
      setFollowingCount(response.data.user.following_count || 0);
      
      if (currentUser && !isOwnProfile) {
        try {
          const followResponse = await axios.get(`/api/users/profile/${targetUsername}/followers`);
          const isUserFollowing = followResponse.data.followers.some(user => user.id === currentUser.id);
          setIsFollowing(isUserFollowing);
        } catch (error) {
          console.error('Erro ao verificar status de seguindo:', error);
        }
      }
      
      if (isOwnProfile) {
        fetchPendingRestaurants();
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      
      if (error.response?.status === 404 && !isOwnProfile) {
        navigate('/');
        return;
      }
      
      setLoading(false);
    }
  }, [targetUsername, navigate, currentUser, isOwnProfile]);

  // Buscar restaurantes pendentes do usuário
  const fetchPendingRestaurants = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoadingPending(true);
      const response = await axios.get('/api/pending-restaurants/user/me');
      setPendingRestaurants(response.data.pendingRestaurants || []);
    } catch (error) {
      console.error('Erro ao buscar restaurantes pendentes:', error);
    } finally {
      setLoadingPending(false);
    }
  }, [currentUser]);

  const fetchUserPosts = useCallback(async () => {
    if (!targetUsername) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/api/users/profile/${targetUsername}/posts?limit=5&offset=${(currentPage - 1) * 5}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const { posts } = response.data;
      
      if (currentPage === 1) {
        setUserPosts(posts);
      } else {
        setUserPosts(prev => [...prev, ...posts]);
      }
      
      // Como a API não retorna paginação, vamos assumir que há mais posts se retornou o limite
      setHasMore(posts.length === 5);
    } catch (error) {
      console.error('Erro ao buscar posts do usuário:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUsername, currentPage]);

  // Carregar perfil do usuário quando o componente montar ou username mudar
  useEffect(() => {
    if (!targetUsername) return;
    console.log('Carregando perfil para username:', targetUsername);
    setCurrentPage(1);
    setProfileUser(null);
    setUserPosts([]);
    setLoading(true);
    
    fetchUserProfile();
  }, [targetUsername, fetchUserProfile]);

  // Buscar mais posts quando a página mudar
  useEffect(() => {
    if (!targetUsername) return;
    if (currentPage > 1) {
      fetchUserPosts();
    }
  }, [currentPage, targetUsername, fetchUserPosts]);

  const loadMorePosts = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleProfileUpdate = async (updatedData) => {
    try {
      const response = await axios.put('/api/users/profile', updatedData);
      setProfileUser(response.data.user);
      // Atualizar também o usuário atual no contexto se for o próprio perfil
      if (isOwnProfile) {
        // Aqui você pode atualizar o contexto de autenticação se necessário
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  };

  const handleImageUpload = async (type, imageUrl) => {
    try {
      const updateData = {
        [type === 'avatar' ? 'profile_picture' : 'cover_picture']: imageUrl
      };
      await handleProfileUpdate(updateData);
    } catch (error) {
      console.error('Erro ao atualizar imagem:', error);
    }
  };

  const handleFollowChange = (isNowFollowing) => {
    setIsFollowing(isNowFollowing);
    setFollowersCount(prev => isNowFollowing ? prev + 1 : prev - 1);
  };

  const handlePostCreated = (newPost) => {
    // Adicionar o novo post no início da lista
    setUserPosts(prev => [newPost, ...prev]);
    // Atualizar contador de posts
    if (profileUser) {
      setProfileUser(prev => ({
        ...prev,
        posts_count: (prev.posts_count || 0) + 1
      }));
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setIsEditModalOpen(true);
  };

  const handlePostUpdated = (updatedPost) => {
    setUserPosts(posts => posts.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ));
  };

  const handleDeletePost = async (postId) => {
    if (!currentUser || !window.confirm('Tem certeza que deseja deletar este post?')) return;
    
    try {
      await axios.delete(`/api/posts/${postId}`);
      setUserPosts(posts => posts.filter(post => post.id !== postId));
      // Atualizar contador de posts
      if (profileUser) {
        setProfileUser(prev => ({
          ...prev,
          posts_count: Math.max(0, (prev.posts_count || 0) - 1)
        }));
      }
    } catch (error) {
      console.error('Erro ao deletar post:', error);
    }
  };

  const handlePhotoNavigation = (postId, direction) => {
    const post = userPosts.find(p => p.id === postId);
    if (!post || !post.photos) return;

    const currentIndex = currentPhotoIndex[postId] || 0;
    let newIndex = currentIndex + direction;

    if (newIndex < 0) {
      newIndex = post.photos.length - 1;
    } else if (newIndex >= post.photos.length) {
      newIndex = 0;
    }

    setCurrentPhotoIndex(prev => ({
      ...prev,
      [postId]: newIndex
    }));
  };

  const handleLike = async (postId) => {
    if (!currentUser) return;
    
    try {
      const post = userPosts.find(p => p.id === postId);
      if (post.user_liked) {
        // Se já deu like, remover
        await handleUnlike(postId);
      } else {
        // Se não deu like, adicionar
        const response = await axios.post(`/api/likes/${postId}`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        // Atualizar o post com o novo número de likes e status de curtido
        setUserPosts(userPosts.map(post => 
          post.id === postId 
            ? { ...post, likes_count: response.data.likes_count, user_liked: true }
            : post
        ));
      }
    } catch (error) {
      console.error('Erro ao dar like:', error);
    }
  };

  const handleUnlike = async (postId) => {
    if (!currentUser) return;
    
    try {
      const response = await axios.delete(`/api/likes/${postId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Atualizar o post com o novo número de likes e status de curtido
      setUserPosts(userPosts.map(post => 
        post.id === postId 
          ? { ...post, likes_count: response.data.likes_count, user_liked: false }
          : post
      ));
    } catch (error) {
      console.error('Erro ao remover like:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Calcular diferença em milissegundos
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Retornar texto relativo para datas recentes
    if (diffMinutes < 1) {
      return 'Agora mesmo';
    } else if (diffMinutes < 60) {
      return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else {
      // Para datas mais antigas, usar formato completo
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`star ${i <= rating ? 'filled' : ''}`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  const renderPost = (post) => {
    const profilePic = post.profile_picture || post.user_profile_picture;
    const liked = post.user_liked || post.is_liked;
    return (
      <div key={post.id} className="post-card card hover-lift">
        <div className="post-header">
          <div className="post-user">
            {profilePic ? (
              <img 
                src={resolveUrl(profilePic)} 
                alt={post.user_name}
                className="user-avatar"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="user-avatar-placeholder" style={{ display: profilePic ? 'none' : 'flex' }}>
              {post.user_name?.charAt(0)}
            </div>
            <div className="user-info">
              <span className="user-name">{post.user_name}</span>
              <span className="post-date">{formatDate(post.created_at)}</span>
            </div>
          </div>
          <div className="post-header-actions">
            {post.restaurant_name && post.restaurant_id && (
              <div className="restaurant-link">
                <Link to={`/restaurant/${post.restaurant_id}`}>
                  {post.restaurant_name}
                </Link>
              </div>
            )}
            {currentUser && currentUser.id === post.user_id && (
              <div className="post-actions-menu">
                <button
                  className="action-button edit-button"
                  onClick={() => handleEditPost(post)}
                  title="Editar post"
                >
                  <FaEdit />
                </button>
                <button
                  className="action-button delete-button"
                  onClick={() => handleDeletePost(post.id)}
                  title="Deletar post"
                >
                  <FaTrash />
                </button>
              </div>
            )}
          </div>
        </div>

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
                  src={resolveUrl(post.photos[currentPhotoIndex[post.id] || 0]?.photo_url || post.photos[0].photo_url)} 
                  alt="Post"
                  className="post-image"
                />
                {post.photos.length > 1 && (
                  <div className="photo-navigation">
                    <button 
                      className="nav-arrow prev-arrow"
                      onClick={() => handlePhotoNavigation(post.id, -1)}
                      title="Foto anterior"
                    >
                      ‹
                    </button>
                    <span className="photo-counter">
                      {(currentPhotoIndex[post.id] || 0) + 1} / {post.photos.length}
                    </span>
                    <button 
                      className="nav-arrow next-arrow"
                      onClick={() => handlePhotoNavigation(post.id, 1)}
                      title="Próxima foto"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="post-content">
          {post.title && (
            <h3 className="post-title">{post.title}</h3>
          )}
          <p className="post-text">{post.content}</p>
          <div className="post-rating">
            {renderStars(post.rating)}
            <span className="rating-text">{post.rating.toFixed(1)}/5.0</span>
          </div>
        </div>

        <div className="post-actions">
          <button 
            className={`action-button ${liked ? 'liked' : ''}`}
            onClick={() => handleLike(post.id)}
          >
            {liked ? (
              <FaHeart className="liked" />
            ) : (
              <FaRegHeart />
            )}
            <span>{Number(post.likes_count || 0)}</span>
          </button>
          <button 
            className="action-button"
            onClick={() => {
              setPostToComment(post);
              setShowCommentsModal(true);
            }}
          >
            <FaComment />
            <span>{Number(post.comments_count || 0)}</span>
          </button>
        </div>
      </div>
    );
  };

  // Renderizar restaurante pendente
  const renderPendingRestaurant = (restaurant) => {
    const getStatusIcon = (status) => {
      switch (status) {
        case 'pending':
          return <FaClock className="status-icon pending" title="Aguardando aprovação" />;
        case 'approved':
          return <FaCheckCircle className="status-icon approved" title="Aprovado" />;
        case 'rejected':
          return <FaTimesCircle className="status-icon rejected" title="Rejeitado" />;
        default:
          return <FaClock className="status-icon pending" title="Aguardando aprovação" />;
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'pending':
          return 'Aguardando aprovação';
        case 'approved':
          return 'Aprovado';
        case 'rejected':
          return 'Rejeitado';
        default:
          return 'Aguardando aprovação';
      }
    };

    const getStatusClass = (status) => {
      switch (status) {
        case 'pending':
          return 'pending';
        case 'approved':
          return 'approved';
        case 'rejected':
          return 'rejected';
        default:
          return 'pending';
      }
    };

    return (
      <div key={restaurant.id} className={`pending-restaurant-card ${getStatusClass(restaurant.status)}`}>
        <div className="pending-restaurant-header">
          <div className="restaurant-info">
            <h4 className="restaurant-name">{restaurant.name}</h4>
            <p className="restaurant-address">{restaurant.address}</p>
          </div>
          <div className="status-info">
            {getStatusIcon(restaurant.status)}
            <span className={`status-text ${getStatusClass(restaurant.status)}`}>
              {getStatusText(restaurant.status)}
            </span>
          </div>
        </div>
        
        <div className="restaurant-details">
          {restaurant.description && (
            <p className="restaurant-description">{restaurant.description}</p>
          )}
          <div className="restaurant-meta">
            {restaurant.cuisine_type && (
              <span className="meta-item">
                <strong>Tipo:</strong> {restaurant.cuisine_type}
              </span>
            )}
            {restaurant.price_range && (
              <span className="meta-item">
                <strong>Preço:</strong> {restaurant.price_range}
              </span>
            )}
            {restaurant.phone_number && (
              <span className="meta-item">
                <strong>Telefone:</strong> {restaurant.phone_number}
              </span>
            )}
          </div>
        </div>

        {restaurant.admin_notes && (
          <div className="admin-notes">
            <strong>Observações do administrador:</strong>
            <p>{restaurant.admin_notes}</p>
          </div>
        )}

        <div className="post-preview">
          <h5>Avaliação associada:</h5>
          <p className="post-content">{restaurant.post_content}</p>
          <div className="post-rating">
            {renderStars(restaurant.post_rating)}
            <span className="rating-text">{restaurant.post_rating.toFixed(1)}/5.0</span>
          </div>
        </div>
      </div>
    );
  };

  if (!displayUser) {
    return (
      <div className="profile-container">
        <div className="loading-message">
          <p>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page home-page">
      {/* Header do Perfil */}
      <div className="profile-header">
        <div className="profile-cover">
          {isOwnProfile ? (
            <ImageUpload
              type="cover"
              currentImage={displayUser.cover_picture}
              onUploadSuccess={(imageUrl) => handleImageUpload('cover', imageUrl)}
              onUploadError={(error) => console.error('Erro no upload:', error)}
              className="cover-upload-overlay"
            />
          ) : (
            <div 
              className="profile-cover-image"
              style={{
                backgroundImage: displayUser.cover_picture 
                  ? `url(${resolveUrl(displayUser.cover_picture)})` 
                  : `url(${defaultCover})`
              }}
            />
          )}
          
          <div className="profile-avatar-container">
            {isOwnProfile ? (
              <ImageUpload
                type="avatar"
                currentImage={displayUser.profile_picture}
                onUploadSuccess={(imageUrl) => handleImageUpload('avatar', imageUrl)}
                onUploadError={(error) => console.error('Erro no upload:', error)}
                className="avatar-upload-overlay"
              />
            ) : (
              <>
                {displayUser.profile_picture ? (
                  <img 
                    src={resolveUrl(displayUser.profile_picture)} 
                    alt={displayUser.name || displayUser.username}
                    className="profile-avatar"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="profile-avatar default-avatar" style={{ display: displayUser.profile_picture ? 'none' : 'flex' }}>
                  {displayUser.name?.charAt(0) || displayUser.username?.charAt(0)}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="profile-info">
          <h1 className="profile-name">{displayUser.name || displayUser.username}</h1>
          <p className="profile-username">@{displayUser.username}</p>
          
          {displayUser.bio && (
            <p className="profile-bio">{displayUser.bio}</p>
          )}
          
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-number">{userPosts.length}</span>
              <span className="stat-label">Avaliações</span>
            </div>
            <div
              className="stat-item clickable"
              onClick={() => { setFollowModalType('following'); setShowFollowModal(true); }}
              title="Ver usuários que este perfil segue"
            >
              <span className="stat-number">{followingCount}</span>
              <span className="stat-label">Seguindo</span>
            </div>
            <div
              className="stat-item clickable"
              onClick={() => { setFollowModalType('followers'); setShowFollowModal(true); }}
              title="Ver seguidores deste perfil"
            >
              <span className="stat-number">{followersCount}</span>
              <span className="stat-label">Seguidores</span>
            </div>
          </div>
          
          <div className="profile-actions">
            {isOwnProfile ? (
              <>
                <button 
                  className="edit-profile-btn"
                  onClick={() => setShowEditModal(true)}
                >
                  Editar Perfil
                </button>
                <button 
                  className="create-post-btn"
                  onClick={() => setShowCreatePostModal(true)}
                >
                  📝 Nova Avaliação
                </button>
              </>
            ) : (
              <FollowButton
                username={displayUser.username}
                isFollowing={isFollowing}
                onFollowChange={handleFollowChange}
                className="large"
              />
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="profile-content">
        <div className="profile-sidebar">
          <div className="sidebar-section">
            <h3>Informações</h3>
            <div className="info-item">
              <span className="info-label">Membro desde:</span>
              <span className="info-value">
                {displayUser.created_at ? formatDate(displayUser.created_at) : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Última atividade:</span>
              <span className="info-value">Hoje</span>
            </div>
          </div>

          {!isOwnProfile && (
            <div className="sidebar-section">
              <h3>Ações</h3>
              <FollowButton
                username={displayUser.username}
                isFollowing={isFollowing}
                onFollowChange={handleFollowChange}
                className="primary"
              />
            </div>
          )}

          {/* Seção de Restaurantes Pendentes - apenas para o próprio perfil */}
          {isOwnProfile && pendingRestaurants.length > 0 && (
            <div className="sidebar-section">
              <h3>Restaurantes Pendentes</h3>
              <div className="pending-restaurants-list">
                {pendingRestaurants.map(restaurant => (
                  <div key={restaurant.id} className="pending-restaurant-item">
                    <div className="restaurant-name">{restaurant.name}</div>
                    <div className="restaurant-status">
                      {restaurant.status === 'pending' && (
                        <span className="status pending">
                          <FaClock /> Aguardando
                        </span>
                      )}
                      {restaurant.status === 'approved' && (
                        <span className="status approved">
                          <FaCheckCircle /> Aprovado
                        </span>
                      )}
                      {restaurant.status === 'rejected' && (
                        <span className="status rejected">
                          <FaTimesCircle /> Rejeitado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                className="view-all-pending-btn"
                onClick={() => setShowPendingRestaurantsModal(true)}
              >
                Ver Todos os Detalhes
              </button>
            </div>
          )}
        </div>

        <div className="profile-main">
          <div className="feed-header">
            <h2>Avaliações Recentes</h2>
            {isOwnProfile && (
              <button 
                className="create-post-header-btn"
                onClick={() => setShowCreatePostModal(true)}
              >
                + Nova Avaliação
              </button>
            )}
          </div>
          
          <div className="posts-grid">
            {userPosts.length > 0 ? (
              userPosts.map(renderPost)
            ) : (
              <div className="no-posts">
                <div className="no-posts-icon">📝</div>
                <h3>Nenhuma avaliação ainda</h3>
                <p>Quando você fizer sua primeira avaliação, ela aparecerá aqui!</p>
                {isOwnProfile && (
                  <button 
                    className="create-first-post-btn"
                    onClick={() => setShowCreatePostModal(true)}
                  >
                    Fazer Primeira Avaliação
                  </button>
                )}
              </div>
            )}
            
            {loading && (
              <div className="loading-posts">
                <div className="spinner"></div>
                <p>Carregando mais avaliações...</p>
              </div>
            )}
            
            {!loading && hasMore && userPosts.length > 0 && (
              <button 
                className="load-more-btn"
                onClick={loadMorePosts}
              >
                Carregar Mais
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleProfileUpdate}
        user={displayUser}
        onImageUpload={handleImageUpload}
      />

      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={handlePostCreated}
        currentUser={currentUser}
      />

      {/* Modal de Edição de Post */}
      <EditPostModal
        post={editingPost}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPost(null);
        }}
        onPostUpdated={handlePostUpdated}
      />

      {/* Modal de Comentários */}
      <CommentsModal
        post={postToComment}
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        onCommentAdded={(newComment, increment) => {
          if (newComment) {
            setUserPosts(prev => prev.map(post => 
              post.id === postToComment.id 
                ? { ...post, comments_count: Number(post.comments_count || 0) + 1 } 
                : post
            ));
          } else if (increment === -1) {
            setUserPosts(prev => prev.map(post => 
              post.id === postToComment.id 
                ? { ...post, comments_count: Math.max(0, (post.comments_count || 0) - 1) } 
                : post
            ));
          }
        }}
      />

      {/* Modal de Seguidores/Seguindo */}
      <FollowListModal
        isOpen={showFollowModal}
        onClose={() => setShowFollowModal(false)}
        username={displayUser?.username}
        type={followModalType}
      />

      {/* Modal de Restaurantes Pendentes */}
      {showPendingRestaurantsModal && (
        <div className="modal-overlay" onClick={() => setShowPendingRestaurantsModal(false)}>
          <div className="modal-content pending-restaurants-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Meus Restaurantes Pendentes</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowPendingRestaurantsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {loadingPending ? (
                <div className="loading-message">
                  <div className="spinner"></div>
                  <p>Carregando restaurantes pendentes...</p>
                </div>
              ) : pendingRestaurants.length > 0 ? (
                <div className="pending-restaurants-grid">
                  {pendingRestaurants.map(renderPendingRestaurant)}
                </div>
              ) : (
                <div className="no-pending-restaurants">
                  <div className="no-pending-icon">🍽️</div>
                  <h3>Nenhum restaurante pendente</h3>
                  <p>Você ainda não sugeriu nenhum restaurante ou todos foram processados.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
