const express = require('express');
const authController = require('../controllers/authController');
const ticketController = require('../controllers/ticketController');
const userModel = require('../models/userModel');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const validators = require('../validators');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    name: 'Helpdesk API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/register',
        login: 'POST /api/login',
        me: 'GET /api/me',
      },
      tickets: {
        list: 'GET /api/tickets',
        create: 'POST /api/tickets',
        get: 'GET /api/tickets/:id',
        update: 'PUT /api/tickets/:id',
        delete: 'DELETE /api/tickets/:id',
        status: 'PUT /api/tickets/:id/status',
        assign: 'PUT /api/tickets/:id/assign',
        comments: 'POST /api/tickets/:id/comments',
      },
    },
  });
});

router.post('/register', validators.registerRules, validate, authController.register);
router.post('/login', validators.loginRules, validate, authController.login);
router.get('/me', authenticate, authController.me);

router.get('/assignees', authenticate, authorize('admin', 'agent'), (req, res) => {
  res.json({ users: userModel.findAgentsAndAdmins() });
});

router.get(
  '/tickets',
  authenticate,
  validators.listQueryRules,
  validate,
  ticketController.listTickets
);
router.post(
  '/tickets',
  authenticate,
  validators.createTicketRules,
  validate,
  ticketController.createTicket
);
router.get(
  '/tickets/:id',
  authenticate,
  validators.ticketIdParam,
  validate,
  ticketController.getTicket
);
router.get(
  '/tickets/:id/history',
  authenticate,
  validators.ticketIdParam,
  validate,
  ticketController.getHistory
);
router.put(
  '/tickets/:id',
  authenticate,
  authorize('admin', 'agent'),
  validators.updateTicketRules,
  validate,
  ticketController.updateTicket
);
router.delete(
  '/tickets/:id',
  authenticate,
  validators.ticketIdParam,
  validate,
  ticketController.deleteTicket
);

router.put(
  '/tickets/:id/status',
  authenticate,
  authorize('admin', 'agent'),
  validators.statusRules,
  validate,
  ticketController.updateStatus
);
router.put(
  '/tickets/:id/assign',
  authenticate,
  authorize('admin', 'agent'),
  validators.assignRules,
  validate,
  ticketController.assignTicket
);
router.post(
  '/tickets/:id/comments',
  authenticate,
  validators.commentRules,
  validate,
  ticketController.addComment
);

router.get('/admin/tickets', authenticate, authorize('admin'), ticketController.listTickets);
router.get('/admin/tickets/:id', authenticate, authorize('admin'), validators.ticketIdParam, validate, ticketController.getTicket);
router.get('/admin/tickets/:id/history', authenticate, authorize('admin'), validators.ticketIdParam, validate, ticketController.getHistory);
router.patch('/admin/tickets/:id/status', authenticate, authorize('admin'), validators.statusRules, validate, ticketController.updateStatus);
router.post('/admin/tickets/:id/comments', authenticate, authorize('admin'), validators.commentRules, validate, ticketController.addComment);

module.exports = router;
