const usersService = require('./users.service');

const { createNotification } = require('../notifications/notifications.service');

class UsersController {
  // Buscar perfil do usuário por username
  async getProfile(req, res) {
    try {
      const { username } = req.params;
      
      const user = await usersService.findUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Buscar posts do usuário (primeira página)
      const posts = await usersService.getUserPosts(user.id, 10, 0, req.user?.id || null);

      res.json({ 
        user,
        posts 
      });
      
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar perfil do usuário
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      // Validar dados de entrada
      if (updateData.name && updateData.name.trim().length < 2) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' });
      }

      if (updateData.bio && updateData.bio.length > 500) {
        return res.status(400).json({ error: 'Bio deve ter no máximo 500 caracteres' });
      }

      const updatedUser = await usersService.updateProfile(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ 
        message: 'Perfil atualizado com sucesso',
        user: updatedUser 
      });
      
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar posts do usuário
  async getUserPosts(req, res) {
    try {
      const { username } = req.params;
      const { limit = 10, offset = 0 } = req.query;
      const currentUserId = req.user?.id || null;

      const user = await usersService.findUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const posts = await usersService.getUserPosts(user.id, parseInt(limit), parseInt(offset), currentUserId);

      res.json({ 
        user: { id: user.id, name: user.name, username: user.username },
        posts 
      });
      
    } catch (error) {
      console.error('Erro ao buscar posts do usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar usuários que o usuário segue
  async getFollowing(req, res) {
    try {
      const { username } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const user = await usersService.findUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const following = await usersService.getFollowing(user.id, parseInt(limit), parseInt(offset));

      res.json({ 
        user: { id: user.id, name: user.name, username: user.username },
        following 
      });
      
    } catch (error) {
      console.error('Erro ao buscar usuários seguidos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar seguidores do usuário
  async getFollowers(req, res) {
    try {
      const { username } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const user = await usersService.findUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const followers = await usersService.getFollowers(user.id, parseInt(limit), parseInt(offset));

      res.json({ 
        user: { id: user.id, name: user.name, username: user.username },
        followers 
      });
      
    } catch (error) {
      console.error('Erro ao buscar seguidores:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Seguir usuário
  async followUser(req, res) {
    try {
      const followerId = req.user.id;
      const { username } = req.params;

      const userToFollow = await usersService.findUserByUsername(username);
      if (!userToFollow) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (followerId === userToFollow.id) {
        return res.status(400).json({ error: 'Não é possível seguir a si mesmo' });
      }

      // Verificar se já está seguindo
      const isFollowing = await usersService.isFollowing(followerId, userToFollow.id);
      if (isFollowing) {
        return res.status(400).json({ error: 'Você já está seguindo este usuário' });
      }

      await usersService.followUser(followerId, userToFollow.id);

      // Notificação para o usuário seguido
      try {
        await createNotification({
          userId: userToFollow.id,
          actorId: followerId,
          type: 'user_followed',
          data: {}
        });
      } catch (e) {
        console.warn('Falha ao gerar notificação de follow (users.controller):', e?.message);
      }

      res.json({ 
        message: `Agora você está seguindo ${userToFollow.username}` 
      });
      
    } catch (error) {
      console.error('Erro ao seguir usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Deixar de seguir usuário
  async unfollowUser(req, res) {
    try {
      const followerId = req.user.id;
      const { username } = req.params;

      const userToUnfollow = await usersService.findUserByUsername(username);
      if (!userToUnfollow) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar se está seguindo
      const isFollowing = await usersService.isFollowing(followerId, userToUnfollow.id);
      if (!isFollowing) {
        return res.status(400).json({ error: 'Você não está seguindo este usuário' });
      }

      await usersService.unfollowUser(followerId, userToUnfollow.id);

      res.json({ 
        message: `Você deixou de seguir ${userToUnfollow.username}` 
      });
      
    } catch (error) {
      console.error('Erro ao deixar de seguir usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar usuários
  async searchUsers(req, res) {
    try {
      const { q, limit = 10, offset = 0 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Termo de busca deve ter pelo menos 2 caracteres' });
      }

      const users = await usersService.searchUsers(q.trim(), parseInt(limit), parseInt(offset));

      res.json({ users });
      
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar feed do usuário
  async getUserFeed(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      const posts = await usersService.getUserFeed(userId, parseInt(limit), parseInt(offset));

      res.json({ posts });
      
    } catch (error) {
      console.error('Erro ao buscar feed:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Upload de imagem
  async uploadImage(req, res) {
    try {
      console.log('🚀 Upload de imagem iniciado');
      console.log('📁 Arquivo recebido:', req.file);
      console.log('📝 Body recebido:', req.body);
      console.log('👤 Usuário:', req.user);

      // Verificar se o arquivo foi enviado
      if (!req.file) {
        console.log('❌ Nenhum arquivo recebido');
        return res.status(400).json({ 
          error: 'Nenhuma imagem foi enviada',
          code: 'NO_FILE'
        });
      }

      const userId = req.user.id;
      const { type } = req.body; // 'avatar' ou 'cover'
      
      console.log('🔍 Tipo de imagem:', type);
      console.log('🆔 ID do usuário:', userId);
      
      // Validar tipo de imagem
      if (!['avatar', 'cover'].includes(type)) {
        console.log('❌ Tipo de imagem inválido:', type);
        return res.status(400).json({ 
          error: 'Tipo de imagem inválido. Use "avatar" ou "cover"',
          code: 'INVALID_TYPE'
        });
      }

      // Verificar se o arquivo foi salvo corretamente
      if (!req.file.filename) {
        console.log('❌ Nome do arquivo não encontrado');
        return res.status(500).json({ 
          error: 'Erro ao salvar arquivo',
          code: 'FILE_SAVE_ERROR'
        });
      }

      // Gerar URL da imagem
      const imageUrl = `/uploads/${req.file.filename}`;
      
      console.log('✅ Arquivo salvo com sucesso:', {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        imageUrl: imageUrl,
        size: req.file.size
      });
      
      // Preparar dados para atualização
      const updateData = {
        [type === 'avatar' ? 'profile_picture' : 'cover_picture']: imageUrl
      };

      console.log('📝 Dados para atualização:', updateData);
      
      // Atualizar usuário com a nova imagem
      const updatedUser = await usersService.updateProfile(userId, updateData);
      
      if (!updatedUser) {
        console.log('❌ Erro ao atualizar perfil do usuário');
        return res.status(500).json({ 
          error: 'Erro ao atualizar perfil do usuário',
          code: 'PROFILE_UPDATE_ERROR'
        });
      }
      
      console.log('✅ Perfil atualizado com sucesso:', updatedUser);
      
      res.json({
        message: 'Imagem enviada com sucesso!',
        imageUrl: imageUrl,
        user: updatedUser
      });
      
    } catch (error) {
      console.error('🚨 Erro ao fazer upload da imagem:', error);
      console.error('📚 Stack trace:', error.stack);
      
      // Se o arquivo foi criado mas houve erro, tentar removê-lo
      if (req.file && req.file.path) {
        try {
          const fs = require('fs');
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log('🗑️ Arquivo temporário removido:', req.file.path);
          }
        } catch (unlinkError) {
          console.error('❌ Erro ao remover arquivo temporário:', unlinkError);
        }
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        code: 'UPLOAD_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Erro ao processar upload'
      });
    }
  }
}

module.exports = new UsersController();
