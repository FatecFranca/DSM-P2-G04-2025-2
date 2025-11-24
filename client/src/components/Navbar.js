import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaUtensils, FaSearch, FaPlus, FaUser, FaSignOutAlt, FaMapMarkerAlt, FaCrown } from 'react-icons/fa';
import { MdNotifications } from 'react-icons/md';
import axios from 'axios';
import CreatePostModal from './CreatePostModal';
import AdminPanel from './AdminPanel';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, notificationsUnread, setNotificationsUnreadCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPanelTab, setAdminPanelTab] = useState('stats');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsRef = useRef(null);

  const resolveUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const isDevClient = typeof window !== 'undefined' && window.location && window.location.port === '3000';
    const normalized = url.startsWith('/') ? url : `/${url}`;
    return `${isDevClient ? 'http://localhost:5000' : ''}${normalized}`;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const raw = searchQuery.trim();
    if (!raw) return;

    // Detecta intenções como "usuário car" ou "restaurante pizza"
    let qParam = raw;
    let typeParam = '';

    const userMatch = raw.match(/^(usu[aá]rio|usuario)\s+(.+)$/i);
    const restMatch = raw.match(/^(restaurante|restaurantes)\s+(.+)$/i);

    if (userMatch) {
      typeParam = 'users';
      qParam = userMatch[2];
    } else if (restMatch) {
      typeParam = 'restaurants';
      qParam = restMatch[2];
    }

    const url = typeParam
      ? `/search?q=${encodeURIComponent(qParam)}&type=${typeParam}`
      : `/search?q=${encodeURIComponent(qParam)}`;

    navigate(url);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (q, type) => {
    setSearchQuery(q);
    const url = type
      ? `/search?q=${encodeURIComponent(q)}&type=${type}`
      : `/search?q=${encodeURIComponent(q)}`;
    navigate(url);
    setShowSuggestions(false);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.search-form')) {
      setShowSuggestions(false);
    }
    if (!e.target.closest('.notifications-container')) {
      setShowNotifications(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowUserMenu(false);
  };

  const handlePostCreated = (newPost) => {
    // Fechar modal e redirecionar para o perfil do usuário
    setShowCreatePostModal(false);
    navigate(`/profile/${user.username}`);
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await axios.get('/api/notifications?limit=10');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const toggleNotifications = async () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      await fetchNotifications();
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      // Marcar como lida
      if (!n.is_read) {
        await axios.post(`/api/notifications/${n.id}/read`);
        // Atualiza localmente para feedback instantâneo
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
      }

      // Navegar conforme o tipo
      if (n.type === 'new_restaurant_suggestion') {
        // Abrir o painel administrativo para aprovação na aba de restaurantes pendentes
        setAdminPanelTab('pending');
        setShowAdminPanel(true);
      } else if (n.post_id) {
        navigate(`/post/${n.post_id}`);
      } else if (n.type === 'user_followed' && n.actor_username) {
        navigate(`/profile/${n.actor_username}`);
      }

      setShowNotifications(false);
    } catch (_) {
      // silencioso
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.post('/api/notifications/read-all');
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
      // Zerar badge imediatamente
      setNotificationsUnreadCount(0);
    } catch (_) {
      // silencioso
    }
  };

  const handleClearAllNotifications = async () => {
    if (!window.confirm('Tem certeza que deseja remover todas as notificações? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      await axios.delete('/api/notifications/clear-all');
      setNotifications([]);
      setNotificationsUnreadCount(0);
      setShowNotifications(false);
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
    }
  };

  const renderNotificationText = (n) => {
    const actor = n.actor_name || n.actor_username || 'Alguém';
    switch (n.type) {
      case 'post_liked':
        return `${actor} curtiu seu post`;
      case 'post_commented':
        return `${actor} comentou no seu post`;
      case 'comment_replied':
        return `${actor} respondeu seu comentário`;
      case 'comment_liked':
        return `${actor} curtiu seu comentário`;
      case 'user_followed':
        return `${actor} começou a te seguir`;
      case 'new_restaurant_suggestion':
        return `Nova sugestão de restaurante: ${n.data?.restaurant_name || 'Restaurante'}`;
      case 'restaurant_approved':
        return `Restaurante "${n.data?.restaurant_name || 'Restaurante'}" foi aprovado!`;
      case 'restaurant_rejected':
        return `Restaurante "${n.data?.restaurant_name || 'Restaurante'}" foi rejeitado`;
      default:
        return 'Nova atividade';
    }
  };

  const formatRelativeTime = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes} min`;
    if (hours < 24) return `há ${hours} h`;
    return `há ${days} d`;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <FaUtensils className="brand-icon" />
          <span className="brand-text">BeastFood</span>
        </Link>

        <Link to="/restaurants" className="nav-link">
          <FaUtensils />
          <span>Restaurantes</span>
        </Link>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Buscar restaurantes, usuários, cidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              onFocus={() => setShowSuggestions(true)}
            />
            <button type="submit" className="search-button">
              <FaSearch />
            </button>
          </div>
          
          {showSuggestions && searchQuery.trim().length >= 2 && (
            <div className="search-suggestions">
              <div className="suggestion-item" onClick={() => handleSuggestionClick(searchQuery, 'restaurants')}>
                <FaUtensils /> Buscar restaurantes com "{searchQuery}"
              </div>
              <div className="suggestion-item" onClick={() => handleSuggestionClick(searchQuery, 'users')}>
                <FaUser /> Buscar usuários com "{searchQuery}"
              </div>
              <div className="suggestion-item" onClick={() => handleSuggestionClick(searchQuery, 'restaurants')}>
                <FaMapMarkerAlt /> Buscar restaurantes em "{searchQuery}"
              </div>
            </div>
          )}
        </form>

        <div className="navbar-nav">
          {user ? (
            <>
              <button 
                onClick={() => setShowCreatePostModal(true)}
                className="nav-link create-post-button"
              >
                <FaPlus />
                <span>Novo Post</span>
              </button>
              
              {/* Notificações */}
              <div className="notifications-container" ref={notificationsRef}>
                <button type="button" className="nav-link notification-button" title="Notificações" onClick={toggleNotifications}>
                  <div className="notification-icon">
                    <MdNotifications />
                    {notificationsUnread > 0 && (
                      <span className="notification-badge">{notificationsUnread}</span>
                    )}
                  </div>
                </button>
                {showNotifications && (
                  <div className="notifications-dropdown">
                    <div className="notifications-header">
                      <span>Notificações</span>
                      {notifications.length > 0 && (
                        <div className="notifications-actions">
                          <button className="mark-all-btn" onClick={markAllNotificationsRead}>Marcar tudo como lido</button>
                          <button className="clear-all-btn" onClick={handleClearAllNotifications}>Limpar Todas</button>
                        </div>
                      )}
                    </div>
                    {loadingNotifications ? (
                      <div className="notifications-empty">Carregando...</div>
                    ) : notifications.length === 0 ? (
                      <div className="notifications-empty">Você não tem notificações.</div>
                    ) : (
                      <ul className="notifications-list">
                        {notifications.map((n) => (
                          <li key={n.id} className={`notification-item ${n.is_read ? '' : 'unread'}`} onClick={() => handleNotificationClick(n)}>
                            <div className="notification-avatar">
                              {n.actor_profile_picture ? (
                                <img src={resolveUrl(n.actor_profile_picture)} alt={n.actor_name || n.actor_username} />
                              ) : (
                                <div className="notification-avatar-placeholder">{(n.actor_name || n.actor_username || '?').charAt(0)}</div>
                              )}
                            </div>
                            <div className="notification-content">
                              <div className="notification-text">{renderNotificationText(n)}</div>
                              <div className="notification-time">{formatRelativeTime(n.created_at)}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              
                            {/* Botão do Painel Administrativo */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setAdminPanelTab('stats');
                    setShowAdminPanel(true);
                  }}
                  className="nav-link admin-button"
                  title="Painel Administrativo"
                >
                  <FaCrown />
                  <span>Admin</span>
                </button>
              )}
              
              {/* Menu do usuário */}
              <div className="user-menu">
                {user ? (
                  <>
                    <button 
                      className="user-menu-trigger"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                      <div className="user-avatar">
                        {user.profile_picture ? (
                          <img 
                            src={resolveUrl(user.profile_picture)} 
                            alt={user.name || user.username}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="user-avatar-placeholder" style={{ display: user.profile_picture ? 'none' : 'flex' }}>
                          {user.name?.charAt(0) || user.username?.charAt(0)}
                        </div>
                      </div>
                      <span className="username">{user.name || user.username}</span>
                      <FaUser className="user-icon" />
                    </button>
                  </>
                ) : (
                  <div className="auth-buttons">
                    <Link to="/login" className="nav-link">
                      <FaUser />
                      Entrar
                    </Link>
                    <Link to="/register" className="nav-link">
                      <FaUser />
                      Registrar
                    </Link>
                  </div>
                )}

                {showUserMenu && (
                  <div className="user-dropdown">
                    <Link 
                      to={`/profile/${user.username}`}
                      className="dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaUser />
                      <span>Meu Perfil</span>
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="dropdown-item logout-item"
                    >
                      <FaSignOutAlt />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline">
                Entrar
              </Link>
              <Link to="/register" className="btn btn-primary">
                Cadastrar
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação de Avaliação */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={handlePostCreated}
        currentUser={user}
      />

      {/* Painel Administrativo */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} initialTab={adminPanelTab} />
      )}
    </nav>
  );
};

export default Navbar;
