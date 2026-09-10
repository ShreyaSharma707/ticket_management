const request = require('supertest');
const {
  setupTestApp,
  teardownTestApp,
  resetDatabase,
  seedUsers,
  loginAs,
  getApp,
} = require('./helpers');

describe('Helpdesk API', () => {
  let userToken;
  let agentToken;
  let adminToken;
  let user;
  let agent;
  let admin;

  beforeAll(async () => {
    await setupTestApp();
  });

  afterAll(() => {
    teardownTestApp();
  });

  beforeEach(() => {
    resetDatabase();
    const users = seedUsers();
    user = users.user;
    agent = users.agent;
    admin = users.admin;
  });

  describe('Authentication', () => {
    it('registers a new user', async () => {
      const res = await request(getApp())
        .post('/api/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        })
        .expect(201);

      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user.role).toBe('user');
      expect(res.body.token).toBeDefined();
    });

    it('logs in with valid credentials', async () => {
      const token = await loginAs('user@example.com');
      expect(token).toBeDefined();
    });

    it('rejects invalid login', async () => {
      await request(getApp())
        .post('/api/login')
        .send({ email: 'user@example.com', password: 'wrong' })
        .expect(401);
    });
  });

  describe('Tickets', () => {
    beforeEach(async () => {
      userToken = await loginAs('user@example.com');
      agentToken = await loginAs('agent@example.com');
      adminToken = await loginAs('admin@example.com');
    });

    it('user can create ticket', async () => {
      const res = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Unable to login',
          description: 'Getting error 500 when trying to login',
          priority: 'HIGH',
        })
        .expect(201);

      expect(res.body.ticket.title).toBe('Unable to login');
      expect(res.body.ticket.status).toBe('OPEN');
      expect(res.body.ticket.priority).toBe('HIGH');
      expect(res.body.ticket.createdBy).toBe(user.id);
    });

    it('requires authentication to create ticket', async () => {
      await request(getApp())
        .post('/api/tickets')
        .send({ title: 'Test', description: 'Test desc' })
        .expect(401);
    });

    it('lists tickets for user (own tickets only)', async () => {
      await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'User ticket', description: 'My issue' });

      await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ title: 'Agent ticket', description: 'Agent issue' });

      const userRes = await request(getApp())
        .get('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(userRes.body.count).toBe(1);
      expect(userRes.body.tickets[0].title).toBe('User ticket');

      const adminRes = await request(getApp())
        .get('/api/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminRes.body.count).toBe(2);
    });

    it('gets ticket by id with comments', async () => {
      const created = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Bug report', description: 'Something broke' });

      const ticketId = created.body.ticket.id;

      await request(getApp())
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ body: 'Still happening' })
        .expect(201);

      const res = await request(getApp())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.ticket.id).toBe(ticketId);
      expect(res.body.comments).toHaveLength(1);
    });

    it('invalid ticket ID returns 404', async () => {
      await request(getApp())
        .get('/api/tickets/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('unauthorized user cannot delete another users ticket', async () => {
      const created = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Private ticket', description: 'Mine only' });

      const otherUser = await request(getApp())
        .post('/api/register')
        .send({
          email: 'other@example.com',
          password: 'password123',
          name: 'Other User',
        });

      await request(getApp())
        .delete(`/api/tickets/${created.body.ticket.id}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);
    });

    it('admin can assign ticket', async () => {
      const created = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Need help', description: 'Please assign' });

      const ticketId = created.body.ticket.id;

      const res = await request(getApp())
        .put(`/api/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeId: agent.id })
        .expect(200);

      expect(res.body.ticket.assignedTo).toBe(agent.id);
      expect(res.body.ticket.status).toBe('IN_PROGRESS');
    });

    it('regular user cannot assign ticket', async () => {
      const created = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Need help', description: 'Please assign' });

      await request(getApp())
        .put(`/api/tickets/${created.body.ticket.id}/assign`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ assigneeId: agent.id })
        .expect(403);
    });

    it('ticket status changes correctly', async () => {
      const created = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Status test', description: 'Testing workflow' });

      const ticketId = created.body.ticket.id;

      let res = await request(getApp())
        .put(`/api/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.ticket.status).toBe('IN_PROGRESS');

      res = await request(getApp())
        .put(`/api/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'RESOLVED' })
        .expect(200);

      expect(res.body.ticket.status).toBe('RESOLVED');

      res = await request(getApp())
        .put(`/api/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'CLOSED' })
        .expect(200);

      expect(res.body.ticket.status).toBe('CLOSED');
    });

    it('rejects invalid status transition', async () => {
      const created = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Transition test', description: 'Testing' });

      await request(getApp())
        .put(`/api/tickets/${created.body.ticket.id}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'RESOLVED' })
        .expect(400);
    });

    it('filters tickets by status and search', async () => {
      const t1 = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Login issue', description: 'Cannot login' });

      await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Payment bug', description: 'Card declined' });

      await request(getApp())
        .put(`/api/tickets/${t1.body.ticket.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'IN_PROGRESS' });

      const byStatus = await request(getApp())
        .get('/api/tickets?status=IN_PROGRESS')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(byStatus.body.count).toBe(1);

      const bySearch = await request(getApp())
        .get('/api/tickets?search=login')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(bySearch.body.count).toBe(1);
      expect(bySearch.body.tickets[0].title).toBe('Login issue');
    });

    it('admin can delete any ticket', async () => {
      const created = await request(getApp())
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Delete me', description: 'Test delete' });

      await request(getApp())
        .delete(`/api/tickets/${created.body.ticket.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(getApp())
        .get(`/api/tickets/${created.body.ticket.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Health check', () => {
    it('returns ok status', async () => {
      const res = await request(getApp()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('returns API info at root and /api', async () => {
      const root = await request(getApp()).get('/').expect(200);
      expect(root.body.name).toBe('Helpdesk API');
      expect(root.body.api).toBe('/api');

      const api = await request(getApp()).get('/api').expect(200);
      expect(api.body.endpoints.auth.login).toBe('POST /api/login');
      expect(api.body.endpoints.tickets.create).toBe('POST /api/tickets');
    });
  });
});
