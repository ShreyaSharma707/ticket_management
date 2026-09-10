const request = require('supertest');
const createApp = require('../src/app');
const { initDatabase, closeDatabase, resetDatabase } = require('../src/db/database');
const userModel = require('../src/models/userModel');

let app;

async function setupTestApp() {
  await initDatabase(':memory:');
  app = createApp();
  return app;
}

function teardownTestApp() {
  closeDatabase();
  app = null;
}

function seedUsers() {
  const user = userModel.create({
    email: 'user@example.com',
    password: 'password123',
    name: 'Regular User',
    role: 'user',
  });

  const agent = userModel.create({
    email: 'agent@example.com',
    password: 'password123',
    name: 'Support Agent',
    role: 'agent',
  });

  const admin = userModel.create({
    email: 'admin@example.com',
    password: 'password123',
    name: 'Admin User',
    role: 'admin',
  });

  return { user, agent, admin };
}

async function loginAs(email, password = 'password123') {
  const res = await request(app)
    .post('/api/login')
    .send({ email, password })
    .expect(200);
  return res.body.token;
}

module.exports = {
  setupTestApp,
  teardownTestApp,
  resetDatabase,
  seedUsers,
  loginAs,
  getApp: () => app,
};
