const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { JWT_SECRET } = require('../config/jwt');

const router = express.Router();

// Registro de usuário
router.post('/register', async (req, res) => {
  try {
    console.log('Tentativa de registro:', { ...req.body, password: '***' });
    const { name, username, email, password, bio } = req.body;

    // Validações básicas
    if (!name || !username || !email || !password) {
      console.log('Campos obrigatórios faltando:', { name: !!name, username: !!username, email: !!email, password: !!password });
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se usuário já existe
    console.log('Verificando se usuário já existe:', { username, email });
    const userExists = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      console.log('Usuário já existe:', userExists.rows[0]);
      return res.status(400).json({ error: 'Usuário ou email já existe' });
    }
    
    console.log('Usuário não existe, prosseguindo com criação');

    // Hash da senha
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Criar usuário
    const newUser = await pool.query(
      'INSERT INTO users (name, username, email, password_hash, bio) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, username, email, bio, profile_picture, created_at',
      [name, username, email, passwordHash, bio]
    );

    // Gerar token JWT
    const token = jwt.sign(
      { id: newUser.rows[0].id, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Usuário criado com sucesso:', newUser.rows[0]);
    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: newUser.rows[0],
      token
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login de usuário
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Tentativa de login:', { username, password: '***' });

    if (!username || !password) {
      console.log('Campos obrigatórios faltando');
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (user.rows.length === 0) {
      console.log('Usuário não encontrado:', username);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    console.log('Usuário encontrado:', user.rows[0].username);

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!isValidPassword) {
      console.log('Senha inválida para usuário:', username);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    console.log('Senha válida para usuário:', username);

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.rows[0].id, username: user.rows[0].username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...userWithoutPassword } = user.rows[0];

    console.log('Login bem-sucedido, token gerado para:', username);

    res.json({
      message: 'Login realizado com sucesso!',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token (rota protegida)
router.get('/verify', auth, async (req, res) => {
  try {
    console.log('Verificando token para usuário:', req.user.id);
    const user = await pool.query(
      'SELECT id, name, username, email, bio, profile_picture, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (user.rows.length === 0) {
      console.log('Usuário não encontrado:', req.user.id);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log('Usuário encontrado:', user.rows[0]);
    res.json({ user: user.rows[0] });
  } catch (error) {
    console.error('Erro na verificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
