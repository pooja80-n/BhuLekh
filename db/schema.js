// db/schema.js — Database schema and initialization
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_URL || 'file:./db/bhoomi.sqlite',
  authToken: process.env.TURSO_TOKEN
});

async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','citizen')),
      email TEXT,
      phone TEXT,
      aadhaar TEXT,
      district TEXT DEFAULT 'Bengaluru Rural',
      avatar TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','suspended')),
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      prop_type TEXT NOT NULL,
      area TEXT NOT NULL,
      address TEXT NOT NULL,
      district TEXT,
      state TEXT DEFAULT 'Karnataka',
      lat REAL,
      lng REAL,
      khata TEXT,
      survey_no TEXT,
      status TEXT DEFAULT 'pending',
      risk_score INTEGER DEFAULT 0,
      notes TEXT,
      for_sale INTEGER DEFAULT 0,
      price TEXT,
      base_price REAL,
      description TEXT,
      bidding_on INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      verified_by TEXT,
      verified_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ownership_history (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      owner_id TEXT,
      event_type TEXT NOT NULL,
      event_date TEXT NOT NULL,
      notes TEXT,
      deed_number TEXT,
      recorded_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      bidder_id TEXT,
      bidder_name TEXT NOT NULL,
      bidder_phone TEXT,
      bidder_email TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_phone TEXT NOT NULL,
      buyer_email TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      uploaded_by TEXT,
      doc_type TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      verified INTEGER DEFAULT 0,
      ai_result TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      factors TEXT,
      ai_analysis TEXT,
      status TEXT DEFAULT 'open',
      created_by TEXT,
      resolved_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('Database initialized successfully');
}

initDB().catch(console.error);

module.exports = db;
