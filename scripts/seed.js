/**
 * Seed the database with demo users and sample tickets.
 * Usage: npm run seed
 */
require('dotenv').config();

const { initDatabase, closeDatabase } = require('../src/db/database');
const userModel = require('../src/models/userModel');
const ticketModel = require('../src/models/ticketModel');
const commentModel = require('../src/models/commentModel');
const config = require('../src/config');

const DEMO_PASSWORD = 'password123';

async function seed() {
  console.log('Seeding Helpdesk database...\n');
  await initDatabase(config.databasePath);

  const users = [
    { email: 'admin@helpdesk.dev', name: 'Admin User', role: 'admin' },
    { email: 'agent@helpdesk.dev', name: 'Support Agent', role: 'agent' },
    { email: 'user@helpdesk.dev', name: 'Jane Customer', role: 'user' },
  ];

  const created = {};
  for (const u of users) {
    const existing = userModel.findByEmail(u.email);
    if (existing) {
      created[u.role] = userModel.findById(existing.id);
      console.log(`  [skip] ${u.email} already exists`);
    } else {
      created[u.role] = userModel.create({
        ...u,
        password: DEMO_PASSWORD,
      });
      console.log(`  [created] ${u.email} (${u.role})`);
    }
  }

  const tickets = [
    {
      title: 'Unable to login',
      description: 'Getting HTTP 500 when submitting login form with valid credentials.',
      category: 'Access',
      priority: 'HIGH',
      createdBy: created.user.id,
      status: 'IN_PROGRESS',
      assigneeId: created.agent.id,
    },
    {
      title: 'Password reset email not received',
      description: 'Requested password reset 30 minutes ago, no email in inbox or spam.',
      category: 'Account',
      priority: 'MEDIUM',
      createdBy: created.user.id,
      status: 'OPEN',
    },
    {
      title: 'Feature request: dark mode',
      description: 'Would love a dark theme option in the dashboard settings.',
      category: 'Feature request',
      priority: 'LOW',
      createdBy: created.user.id,
      status: 'RESOLVED',
      assigneeId: created.agent.id,
    },
  ];

  for (const t of tickets) {
    const ticket = ticketModel.create({
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      createdBy: t.createdBy,
    });

    if (t.assigneeId) {
      ticketModel.assign(ticket.id, t.assigneeId);
      ticketModel.updateStatus(ticket.id, 'IN_PROGRESS');
    }
    if (t.status === 'RESOLVED') {
      ticketModel.updateStatus(ticket.id, 'RESOLVED');
    }

    commentModel.create({
      ticketId: ticket.id,
      userId: t.createdBy,
      body: 'This issue is affecting my daily workflow.',
    });

    if (t.assigneeId) {
      commentModel.create({
        ticketId: ticket.id,
        userId: t.assigneeId,
        body: 'Looking into this now.',
      });
    }

    console.log(`  [ticket #${ticket.id}] ${t.title} (${t.status || 'OPEN'})`);
  }

  console.log('\nSeed complete!\n');
  console.log('Demo accounts (password: password123):');
  console.log('  admin  → admin@helpdesk.dev');
  console.log('  agent  → agent@helpdesk.dev');
  console.log('  user   → user@helpdesk.dev');
  console.log('');

  closeDatabase();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
