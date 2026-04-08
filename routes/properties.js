// routes/properties.js — Full CRUD for properties
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db = require('../db/schema');
const { authenticate, adminOnly } = require('../middleware/auth');

// ── GET /api/properties — List all (admin) or own (citizen) ──────────────────
router.get('/', authenticate, (req, res) => {
  const { status, type, forSale, district, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  // Citizens can only see their own properties
  if (req.user.role === 'citizen') {
    where.push('p.owner_id = ?');
    params.push(req.user.id);
  }

  if (status) { where.push('p.status = ?'); params.push(status); }
  if (type) { where.push('p.prop_type = ?'); params.push(type); }
  if (forSale === '1') { where.push('p.for_sale = 1'); }
  if (district) { where.push('p.district = ?'); params.push(district); }
  if (search) {
    where.push('(p.id LIKE ? OR p.owner_name LIKE ? OR p.address LIKE ? OR p.prop_type LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as n FROM properties p ${whereClause}`).get(...params).n;
  const rows = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM bids b WHERE b.property_id = p.id AND b.status = 'active') as active_bids,
      (SELECT MAX(b.amount) FROM bids b WHERE b.property_id = p.id) as top_bid
    FROM properties p
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ data: rows, total, page: +page, pages: Math.ceil(total / limit) });
});

// ── GET /api/properties/marketplace — Public listings ─────────────────────────
router.get('/marketplace', (req, res) => {
  const { type, district, minPrice, maxPrice, hasBidding } = req.query;
  let where = ['p.for_sale = 1', 'p.status != "disputed"'];
  let params = [];
  if (type) { where.push('p.prop_type = ?'); params.push(type); }
  if (district) { where.push('p.district = ?'); params.push(district); }
  if (minPrice) { where.push('p.base_price >= ?'); params.push(+minPrice); }
  if (maxPrice) { where.push('p.base_price <= ?'); params.push(+maxPrice); }
  if (hasBidding === '1') { where.push('p.bidding_on = 1'); }

  const rows = db.prepare(`
    SELECT p.id, p.owner_name, p.prop_type, p.area, p.address, p.district,
           p.lat, p.lng, p.status, p.price, p.base_price, p.description,
           p.bidding_on, p.for_sale, p.risk_score,
           (SELECT COUNT(*) FROM bids b WHERE b.property_id = p.id AND b.status = 'active') as bid_count,
           (SELECT MAX(b.amount) FROM bids b WHERE b.property_id = p.id) as top_bid,
           (SELECT b.bidder_name FROM bids b WHERE b.property_id = p.id ORDER BY b.amount DESC LIMIT 1) as top_bidder
    FROM properties p
    WHERE ${where.join(' AND ')}
    ORDER BY p.created_at DESC
  `).all(...params);
  res.json({ data: rows });
});

