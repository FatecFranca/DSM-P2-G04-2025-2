require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_2024';

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não configurado no .env');
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️ JWT_REFRESH_SECRET não configurado no .env, usando valor padrão');
}

module.exports = {
  JWT_SECRET,
  JWT_REFRESH_SECRET
};
