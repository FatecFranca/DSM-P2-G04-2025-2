const pool = require('../../config/database');

class UsersService {
  // Buscar usuário por username
  async findUserByUsername(username) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.email, u.bio, u.profile_picture, u.cover_picture, u.created_at,
              COUNT(DISTINCT f1.following_id) as following_count,
              COUNT(DISTINCT f2.follower_id) as followers_count,
              COUNT(DISTINCT p.id) as posts_count
       FROM users u
       LEFT JOIN follows f1 ON u.id = f1.follower_id
       LEFT JOIN follows f2 ON u.id = f2.following_id
       LEFT JOIN posts p ON u.id = p.user_id
       WHERE u.username = $1
       GROUP BY u.id`,
      [username]
    );
    return result.rows[0] || null;
  }

  // Buscar usuário por ID
  async findUserById(userId) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.email, u.bio, u.profile_picture, u.cover_picture, u.created_at,
              COUNT(DISTINCT f1.following_id) as following_count,
              COUNT(DISTINCT f2.follower_id) as followers_count,
              COUNT(DISTINCT p.id) as posts_count
       FROM users u
       LEFT JOIN follows f1 ON u.id = f1.follower_id
       LEFT JOIN follows f2 ON u.id = f2.follower_id
       LEFT JOIN posts p ON u.id = p.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // Atualizar perfil do usuário
  async updateProfile(userId, updateData) {
    const { name, bio, profile_picture, cover_picture } = updateData;
    
    console.log('🔄 Atualizando perfil do usuário:', {
      userId,
      updateData,
      fields: Object.keys(updateData)
    });
    
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           bio = COALESCE($2, bio), 
           profile_picture = COALESCE($3, profile_picture),
           cover_picture = COALESCE($4, cover_picture),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, username, email, bio, profile_picture, cover_picture, created_at, updated_at`,
      [name, bio, profile_picture, cover_picture, userId]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Usuário não encontrado para atualização:', userId);
      return null;
    }
    
    console.log('✅ Perfil atualizado com sucesso:', result.rows[0]);
    return result.rows[0];
  }

  // Buscar posts do usuário
  async getUserPosts(userId, limit = 10, offset = 0, currentUserId = null) {
    const result = await pool.query(
      `SELECT p.*,
              u.name as user_name, u.username as user_username, u.profile_picture as user_profile_picture,
              r.name as restaurant_name, r.address as restaurant_address,
              COUNT(DISTINCT l.id) as likes_count,
              COUNT(DISTINCT c.id) as comments_count,
              CASE WHEN $4::int IS NULL THEN false
                   ELSE EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $4)
              END as user_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN restaurants r ON p.restaurant_id = r.id
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.user_id = $1
       GROUP BY p.id, u.name, u.username, u.profile_picture, r.name, r.address
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset, currentUserId]
    );
    
    // Buscar fotos para cada post
    for (let post of result.rows) {
      const photos = await pool.query(
        'SELECT * FROM post_photos WHERE post_id = $1 ORDER BY uploaded_at ASC',
        [post.id]
      );
      post.photos = photos.rows;
    }
    
    return result.rows;
  }

  // Buscar usuários que o usuário segue
  async getFollowing(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.bio, u.profile_picture, u.created_at
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  }

  // Buscar seguidores do usuário
  async getFollowers(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.bio, u.profile_picture, u.created_at
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  }

  // Verificar se um usuário segue outro
  async isFollowing(followerId, followingId) {
    const result = await pool.query(
      'SELECT 1 as exists FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  // Seguir usuário
  async followUser(followerId, followingId) {
    if (followerId === followingId) {
      throw new Error('Usuário não pode seguir a si mesmo');
    }

    const result = await pool.query(
      `INSERT INTO follows (follower_id, following_id) 
       VALUES ($1, $2) 
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING follower_id, following_id, created_at`,
      [followerId, followingId]
    );
    
    return result.rows[0];
  }

  // Deixar de seguir usuário
  async unfollowUser(followerId, followingId) {
    const result = await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING follower_id, following_id',
      [followerId, followingId]
    );
    
    return result.rows[0];
  }

  // Buscar usuários por termo de busca
  async searchUsers(searchTerm, limit = 10, offset = 0) {
    const result = await pool.query(
      `SELECT u.id, u.name, u.username, u.bio, u.profile_picture, u.created_at
       FROM users u
       WHERE u.name ILIKE $1 OR u.username ILIKE $1
       ORDER BY u.username
       LIMIT $2 OFFSET $3`,
      [`%${searchTerm}%`, limit, offset]
    );
    
    return result.rows;
  }

  // Buscar feed do usuário (posts dos usuários que segue)
  async getUserFeed(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT p.*, u.name as user_name, u.username as user_username, u.profile_picture as user_profile_picture,
              r.name as restaurant_name, r.cuisine_type,
              COUNT(DISTINCT l.id) as likes_count,
              COUNT(DISTINCT c.id) as comments_count,
              COUNT(DISTINCT ph.id) as photos_count,
              EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as user_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN restaurants r ON p.restaurant_id = r.id
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       LEFT JOIN post_photos ph ON p.id = ph.post_id
       WHERE p.user_id IN (
         SELECT following_id FROM follows WHERE follower_id = $1
       ) OR p.user_id = $1
       GROUP BY p.id, u.name, u.username, u.profile_picture, r.name, r.cuisine_type
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  }
}

module.exports = new UsersService();
