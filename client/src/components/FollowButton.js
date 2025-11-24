import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './FollowButton.css';

const FollowButton = ({ 
  userId, 
  username, 
  isFollowing, 
  onFollowChange,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(isFollowing);

  // Sincronizar estado interno quando a prop mudar (ex.: outra instância alterou)
  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  const handleFollowToggle = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      if (following) {
        // Deixar de seguir
        await axios.delete(`/api/users/profile/${username}/follow`);
        setFollowing(false);
        onFollowChange?.(false);
      } else {
        // Seguir
        await axios.post(`/api/users/profile/${username}/follow`);
        setFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('Erro ao alterar status de seguindo:', error);
      // Reverter estado em caso de erro
      setFollowing(following);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`follow-button ${following ? 'following' : 'not-following'} ${className}`}
      onClick={handleFollowToggle}
      disabled={loading}
    >
      {loading ? (
        <span className="loading-text">
          <div className="spinner"></div>
          {following ? 'Deixando...' : 'Seguindo...'}
        </span>
      ) : following ? (
        <>
          <span className="icon">✓</span>
          Seguindo
        </>
      ) : (
        <>
          <span className="icon">+</span>
          Seguir
        </>
      )}
    </button>
  );
};

export default FollowButton;
