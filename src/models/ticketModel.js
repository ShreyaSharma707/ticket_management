const { getDb, lastInsertRowid, changes } = require('../db/database');

const STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT'];
const CATEGORIES = ['Account', 'Billing', 'Technical', 'Access', 'Feature request', 'General'];

const VALID_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['PENDING', 'RESOLVED', 'OPEN', 'CLOSED'],
  PENDING: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['OPEN'],
};

function formatTicket(row) {
  if (!row || !row.id) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creator: row.creator_name
      ? { id: row.created_by, name: row.creator_name, email: row.creator_email }
      : undefined,
    assignee: row.assignee_name
      ? { id: row.assigned_to, name: row.assignee_name, email: row.assignee_email }
      : null,
    commentCount: row.comment_count || 0,
  };
}

const BASE_SELECT = `
  SELECT
    t.*,
    c.name AS creator_name,
    c.email AS creator_email,
    a.name AS assignee_name,
    a.email AS assignee_email,
    (SELECT COUNT(*) FROM comments cm WHERE cm.ticket_id = t.id) AS comment_count
  FROM tickets t
  JOIN users c ON t.created_by = c.id
  LEFT JOIN users a ON t.assigned_to = a.id
`;

function findById(id) {
  const row = getDb().get(`${BASE_SELECT} WHERE t.id = ?`, [id]);
  return formatTicket(row);
}

function create({ title, description, category, priority, createdBy }) {
  getDb().run(
    `INSERT INTO tickets (title, description, category, priority, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [title, description, category || 'General', priority || 'MEDIUM', createdBy]
  );
  return findById(lastInsertRowid());
}

function update(id, { title, description, category, priority }) {
  const existing = findById(id);
  if (!existing) return null;

  getDb().run(
    `UPDATE tickets
    SET title = ?, description = ?, category = ?, priority = ?, updated_at = datetime('now')
     WHERE id = ?`,
      [title ?? existing.title, description ?? existing.description, category ?? existing.category, priority ?? existing.priority, id]
  );
  return findById(id);
}

function remove(id) {
  getDb().run('DELETE FROM tickets WHERE id = ?', [id]);
  return changes() > 0;
}

function updateStatus(id, status) {
  const existing = findById(id);
  if (!existing) return null;

  const allowed = VALID_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(status) && existing.status !== status) {
    const error = new Error(
      `Invalid status transition from ${existing.status} to ${status}`
    );
    error.code = 'INVALID_TRANSITION';
    throw error;
  }

  getDb().run(
    `UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    [status, id]
  );
  return findById(id);
}

function assign(id, assigneeId) {
  const existing = findById(id);
  if (!existing) return null;

  getDb().run(
    `UPDATE tickets SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?`,
    [assigneeId, id]
  );
  return findById(id);
}

function findAll(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('t.status = ?');
    params.push(filters.status.toUpperCase());
  }
  if (filters.priority) {
    conditions.push('t.priority = ?');
    params.push(filters.priority.toUpperCase());
  }
  if (filters.assignedTo) {
    conditions.push('t.assigned_to = ?');
    params.push(filters.assignedTo);
  }
  if (filters.createdBy) {
    conditions.push('t.created_by = ?');
    params.push(filters.createdBy);
  }
  if (filters.search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = getDb().all(`${BASE_SELECT} ${where} ORDER BY t.created_at DESC`, params);
  return rows.map(formatTicket);
}

module.exports = {
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  VALID_TRANSITIONS,
  findById,
  create,
  update,
  remove,
  updateStatus,
  assign,
  findAll,
};
