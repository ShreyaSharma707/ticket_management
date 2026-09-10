require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';

if (nodeEnv === 'production' && jwtSecret === 'dev-secret-change-in-production') {
  console.error('FATAL: Set JWT_SECRET in production');
  process.exit(1);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  databasePath: process.env.DATABASE_PATH || './data/helpdesk.db',
  nodeEnv,
  isProduction: nodeEnv === 'production',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
};

module.exports = config;
