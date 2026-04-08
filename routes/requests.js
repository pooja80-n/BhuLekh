// routes/requests.js — Purchase requests
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db = require('../db/schema');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, p.prop_type, p.area, p.address, p.price, p.owner_name
    FROM purchase_requests r
    LEFT JOIN properties p ON p.id = r.property_id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ data: rows });
});

router.post('/', authenticate, (req, res) => {
  const { property_id, buyer_name, buyer_phone, buyer_email, message } = req.body;
  if (!property_id || !buyer_name || !buyer_phone) {
    return res.status(400).json({ error: 'property_id, buyer_name, buyer_phone required.' });
  }
  const prop = db.prepare('SELECT id, for_sale FROM properties WHERE id = ?').get(property_id);
  if (!prop || !prop.for_sale) return res.status(400).json({ error: 'Property not available.' });

  const id = uuid();
  db.prepare(`INSERT INTO purchase_requests (id,property_id,buyer_name,buyer_phone,buyer_email,message)
    VALUES (?,?,?,?,?,?)`).run(id, property_id, buyer_name, buyer_phone, buyer_email||null, message||null);
  res.status(201).json({ message: 'Request submitted. Admin will contact you.', id });
});

router.patch('/:id', authenticate, adminOnly, (req, res) => {
  const { status, admin_notes } = req.body;
  if (!['connected','rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be connected or rejected.' });
  }
  db.prepare(`UPDATE purchase_requests SET status=?, admin_notes=?, updated_at=datetime('now') WHERE id=?`)
    .run(status, admin_notes||null, req.params.id);
  res.json({ message: `Request ${status}.` });
});

module.exports = router;
