import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaUsers, FaUtensils, FaChartBar, FaCrown, FaEdit, FaUserPlus, FaUserMinus, FaClock, FaCheck, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import EditRestaurantModal from './EditRestaurantModal';
import CreateRestaurantModal from './CreateRestaurantModal';
import './AdminPanel.css';

const AdminPanel = ({ onClose, initialTab = 'stats' }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [pendingRestaurants, setPendingRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedPendingRestaurant, setSelectedPendingRestaurant] = useState(null);
  // Modal de usuário removido pois não estava sendo utilizado
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showEditRestaurantModal, setShowEditRestaurantModal] = useState(false);
  const [showCreateRestaurantModal, setShowCreateRestaurantModal] = useState(false);
  const [restaurantToEdit, setRestaurantToEdit] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Criar instância do axios configurada para este componente (memoizada)
  const adminAxios = useMemo(() => axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
      'Content-Type': 'application/json'
    }
  }), []);

  // Configurar token quando disponível
  useEffect(() => {
    if (token) {
      adminAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete adminAxios.defaults.headers.common['Authorization'];
    }
  }, [token, adminAxios]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Verificar se o token está presente
      if (!token) {
        console.error('Token não encontrado');
        return;
      }

      // Configurar headers para esta requisição
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const [statsRes, usersRes, restaurantsRes, pendingRestaurantsRes] = await Promise.all([
        adminAxios.get('/api/admin/stats', config),
        adminAxios.get('/api/admin/users', config),
        adminAxios.get('/api/admin/restaurants', config),
        adminAxios.get('/api/pending-restaurants', config)
      ]);

      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setRestaurants(restaurantsRes.data.restaurants);
      setPendingRestaurants(pendingRestaurantsRes.data.pendingRestaurants || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      if (error.response?.status === 401) {
        alert('Erro de autenticação. Verifique se você tem permissão de administrador.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, adminAxios]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  const updateUserRole = async (userId, newRole) => {
    try {
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      await adminAxios.put(`/api/admin/users/${userId}/role`, { newRole }, config);
      await fetchData(); // Recarregar dados
      alert('Role do usuário atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      alert('Erro ao atualizar role do usuário');
    }
  };

  const setRestaurantOwner = async (restaurantId, ownerId) => {
    try {
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      await adminAxios.put(`/api/admin/restaurants/${restaurantId}/owner`, { ownerId }, config);
      await fetchData(); // Recarregar dados
      alert('Dono do restaurante definido com sucesso!');
    } catch (error) {
      console.error('Erro ao definir dono:', error);
      alert('Erro ao definir dono do restaurante');
    }
  };

  const removeRestaurantOwner = async (restaurantId) => {
    try {
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      await adminAxios.delete(`/api/admin/restaurants/${restaurantId}/owner`, config);
      await fetchData(); // Recarregar dados
      alert('Dono do restaurante removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover dono:', error);
      alert('Erro ao remover dono do restaurante');
    }
  };

  const handleEditRestaurant = (restaurant) => {
    setRestaurantToEdit(restaurant);
    setShowEditRestaurantModal(true);
  };

  const handleRestaurantUpdated = (updatedRestaurant) => {
    // Atualizar o restaurante na lista local
    setRestaurants(prev => 
      prev.map(r => r.id === updatedRestaurant.id ? updatedRestaurant : r)
    );
    
    // Recarregar dados para garantir sincronização
    fetchData();
  };

  const handleRestaurantCreated = (createdRestaurant) => {
    setRestaurants(prev => [createdRestaurant, ...prev]);
    fetchData();
  };

  const approvePendingRestaurant = async (pendingRestaurantId) => {
    try {
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      await adminAxios.put(`/api/pending-restaurants/${pendingRestaurantId}/approve`, 
        { adminNotes }, config);
      
      await fetchData(); // Recarregar dados
      alert('Restaurante aprovado com sucesso!');
      setAdminNotes('');
      setSelectedPendingRestaurant(null);
    } catch (error) {
      console.error('Erro ao aprovar restaurante:', error);
      alert('Erro ao aprovar restaurante');
    }
  };

  const rejectPendingRestaurant = async (pendingRestaurantId) => {
    try {
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      await adminAxios.put(`/api/pending-restaurants/${pendingRestaurantId}/reject`, 
        { adminNotes }, config);
      
      await fetchData(); // Recarregar dados
      alert('Restaurante rejeitado com sucesso!');
      setAdminNotes('');
      setSelectedPendingRestaurant(null);
    } catch (error) {
      console.error('Erro ao rejeitar restaurante:', error);
      alert('Erro ao rejeitar restaurante');
    }
  };

  const viewPendingRestaurantDetails = (pendingRestaurant) => {
    setSelectedPendingRestaurant(pendingRestaurant);
  };

  const renderStats = () => (
    <div className="admin-stats">
      <h3>📊 Estatísticas do Sistema</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <FaUsers className="stat-icon" />
          <div className="stat-content">
            <h4>Usuários</h4>
            <p className="stat-number">{stats?.users?.total || 0}</p>
            <div className="stat-breakdown">
              {stats?.users?.by_role?.map(role => (
                <span key={role.role} className="stat-item">
                  {role.role === 'admin' ? '👑 Admin' : 
                   role.role === 'owner' ? '🏪 Proprietários' : '👤 Usuários'}: {role.count}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <FaUtensils className="stat-icon" />
          <div className="stat-content">
            <h4>Restaurantes</h4>
            <p className="stat-number">{stats?.restaurants?.total || 0}</p>
            <div className="stat-breakdown">
              {stats?.restaurants?.by_ownership?.map(status => (
                <span key={status.status} className="stat-item">
                  {status.status === 'Com dono' ? '✅ Com dono' : '❌ Sem dono'}: {status.count}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <FaChartBar className="stat-icon" />
          <div className="stat-content">
            <h4>Fontes</h4>
            <div className="stat-breakdown">
              {stats?.restaurants?.by_source?.map(source => (
                <span key={source.source} className="stat-item">
                  {source.source === 'OSM' ? '🗺️ OSM' : '✏️ Manual'}: {source.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="admin-users">
      <h3>👥 Gestão de Usuários</h3>
      
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email</th>
              <th>Role</th>
              <th>Data de Criação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <span className="username">{user.username}</span>
                    {user.role === 'admin' && <FaCrown className="admin-badge" />}
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role_display}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div className="user-actions">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="user">Usuário</option>
                      <option value="owner">Proprietário</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRestaurants = () => (
    <div className="admin-restaurants">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <h3>🏪 Gestão de Restaurantes</h3>
        <button
          className="action-btn add-btn"
          onClick={() => setShowCreateRestaurantModal(true)}
          title="Adicionar restaurante"
        >
          + Adicionar
        </button>
      </div>
      
      <div className="restaurants-table">
        <table>
          <thead>
            <tr>
              <th>Restaurante</th>
              <th>Endereço</th>
              <th>Dono</th>
              <th>Fonte</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map(restaurant => (
              <tr key={restaurant.id}>
                <td>
                  <div className="restaurant-info">
                    <span className="restaurant-name">{restaurant.name}</span>
                    {restaurant.logo_url && <img src={restaurant.logo_url} alt="Logo" className="restaurant-logo" />}
                  </div>
                </td>
                <td>{restaurant.address}</td>
                <td>
                  <span className={`owner-badge ${restaurant.owner_id ? 'has-owner' : 'no-owner'}`}>
                    {restaurant.owner_display}
                  </span>
                </td>
                <td>
                  <span className={`source-badge source-${restaurant.source_type?.toLowerCase()}`}>
                    {restaurant.source_type}
                  </span>
                </td>
                <td>
                  <div className="restaurant-actions">
                    {/* Botão de Edição */}
                    <button
                      onClick={() => handleEditRestaurant(restaurant)}
                      className="action-btn edit-btn"
                      title="Editar restaurante"
                    >
                      <FaEdit />
                    </button>
                    
                    {/* Botões de Gerenciamento de Dono */}
                    {restaurant.owner_id ? (
                      <button
                        onClick={() => removeRestaurantOwner(restaurant.id)}
                        className="action-btn remove-btn"
                        title="Remover dono"
                      >
                        <FaUserMinus />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedRestaurant(restaurant);
                          setShowRestaurantModal(true);
                        }}
                        className="action-btn add-btn"
                        title="Definir dono"
                      >
                        <FaUserPlus />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPendingRestaurants = () => (
    <div className="admin-pending-restaurants">
      <h3>⏳ Restaurantes Pendentes de Aprovação</h3>
      
      {pendingRestaurants.length === 0 ? (
        <div className="no-pending">
          <p>Nenhum restaurante pendente de aprovação.</p>
        </div>
      ) : (
        <div className="pending-restaurants-table">
          <table>
            <thead>
              <tr>
                <th>Restaurante</th>
                <th>Sugerido por</th>
                <th>Endereço</th>
                <th>Avaliação</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendingRestaurants.map(pending => (
                <tr key={pending.id}>
                  <td>
                    <div className="pending-restaurant-info">
                      <span className="restaurant-name">{pending.name}</span>
                      {pending.description && (
                        <p className="restaurant-description">{pending.description}</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="user-info">
                      <span className="username">{pending.suggested_by_username}</span>
                      <span className="user-name">({pending.suggested_by_name})</span>
                    </div>
                  </td>
                  <td>{pending.address}</td>
                  <td>
                    <div className="rating">
                      <span className="rating-stars">{'★'.repeat(pending.post_rating)}</span>
                      <span className="rating-number">({pending.post_rating}/5)</span>
                    </div>
                  </td>
                  <td>{new Date(pending.created_at).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div className="pending-actions">
                      <button
                        onClick={() => viewPendingRestaurantDetails(pending)}
                        className="action-btn view-btn"
                        title="Ver detalhes"
                      >
                        👁️ Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalhes do restaurante pendente */}
      {selectedPendingRestaurant && (
        <div className="modal-overlay">
          <div className="modal pending-details-modal">
            <h3>Detalhes da Sugestão: {selectedPendingRestaurant.name}</h3>
            
            <div className="pending-details">
              <div className="detail-section">
                <h4>Informações do Restaurante</h4>
                <p><strong>Nome:</strong> {selectedPendingRestaurant.name}</p>
                <p><strong>Descrição:</strong> {selectedPendingRestaurant.description || 'Não informada'}</p>
                <p><strong>Endereço:</strong> {selectedPendingRestaurant.address}</p>
                {selectedPendingRestaurant.cuisine_type && (
                  <p><strong>Tipo de Culinária:</strong> {selectedPendingRestaurant.cuisine_type}</p>
                )}
                {selectedPendingRestaurant.price_range && (
                  <p><strong>Faixa de Preço:</strong> {selectedPendingRestaurant.price_range}</p>
                )}
                {selectedPendingRestaurant.phone_number && (
                  <p><strong>Telefone:</strong> {selectedPendingRestaurant.phone_number}</p>
                )}
                {selectedPendingRestaurant.website && (
                  <p><strong>Website:</strong> <a href={selectedPendingRestaurant.website} target="_blank" rel="noopener noreferrer">{selectedPendingRestaurant.website}</a></p>
                )}
              </div>

              <div className="detail-section">
                <h4>Avaliação do Usuário</h4>
                <p><strong>Nota:</strong> {selectedPendingRestaurant.post_rating}/5</p>
                <p><strong>Conteúdo:</strong> {selectedPendingRestaurant.post_content}</p>
                <p><strong>Sugerido por:</strong> {selectedPendingRestaurant.suggested_by_name} (@{selectedPendingRestaurant.suggested_by_username})</p>
                <p><strong>Data da sugestão:</strong> {new Date(selectedPendingRestaurant.created_at).toLocaleDateString('pt-BR')}</p>
              </div>

              <div className="detail-section">
                <h4>Observações do Administrador</h4>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicione observações sobre a aprovação/rejeição..."
                  className="admin-notes"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => approvePendingRestaurant(selectedPendingRestaurant.id)}
                className="action-btn approve-btn"
                title="Aprovar restaurante"
              >
                <FaCheck /> Aprovar
              </button>
              <button
                onClick={() => rejectPendingRestaurant(selectedPendingRestaurant.id)}
                className="action-btn reject-btn"
                title="Rejeitar restaurante"
              >
                <FaTimes /> Rejeitar
              </button>
              <button
                onClick={() => {
                  setSelectedPendingRestaurant(null);
                  setAdminNotes('');
                }}
                className="cancel-btn"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="admin-panel-overlay">
        <div className="admin-panel">
          <div className="loading">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2>👑 Painel Administrativo</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <FaChartBar /> Estatísticas
          </button>
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <FaUsers /> Usuários
          </button>
          <button
            className={`tab-btn ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            <FaUtensils /> Restaurantes
          </button>
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <FaClock /> Pendentes
            {pendingRestaurants.length > 0 && (
              <span className="pending-badge">{pendingRestaurants.length}</span>
            )}
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'restaurants' && renderRestaurants()}
          {activeTab === 'pending' && renderPendingRestaurants()}
        </div>

        {/* Modal para definir dono do restaurante */}
        {showRestaurantModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Definir Dono para "{selectedRestaurant?.name}"</h3>
              <div className="user-selection">
                <select
                  onChange={(e) => setSelectedUser(users.find(u => u.id === parseInt(e.target.value)))}
                  className="user-select"
                >
                  <option value="">Selecione um usuário</option>
                  {users.filter(u => u.role !== 'admin').map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => {
                    if (selectedUser) {
                      setRestaurantOwner(selectedRestaurant.id, selectedUser.id);
                      setShowRestaurantModal(false);
                      setSelectedUser(null);
                      setSelectedRestaurant(null);
                    }
                  }}
                  disabled={!selectedUser}
                  className="confirm-btn"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => {
                    setShowRestaurantModal(false);
                    setSelectedUser(null);
                    setSelectedRestaurant(null);
                  }}
                  className="cancel-btn"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edição de Restaurante */}
        {showEditRestaurantModal && restaurantToEdit && (
          <EditRestaurantModal
            restaurant={restaurantToEdit}
            isOpen={showEditRestaurantModal}
            onClose={() => {
              setShowEditRestaurantModal(false);
              setRestaurantToEdit(null);
            }}
            onRestaurantUpdated={handleRestaurantUpdated}
          />
        )}

        {/* Modal de Criação de Restaurante */}
        {showCreateRestaurantModal && (
          <CreateRestaurantModal
            isOpen={showCreateRestaurantModal}
            onClose={() => setShowCreateRestaurantModal(false)}
            onRestaurantCreated={handleRestaurantCreated}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
