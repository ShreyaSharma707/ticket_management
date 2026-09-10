const express = require('express');
const path = require('path');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/validate');
const { requestId } = require('./middleware/requestId');
const { createLogger } = require('./middleware/logger');
const {
  securityMiddleware,
  apiRateLimiter,
  authRateLimiter,
} = require('./middleware/security');
const openApiSpec = require('./docs/openapi');
const config = require('./config');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(securityMiddleware());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.get(['/login', '/dashboard', '/user', '/admin/login', '/admin/dashboard', '/admin'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });
  app.use(createLogger());
  app.use('/api', apiRateLimiter());

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  });

  app.get('/', (req, res) => {
    if (req.headers.accept && req.accepts('html')) {
      return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }

    res.json({
      name: 'Helpdesk API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/health',
      api: '/api',
    });
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Helpdesk API Docs',
  }));

  const authLimiter = authRateLimiter();
  app.use('/api', (req, res, next) => {
    if (req.path === '/register' || req.path === '/login') {
      return authLimiter(req, res, next);
    }
    next();
  });

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
