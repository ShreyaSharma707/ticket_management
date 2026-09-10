const morgan = require('morgan');
const config = require('../config');

const format = config.isProduction
  ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
  : 'dev';

function createLogger() {
  return morgan(format, {
    skip: (req) => req.url === '/health',
  });
}

module.exports = { createLogger };
