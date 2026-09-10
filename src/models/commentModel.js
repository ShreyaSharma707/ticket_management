const { getDb, lastInsertRowid } = require('../db/database');

function formatComment(row) {
  if (!row || !row.id) return null;
  return {
    id: row.id,
    ticketId: row.ticket_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      id: row.user_id,
      name: row.author_name,
      email: row.author_email,
    },
  };
}

function findByTicketId(ticketId) {
  const rows = getDb().all(
    `SELECT c.*, u.name AS author_name, u.email AS author_email
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.ticket_id = ?
     ORDER BY c.created_at ASC`,
    [ticketId]
  );
  return rows.map(formatComment);
}

function create({ ticketId, userId, body }) {
  getDb().run(
    'INSERT INTO comments (ticket_id, user_id, body) VALUES (?, ?, ?)',
    [ticketId, userId, body]
  );
  const row = getDb().get(
    `SELECT c.*, u.name AS author_name, u.email AS author_email
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [lastInsertRowid()]
  );
  return formatComment(row);
}

module.exports = {
  findByTicketId,
  create,
};
