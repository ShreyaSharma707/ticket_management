const { body, param, query } = require('express-validator');
const ticketModel = require('../models/ticketModel');
const userModel = require('../models/userModel');

const registerRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role')
    .optional()
    .isIn(userModel.ROLES)
    .withMessage('Role must be user, agent, or admin'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

const createTicketRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').optional().isIn(ticketModel.CATEGORIES).withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(ticketModel.PRIORITIES)
    .withMessage('Invalid priority'),
];

const updateTicketRules = [
  param('id').isInt({ min: 1 }),
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('category').optional().isIn(ticketModel.CATEGORIES),
  body('priority').optional().isIn(ticketModel.PRIORITIES),
];

const ticketIdParam = [param('id').isInt({ min: 1 }).withMessage('Invalid ticket ID')];

const statusRules = [
  ...ticketIdParam,
  body('status')
    .isIn(ticketModel.STATUSES)
    .withMessage('Invalid status'),
];

const assignRules = [
  ...ticketIdParam,
  body('assigneeId').isInt({ min: 1 }).withMessage('Valid assignee ID required'),
];

const commentRules = [
  ...ticketIdParam,
  body('body').trim().notEmpty().withMessage('Comment body is required'),
];

const listQueryRules = [
  query('status').optional().isIn(ticketModel.STATUSES),
  query('priority').optional().isIn(ticketModel.PRIORITIES),
  query('search').optional().isString(),
  query('assignedTo').optional().isInt({ min: 1 }),
];

module.exports = {
  registerRules,
  loginRules,
  createTicketRules,
  updateTicketRules,
  ticketIdParam,
  statusRules,
  assignRules,
  commentRules,
  listQueryRules,
};
