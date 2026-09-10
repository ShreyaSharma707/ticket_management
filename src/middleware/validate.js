const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (err.code === 'INVALID_TRANSITION') {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'SQLITE_CONSTRAINT' || err.message?.includes('UNIQUE constraint')) {
    return res.status(409).json({ error: 'Resource already exists' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { validate, notFound, errorHandler };
