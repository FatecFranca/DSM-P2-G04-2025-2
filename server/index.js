const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const performanceConfig = require('./config/performance');
const pool = require('./config/database');
require('dotenv').config();

console.log('Variáveis de ambiente carregadas:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***' : 'undefined');
console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? '***' : 'undefined');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('PORT:', process.env.PORT);

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const estabelecimentosRoutes = require('./modules/estabelecimentos/estabelecimentos.routes');
const osmEstabelecimentosRoutes = require('./modules/osm-estabelecimentos/osm-estabelecimentos.routes');
const googlePlacesRoutes = require('./modules/google-places/google-places.routes');
const aiRestaurantSearchRoutes = require('./modules/ai-restaurant-search/ai-restaurant-search.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const restaurantOwnerRoutes = require('./modules/restaurant-owner/restaurant-owner.routes');
const restaurantRoutes = require('./routes/restaurants');
const restaurantPhotosRoutes = require('./modules/restaurants/restaurant-photos.routes');
const restaurantFeaturesRoutes = require('./modules/restaurants/restaurant-features.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const pendingRestaurantsRoutes = require('./modules/pending-restaurants/pending-restaurants.routes');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const likeRoutes = require('./routes/likes');
const favoriteRoutes = require('./routes/favorites');
const followRoutes = require('./routes/follows');
const searchRoutes = require('./routes/search');

const PORT = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Diretório de uploads criado:', uploadsDir);
}

const app = express();

app.set('trust proxy', 1);

app.use(compression(performanceConfig.compression));

app.use(helmet(performanceConfig.security.helmet));

app.use(cors(performanceConfig.cors));

console.log('CORS configurado para:', process.env.CLIENT_URL || 'http://localhost:3000');

const authLimiter = rateLimit(performanceConfig.rateLimit.auth);
const generalLimiter = rateLimit(performanceConfig.rateLimit.general);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 10000,
  delayMs: 0,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  standardHeaders: true,
  legacyHeaders: false
});

if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth', authLimiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api', generalLimiter);
} else {
  console.log('🚀 Rate limiting DESABILITADO em desenvolvimento');
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  if (performanceConfig.cache.enabled && req.method === 'GET') {
    if (req.path.startsWith('/uploads/')) {
      res.set('Cache-Control', `public, max-age=${performanceConfig.cache.maxAge}`);
    }
  }
  next();
});

app.use('/uploads', express.static('uploads'));

app.use(cookieParser());

app.options('*', cors());

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Expires');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
    return;
  }
  next();
});

(async () => {
  try {
    await pool.query("ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS instagram TEXT");
    await pool.query("ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ifood TEXT");
    console.log('✅ Colunas instagram e ifood garantidas na tabela restaurants');
  } catch (e) {
    console.error('⚠️ Não foi possível garantir colunas instagram/ifood:', e.message);
  }
})();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/estabelecimentos', estabelecimentosRoutes);
app.use('/api/osm-estabelecimentos', osmEstabelecimentosRoutes);
app.use('/api/google-places', googlePlacesRoutes);
app.use('/api/ai-restaurant-search', aiRestaurantSearchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurant-owner', restaurantOwnerRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/restaurant-photos', restaurantPhotosRoutes);
app.use('/api/restaurant-features', restaurantFeaturesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/pending-restaurants', pendingRestaurantsRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/search', searchRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BeastFood API funcionando!',
    timestamp: new Date().toISOString(),
    version: '2.3.0',
    modules: ['auth', 'users', 'estabelecimentos', 'osm-estabelecimentos', 'google-places', 'ai-restaurant-search', 'restaurants', 'posts', 'comments', 'likes', 'favorites']
  });
});

app.use((err, req, res, next) => {
  console.error('Erro:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Dados inválidos',
      details: err.message 
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Token inválido' 
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token expirado' 
    });
  }

  res.status(500).json({ 
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    availableRoutes: [
      '/api/auth',
      '/api/users',
      '/api/estabelecimentos',
      '/api/osm-estabelecimentos',
      '/api/google-places',
      '/api/ai-restaurant-search',
      '/api/admin',
      '/api/restaurant-owner',
      '/api/restaurants',
      '/api/restaurant-photos',
      '/api/restaurant-features',
      '/api/pending-restaurants',
      '/api/posts',
      '/api/comments',
      '/api/likes',
      '/api/favorites',
      '/api/follows',
      '/api/search',
      '/api/health'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor BeastFood v2.3 rodando na porta ${PORT}`);
  console.log(`📱 API disponível em:`);
  console.log(`   🌐 Local: http://localhost:${PORT}/api`);
  console.log(`   📱 Rede: http://186.210.58.15:${PORT}/api`);
  console.log(`🔒 Autenticação com refresh tokens habilitada`);
  console.log(`🗺️  Geolocalização com PostGIS habilitada`);
  console.log(`🏪 API de Estabelecimentos implementada`);
  console.log(`🗺️  OpenStreetMap integrado`);
  console.log(`🌐 Google Places API integrada`);
  console.log(`📊 Estrutura modular implementada`);
  console.log(`\n📍 Endpoints disponíveis:`);
  console.log(`   GET  /api/estabelecimentos - Estabelecimentos manuais`);
  console.log(`   GET  /api/osm-estabelecimentos - Estabelecimentos OpenStreetMap`);
  console.log(`   GET  /api/osm-estabelecimentos/nearby - Busca por proximidade OSM`);
  console.log(`   GET  /api/osm-estabelecimentos/status - Status da view OSM`);
  console.log(`   GET  /api/google-places - Estabelecimentos Google Places`);
  console.log(`   GET  /api/google-places/estabelecimentos/unificados - Busca unificada`);
  console.log(`   GET  /api/google-places/estabelecimentos/proximos - Busca por proximidade`);
});
