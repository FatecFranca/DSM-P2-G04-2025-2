const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../../config/jwt');

class AuthService {
  constructor() {
    this.saltRounds = 12;
    this.blacklistedTokens = new Set(); // Lista negra de tokens invalidados
  }

  // Adicionar token à lista negra
  blacklistToken(token) {
    this.blacklistedTokens.add(token);
    // Limpar tokens antigos da lista negra após 7 dias
    setTimeout(() => {
      this.blacklistedTokens.delete(token);
    }, 7 * 24 * 60 * 60 * 1000);
  }

  // Verificar se token está na lista negra
  isTokenBlacklisted(token) {
    return this.blacklistedTokens.has(token);
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

  // Verificar se usuário existe
  async userExists(username, email) {
    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    return result.rows.length > 0;
  }

  // Criar novo usuário
  async createUser(userData) {
    const { name, username, email, password, bio } = userData;
    
    // Hash da senha
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Inserir usuário
    const result = await pool.query(
      `INSERT INTO users (name, username, email, password_hash, bio, role) 
       VALUES ($1, $2, $3, $4, $5, 'user') 
       RETURNING id, name, username, email, bio, profile_picture, created_at, role`,
      [name, username, email, passwordHash, bio]
    );

    return result.rows[0];
  }

  // Buscar usuário por credenciais
  async findUserByCredentials(identifier) {
    const result = await pool.query(
      'SELECT id, name, username, email, bio, profile_picture, created_at, role, password_hash FROM users WHERE username = $1 OR email = $1',
      [identifier]
    );
    return result.rows[0] || null;
  }

  // Verificar senha
  async verifyPassword(password, passwordHash) {
    console.log('=== VERIFICANDO SENHA ===');
    console.log('Tipo de password:', typeof password);
    console.log('Password é truthy:', !!password);
    console.log('Password length:', password ? password.length : 'undefined');
    console.log('Tipo de passwordHash:', typeof passwordHash);
    console.log('PasswordHash é truthy:', !!passwordHash);
    console.log('PasswordHash length:', passwordHash ? passwordHash.length : 'undefined');
    
    if (!password) {
      console.error('ERRO: Password é undefined ou null');
      throw new Error('Password é obrigatório');
    }
    
    if (!passwordHash) {
      console.error('ERRO: PasswordHash é undefined ou null');
      throw new Error('Hash da senha não encontrado');
    }
    
    try {
      const result = await bcrypt.compare(password, passwordHash);
      console.log('Resultado da comparação:', result);
      return result;
    } catch (error) {
      console.error('Erro na comparação bcrypt:', error);
      throw error;
    }
  }

  // Verificar token de acesso
  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  // Verificar token de refresh
  async verifyRefreshToken(token) {
    try {
      // Verificar se o token está na lista negra
      if (this.isTokenBlacklisted(token)) {
        throw new Error('Refresh token invalidado');
      }

      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Refresh token inválido');
    }
  }

  // Buscar usuário por ID
  async findUserById(userId) {
    const result = await pool.query(
      'SELECT id, name, username, email, bio, profile_picture, created_at, role FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  // Validar dados de entrada
  validateUserData(userData) {
    const { name, username, email, password } = userData;
    const errors = [];

    if (!name || name.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }

    if (!username || username.trim().length < 3) {
      errors.push('Username deve ter pelo menos 3 caracteres');
    }

    if (!email || !this.isValidEmail(email)) {
      errors.push('Email inválido');
    }

    if (!password || password.length < 6) {
      errors.push('Senha deve ter pelo menos 6 caracteres');
    }

    return errors;
  }

  // Validar email
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validar credenciais de login
  validateLoginData(loginData) {
    const { username, password } = loginData;
    const errors = [];

    if (!username || !username.trim()) {
      errors.push('Username ou email é obrigatório');
    }

    if (!password || !password.trim()) {
      errors.push('Senha é obrigatória');
    }

    return errors;
  }
}

module.exports = new AuthService();
