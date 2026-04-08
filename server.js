// server.js — BhoomiAI Backend API Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// ── Initialize DB (creates tables if not exist) ───────────────────────────────
require('./db/schema');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5500',   // Live Server
    'http://127.0.0.1:5500',
    'null',                     // Local file:// access
  ],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Request parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging (dev only) ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Global rate limiter ────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT) || 200,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Static file serving (uploads) ─────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(path.resolve(uploadDir)));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/properties',  require('./routes/properties'));
app.use('/api/bids',        require('./routes/bids'));
app.use('/api/requests',    require('./routes/requests'));
app.use('/api/ai',          require('./routes/ai'));
app.use('/api/users',       require('./routes/users'));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BhoomiAI API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API docs listing ───────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    name: 'BhoomiAI API',
    version: '1.0.0',
    endpoints: {
      auth:       ['POST /api/auth/login', 'POST /api/auth/logout', 'GET /api/auth/me', 'POST /api/auth/change-password'],
      properties: ['GET /api/properties', 'POST /api/properties', 'GET /api/properties/:id', 'PUT /api/properties/:id', 'DELETE /api/properties/:id', 'GET /api/properties/marketplace', 'POST /api/properties/:id/list', 'POST /api/properties/:id/unlist', 'GET /api/properties/:id/history'],
      bids:       ['GET /api/bids/:propertyId', 'POST /api/bids/:propertyId', 'POST /api/bids/:propertyId/declare-winner'],
      requests:   ['GET /api/requests', 'POST /api/requests', 'PATCH /api/requests/:id'],
      ai:         ['POST /api/ai/fraud-check', 'POST /api/ai/verify-document', 'POST /api/ai/chat', 'POST /api/ai/match-schemes', 'GET /api/ai/fraud-alerts'],
      users:      ['GET /api/users', 'POST /api/users', 'PATCH /api/users/:id/status', 'GET /api/users/activity', 'GET /api/users/stats'],
    }
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║       BhoomiAI Backend API             ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Running at http://localhost:${PORT}      ║`);
  console.log(`║  Mode: ${(process.env.NODE_ENV || 'development').padEnd(31)}║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  API docs: http://localhost:5000/api   ║');
  console.log('║  Health:   http://localhost:5000/api/health ║');
  console.log('╚════════════════════════════════════════╝\n');
});

module.exports = app;