// ── GET /api/properties/:id ────────────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  const prop = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM bids b WHERE b.property_id = p.id) as total_bids,
      (SELECT MAX(b.amount) FROM bids b WHERE b.property_id = p.id) as top_bid,
      (SELECT b.bidder_name FROM bids b WHERE b.property_id = p.id ORDER BY b.amount DESC LIMIT 1) as top_bidder
    FROM properties p WHERE p.id = ?`).get(req.params.id);

  if (!prop) return res.status(404).json({ error: 'Property not found.' });

  // Citizens can only view their own or marketplace listings
  if (req.user.role === 'citizen' && prop.owner_id !== req.user.id && !prop.for_sale) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  // Get ownership history
  const history = db.prepare(
    'SELECT * FROM ownership_history WHERE property_id = ? ORDER BY event_date DESC'
  ).all(req.params.id);

  // Get fraud alerts
  const alerts = db.prepare(
    'SELECT * FROM fraud_alerts WHERE property_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);

  res.json({ data: { ...prop, history, alerts } });
});

// ── POST /api/properties — Create (admin only) ────────────────────────────────
router.post('/', authenticate, adminOnly, (req, res) => {
  const { id, owner_id, owner_name, prop_type, area, address, district,
          lat, lng, khata, survey_no, notes } = req.body;

  if (!id || !owner_name || !prop_type || !area || !address) {
    return res.status(400).json({ error: 'Required: id, owner_name, prop_type, area, address' });
  }

  // Check duplicate ID
  const existing = db.prepare('SELECT id FROM properties WHERE id = ?').get(id);
  if (existing) return res.status(409).json({ error: 'Property ID already exists.' });

  db.prepare(`INSERT INTO properties
    (id,owner_id,owner_name,prop_type,area,address,district,lat,lng,khata,survey_no,notes,status,risk_score)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',0)
  `).run(id, owner_id || req.user.id, owner_name, prop_type, area, address,
         district || 'Bengaluru Rural', lat || null, lng || null,
         khata || null, survey_no || null, notes || null);

  // Add initial history entry
  db.prepare(`INSERT INTO ownership_history (id,property_id,owner_name,event_type,event_date,notes,recorded_by)
    VALUES (?,?,?,?,datetime('now'),?,?)`
  ).run(uuid(), id, owner_name, 'Registration', 'Added to digital registry', req.user.id);

  // Log
  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id,details)
    VALUES (?,?,?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name,
    'PROPERTY_REGISTERED', 'property', id, `${prop_type} registered for ${owner_name}`);

  res.status(201).json({ message: 'Property registered.', id });
});

// ── PUT /api/properties/:id — Update (admin only) ─────────────────────────────
router.put('/:id', authenticate, adminOnly, (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });

  const fields = ['prop_type','area','address','district','lat','lng','khata',
                  'survey_no','notes','status','risk_score'];
  const updates = [];
  const vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
  });
  if (!updates.length) return res.status(400).json({ error: 'No valid fields to update.' });

  updates.push('updated_at = datetime("now")');
  vals.push(req.params.id);
  db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...vals);

  if (req.body.status && req.body.status === 'verified') {
    db.prepare('UPDATE properties SET verified_by = ?, verified_at = datetime("now") WHERE id = ?')
      .run(req.user.id, req.params.id);
  }

  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id,details)
    VALUES (?,?,?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name,
    'PROPERTY_UPDATED', 'property', req.params.id, `Updated: ${updates.slice(0,-1).join(', ')}`);

  res.json({ message: 'Property updated.' });
});

// ── DELETE /api/properties/:id — Delete (admin only) ─────────────────────────
router.delete('/:id', authenticate, adminOnly, (req, res) => {
  const prop = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });
  db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id)
    VALUES (?,?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name,
    'PROPERTY_DELETED', 'property', req.params.id);
  res.json({ message: 'Property deleted.' });
});

// ── POST /api/properties/:id/list — List for sale ─────────────────────────────
router.post('/:id/list', authenticate, (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });
  if (req.user.role !== 'admin' && prop.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the owner or admin can list this property.' });
  }
  if (prop.status === 'disputed') return res.status(400).json({ error: 'Disputed properties cannot be listed.' });

  const { price, description, biddingEnabled } = req.body;
  if (!price) return res.status(400).json({ error: 'Price is required.' });

  const basePrice = parseInt(price.replace(/[^\d]/g, '')) || 0;
  db.prepare(`UPDATE properties SET for_sale = 1, price = ?, base_price = ?,
    description = ?, bidding_on = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(price, basePrice, description || null, biddingEnabled ? 1 : 0, req.params.id);

  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id,details)
    VALUES (?,?,?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name,
    'PROPERTY_LISTED', 'property', req.params.id,
    `Listed at ${price}${biddingEnabled ? ' — bidding enabled' : ''}`);

  res.json({ message: 'Property listed for sale.' });
});

// ── POST /api/properties/:id/unlist — Remove from sale ────────────────────────
router.post('/:id/unlist', authenticate, (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });
  if (req.user.role !== 'admin' && prop.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the owner or admin can unlist.' });
  }
  db.prepare(`UPDATE properties SET for_sale = 0, price = NULL, base_price = NULL,
    description = NULL, bidding_on = 0, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Property unlisted.' });
});

// ── GET /api/properties/:id/history — Ownership history ───────────────────────
router.get('/:id/history', authenticate, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM ownership_history WHERE property_id = ? ORDER BY event_date DESC'
  ).all(req.params.id);
  res.json({ data: rows });
});

module.exports = router;
