const bcrypt = require('bcryptjs');
const { getDb, lastInsertRowid } = require('../db/database');

const ROLES = ['user', 'agent', 'admin'];

function findByEmail(email) {
  return getDb().get('SELECT * FROM users WHERE email = ?', [email]);
}

function findById(id) {
  const user = getDb().get(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
    [id]
  );
  return user || null;
}

function create({ email, password, name, role = 'user' }) {
  const passwordHash = bcrypt.hashSync(password, 10);
  getDb().run(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    [email, passwordHash, name, role]
  );
  return findById(lastInsertRowid());
}

function findByIdWithPassword(id) {
  return getDb().get('SELECT * FROM users WHERE id = ?', [id]);
}

function findAgentsAndAdmins() {
  return getDb().all(
    "SELECT id, email, name, role FROM users WHERE role IN ('agent', 'admin')"
  );
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

module.exports = {
  ROLES,
  findByEmail,
  findById,
  findByIdWithPassword,
  create,
  findAgentsAndAdmins,
  verifyPassword,
};
