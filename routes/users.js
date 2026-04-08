// routes/users.js — User management (admin) + activity log
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../db/schema');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/users — All users (admin only)
router.get('/', authenticate, adminOnly, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, name, role, email, phone, district, avatar, status, last_login, created_at,
      (SELECT COUNT(*) FROM properties WHERE owner_id = u.id) as property_count
    FROM users u ORDER BY role DESC, name
  `).all();
  res.json({ data: users });
});

// POST /api/users — Create user (admin only)
router.post('/', authenticate, adminOnly, (req, res) => {
  const { username, password, name, role, email, phone, aadhaar, district } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'username, password, name, role are required.' });
  }
  if (!['admin','citizen'].includes(role)) return res.status(400).json({ error: 'Role must be admin or citizen.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already taken.' });

  const id = uuid();
  const av = name.substring(0, 2).toUpperCase();
  db.prepare(`INSERT INTO users (id,username,password,name,role,email,phone,aadhaar,district,avatar)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, username, bcrypt.hashSync(password, 10), name, role,
    email||null, phone||null, aadhaar||null, district||'Bengaluru Rural', av
  );
  res.status(201).json({ message: 'User created.', id });
});

// PATCH /api/users/:id/status — Suspend/activate
router.patch('/:id/status', authenticate, adminOnly, (req, res) => {
  const { status } = req.body;
  if (!['active','suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, req.params.id);
  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id,details)
    VALUES (?,?,?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name,
    'USER_STATUS_CHANGED', 'user', req.params.id, `Status set to ${status}`);
  res.json({ message: `User ${status}.` });
});

// GET /api/users/activity — Recent activity log
router.get('/activity', authenticate, adminOnly, (req, res) => {
  const { limit = 50, userId } = req.query;
  let sql = 'SELECT * FROM activity_log';
  let params = [];
  if (userId) { sql += ' WHERE user_id = ?'; params.push(userId); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(+limit);
  res.json({ data: db.prepare(sql).all(...params) });
});

// GET /api/users/stats — Dashboard stats
router.get('/stats', authenticate, adminOnly, (req, res) => {
  const stats = {
    totalProperties: db.prepare('SELECT COUNT(*) as n FROM properties').get().n,
    verifiedProperties: db.prepare("SELECT COUNT(*) as n FROM properties WHERE status='verified'").get().n,
    pendingProperties: db.prepare("SELECT COUNT(*) as n FROM properties WHERE status='pending'").get().n,
    disputedProperties: db.prepare("SELECT COUNT(*) as n FROM properties WHERE status='disputed'").get().n,
    forSaleProperties: db.prepare('SELECT COUNT(*) as n FROM properties WHERE for_sale=1').get().n,
    activeBids: db.prepare("SELECT COUNT(*) as n FROM bids WHERE status='active'").get().n,
    totalBids: db.prepare('SELECT COUNT(*) as n FROM bids').get().n,
    pendingRequests: db.prepare("SELECT COUNT(*) as n FROM purchase_requests WHERE status='pending'").get().n,
    openFraudAlerts: db.prepare("SELECT COUNT(*) as n FROM fraud_alerts WHERE status='open'").get().n,
    totalUsers: db.prepare('SELECT COUNT(*) as n FROM users').get().n,
    totalCitizens: db.prepare("SELECT COUNT(*) as n FROM users WHERE role='citizen'").get().n,
  };
  res.json({ data: stats });
});

module.exports = router;
