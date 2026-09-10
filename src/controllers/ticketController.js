const ticketModel = require('../models/ticketModel');
const commentModel = require('../models/commentModel');
const historyModel = require('../models/historyModel');
const userModel = require('../models/userModel');

function canViewTicket(user, ticket) {
  if (user.role === 'admin' || user.role === 'agent') return true;
  return ticket.createdBy === user.id || ticket.assignedTo === user.id;
}

function canModifyTicket(user, ticket) {
  if (user.role === 'admin') return true;
  if (user.role === 'agent') return true;
  return ticket.createdBy === user.id;
}

function listTickets(req, res, next) {
  try {
    const filters = {};

    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.assignedTo) filters.assignedTo = parseInt(req.query.assignedTo, 10);

    if (req.user.role === 'user') {
      filters.createdBy = req.user.id;
    }

    const tickets = ticketModel.findAll(filters);
    res.json({ tickets, count: tickets.length });
  } catch (err) {
    next(err);
  }
}

function getTicket(req, res, next) {
  try {
    const ticket = ticketModel.findById(parseInt(req.params.id, 10));
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canViewTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const comments = commentModel.findByTicketId(ticket.id);
    const history = historyModel.findByTicketId(ticket.id);
    res.json({ ticket, comments, history });
  } catch (err) {
    next(err);
  }
}

function createTicket(req, res, next) {
  try {
    const ticket = ticketModel.create({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      priority: req.body.priority,
      createdBy: req.user.id,
    });
    historyModel.create({ ticketId: ticket.id, newStatus: ticket.status, changedBy: req.user.id });
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

function updateTicket(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = ticketModel.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!['admin', 'agent'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = ticketModel.update(id, req.body);
    res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
}

function deleteTicket(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = ticketModel.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (req.user.role !== 'admin' && ticket.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    ticketModel.remove(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function updateStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = ticketModel.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!['admin', 'agent'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = ticketModel.updateStatus(id, req.body.status);
    if (updated.status !== ticket.status) {
      historyModel.create({
        ticketId: id,
        previousStatus: ticket.status,
        newStatus: updated.status,
        changedBy: req.user.id,
      });
    }
    res.json({ ticket: updated });
  } catch (err) {
    next(err);
  }
}

function assignTicket(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = ticketModel.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const assigneeId = parseInt(req.body.assigneeId, 10);
    const assignee = userModel.findById(assigneeId);
    if (!assignee || !['agent', 'admin'].includes(assignee.role)) {
      return res.status(400).json({ error: 'Assignee must be an agent or admin' });
    }

    const updated = ticketModel.assign(id, assigneeId);

    if (updated.status === 'OPEN') {
      ticketModel.updateStatus(id, 'IN_PROGRESS');
      updated.status = 'IN_PROGRESS';
    }

    res.json({ ticket: ticketModel.findById(id) });
  } catch (err) {
    next(err);
  }
}

function addComment(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = ticketModel.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canViewTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const comment = commentModel.create({
      ticketId: id,
      userId: req.user.id,
      body: req.body.body,
    });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  updateStatus,
  assignTicket,
  addComment,
  getHistory: (req, res, next) => {
    try {
      const ticket = ticketModel.findById(parseInt(req.params.id, 10));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      if (!canViewTicket(req.user, ticket)) return res.status(403).json({ error: 'Insufficient permissions' });
      res.json({ history: historyModel.findByTicketId(ticket.id) });
    } catch (err) {
      next(err);
    }
  },
};
