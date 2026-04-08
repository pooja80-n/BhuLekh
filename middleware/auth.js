// middleware/auth.js — JWT authentication & role authorization
const jwt = require('jsonwebtoken');
const db = require('../db/schema');

// Verify JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check user still exists and is active
    const user = db.prepare('SELECT id, username, name, role, status FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found.' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended.' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired. Please login again.' });
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

// Admin only
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

// Admin or own resource
function adminOrOwn(ownerField = 'owner_id') {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (req.resource && req.resource[ownerField] === req.user.id) return next();
    return res.status(403).json({ error: 'Access denied.' });
  };
}

// Log activity
function logActivity(action, entityType, entityIdFn, detailsFn) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user) {
        try {
          const { v4: uuid } = require('uuid');
          db.prepare(`INSERT INTO activity_log (id, user_id, user_name, action, entity_type, entity_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
            uuid(), req.user.id, req.user.name, action, entityType,
            entityIdFn ? entityIdFn(req) : null,
            detailsFn ? detailsFn(req) : null,
            req.ip
          );
        } catch (e) { /* non-critical */ }
      }
    });
    next();
  };
}

module.exports = { authenticate, adminOnly, adminOrOwn, logActivity };
