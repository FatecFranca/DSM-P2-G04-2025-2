const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const { JWT_SECRET } = require('../../config/jwt');

// Armazena conexões SSE ativas por usuário
const userIdToSseClients = new Map(); // userId: Set<res>

function addSseClient(userId, res) {
  if (!userIdToSseClients.has(userId)) {
    userIdToSseClients.set(userId, new Set());
  }
  userIdToSseClients.get(userId).add(res);
}

function removeSseClient(userId, res) {
  const set = userIdToSseClients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    userIdToSseClients.delete(userId);
  }
}

function sendEventToUser(userId, eventName, data) {
  const set = userIdToSseClients.get(userId);
  if (!set || set.size === 0) return;
  const payload = `event: ${eventName}\n` +
                  `data: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch (_) {
      // Ignorar erros de escrita em conexões fechadas
    }
  }
}

async function ensureNotificationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
      comment_id INTEGER REFERENCES comments(id) ON DELETE SET NULL,
      data JSONB,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
  `);
}

async function createNotification({ userId, actorId, type, postId = null, commentId = null, pendingRestaurantId = null, data = {} }) {
  // Garantir que a tabela exista antes de inserir
  await ensureNotificationsTable();
  if (!userId || !type) return null;
  if (actorId && userId === actorId) return null; // não notificar ações do próprio usuário

  // Se pendingRestaurantId for fornecido, incluí-lo no data JSONB
  if (pendingRestaurantId) {
    data = { ...data, pending_restaurant_id: pendingRestaurantId };
  }

  const result = await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, actorId || null, type, postId, commentId, data]
  );
  let notification = result.rows[0];

  // Enriquecer com dados do ator para UI
  try {
    const actor = await pool.query(
      'SELECT id, username, name, profile_picture FROM users WHERE id = $1',
      [actorId]
    );
    if (actor.rows[0]) {
      notification = {
        ...notification,
        actor_username: actor.rows[0].username,
        actor_name: actor.rows[0].name,
        actor_profile_picture: actor.rows[0].profile_picture
      };
    }
  } catch (_) {}

  // Enviar em tempo real via SSE
  sendEventToUser(userId, 'notification', notification);
  // Atualizar contador de não lidas
  const unread = await getUnreadCount(userId);
  sendEventToUser(userId, 'unread_count', { unread });

  return notification;
}

async function getUnreadCount(userId) {
  const r = await pool.query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return r.rows[0]?.count || 0;
}

async function listNotifications(userId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
  const params = [userId, limit, offset];
  const unreadClause = unreadOnly ? 'AND n.is_read = FALSE' : '';
  const result = await pool.query(
    `SELECT n.*, 
            ua.username AS actor_username,
            ua.name AS actor_name,
            ua.profile_picture AS actor_profile_picture
     FROM notifications n
     LEFT JOIN users ua ON n.actor_id = ua.id
     WHERE n.user_id = $1 ${unreadClause}
     ORDER BY n.created_at DESC
     LIMIT $2 OFFSET $3`,
    params
  );
  return result.rows;
}

async function markAsRead(userId, notificationId) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  const unread = await getUnreadCount(userId);
  sendEventToUser(userId, 'unread_count', { unread });
  return result.rows[0];
}

async function markAllAsRead(userId) {
  await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  const unread = 0;
  sendEventToUser(userId, 'unread_count', { unread });
  return { success: true };
}

async function clearAllNotifications(userId) {
  await pool.query(
    `DELETE FROM notifications WHERE user_id = $1`,
    [userId]
  );
  const unread = 0;
  sendEventToUser(userId, 'unread_count', { unread });
  return { success: true, message: 'Todas as notificações foram removidas' };
}

function verifyTokenFromQuery(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (_) {
    return null;
  }
}

module.exports = {
  ensureNotificationsTable,
  addSseClient,
  removeSseClient,
  sendEventToUser,
  verifyTokenFromQuery,
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  getUnreadCount
};


