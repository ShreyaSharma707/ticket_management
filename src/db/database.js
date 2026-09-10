const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let db;
let SQL;
let dbPath;
let lastInsertedId;

function persist() {
  if (!db || dbPath === ':memory:') return;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function run(sql, params = []) {
  db.run(sql, params);
  lastInsertedId = db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0];
  persist();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function all(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function tableSql(tableName) {
  return db.exec('SELECT sql FROM sqlite_master WHERE type = \'table\' AND name = ?', [tableName])[0]?.values[0]?.[0] || '';
}

function tableColumns(tableName) {
  return new Set((db.exec(`PRAGMA table_info(${tableName})`)[0]?.values || []).map((row) => row[1]));
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return { run, get, all };
}

async function initDatabase(pathArg = config.databasePath) {
  dbPath = pathArg;
  SQL = await initSqlJs();

  if (pathArg !== ':memory:' && fs.existsSync(pathArg)) {
    const fileBuffer = fs.readFileSync(pathArg);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'agent', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED')),
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT')),
      created_by INTEGER NOT NULL,
      assigned_to INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  if (!tableSql('tickets').includes("'PENDING'")) {
    db.run('ALTER TABLE tickets RENAME TO tickets_legacy');
    db.run(`CREATE TABLE tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED')),
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT')),
      created_by INTEGER NOT NULL,
      assigned_to INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )`);
    db.run(`INSERT INTO tickets (id, title, description, status, priority, created_by, assigned_to, created_at, updated_at)
      SELECT id, title, description, status, priority, created_by, assigned_to, created_at, updated_at FROM tickets_legacy`);
    db.run('DROP TABLE tickets_legacy');
  } else if (!tableColumns('tickets').has('category')) {
    db.run("ALTER TABLE tickets ADD COLUMN category TEXT NOT NULL DEFAULT 'General'");
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to)');
  db.run('CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by)');
  db.run('CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id)');

  persist();
  return getDb();
}

function closeDatabase() {
  if (db) {
    persist();
    db.close();
    db = null;
  }
}

function resetDatabase() {
  if (!db) return;
  db.run('DELETE FROM ticket_history');
  db.run('DELETE FROM comments');
  db.run('DELETE FROM tickets');
  db.run('DELETE FROM users');
  persist();
}

function lastInsertRowid() {
  return lastInsertedId;
}

function changes() {
  return db.getRowsModified();
}

module.exports = {
  getDb,
  initDatabase,
  closeDatabase,
  resetDatabase,
  lastInsertRowid,
  changes,
};
