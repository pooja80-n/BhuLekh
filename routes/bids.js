// routes/bids.js — Bidding system
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db = require('../db/schema');
const { authenticate, adminOnly } = require('../middleware/auth');

// GET /api/bids/:propertyId — Get all bids for a property
router.get('/:propertyId', authenticate, (req, res) => {
  const bids = db.prepare(`
    SELECT id, bidder_name, amount, status, created_at
    FROM bids WHERE property_id = ?
    ORDER BY amount DESC
  `).all(req.params.propertyId);
  res.json({ data: bids });
});

// POST /api/bids/:propertyId — Place a bid
router.post('/:propertyId', authenticate, (req, res) => {
  const { bidder_name, bidder_phone, bidder_email, amount } = req.body;
  const propertyId = req.params.propertyId;

  if (!amount || !bidder_name || !bidder_phone) {
    return res.status(400).json({ error: 'Name, phone and amount are required.' });
  }

  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
  if (!prop) return res.status(404).json({ error: 'Property not found.' });
  if (!prop.for_sale) return res.status(400).json({ error: 'Property is not listed for sale.' });
  if (!prop.bidding_on) return res.status(400).json({ error: 'Bidding is not enabled for this property.' });

  // Validate minimum bid (5% above current top)
  const topBid = db.prepare(
    'SELECT MAX(amount) as top FROM bids WHERE property_id = ?'
  ).get(propertyId).top || prop.base_price || 0;
  const minBid = Math.ceil(topBid * 1.05 / 1000) * 1000;

  if (amount < minBid) {
    return res.status(400).json({
      error: `Minimum bid is ₹${minBid.toLocaleString('en-IN')} (5% above current top).`,
      minBid
    });
  }

  // Mark previous active bids as outbid
  db.prepare(`UPDATE bids SET status = 'outbid' WHERE property_id = ? AND status = 'active'`)
    .run(propertyId);

  // Insert new bid
  const bidId = uuid();
  db.prepare(`INSERT INTO bids (id, property_id, bidder_id, bidder_name, bidder_phone, bidder_email, amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
  ).run(bidId, propertyId, req.user.id, bidder_name, bidder_phone, bidder_email || null, amount);

  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id,details)
    VALUES (?,?,?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name,
    'BID_PLACED', 'bid', bidId, `Bid ₹${amount} on ${propertyId}`);

  const allBids = db.prepare(
    'SELECT bidder_name, amount, status, created_at FROM bids WHERE property_id = ? ORDER BY amount DESC'
  ).all(propertyId);

  res.status(201).json({ message: 'Bid placed successfully!', bid: { id: bidId, amount }, allBids });
});

// POST /api/bids/:propertyId/declare-winner — Admin declares winner
router.post('/:propertyId/declare-winner', authenticate, adminOnly, (req, res) => {
  const topBid = db.prepare(
    "SELECT * FROM bids WHERE property_id = ? AND status = 'active' ORDER BY amount DESC LIMIT 1"
  ).get(req.params.propertyId);

  if (!topBid) return res.status(400).json({ error: 'No active bids to declare winner.' });

  db.prepare("UPDATE bids SET status = 'won' WHERE id = ?").run(topBid.id);

  db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id,details)
    VALUES (?,?,?,?,?,?,?)`).run(uuid(), req.user.id, req.user.name,
    'WINNER_DECLARED', 'bid', topBid.id,
    `Winner: ${topBid.bidder_name} at ₹${topBid.amount}`);

  res.json({ message: `Winner declared: ${topBid.bidder_name} at ₹${topBid.amount}`, winner: topBid });
});

module.exports = router;
