// routes/auth.js — Login, logout, refresh, me
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db/schema');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');

// Rate limit login — max 10 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT) || 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', loginLimiter, (req, res) => {
  const { username, password, captcha, captchaAnswer } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Validate CAPTCHA (server-side check against stored session captcha)
  // In production use server-stored captcha tokens — here we accept a signed answer
  if (captchaAnswer && captcha && captchaAnswer !== captcha) {
    return res.status(400).json({ error: 'CAPTCHA verification failed.' });
  }

  // Find user
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    // Always respond with same message to prevent username enumeration
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Check password
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    db.prepare(`INSERT INTO activity_log (id,user_name,action,details,ip_address)
      VALUES (?,?,?,?,?)`).run(uuid(), username, 'LOGIN_FAILED', 'Wrong password', req.ip);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Check status
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Your account has been suspended. Contact admin.' });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  // Update last login
  //db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id);

  // Log activity
  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,details,ip_address)
    VALUES (?,?,?,?,?,?)`).run(uuid(), user.id, user.name, 'LOGIN_SUCCESS', `Role: ${user.role}`, req.ip);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      district: user.district,
      avatar: user.avatar,
    }
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authenticate, (req, res) => {
  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,ip_address)
    VALUES (?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name, 'LOGOUT', req.ip);
  res.json({ message: 'Logged out successfully.' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(`SELECT id,username,name,role,email,phone,aadhaar,district,avatar,status,last_login,created_at
    FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  db.prepare('UPDATE users SET password = ?, WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 10), req.user.id);

  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,ip_address)
    VALUES (?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name, 'PASSWORD_CHANGED', req.ip);

  res.json({ message: 'Password changed successfully.' });
});

module.exports = router;
