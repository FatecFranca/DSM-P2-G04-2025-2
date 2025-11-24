import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from '../components/CreatePostModal';
import './CreatePost.css';

function CreatePost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // isModalOpen removido pois não estava sendo utilizado

  const handlePostCreated = (newPost) => {
    // Redirecionar para a página inicial após criar o post
    navigate('/', { state: { newPost } });
  };

  const handleClose = () => {
    // Redirecionar para a página inicial se o modal for fechado
    navigate('/');
  };

  // Se não houver usuário logado, não deve chegar aqui devido à rota protegida
  if (!user) {
    return null;
  }

  return (
    <div className="create-post-page">
      <CreatePostModal
        isOpen={true}
        onClose={handleClose}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}

export default CreatePost;
