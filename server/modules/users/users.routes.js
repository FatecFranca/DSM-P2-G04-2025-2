const express = require('express');
const usersController = require('./users.controller');
const auth = require('../../middleware/auth');
const optionalAuth = require('../../middleware/optional-auth');
const { upload, handleUploadError } = require('../../middleware/upload');

const router = express.Router();

// Rotas públicas
router.get('/profile/:username', usersController.getProfile.bind(usersController));
// Usar autenticação opcional para permitir calcular user_liked quando houver token
router.get('/profile/:username/posts', optionalAuth, usersController.getUserPosts.bind(usersController));
router.get('/profile/:username/following', usersController.getFollowing.bind(usersController));
router.get('/profile/:username/followers', usersController.getFollowers.bind(usersController));
router.get('/search', usersController.searchUsers.bind(usersController));

// Rotas protegidas
router.put('/profile', auth, usersController.updateProfile.bind(usersController));
router.post('/upload-image', auth, upload.single('image'), handleUploadError, usersController.uploadImage.bind(usersController));
router.post('/profile/:username/follow', auth, usersController.followUser.bind(usersController));
router.delete('/profile/:username/follow', auth, usersController.unfollowUser.bind(usersController));
router.get('/feed', auth, usersController.getUserFeed.bind(usersController));

module.exports = router;
