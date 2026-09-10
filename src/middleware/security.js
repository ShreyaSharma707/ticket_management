const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config');

function securityMiddleware() {
  return helmet();
}

function apiRateLimiter() {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    skip: () => config.nodeEnv === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
}

function authRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.authRateLimitMax,
    skip: () => config.nodeEnv === 'test',
    message: { error: 'Too many authentication attempts, please try again later' },
  });
}

module.exports = {
  securityMiddleware,
  apiRateLimiter,
  authRateLimiter,
};
