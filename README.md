# BhoomiAI Backend — Setup Guide

Complete REST API for the BhoomiAI Digital Land Records system.
Built with **Node.js + Express + SQLite**.

---

## 📁 Folder Structure

```
bhoomi-backend/
├── server.js           ← Main entry point
├── package.json        ← Dependencies
├── .env.example        ← Copy to .env and fill in
├── api.js              ← Frontend API connector (copy to your frontend folder)
├── db/
│   ├── schema.js       ← SQLite schema (auto-creates all tables)
│   └── seed.js         ← Seed with demo data
├── routes/
│   ├── auth.js         ← Login / logout / me
│   ├── properties.js   ← Full CRUD + list/unlist
│   ├── bids.js         ← Bidding system
│   ├── requests.js     ← Purchase requests
│   ├── ai.js           ← Fraud check, doc verify, chatbot, schemes
│   └── users.js        ← User management + stats
├── middleware/
│   └── auth.js         ← JWT verify + role guard + activity logger
└── uploads/            ← Document uploads (auto-created)
```

---

## 🚀 Quick Start

### Step 1 — Install dependencies
```bash
cd bhoomi-backend
npm install
```

### Step 2 — Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set:
- `JWT_SECRET` — change to a long random string
- `ANTHROPIC_API_KEY` — your Claude API key (get from console.anthropic.com)

### Step 3 — Seed the database
```bash
npm run seed
```
This creates `db/bhoomi.sqlite` with all demo data.

### Step 4 — Start the server
```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

Server runs at **http://localhost:5000**

---

## 🔐 Login Credentials (after seeding)

| Role    | Username   | Password     |
|---------|------------|--------------|
| Admin   | admin      | admin123     |
| Admin   | collector  | col@2024     |
| Citizen | ravi       | ravi123      |
| Citizen | lakshmi    | lakshmi123   |
| Citizen | suresh     | suresh123    |
| Citizen | meera      | meera123     |
| Citizen | ganesh     | ganesh123    |
| Citizen | priya      | priya123     |

---

## 🔗 Connect Frontend to Backend

1. Copy `api.js` to your frontend folder (same folder as `bhoomi-v2.html`)
2. Add this line in `bhoomi-v2.html` just before the closing `</body>` tag:
   ```html
   <script src="api.js"></script>
   ```
3. The frontend can now call:
   ```js
   // Login
   const user = await BhoomiAPI.AuthAPI.login('admin', 'admin123', captcha);

   // Get all properties
   const props = await BhoomiAPI.PropertiesAPI.list();

   // Place a bid
   await BhoomiAPI.BidsAPI.placeBid('KA-BLR-2024-002', {
     bidder_name: 'Ravi Kumar',
     bidder_phone: '+91 98765 43210',
     amount: 2500000
   });

   // AI chat
   const reply = await BhoomiAPI.AIAPI.chat('How to transfer land in Karnataka?');

   // Fraud check
   const result = await BhoomiAPI.AIAPI.fraudCheck('KA-TUM-2024-001');
   ```

---

## 📡 Full API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login with username + password |
| POST | `/api/auth/logout` | JWT | Logout |
| GET | `/api/auth/me` | JWT | Get current user |
| POST | `/api/auth/change-password` | JWT | Change password |

### Properties
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/properties` | JWT | List (admin=all, citizen=own) |
| GET | `/api/properties/marketplace` | None | Public for-sale listings |
| GET | `/api/properties/:id` | JWT | Single property + history + alerts |
| POST | `/api/properties` | Admin | Register new property |
| PUT | `/api/properties/:id` | Admin | Update property |
| DELETE | `/api/properties/:id` | Admin | Delete property |
| POST | `/api/properties/:id/list` | Owner/Admin | List for sale |
| POST | `/api/properties/:id/unlist` | Owner/Admin | Remove from sale |
| GET | `/api/properties/:id/history` | JWT | Ownership history |

### Bids
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bids/:propertyId` | JWT | Get all bids |
| POST | `/api/bids/:propertyId` | JWT | Place a bid |
| POST | `/api/bids/:propertyId/declare-winner` | Admin | Declare auction winner |

### Purchase Requests
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/requests` | Admin | All purchase requests |
| POST | `/api/requests` | JWT | Submit request |
| PATCH | `/api/requests/:id` | Admin | Connect or reject |

### AI Tools
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/fraud-check` | Admin | AI fraud analysis |
| POST | `/api/ai/verify-document` | JWT | Document verification |
| POST | `/api/ai/chat` | JWT | Land law chatbot |
| POST | `/api/ai/match-schemes` | JWT | Government scheme matching |
| GET | `/api/ai/fraud-alerts` | Admin | All open fraud alerts |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Admin | All users |
| POST | `/api/users` | Admin | Create user |
| PATCH | `/api/users/:id/status` | Admin | Suspend/activate |
| GET | `/api/users/activity` | Admin | Activity log |
| GET | `/api/users/stats` | Admin | Dashboard stats |

---

## 🛡️ Security Features

- **JWT authentication** — tokens expire in 24 hours
- **bcrypt password hashing** — industry standard
- **Rate limiting** — 10 login attempts per 15 min, 200 API calls per 15 min
- **Role-based access** — admin vs citizen permissions on every route
- **Helmet** — sets secure HTTP headers
- **CORS** — only allows your frontend URL
- **Activity logging** — every action logged with IP address
- **Input validation** — required fields checked on every endpoint

---

## 🗄️ Database Tables

| Table | Description |
|-------|-------------|
| `users` | Admin and citizen accounts |
| `properties` | All land/property records |
| `ownership_history` | Transfer timeline per property |
| `bids` | Live auction bids |
| `purchase_requests` | Buy requests for non-bidding listings |
| `documents` | Uploaded documents |
| `fraud_alerts` | AI-generated fraud flags |
| `activity_log` | Full audit trail |
| `sessions` | Active user sessions |

---

## 🚀 Deploy to Production

### Option A — VPS (Ubuntu)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Install PM2 process manager
npm install -g pm2

# Start the app
pm2 start server.js --name bhoomi-api
pm2 save
pm2 startup
```

### Option B — Railway / Render (free)
1. Push to GitHub
2. Connect repo to Railway.app or Render.com
3. Set environment variables in their dashboard
4. Deploy — they provide a public HTTPS URL

### Option C — Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```
