const {
  ensureNotificationsTable,
  addSseClient,
  removeSseClient,
  verifyTokenFromQuery,
  listNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  getUnreadCount
} = require('./notifications.service');

class NotificationsController {
  async init(req, res) {
    await ensureNotificationsTable();
    res.json({ ready: true });
  }

  async sse(req, res) {
    await ensureNotificationsTable();
    const token = req.query.token;
    const decoded = verifyTokenFromQuery(token);
    if (!decoded) {
      return res.status(401).end();
    }

    const userId = decoded.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    addSseClient(userId, res);

    // Enviar contador inicial
    getUnreadCount(userId).then((count) => {
      try {
        res.write(`event: unread_count\n`);
        res.write(`data: ${JSON.stringify({ unread: count })}\n\n`);
      } catch (_) {}
    });

    // Keep-alive
    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (_) {}
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      removeSseClient(userId, res);
    });
  }

  async list(req, res) {
    await ensureNotificationsTable();
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const items = await listNotifications(userId, {
      limit: parseInt(limit),
      offset,
      unreadOnly: String(unreadOnly) === 'true'
    });
    res.json({ notifications: items });
  }

  async unreadCount(req, res) {
    await ensureNotificationsTable();
    const userId = req.user.id;
    const count = await getUnreadCount(userId);
    res.json({ unread: count });
  }

  async markRead(req, res) {
    await ensureNotificationsTable();
    const userId = req.user.id;
    const { id } = req.params;
    const n = await markAsRead(userId, id);
    res.json({ notification: n });
  }

  async markAll(req, res) {
    await ensureNotificationsTable();
    const userId = req.user.id;
    const result = await markAllAsRead(userId);
    res.json(result);
  }

  async clearAll(req, res) {
    await ensureNotificationsTable();
    const userId = req.user.id;
    const result = await clearAllNotifications(userId);
    res.json(result);
  }
}

module.exports = new NotificationsController();


