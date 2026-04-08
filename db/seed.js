// db/seed.js — Seed the database with initial data
require('dotenv').config();
const db = require('./schema');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

console.log('🌱 Seeding BhoomiAI database...\n');

// ─── CLEAR EXISTING DATA ─────────────────────────────────────────────────────
const tables = ['activity_log','sessions','fraud_alerts','documents',
                'purchase_requests','bids','ownership_history','properties','users'];
tables.forEach(t => db.prepare(`DELETE FROM ${t}`).run());
console.log('✓ Cleared existing data');

// ─── USERS ───────────────────────────────────────────────────────────────────
const password = (raw) => bcrypt.hashSync(raw, 10);

const users = [
  { id:'u-001', username:'admin',     password:password('admin123'),  name:'District Admin',    role:'admin',   email:'admin@bhoomi.gov.in',      phone:'+91 80 2238 0001', aadhaar:'XXXX-XXXX-0001', district:'Bengaluru Rural', avatar:'AD' },
  { id:'u-002', username:'collector', password:password('col@2024'),   name:'District Collector',role:'admin',   email:'collector@bhoomi.gov.in',  phone:'+91 80 2238 0002', aadhaar:'XXXX-XXXX-0002', district:'Mysuru',         avatar:'DC' },
  { id:'u-003', username:'ravi',      password:password('ravi123'),    name:'Ravi Kumar',        role:'citizen', email:'ravi@example.com',         phone:'+91 98765 43210',  aadhaar:'XXXX-XXXX-1234', district:'Bengaluru Rural', avatar:'RK' },
  { id:'u-004', username:'lakshmi',   password:password('lakshmi123'), name:'Lakshmi Devi',      role:'citizen', email:'lakshmi@example.com',      phone:'+91 87654 32109',  aadhaar:'XXXX-XXXX-5678', district:'Ramanagara',     avatar:'LD' },
  { id:'u-005', username:'suresh',    password:password('suresh123'),  name:'Suresh Babu',       role:'citizen', email:'suresh@example.com',       phone:'+91 76543 21098',  aadhaar:'XXXX-XXXX-9012', district:'Mysuru',         avatar:'SB' },
  { id:'u-006', username:'meera',     password:password('meera123'),   name:'Meera Nair',        role:'citizen', email:'meera@example.com',        phone:'+91 54321 09876',  aadhaar:'XXXX-XXXX-7890', district:'Hassan',         avatar:'MN' },
  { id:'u-007', username:'ganesh',    password:password('ganesh123'),  name:'Ganesh Reddy',      role:'citizen', email:'ganesh@example.com',       phone:'+91 43210 98765',  aadhaar:'XXXX-XXXX-2345', district:'Bengaluru Urban', avatar:'GR' },
  { id:'u-008', username:'priya',     password:password('priya123'),   name:'Priya Shetty',      role:'citizen', email:'priya@example.com',        phone:'+91 98123 45678',  aadhaar:'XXXX-XXXX-3456', district:'Dakshina Kannada', avatar:'PS' },
];

const insUser = db.prepare(`INSERT INTO users (id,username,password,name,role,email,phone,aadhaar,district,avatar)
  VALUES (@id,@username,@password,@name,@role,@email,@phone,@aadhaar,@district,@avatar)`);
users.forEach(u => insUser.run(u));
console.log(`✓ Created ${users.length} users`);

