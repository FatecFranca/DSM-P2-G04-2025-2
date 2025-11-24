const { Pool } = require('pg');
require('dotenv').config();

console.log('🔧 Configuração do banco - dotenv carregado');
console.log('📍 DB_HOST:', process.env.DB_HOST);
console.log('🔌 DB_PORT:', process.env.DB_PORT);
console.log('🗄️ DB_NAME:', process.env.DB_NAME);
console.log('👤 DB_USER:', process.env.DB_USER);
console.log('🔑 DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'beastfood',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  options: '-c timezone=America/Sao_Paulo',
  client_encoding: 'UTF8',
  statement_timeout: 10000,
  query_timeout: 10000,
  min: 2,
  acquireTimeoutMillis: 10000,
  createTimeoutMillis: 10000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
});

console.log('✅ Pool do banco criado com configuração:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'beastfood',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD ? '***' : 'undefined',
  timezone: 'America/Sao_Paulo'
});

console.log('🔍 Pool criado:', pool);
console.log('🔍 Tipo do pool:', typeof pool);
console.log('🔍 Pool tem método query?', typeof pool.query);

pool.on('connect', () => {
  console.log('✅ Conectado ao banco PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com o banco:', err);
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro ao testar conexão com o banco:', err);
  } else {
    console.log('✅ Teste de conexão com o banco bem-sucedido:', res.rows[0]);
  }
});

const checkPostGIS = async () => {
  try {
    const result = await pool.query('SELECT PostGIS_Version()');
    console.log('✅ PostGIS disponível:', result.rows[0].postgis_version);
    return true;
  } catch (error) {
    console.warn('⚠️ PostGIS não disponível. Funcionalidades de geolocalização serão limitadas.');
    return false;
  }
};

checkPostGIS();

module.exports = pool;
