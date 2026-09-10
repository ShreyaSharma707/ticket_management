const { getDb, lastInsertRowid } = require('../db/database');

function formatHistory(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    comment: row.comment,
    changedAt: row.created_at,
    changedBy: { id: row.changed_by, name: row.changed_by_name, email: row.changed_by_email },
  };
}

function findById(id) {
  const row = getDb().get(
    `SELECT h.*, u.name AS changed_by_name, u.email AS changed_by_email
     FROM ticket_history h JOIN users u ON h.changed_by = u.id WHERE h.id = ?`,
    [id]
  );
  return row ? formatHistory(row) : null;
}

function create({ ticketId, previousStatus = null, newStatus, changedBy, comment = null }) {
  getDb().run(
    'INSERT INTO ticket_history (ticket_id, previous_status, new_status, changed_by, comment) VALUES (?, ?, ?, ?, ?)',
    [ticketId, previousStatus, newStatus, changedBy, comment]
  );
  return findById(lastInsertRowid());
}

function findByTicketId(ticketId) {
  return getDb().all(
    `SELECT h.*, u.name AS changed_by_name, u.email AS changed_by_email
     FROM ticket_history h JOIN users u ON h.changed_by = u.id
     WHERE h.ticket_id = ? ORDER BY h.created_at ASC, h.id ASC`,
    [ticketId]
  ).map(formatHistory);
}

module.exports = { create, findByTicketId };