// ─── PROPERTIES ──────────────────────────────────────────────────────────────
const properties = [
  {
    id:'KA-BLR-2024-001', owner_id:'u-003', owner_name:'Ravi Kumar',
    prop_type:'Agricultural Land', area:'3.2 acres',
    address:'Dodballapur Road, Bengaluru Rural, Karnataka',
    district:'Bengaluru Rural', lat:13.2942, lng:77.5383,
    khata:'KHT-45821', survey_no:'SRV-2024-001',
    status:'verified', risk_score:8, for_sale:0, bidding_on:0,
    notes:'Irrigated land with borewell. Good road access.',
    price:null, base_price:null, description:null
  },
  {
    id:'KA-BLR-2024-002', owner_id:'u-004', owner_name:'Lakshmi Devi',
    prop_type:'Agricultural Land', area:'1.8 acres',
    address:'Kanakapura Road, South Bengaluru, Karnataka',
    district:'Ramanagara', lat:12.5472, lng:77.4173,
    khata:'KHT-33290', survey_no:'SRV-2024-002',
    status:'verified', risk_score:12, for_sale:1, bidding_on:1,
    notes:'Black soil, adjacent to NH 209.',
    price:'₹18,00,000', base_price:1800000,
    description:'Fertile agricultural land. Excellent for horticulture. Clear title.'
  },
  {
    id:'KA-MYS-2024-001', owner_id:'u-005', owner_name:'Suresh Babu',
    prop_type:'Independent House', area:'2,400 sq ft',
    address:'Vijayanagar, Mysuru, Karnataka',
    district:'Mysuru', lat:12.3051, lng:76.6551,
    khata:'KHT-71045', survey_no:'SRV-2024-003',
    status:'verified', risk_score:12, for_sale:1, bidding_on:1,
    notes:'G+2 independent house, 3BHK. Near ring road.',
    price:'₹75,00,000', base_price:7500000,
    description:'Spacious 3-storey house. BDA approved. Close to schools and hospitals.'
  },
  {
    id:'KA-TUM-2024-001', owner_id:'u-004', owner_name:'Annamalai P.',
    prop_type:'Agricultural Land', area:'5.0 acres',
    address:'Tumkur Town, Tumkur District, Karnataka',
    district:'Tumkur', lat:13.3379, lng:77.1013,
    khata:'KHT-92311', survey_no:'SRV-2024-004',
    status:'disputed', risk_score:72, for_sale:0, bidding_on:0,
    notes:'DISPUTED: Boundary overlap with KA-TUM-2023-088.',
    price:null, base_price:null, description:null
  },
  {
    id:'KA-HAS-2024-001', owner_id:'u-006', owner_name:'Meera Nair',
    prop_type:'Farm House', area:'2.1 acres',
    address:'Hassan Town, Hassan District, Karnataka',
    district:'Hassan', lat:13.0035, lng:76.1004,
    khata:'KHT-28874', survey_no:'SRV-2024-005',
    status:'verified', risk_score:5, for_sale:1, bidding_on:0,
    notes:'Farm house with paddy field and mango grove.',
    price:'₹35,00,000', base_price:3500000,
    description:'Beautiful farm house. Canal irrigation. All docs clear.'
  },
  {
    id:'KA-BLR-2024-003', owner_id:'u-007', owner_name:'Ganesh Reddy',
    prop_type:'Commercial Building', area:'3,200 sq ft',
    address:'Yelahanka, North Bengaluru, Karnataka',
    district:'Bengaluru Urban', lat:13.1007, lng:77.5963,
    khata:'KHT-60123', survey_no:'SRV-2024-006',
    status:'verified', risk_score:18, for_sale:1, bidding_on:1,
    notes:'Ground floor commercial space. BIAL road frontage.',
    price:'₹1,20,00,000', base_price:12000000,
    description:'Prime commercial building on BIAL road. Near airport.'
  },
  {
    id:'KA-MNG-2024-001', owner_id:'u-008', owner_name:'Priya Shetty',
    prop_type:'Residential Apartment', area:'1,850 sq ft',
    address:'Mangaluru City, Dakshina Kannada, Karnataka',
    district:'Dakshina Kannada', lat:12.9141, lng:74.8560,
    khata:'KHT-10234', survey_no:'SRV-2024-007',
    status:'verified', risk_score:10, for_sale:1, bidding_on:1,
    notes:'3BHK apartment, 4th floor, lift facility.',
    price:'₹55,00,000', base_price:5500000,
    description:'Spacious 3BHK. Fully furnished. Society with gym, pool. RERA approved.'
  },
];

const insProp = db.prepare(`INSERT INTO properties
  (id,owner_id,owner_name,prop_type,area,address,district,lat,lng,khata,survey_no,
   status,risk_score,for_sale,bidding_on,notes,price,base_price,description)
  VALUES (@id,@owner_id,@owner_name,@prop_type,@area,@address,@district,@lat,@lng,
          @khata,@survey_no,@status,@risk_score,@for_sale,@bidding_on,@notes,
          @price,@base_price,@description)`);
properties.forEach(p => insProp.run(p));
console.log(`✓ Created ${properties.length} properties`);

