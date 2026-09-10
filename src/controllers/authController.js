const jwt = require('jsonwebtoken');
const config = require('../config');
const userModel = require('../models/userModel');

function register(req, res, next) {
  try {
    const { email, password, name, role } = req.body;

    if (userModel.findByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const assignedRole =
      role && req.user?.role === 'admin' ? role : 'user';

    const user = userModel.create({ email, password, name, role: assignedRole });
    const token = signToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

function login(req, res, next) {
  try {
    const { email, password, role } = req.body;
    const user = userModel.findByEmail(email);

    if (!user || !userModel.verifyPassword(user, password) || (role && user.role !== role)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const safeUser = userModel.findById(user.id);
    const token = signToken(safeUser);
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  res.json({ user: req.user });
}

function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

module.exports = { register, login, me };
