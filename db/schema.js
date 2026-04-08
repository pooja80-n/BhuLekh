// db/schema.js — Database schema and initialization
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './db/bhoomi.sqlite';

// Ensure db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── CREATE ALL TABLES ───────────────────────────────────────────────────────

db.exec(`

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('admin','citizen')),
  email       TEXT,
  phone       TEXT,
  aadhaar     TEXT,
  district    TEXT DEFAULT 'Bengaluru Rural',
  avatar      TEXT,
  status      TEXT DEFAULT 'active' CHECK(status IN ('active','suspended')),
  last_login  TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS properties (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL REFERENCES users(id),
  owner_name    TEXT NOT NULL,
  prop_type     TEXT NOT NULL,
  area          TEXT NOT NULL,
  address       TEXT NOT NULL,
  district      TEXT,
  state         TEXT DEFAULT 'Karnataka',
  lat           REAL,
  lng           REAL,
  khata         TEXT,
  survey_no     TEXT,
  status        TEXT DEFAULT 'pending' CHECK(status IN ('verified','pending','disputed')),
  risk_score    INTEGER DEFAULT 0,
  notes         TEXT,
  for_sale      INTEGER DEFAULT 0,
  price         TEXT,
  base_price    REAL,
  description   TEXT,
  bidding_on    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  verified_by   TEXT REFERENCES users(id),
  verified_at   TEXT
);

-- OWNERSHIP HISTORY TABLE
CREATE TABLE IF NOT EXISTS ownership_history (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_name    TEXT NOT NULL,
  owner_id      TEXT REFERENCES users(id),
  event_type    TEXT NOT NULL,
  event_date    TEXT NOT NULL,
  notes         TEXT,
  deed_number   TEXT,
  recorded_by   TEXT REFERENCES users(id),
  created_at    TEXT DEFAULT (datetime('now'))
);

-- BIDS TABLE
CREATE TABLE IF NOT EXISTS bids (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  bidder_id     TEXT REFERENCES users(id),
  bidder_name   TEXT NOT NULL,
  bidder_phone  TEXT,
  bidder_email  TEXT,
  amount        REAL NOT NULL,
  status        TEXT DEFAULT 'active' CHECK(status IN ('active','won','outbid','withdrawn')),
  created_at    TEXT DEFAULT (datetime('now'))
);

-- PURCHASE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS purchase_requests (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  buyer_name    TEXT NOT NULL,
  buyer_phone   TEXT NOT NULL,
  buyer_email   TEXT,
  message       TEXT,
  status        TEXT DEFAULT 'pending' CHECK(status IN ('pending','connected','rejected')),
  admin_notes   TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  property_id   TEXT REFERENCES properties(id) ON DELETE CASCADE,
  uploaded_by   TEXT REFERENCES users(id),
  doc_type      TEXT NOT NULL,
  filename      TEXT NOT NULL,
  original_name TEXT,
  file_size     INTEGER,
  mime_type     TEXT,
  verified      INTEGER DEFAULT 0,
  ai_result     TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- FRAUD ALERTS TABLE
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  risk_score    INTEGER NOT NULL,
  factors       TEXT,
  ai_analysis   TEXT,
  status        TEXT DEFAULT 'open' CHECK(status IN ('open','resolved','false_positive')),
  created_by    TEXT REFERENCES users(id),
  resolved_by   TEXT REFERENCES users(id),
  created_at    TEXT DEFAULT (datetime('now')),
  resolved_at   TEXT
);

-- ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS activity_log (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id),
  user_name     TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  details       TEXT,
  ip_address    TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_properties_owner    ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status   ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_for_sale ON properties(for_sale);
CREATE INDEX IF NOT EXISTS idx_bids_property       ON bids(property_id);
CREATE INDEX IF NOT EXISTS idx_bids_status         ON bids(status);
CREATE INDEX IF NOT EXISTS idx_requests_property   ON purchase_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_activity_user       ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created    ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_history_property    ON ownership_history(property_id);
`);

module.exports = db;