// ─── OWNERSHIP HISTORY ────────────────────────────────────────────────────────
const history = [
  { id:uuid(), property_id:'KA-BLR-2024-001', owner_name:'Ravi Kumar',    event_type:'Registration',      event_date:'2024-01-15', notes:'Added to digital registry',              recorded_by:'u-001' },
  { id:uuid(), property_id:'KA-BLR-2024-001', owner_name:'Ravi Kumar',    event_type:'Ownership Transfer', event_date:'2023-03-10', notes:'Gopal Rao → Ravi Kumar via sale deed',   recorded_by:'u-001' },
  { id:uuid(), property_id:'KA-BLR-2024-001', owner_name:'Gopal Rao',     event_type:'Khata Mutation',     event_date:'2019-07-22', notes:'Updated after family partition',          recorded_by:'u-001' },
  { id:uuid(), property_id:'KA-BLR-2024-001', owner_name:'Ram Prasad',    event_type:'Original Register',  event_date:'2015-12-05', notes:'First registration at Sub-Registrar',    recorded_by:'u-001' },
  { id:uuid(), property_id:'KA-BLR-2024-001', owner_name:'Government',    event_type:'Land Grant',         event_date:'1987-01-01', notes:'Karnataka Land Reform Act 1961',          recorded_by:'u-001' },
  { id:uuid(), property_id:'KA-MYS-2024-001', owner_name:'Suresh Babu',   event_type:'Registration',      event_date:'2024-03-05', notes:'New construction registered',             recorded_by:'u-002' },
  { id:uuid(), property_id:'KA-MYS-2024-001', owner_name:'Suresh Babu',   event_type:'Building Approval', event_date:'2022-08-15', notes:'BBMP plan approved, commencement cert',   recorded_by:'u-002' },
  { id:uuid(), property_id:'KA-HAS-2024-001', owner_name:'Meera Nair',    event_type:'Registration',      event_date:'2024-04-02', notes:'Farm house digitally registered',         recorded_by:'u-001' },
];
const insHist = db.prepare(`INSERT INTO ownership_history
  (id,property_id,owner_name,event_type,event_date,notes,recorded_by)
  VALUES (@id,@property_id,@owner_name,@event_type,@event_date,@notes,@recorded_by)`);
history.forEach(h => insHist.run(h));
console.log(`✓ Created ${history.length} ownership history records`);

// ─── BIDS ─────────────────────────────────────────────────────────────────────
const bids = [
  { id:uuid(), property_id:'KA-BLR-2024-002', bidder_id:null, bidder_name:'Prakash M.',  bidder_phone:'+91 99887 76655', amount:1950000, status:'outbid' },
  { id:uuid(), property_id:'KA-BLR-2024-002', bidder_id:null, bidder_name:'Divya S.',    bidder_phone:'+91 88776 65544', amount:2050000, status:'outbid' },
  { id:uuid(), property_id:'KA-BLR-2024-002', bidder_id:null, bidder_name:'Kiran R.',    bidder_phone:'+91 77665 54433', amount:2200000, status:'active' },
  { id:uuid(), property_id:'KA-MYS-2024-001', bidder_id:null, bidder_name:'Arjun T.',    bidder_phone:'+91 66554 43322', amount:7800000, status:'outbid' },
  { id:uuid(), property_id:'KA-MYS-2024-001', bidder_id:null, bidder_name:'Suma P.',     bidder_phone:'+91 55443 32211', amount:8200000, status:'active' },
  { id:uuid(), property_id:'KA-BLR-2024-003', bidder_id:null, bidder_name:'RetailCo.',   bidder_phone:'+91 80 4000 0001', amount:12500000, status:'outbid' },
  { id:uuid(), property_id:'KA-BLR-2024-003', bidder_id:null, bidder_name:'Naresh G.',   bidder_phone:'+91 80 4000 0002', amount:13000000, status:'outbid' },
  { id:uuid(), property_id:'KA-BLR-2024-003', bidder_id:null, bidder_name:'SkyTech',     bidder_phone:'+91 80 4000 0003', amount:13800000, status:'outbid' },
  { id:uuid(), property_id:'KA-BLR-2024-003', bidder_id:null, bidder_name:'Sunil K.',    bidder_phone:'+91 80 4000 0004', amount:14200000, status:'active' },
  { id:uuid(), property_id:'KA-MNG-2024-001', bidder_id:null, bidder_name:'Vivek R.',    bidder_phone:'+91 99001 12233', amount:5800000,  status:'outbid' },
  { id:uuid(), property_id:'KA-MNG-2024-001', bidder_id:null, bidder_name:'Anitha S.',   bidder_phone:'+91 88990 01122', amount:6100000,  status:'active' },
];
const insBid = db.prepare(`INSERT INTO bids
  (id,property_id,bidder_id,bidder_name,bidder_phone,amount,status)
  VALUES (@id,@property_id,@bidder_id,@bidder_name,@bidder_phone,@amount,@status)`);
