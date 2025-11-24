import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CommentModal from './CommentModal';
import './Comments.css';

const Comments = ({ postId, onCommentCountChange, post }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const { user, token } = useAuth();

  const fetchComments = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comments/${postId}?page=${pageNum}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (append) {
          setComments(prev => [...prev, ...data.comments]);
        } else {
          setComments(data.comments);
        }
        
        setHasMore(data.pagination.current < data.pagination.pages);
        setPage(pageNum);
        
        if (onCommentCountChange) {
          onCommentCountChange(data.pagination.total);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = (newComment) => {
    setComments(prev => [newComment, ...prev]);
    
    if (onCommentCountChange) {
      onCommentCountChange(prev => prev + 1);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: editContent.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentId 
              ? { ...comment, content: data.comment.content }
              : comment
          )
        );
        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Erro ao editar comentário:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Tem certeza que deseja deletar este comentário?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        
        if (onCommentCountChange) {
          onCommentCountChange(prev => prev - 1);
        }
      }
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
    }
  };

  const loadMoreComments = () => {
    if (!loading && hasMore) {
      fetchComments(page + 1, true);
    }
  };

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

  useEffect(() => {
    if (postId) {
      fetchComments(1, false);
    }
  }, [postId]);

  if (!user) {
    return (
      <div className="comments-container">
        <div className="comments-login-prompt">
          <p>Faça login para ver e adicionar comentários</p>
        </div>
      </div>
    );
  }

  return (
    <div className="comments-container">
      {/* Botão para abrir modal de comentário */}
      <div className="comment-action-container">
        <button 
          className="add-comment-btn"
          onClick={() => setIsCommentModalOpen(true)}
        >
          💬 Adicionar Comentário
        </button>
      </div>

      {/* Lista de comentários */}
      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <div className="comment-author">
                    <div className="comment-avatar">
                      {comment.profile_picture ? (
                        <img 
                          src={comment.profile_picture} 
                          alt={comment.user_name}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="comment-avatar-placeholder"
                        style={{ display: comment.profile_picture ? 'none' : 'flex' }}
                      >
                        {comment.user_name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="comment-author-info">
                      <span className="comment-author-name">{comment.user_name}</span>
                      <span className="comment-date">{formatDate(comment.created_at)}</span>
                    </div>
                  </div>
                  
                  {/* Botões de ação para o autor do comentário */}
                  {comment.user_id === user.id && (
                    <div className="comment-actions">
                      {editingComment === comment.id ? (
                        <>
                          <button 
                            onClick={() => handleEditComment(comment.id)}
                            className="comment-action-btn save-btn"
                          >
                            Salvar
                          </button>
                          <button 
                            onClick={() => {
                              setEditingComment(null);
                              setEditContent('');
                            }}
                            className="comment-action-btn cancel-btn"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingComment(comment.id);
                              setEditContent(comment.content);
                            }}
                            className="comment-action-btn edit-btn"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="comment-action-btn delete-btn"
                          >
                            Deletar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="comment-content">
                  {editingComment === comment.id ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="comment-edit-input"
                      rows="3"
                      maxLength="500"
                    />
                  ) : (
                    <p>{comment.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Botão para carregar mais comentários */}
            {hasMore && (
              <div className="load-more-container">
                <button 
                  onClick={loadMoreComments}
                  className="load-more-btn"
                  disabled={loading}
                >
                  {loading ? 'Carregando...' : 'Carregar mais comentários'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de comentário */}
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        post={post}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
};

export default Comments;
