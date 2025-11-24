import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaStar, 
  FaHeart, 
  FaRegHeart,
  FaUtensils, 
  FaPlus,
  FaEdit,
  FaTrash,
  FaComment,
  FaArrowLeft
} from 'react-icons/fa';
import axios from 'axios';
import EditPostModal from '../components/EditPostModal';
import CreatePostModal from '../components/CreatePostModal';
import CommentsModal from '../components/CommentsModal';
import EditRestaurantModal from '../components/EditRestaurantModal';
import RestaurantCard from '../components/RestaurantCard';
import OperatingHoursModal from '../components/OperatingHoursModal';
import './RestaurantDetail.css';
import './Home.css';
import { resolveUrl } from '../utils/resolveUrl';

const RestaurantDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    rating: 5
  });
  const [editingPost, setEditingPost] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState({});
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [postToComment, setPostToComment] = useState(null);
  const [showEditRestaurantModal, setShowEditRestaurantModal] = useState(false);
  const [restaurantToEdit, setRestaurantToEdit] = useState(null);
  const [restaurantServices, setRestaurantServices] = useState([]);
  const [restaurantHighlights, setRestaurantHighlights] = useState([]);
  const [restaurantStatus, setRestaurantStatus] = useState({ isOpen: false, nextOpen: "Abre às 11:00" });
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [operatingHours, setOperatingHours] = useState([]);

  // Debug: log do estado inicial
  console.log('🔍 Debug - Estado inicial restaurantStatus:', { isOpen: false, nextOpen: "Abre às 11:00" });
  
  // ===== DEFINIR TODAS AS FUNÇÕES PRIMEIRO =====
  
  const fetchRestaurantDetails = useCallback(async () => {
    try {
      const response = await axios.get(`/api/restaurants/${id}`);
      setRestaurant(response.data.restaurant);
      // Garantir contador de favoritos
      const count = parseInt(response.data.restaurant?.favorites_count || 0, 10);
      setFavoritesCount(Number.isNaN(count) ? 0 : count);
      
      // Buscar serviços da API de features
      try {
        const servicesResponse = await axios.get(`/api/restaurant-features/${id}/services/all`);
        if (servicesResponse.data.success) {
          const availableServices = servicesResponse.data.services
            .filter(service => service.is_available)
            .map(service => service.service_type);
          setRestaurantServices(availableServices);
          console.log('✅ Serviços carregados:', availableServices);
        }
      } catch (servicesError) {
        console.error('❌ Erro ao buscar serviços:', servicesError);
        setRestaurantServices(["Delivery", "Reservas"]);
      }
      
      // Buscar highlights da API de features
      try {
        const highlightsResponse = await axios.get(`/api/restaurant-features/${id}/highlights`);
        if (highlightsResponse.data.success) {
          const activeHighlights = highlightsResponse.data.highlights
            .filter(highlight => highlight.is_active)
            .map(highlight => highlight.highlight_text);
          setRestaurantHighlights(activeHighlights);
          console.log('✅ Highlights carregados:', activeHighlights);
        }
      } catch (highlightsError) {
        console.error('❌ Erro ao buscar highlights:', highlightsError);
        setRestaurantHighlights(["Ambiente familiar", "Boa localização"]);
      }

      // Buscar status do restaurante em tempo real (UTC-3)
      try {
        const statusResponse = await axios.get(`/api/restaurant-features/${id}/status`);
        console.log('🔍 Debug - Resposta da API de status:', statusResponse.data);
        
        if (statusResponse.data.success) {
          // A API retorna {success: true, isOpen: true}, não {success: true, status: {...}}
          const isOpen = statusResponse.data.isOpen;
          console.log('🔍 Debug - isOpen recebido:', isOpen);
          
          // Buscar horários de funcionamento para obter o horário de abertura correto
          let nextOpenTime = "11:00"; // valor padrão
          try {
            const hoursResponse = await axios.get(`/api/restaurant-features/${id}/operating-hours`);
            if (hoursResponse.data.success) {
              const fetchedOperatingHours = hoursResponse.data.operatingHours;
              setOperatingHours(fetchedOperatingHours);
              console.log('🔍 Debug - Horários de funcionamento:', fetchedOperatingHours);
              
              // Encontrar o próximo dia que abre
              const today = new Date().getDay(); // 0 = Domingo, 1 = Segunda, etc.
              let nextOpenDay = null;
              let nextOpenHour = null;
              
              // Procurar nos próximos 7 dias
              for (let i = 0; i < 7; i++) {
                const dayToCheck = (today + i) % 7;
                const dayHours = fetchedOperatingHours.find(h => h.day_of_week === dayToCheck);
                
                if (dayHours && !dayHours.is_closed) {
                  nextOpenDay = dayToCheck;
                  nextOpenHour = dayHours.open_time;
                  break;
                }
              }
              
              if (nextOpenHour) {
                // Formatar o horário
                const [hours, minutes] = nextOpenHour.split(':');
                nextOpenTime = `${hours}:${minutes}`;
                
                // Adicionar nome do dia se não for hoje
                if (nextOpenDay !== today) {
                  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                  nextOpenTime = `${dayNames[nextOpenDay]} às ${nextOpenTime}`;
                } else {
                  nextOpenTime = `Abre às ${nextOpenTime}`;
                }
              }
            }
          } catch (hoursError) {
            console.error('❌ Erro ao buscar horários:', hoursError);
          }
          
          const newStatus = {
            isOpen: isOpen,
            nextOpen: isOpen ? "Aberto agora" : nextOpenTime
          };
          
          console.log('🔍 Debug - Novo status calculado:', newStatus);
          setRestaurantStatus(newStatus);
          console.log('✅ Status do restaurante carregado:', newStatus);
        }
      } catch (statusError) {
        console.error('❌ Erro ao buscar status do restaurante:', statusError);
        // Usar status padrão se a API falhar
        const fallbackStatus = {
          isOpen: restaurant?.is_open || false,
          nextOpen: restaurant?.is_open ? "Aberto agora" : "Abre às 11:00"
        };
        console.log('🔍 Debug - Usando status de fallback:', fallbackStatus);
        setRestaurantStatus(fallbackStatus);
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar detalhes do restaurante:', error);
    } finally {
      setLoading(false);
    }
  }, [id, restaurant?.is_open]);

  const fetchRestaurantPosts = useCallback(async () => {
    try {
      const response = await axios.get(`/api/posts?restaurant_id=${id}&limit=20`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Erro ao buscar posts do restaurante:', error);
    }
  }, [id]);

  const checkIfFavorite = useCallback(async () => {
    try {
      const response = await axios.get(`/api/restaurants/${id}/favorite`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsFavorite(response.data.isFavorite);
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
    }
  }, [id]);

  const toggleFavorite = useCallback(async () => {
    if (!user) return;
    
    try {
      if (isFavorite) {
        await axios.delete(`/api/restaurants/favorites/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setIsFavorite(false);
        setFavoritesCount(prev => Math.max(0, (prev || 0) - 1));
      } else {
        await axios.post(`/api/restaurants/favorites`, { restaurantId: id }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setIsFavorite(true);
        setFavoritesCount(prev => (prev || 0) + 1);
      }
    } catch (error) {
      console.error('Erro ao alternar favorito:', error);
    }
  }, [user, isFavorite, id]);

  const handleCreatePost = useCallback(async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return;

    try {
      const response = await axios.post('/api/posts', {
        content: newPost.content,
        rating: newPost.rating,
        restaurant_id: id
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setPosts(prev => [response.data.post, ...prev]);
        setNewPost({ content: '', rating: 5 });
        setShowCreatePost(false);
      }
    } catch (error) {
      console.error('Erro ao criar post:', error);
    }
  }, [newPost, id]);

  const handleEditPost = useCallback((post) => {
    setEditingPost(post);
    setIsEditModalOpen(true);
  }, []);

  const handlePostUpdated = useCallback((updatedPost) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    setIsEditModalOpen(false);
    setEditingPost(null);
  }, []);

  const handleDeletePost = useCallback(async (postId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta avaliação?')) return;

    try {
      await axios.delete(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Erro ao excluir post:', error);
    }
  }, []);

  const handleShowComments = useCallback((post) => {
    setPostToComment(post);
    setIsCommentsModalOpen(true);
  }, []);

  const handleCloseCommentsModal = useCallback(() => {
    setIsCommentsModalOpen(false);
    setPostToComment(null);
  }, []);

  const handleEditRestaurant = useCallback(() => {
    setRestaurantToEdit(restaurant);
    setShowEditRestaurantModal(true);
  }, [restaurant]);

  const handleCloseEditModal = useCallback(() => {
    setShowEditRestaurantModal(false);
    setRestaurantToEdit(null);
  }, []);

  const handlePhotoNavigation = useCallback((postId, direction) => {
    setCurrentPhotoIndex(prev => ({
      ...prev,
      [postId]: direction === 'next' 
        ? ((prev[postId] || 0) + 1) % (posts.find(p => p.id === postId)?.photos?.length || 1)
        : ((prev[postId] || 0) - 1 + (posts.find(p => p.id === postId)?.photos?.length || 1)) % (posts.find(p => p.id === postId)?.photos?.length || 1)
    }));
  }, [posts]);

  const handleLike = useCallback(async (postId) => {
    if (!user) return;
    
    try {
      const post = posts.find(p => p.id === postId);
      const isLiked = post?.user_liked || post?.is_liked;
      if (isLiked) {
        const response = await axios.delete(`/api/likes/${postId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, likes_count: response.data.likes_count, user_liked: false, is_liked: false }
            : p
        ));
      } else {
        const response = await axios.post(`/api/likes/${postId}`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, likes_count: response.data.likes_count, user_liked: true, is_liked: true }
            : p
        ));
      }
    } catch (error) {
      console.error('Erro ao curtir/descurtir post:', error);
    }
  }, [user, posts]);

  // handleUnlike removido pois não estava sendo utilizado

  // Função para restaurante atualizado - MOVIDA PARA DEPOIS DE fetchRestaurantDetails
  const handleRestaurantUpdated = useCallback((updatedRestaurant) => {
    console.log('🔍 Debug - handleRestaurantUpdated chamado com:', updatedRestaurant);
    setRestaurant(updatedRestaurant);
    if (id) {
      console.log('🔍 Debug - Recarregando dados do restaurante...');
      fetchRestaurantDetails();
    }
    setShowEditRestaurantModal(false);
    setRestaurantToEdit(null);
  }, [id, fetchRestaurantDetails]);

  // ===== AGORA DEFINIR OS USEEFFECT =====
  
  useEffect(() => {
    if (id) {
      fetchRestaurantDetails();
      fetchRestaurantPosts();
    }
  }, [id, fetchRestaurantDetails, fetchRestaurantPosts]);

  useEffect(() => {
    if (id && user) {
      checkIfFavorite();
    }
  }, [id, user, checkIfFavorite]);

  // Debug: monitorar mudanças no restaurantStatus
  useEffect(() => {
    console.log('🔍 Debug - restaurantStatus mudou para:', restaurantStatus);
  }, [restaurantStatus]);

  // ===== VERIFICAR SE O USUÁRIO PODE EDITAR =====
  
  const canEditRestaurant = useMemo(() => {
    return user && (
      user.role === 'admin' || 
      user.role === 'owner' || 
      (restaurant && restaurant.owner_id === user.id)
    );
  }, [user, restaurant]);

  // Objeto memoizado para o formato do RestaurantCard
  const restaurantCardData = useMemo(() => {
    if (!restaurant) return null;
    
    console.log('🔍 Debug restaurantCardData - restaurant:', restaurant);
    console.log('🔍 Debug restaurantCardData - restaurant.photos:', restaurant.photos);
    console.log('🔍 Debug restaurantCardData - restaurantStatus:', restaurantStatus);
    
    const photos = restaurant.photos ? restaurant.photos.map(p => p.photo_url) : [];
    console.log('🔍 Debug restaurantCardData - photos processadas:', photos);
    
    const result = {
      name: restaurant.name,
      rating: parseFloat(restaurant.average_rating) || 0,
      reviewCount: restaurant.posts_count ? `${restaurant.posts_count}` : "0",
      cuisine: restaurant.cuisine_type || "Não especificado",
      address: restaurant.address || "Endereço não disponível",
      phone: restaurant.phone || "Telefone não disponível",
      description: restaurant.description || "Descrição não disponível",
      serviceOptions: restaurantServices,
      highlights: restaurantHighlights,
      status: restaurantStatus.isOpen ? "Aberto" : "Fechado",
      nextOpen: restaurantStatus.nextOpen,
      photos: photos,
      isFavorite: isFavorite,
      favoritesCount: favoritesCount,
      social: {
        instagram: restaurant.instagram || restaurant.instagram_url || restaurant.social_instagram || null,
        ifood: restaurant.ifood || restaurant.ifood_url || restaurant.social_ifood || null,
        website: restaurant.menu_url || restaurant.cardapio_url || restaurant.website || null
      }
    };
    
    console.log('🔍 Debug restaurantCardData - resultado final:', result);
    console.log('🔍 Debug restaurantCardData - status final:', result.status);
    return result;
  }, [restaurant, isFavorite, restaurantServices, restaurantHighlights, restaurantStatus, favoritesCount]);

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={index < rating ? 'star filled' : 'star'}
      />
    ));
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando detalhes do restaurante...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="error-container">
        <h2>Restaurante não encontrado</h2>
        <p>O restaurante que você está procurando não existe ou foi removido.</p>
        <Link to="/restaurants" className="btn btn-primary">
          <FaArrowLeft />
          Voltar aos Restaurantes
        </Link>
      </div>
    );
  }

  return (
    <div className="restaurant-detail-page home-page">
      {/* Header com navegação */}
      <div className="detail-header">
        <Link to="/restaurants" className="back-button">
          <FaArrowLeft />
          Voltar aos Restaurantes
        </Link>
      </div>

      {/* RestaurantCard horizontal compacto */}
      <div className="restaurant-card-container">
        <RestaurantCard 
          restaurant={restaurantCardData}
          onToggleFavorite={toggleFavorite}
          onEdit={handleEditRestaurant}
          canEdit={canEditRestaurant}
          isLoggedIn={!!user}
          onHoursClick={() => setShowHoursModal(true)}
        />
      </div>

      {/* Seção de posts e avaliações */}
      <div className="posts-section">
        <div className="posts-header">
          <h2>Avaliações e Experiências</h2>
          {user && (
            <button
              onClick={() => setShowCreatePost(true)}
              className="btn btn-primary"
            >
              <FaPlus />
              Nova Avaliação
            </button>
          )}
        </div>

        {/* Modal de Nova Avaliação (mesmo modal do + Novo Post) */}
        {showCreatePost && user && (
          <CreatePostModal
            isOpen={showCreatePost}
            onClose={() => setShowCreatePost(false)}
            onPostCreated={(created) => {
              setPosts(prev => [created, ...prev]);
              setShowCreatePost(false);
            }}
            currentUser={user}
            preselectedRestaurant={{
              id: restaurant.id,
              name: restaurant.name,
              address: restaurant.address
            }}
            allowChangeRestaurant={false}
          />
        )}

        {/* Lista de posts */}
        <div className="posts-grid">
          {posts.length > 0 ? (
            posts.map(post => (
              <div key={post.id} className="post-card card hover-lift">
                <div className="post-header">
                  <div className="post-user">
                    {post.profile_picture ? (
                      <img 
                        src={resolveUrl(post.profile_picture)} 
                        alt={post.user_name}
                        className="user-avatar"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
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
                      <Link to={`/restaurant/${restaurant.id}`}>
                        {restaurant.name}
                      </Link>
                    </div>
                    {user && user.id === post.user_id && (
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
                    className={`action-button ${(post.user_liked || post.is_liked) ? 'liked' : ''}`}
                    onClick={() => handleLike(post.id)}
                  >
                    {(post.user_liked || post.is_liked) ? (
                      <FaHeart className="liked" />
                    ) : (
                      <FaRegHeart />
                    )}
                    <span>{Number(post.likes_count || 0)}</span>
                  </button>
                  <button 
                    className="action-button"
                    onClick={() => handleShowComments(post)}
                  >
                    <FaComment />
                    <span>{Number(post.comments_count || 0)}</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-posts">
              <FaUtensils className="no-posts-icon" />
              <h3>Nenhuma avaliação ainda</h3>
              <p>Seja o primeiro a compartilhar sua experiência neste restaurante!</p>
              {user && (
                <button
                  onClick={() => setShowCreatePost(true)}
                  className="btn btn-primary"
                >
                  <FaPlus />
                  Primeira Avaliação
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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
        isOpen={isCommentsModalOpen}
        onClose={handleCloseCommentsModal}
        onCommentAdded={(newComment, increment) => {
          if (newComment) {
            // Atualizar contador de comentários no post
            setPosts(prev => 
              prev.map(post => 
                post.id === postToComment.id 
                  ? { ...post, comments_count: Number(post.comments_count || 0) + 1 }
                  : post
              )
            );
          } else if (increment === -1) {
            // Decrementar contador quando comentário é deletado
            setPosts(prev => 
              prev.map(post => 
                post.id === postToComment.id 
                  ? { ...post, comments_count: Math.max(0, (post.comments_count || 0) - 1) }
                  : post
              )
            );
          }
        }}
      />

      {/* Modal de Edição de Restaurante */}
      {showEditRestaurantModal && restaurant && (
        <EditRestaurantModal
          restaurant={restaurantToEdit}
          isOpen={showEditRestaurantModal}
          onClose={handleCloseEditModal}
          onRestaurantUpdated={handleRestaurantUpdated}
        />
      )}

      {/* Modal de Horários de Funcionamento */}
      {showHoursModal && (
        <OperatingHoursModal
          isOpen={showHoursModal}
          onClose={() => setShowHoursModal(false)}
          operatingHours={operatingHours}
          restaurantName={restaurant?.name}
        />
      )}
    </div>
  );
};

export default RestaurantDetail;

