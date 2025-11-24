const { OAuth2Client } = require('google-auth-library');
const pool = require('../../config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../../config/jwt');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // Verificar token ID do Google (método mantido para compatibilidade, mas não usado mais)
  async verifyGoogleToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified
      };
    } catch (error) {
      console.error('Erro ao verificar token Google:', error);
      throw new Error('Token Google inválido');
    }
  }

  // Buscar ou criar usuário baseado nos dados do Google
  async findOrCreateGoogleUser(googleData) {
    const { googleId, email, name, picture, emailVerified } = googleData;
    
    try {
      // Primeiro, tentar encontrar usuário pelo Google ID
      let result = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );

      if (result.rows.length > 0) {
        // Usuário já existe com este Google ID
        return result.rows[0];
      }

      // Se não encontrar pelo Google ID, tentar pelo email
      result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length > 0) {
        // Usuário existe com este email, atualizar com Google ID
        await pool.query(
          'UPDATE users SET google_id = $1, profile_picture = COALESCE($2, profile_picture) WHERE email = $3',
          [googleId, picture, email]
        );
        
        // Buscar usuário atualizado
        result = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        return result.rows[0];
      }

      // Criar novo usuário
      const username = await this.generateUniqueUsername(name);
      
      result = await pool.query(
        `INSERT INTO users (name, username, email, google_id, profile_picture, role, email_verified) 
         VALUES ($1, $2, $3, $4, $5, 'user', $6) 
         RETURNING *`,
        [name, username, email, googleId, picture, emailVerified || true]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao buscar/criar usuário Google:', error);
      throw error;
    }
  }

  // Buscar ou criar usuário usando access token do Google
  async findOrCreateGoogleUserWithToken(accessToken) {
    try {
      // Usar o access token para obter informações do usuário
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!userInfoResponse.ok) {
        throw new Error('Falha ao obter dados do usuário Google');
      }

      const userData = await userInfoResponse.json();
      console.log('Dados obtidos do Google:', userData);

      // Criar objeto com os dados do usuário
      const googleData = {
        googleId: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        emailVerified: userData.verified_email
      };

      // Usar o método existente para buscar/criar usuário
      return await this.findOrCreateGoogleUser(googleData);

    } catch (error) {
      console.error('Erro ao obter dados do usuário com access token:', error);
      throw new Error('Falha ao autenticar com Google');
    }
  }

  // Gerar username único baseado no nome
  async generateUniqueUsername(name) {
    let baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    let username = baseUsername;
    let counter = 1;
    
    while (true) {
      const result = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return username;
      }
      
      username = `${baseUsername}${counter}`;
      counter++;
      
      if (counter > 100) {
        // Fallback: usar timestamp
        username = `${baseUsername}${Date.now()}`;
        break;
      }
    }
    
    return username;
  }

  // Gerar tokens JWT
  generateTokens(userId, username) {
    const accessToken = jwt.sign(
      { id: userId, username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: userId, username },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }
}

module.exports = new GoogleAuthService();
