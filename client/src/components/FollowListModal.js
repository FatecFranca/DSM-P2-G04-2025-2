import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './FollowListModal.css';

const FollowListModal = ({ isOpen, onClose, username, type = 'followers' }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const resolveUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const isDevClient = typeof window !== 'undefined' && window.location && window.location.port === '3000';
    const normalized = url.startsWith('/') ? url : `/${url}`;
    return `${isDevClient ? 'http://localhost:5000' : ''}${normalized}`;
  };

  const fetchList = useCallback(async () => {
    if (!isOpen || !username) return;
    try {
      setLoading(true);
      setError('');
      const endpoint = `/api/users/profile/${username}/${type}`; // followers | following
      const response = await axios.get(endpoint);
      const list = type === 'followers' ? response.data.followers : response.data.following;
      setUsers(list || []);
    } catch (err) {
      console.error('Erro ao carregar lista de usuários:', err);
      setError('Não foi possível carregar a lista. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [isOpen, username, type]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const title = type === 'followers' ? 'Seguidores' : 'Seguindo';

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const usernameLower = (u.username || '').toLowerCase();
      return name.includes(term) || usernameLower.includes(term);
    });
  }, [users, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="follow-list-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="follow-list-modal">
        <button className="follow-list-close" onClick={onClose} aria-label="Fechar modal">×</button>
        <h3 className="follow-list-title">{title}</h3>
        <div className="follow-list-search">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou @username..."
            className="follow-list-search-input"
          />
        </div>

        {loading ? (
          <div className="follow-list-loading">
            <div className="spinner" />
            <span>Carregando...</span>
          </div>
        ) : error ? (
          <div className="follow-list-error">{error}</div>
        ) : users.length === 0 ? (
          <div className="follow-list-empty">Nenhum usuário encontrado.</div>
        ) : (
          <ul className="follow-list">
            {filteredUsers.map((u) => (
              <li key={u.id} className="follow-list-item">
                <Link to={`/profile/${u.username}`} className="follow-list-user" onClick={onClose}>
                  {u.profile_picture ? (
                    <img
                      src={resolveUrl(u.profile_picture)}
                      alt={u.name || u.username}
                      className="follow-list-avatar"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className="follow-list-avatar placeholder" style={{ display: u.profile_picture ? 'none' : 'flex' }}>
                    {(u.name || u.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="follow-list-info">
                    <div className="follow-list-name">{u.name || u.username}</div>
                    <div className="follow-list-username">@{u.username}</div>
                    {u.bio ? <div className="follow-list-bio">{u.bio}</div> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FollowListModal;


