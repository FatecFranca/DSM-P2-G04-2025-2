import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaChevronLeft, FaChevronRight, FaHeart, FaRegHeart, FaReply, FaTrash, FaEdit } from 'react-icons/fa';
import './CommentsModal.css';
import { resolveUrl } from '../utils/resolveUrl';

const CommentsModal = ({ isOpen, onClose, post, onCommentAdded }) => {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showReplies, setShowReplies] = useState({});
  const [replies, setReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const { user, token } = useAuth();

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const fetchComments = useCallback(async () => {
    if (!post?.id) return;
    
    try {
      setLoadingComments(true);
      const response = await fetch(`/api/comments/${post.id}?page=1&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [post?.id, token]);

  useEffect(() => {
    if (isOpen) {
      setNewComment('');
      setCurrentPhotoIndex(0);
      setReplyingTo(null);
      setReplyContent('');
      setEditingComment(null);
      setEditContent('');
      fetchComments();
    }
  }, [isOpen, post?.id, fetchComments]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePhotoNavigation = (direction) => {
    if (!post?.photos?.length) return;
    
    const newIndex = currentPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < post.photos.length) {
      setCurrentPhotoIndex(newIndex);
    }
  };

  const fetchReplies = async (commentId) => {
    try {
      setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
      
      const response = await fetch(`/api/comments/${commentId}/replies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReplies(prev => ({ ...prev, [commentId]: data.replies || [] }));
      }
    } catch (error) {
      console.error('Erro ao buscar respostas:', error);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const toggleReplies = (commentId) => {
    const isShowing = showReplies[commentId];
    
    if (isShowing) {
      setShowReplies(prev => ({ ...prev, [commentId]: false }));
    } else {
      setShowReplies(prev => ({ ...prev, [commentId]: true }));
      
      if (!replies[commentId]) {
        fetchReplies(commentId);
      }
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !post?.id) return;

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
        setComments(prev => [data.comment, ...prev]);
        
        if (onCommentAdded) {
          onCommentAdded(data.comment);
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar resposta
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !replyingTo || !post?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/comments/${post.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: replyContent.trim(),
          parentCommentId: replyingTo.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReplyContent('');
        setReplyingTo(null);
        
        setComments(prev => 
          prev.map(comment => 
            comment.id === replyingTo.id 
              ? { 
                  ...comment, 
                  replies_count: Number(comment.replies_count || 0) + 1 
                }
              : comment
          )
        );

        if (showReplies[replyingTo.id]) {
          setReplies(prev => ({
            ...prev,
            [replyingTo.id]: [data.comment, ...(prev[replyingTo.id] || [])]
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar resposta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentId 
              ? { 
                  ...comment, 
                  likes_count: data.liked 
                    ? Number(comment.likes_count || 0) + 1 
                    : Math.max(0, Number(comment.likes_count || 0) - 1),
                  user_liked: data.liked
                }
              : comment
          )
        );
      }
    } catch (error) {
      console.error('Erro ao curtir comentário:', error);
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

        setReplies(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach((parentId) => {
            updated[parentId] = (updated[parentId] || []).map((reply) =>
              reply.id === commentId
                ? { ...reply, content: data.comment.content }
                : reply
            );
          });
          return updated;
        });
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
        
        if (onCommentAdded) {
          onCommentAdded(null, -1);
        }
      }
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
    }
  };

  const handleDeleteReply = async (replyId, parentCommentId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta resposta?')) return;

    try {
      const response = await fetch(`/api/comments/${replyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setReplies(prev => ({
          ...prev,
          [parentCommentId]: prev[parentCommentId]?.filter(reply => reply.id !== replyId) || []
        }));

        setComments(prev => 
          prev.map(comment => 
            comment.id === parentCommentId 
              ? { 
                  ...comment, 
                  replies_count: Math.max(0, Number(comment.replies_count || 0) - 1) 
                }
              : comment
          )
        );
      }
    } catch (error) {
      console.error('Erro ao deletar resposta:', error);
    }
  };

  const handleLikeReply = async (replyId, parentCommentId) => {
    try {
      const response = await fetch(`/api/comments/${replyId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        setReplies(prev => ({
          ...prev,
          [parentCommentId]: prev[parentCommentId]?.map(reply => 
            reply.id === replyId 
              ? { 
                  ...reply, 
                  likes_count: data.liked 
                    ? Number(reply.likes_count || 0) + 1 
                    : Math.max(0, Number(reply.likes_count || 0) - 1),
                  user_liked: data.liked
                }
              : reply
          ) || []
        }));
      }
    } catch (error) {
      console.error('Erro ao curtir resposta:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comments-modal-overlay" onClick={handleBackdropClick}>
      <div className="comments-modal">
        <button 
          className="comments-close"
          onClick={onClose}
          aria-label="Fechar modal"
        >
          ×
        </button>

        <div className="post-image-section">
          {post?.photos?.length > 0 ? (
            <>
              <img 
                src={resolveUrl(post?.photos?.[currentPhotoIndex]?.photo_url)} 
                alt={`Foto ${currentPhotoIndex + 1}`}
                className="post-image-main"
              />
              
              {post?.photos?.length > 1 && (
                <div className="photo-navigation-main">
                  <button 
                    className="photo-nav-main-btn"
                    onClick={() => handlePhotoNavigation(-1)}
                    disabled={currentPhotoIndex === 0}
                    aria-label="Foto anterior"
                  >
                    <FaChevronLeft />
                  </button>
                  
                  <span className="photo-counter-main">
                    {currentPhotoIndex + 1} / {post?.photos?.length || 0}
                  </span>
                  
                  <button 
                    className="photo-nav-main-btn"
                    onClick={() => handlePhotoNavigation(1)}
                    disabled={currentPhotoIndex === ((post?.photos?.length || 0) - 1)}
                    aria-label="Próxima foto"
                  >
                    <FaChevronRight />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="post-image-placeholder">
              <span>Sem imagem</span>
            </div>
          )}
        </div>

        <div className="comments-section">
          <div className="comments-header">
            <h3>Comentários ({comments.length})</h3>
          </div>

          <div className="comments-list-container">
            {loadingComments ? (
              <div className="loading-comments">
                <div className="loading-spinner"></div>
                <p>Carregando comentários...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="no-comments">
                <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
              </div>
            ) : (
              <div className="comments-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <div className="comment-author">
                        <div className="comment-avatar">
                          {comment.profile_picture ? (
                            <img 
                              src={resolveUrl(comment.profile_picture)} 
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
                      
                      {comment.user_id === user?.id && (
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
                                <FaEdit />
                              </button>
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="comment-action-btn delete-btn"
                              >
                                <FaTrash />
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

                    <div className="comment-actions-bar">
                      <button 
                        className={`like-btn ${comment.user_liked ? 'liked' : ''}`}
                        onClick={() => handleLikeComment(comment.id)}
                      >
                        {comment.user_liked ? <FaHeart /> : <FaRegHeart />}
                        <span>{Number(comment.likes_count || 0)}</span>
                      </button>
                      
                      <button 
                        className="reply-btn"
                        onClick={() => setReplyingTo(comment)}
                      >
                        <FaReply />
                        <span>Responder</span>
                      </button>
                      
                      {(comment.replies_count || 0) > 0 && (
                        <button 
                          className="replies-count"
                          onClick={() => toggleReplies(comment.id)}
                        >
                          {showReplies[comment.id] 
                            ? `Ocultar ${Number(comment.replies_count || 0)} resposta${(Number(comment.replies_count || 0)) > 1 ? 's' : ''}`
                            : `Ver ${Number(comment.replies_count || 0)} resposta${(Number(comment.replies_count || 0)) > 1 ? 's' : ''}`
                          }
                        </button>
                      )}
                    </div>

                    {replyingTo?.id === comment.id && (
                      <div className="reply-form">
                        <form onSubmit={handleSubmitReply}>
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`Responder a ${comment.user_name}...`}
                            className="reply-input"
                            rows="2"
                            maxLength="500"
                          />
                          <div className="reply-form-actions">
                            <button 
                              type="button"
                              className="reply-cancel-btn"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent('');
                              }}
                            >
                              Cancelar
                            </button>
                            <button 
                              type="submit" 
                              className="reply-submit-btn"
                              disabled={!replyContent.trim() || loading}
                            >
                              {loading ? 'Enviando...' : 'Responder'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {showReplies[comment.id] && (
                      <div className="replies-container">
                        {loadingReplies[comment.id] ? (
                          <div className="loading-replies">
                            <div className="loading-spinner-small"></div>
                            <span>Carregando respostas...</span>
                          </div>
                        ) : replies[comment.id] && replies[comment.id].length > 0 ? (
                          <div className="replies-list">
                            {replies[comment.id].map((reply) => (
                              <div key={reply.id} className="reply-item">
                                <div className="reply-header">
                                  <div className="reply-author">
                                    <div className="reply-avatar">
                                      {reply.profile_picture ? (
                                        <img 
                                          src={resolveUrl(reply.profile_picture)} 
                                          alt={reply.user_name}
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <div 
                                        className="reply-avatar-placeholder"
                                        style={{ display: reply.profile_picture ? 'none' : 'flex' }}
                                      >
                                        {reply.user_name.charAt(0).toUpperCase()}
                                      </div>
                                    </div>
                                    <div className="reply-author-info">
                                      <span className="reply-author-name">{reply.user_name}</span>
                                      <span className="reply-date">{formatDate(reply.created_at)}</span>
                                    </div>
                                  </div>
                                  
                                  {reply.user_id === user?.id && (
                                    <div className="reply-actions">
                                      {editingComment === reply.id ? (
                                        <>
                                          <button 
                                            onClick={() => handleEditComment(reply.id)}
                                            className="reply-action-btn save-btn"
                                          >
                                            Salvar
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setEditingComment(null);
                                              setEditContent('');
                                            }}
                                            className="reply-action-btn cancel-btn"
                                          >
                                            Cancelar
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button 
                                            onClick={() => {
                                              setEditingComment(reply.id);
                                              setEditContent(reply.content);
                                            }}
                                            className="reply-action-btn edit-btn"
                                          >
                                            <FaEdit />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteReply(reply.id, comment.id)}
                                            className="reply-action-btn delete-btn"
                                          >
                                            <FaTrash />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="reply-content">
                                  {editingComment === reply.id ? (
                                    <textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      className="comment-edit-input"
                                      rows="3"
                                      maxLength="500"
                                    />
                                  ) : (
                                    <p>{reply.content}</p>
                                  )}
                                </div>

                                <div className="reply-actions-bar">
                                  <button 
                                    className={`like-btn ${reply.user_liked ? 'liked' : ''}`}
                                    onClick={() => handleLikeReply(reply.id, comment.id)}
                                  >
                                    {reply.user_liked ? <FaHeart /> : <FaRegHeart />}
                                    <span>{Number(reply.likes_count || 0)}</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-replies">
                            <p>Sem respostas ainda.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="add-comment-area">
            <form onSubmit={handleSubmitComment} className="add-comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="comment-input"
                rows="3"
                maxLength="500"
              />
              <div className="comment-form-footer">
                <span className="comment-char-count">
                  {newComment.length}/500
                </span>
                <button 
                  type="submit" 
                  className="comment-submit-btn"
                  disabled={!newComment.trim() || loading}
                >
                  {loading ? 'Enviando...' : 'Comentar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
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

export default CommentsModal;