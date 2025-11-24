const express = require('express');
const auth = require('../../middleware/auth');
const NotificationsController = require('./notifications.controller');

const router = express.Router();

// Inicialização (opcional)
router.post('/init', auth, (req, res) => NotificationsController.init(req, res));

// Stream de eventos para o usuário autenticado via token na query
router.get('/stream', (req, res) => NotificationsController.sse(req, res));

// Listar notificações do usuário
router.get('/', auth, (req, res) => NotificationsController.list(req, res));

// Contador de não lidas
router.get('/unread-count', auth, (req, res) => NotificationsController.unreadCount(req, res));

// Marcar como lida
router.post('/:id/read', auth, (req, res) => NotificationsController.markRead(req, res));

// Marcar todas como lidas
router.post('/read-all', auth, (req, res) => NotificationsController.markAll(req, res));

// Deletar todas as notificações
router.delete('/clear-all', auth, (req, res) => NotificationsController.clearAll(req, res));

module.exports = router;