bids.forEach(b => insBid.run(b));
console.log(`✓ Created ${bids.length} bids`);

// ─── PURCHASE REQUESTS ────────────────────────────────────────────────────────
const requests = [
  { id:uuid(), property_id:'KA-HAS-2024-001', buyer_name:'Ramu L.',       buyer_phone:'+91 77665 54433', buyer_email:'ramu@ex.com',   message:'Very interested in this farm house.',     status:'pending' },
  { id:uuid(), property_id:'KA-HAS-2024-001', buyer_name:'Priya K.',      buyer_phone:'+91 88776 65544', buyer_email:'priya@ex.com',  message:'Looking for farm property in Hassan.',    status:'pending' },
];
const insReq = db.prepare(`INSERT INTO purchase_requests
  (id,property_id,buyer_name,buyer_phone,buyer_email,message,status)
  VALUES (@id,@property_id,@buyer_name,@buyer_phone,@buyer_email,@message,@status)`);
requests.forEach(r => insReq.run(r));
console.log(`✓ Created ${requests.length} purchase requests`);

// ─── FRAUD ALERTS ─────────────────────────────────────────────────────────────
const alerts = [
  { id:uuid(), property_id:'KA-TUM-2024-001', risk_score:72, factors:JSON.stringify(['Boundary overlap','Duplicate GPS','Unusual transfers']), ai_analysis:'High risk: boundary conflict with adjacent parcel KA-TUM-2023-088. Manual verification required.', status:'open', created_by:'u-001' },
  { id:uuid(), property_id:'KA-BLR-2024-002', risk_score:35, factors:JSON.stringify(['Transfer frequency']), ai_analysis:'Medium risk: 3 ownership changes in 5 years. Standard verification recommended.', status:'open', created_by:'u-001' },
];
const insAlert = db.prepare(`INSERT INTO fraud_alerts
  (id,property_id,risk_score,factors,ai_analysis,status,created_by)
  VALUES (@id,@property_id,@risk_score,@factors,@ai_analysis,@status,@created_by)`);
alerts.forEach(a => insAlert.run(a));
console.log(`✓ Created ${alerts.length} fraud alerts`);

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
const activities = [
  { id:uuid(), user_id:'u-001', user_name:'District Admin',  action:'PROPERTY_REGISTERED', entity_type:'property', entity_id:'KA-BLR-2024-001', details:'Registered agricultural land' },
  { id:uuid(), user_id:'u-001', user_name:'District Admin',  action:'FRAUD_CHECK',          entity_type:'property', entity_id:'KA-TUM-2024-001', details:'Fraud check triggered — risk 72%' },
  { id:uuid(), user_id:'u-003', user_name:'Ravi Kumar',      action:'PROPERTY_LISTED',      entity_type:'property', entity_id:'KA-BLR-2024-001', details:'Listed for sale — bidding enabled' },
  { id:uuid(), user_id:'u-006', user_name:'Meera Nair',      action:'BID_PLACED',           entity_type:'bid',      entity_id:'KA-HAS-2024-001', details:'Bid ₹3,500,000 placed' },
];
const insAct = db.prepare(`INSERT INTO activity_log
  (id,user_id,user_name,action,entity_type,entity_id,details)
  VALUES (@id,@user_id,@user_name,@action,@entity_type,@entity_id,@details)`);
activities.forEach(a => insAct.run(a));
console.log(`✓ Created ${activities.length} activity log entries`);

console.log('\n✅ Database seeded successfully!');
console.log('──────────────────────────────────');
console.log('Admin accounts:');
console.log('  admin      / admin123');
console.log('  collector  / col@2024');
console.log('Citizen accounts:');
console.log('  ravi       / ravi123');
console.log('  lakshmi    / lakshmi123');
console.log('  suresh     / suresh123');
console.log('  meera      / meera123');
console.log('  ganesh     / ganesh123');
console.log('  priya      / priya123');
