const express = require('express');
const authController = require('./auth.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

// Rotas públicas
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/google-login', authController.googleLogin.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/logout', authController.logout.bind(authController));

// Rotas protegidas
router.get('/verify', auth, authController.verify.bind(authController));

module.exports = router;
