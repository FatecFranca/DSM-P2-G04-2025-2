const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Middleware para verificar se o usuário é administrador
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Verificar se o token está presente
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso não fornecido' 
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Debug: log do token decodificado
    console.log('Token decodificado:', decoded);
    
    // Buscar informações do usuário no banco
    // O token usa 'id', não 'userId'
    const userId = decoded.id || decoded.userId;
    
    if (!userId) {
      console.error('Token não contém ID do usuário:', decoded);
      return res.status(401).json({ 
        error: 'Token inválido - ID do usuário não encontrado' 
      });
    }
    
    const userQuery = `
      SELECT id, username, email, role 
      FROM users 
      WHERE id = $1
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      console.error('Usuário não encontrado no banco para ID:', userId);
      return res.status(401).json({ 
        error: 'Usuário não encontrado' 
      });
    }

    const user = userResult.rows[0];

    // Verificar se o usuário é administrador
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas administradores podem acessar este recurso.',
        required_role: 'admin',
        user_role: user.role
      });
    }

    // Adicionar informações do usuário ao request
    req.user = user;
    next();

  } catch (error) {
    console.error('Erro na verificação de administrador:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado' 
      });
    }

    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

/**
 * Middleware para verificar se o usuário é dono do restaurante OU administrador
 */
const requireOwnerOrAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acesso não fornecido' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // O token usa 'id', não 'userId'
    const userId = decoded.id || decoded.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Token inválido - ID do usuário não encontrado' 
      });
    }
    
    // Buscar informações do usuário
    const userQuery = `
      SELECT id, username, email, role 
      FROM users 
      WHERE id = $1
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Usuário não encontrado' 
      });
    }

    const user = userResult.rows[0];
    req.user = user;

    // Se for administrador, permitir acesso
    if (user.role === 'admin') {
      return next();
    }

    // Se não for admin, verificar se é dono do restaurante
    const restaurantId = req.params.id || req.params.restaurantId || req.body.restaurant_id;
    
    if (!restaurantId) {
      return res.status(400).json({ 
        error: 'ID do restaurante não fornecido' 
      });
    }

    const restaurantQuery = `
      SELECT owner_id 
      FROM restaurants 
      WHERE id = $1
    `;
    
    const restaurantResult = await pool.query(restaurantQuery, [restaurantId]);
    
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Restaurante não encontrado' 
      });
    }

    const restaurant = restaurantResult.rows[0];

    // Verificar se o usuário é o dono
    if (restaurant.owner_id !== parseInt(user.id)) {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas o dono do restaurante ou administradores podem acessar este recurso.' 
      });
    }

    next();

  } catch (error) {
    console.error('Erro na verificação de proprietário ou administrador:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado' 
      });
    }

    return res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
};

module.exports = {
  requireAdmin,
  requireOwnerOrAdmin
};
