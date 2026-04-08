// api.js — Drop this file next to your bhoomi-v2.html
// It replaces localStorage with real backend API calls
// Usage: <script src="api.js"></script> before your main script

const API_BASE = 'http://localhost:5000/api';

// ── Token management ──────────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('bhoomi_token'),
  setToken: (t) => localStorage.setItem('bhoomi_token', t),
  clearToken: () => localStorage.removeItem('bhoomi_token'),
  getUser: () => JSON.parse(localStorage.getItem('bhoomi_user') || 'null'),
  setUser: (u) => localStorage.setItem('bhoomi_user', JSON.stringify(u)),
  clearUser: () => localStorage.removeItem('bhoomi_user'),
};

// ── Base fetch with JWT ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    Auth.clearToken(); Auth.clearUser();
    window.location.reload();
    throw new Error('Session expired. Please login again.');
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── AUTH API ──────────────────────────────────────────────────────────────────
const AuthAPI = {
  async login(username, password, captchaAnswer) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, captchaAnswer }),
    });
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    return data.user;
  },

  async logout() {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
    Auth.clearToken(); Auth.clearUser();
  },

  async me() {
    return (await apiFetch('/auth/me')).user;
  },
};

// ── PROPERTIES API ────────────────────────────────────────────────────────────
const PropertiesAPI = {
  async list(params = {}) {
    const q = new URLSearchParams(params).toString();
    return (await apiFetch(`/properties?${q}`)).data;
  },

  async marketplace(params = {}) {
    const q = new URLSearchParams(params).toString();
    return (await apiFetch(`/properties/marketplace?${q}`)).data;
  },

  async get(id) {
    return (await apiFetch(`/properties/${id}`)).data;
  },

  async create(data) {
    return apiFetch('/properties', { method: 'POST', body: JSON.stringify(data) });
  },

  async update(id, data) {
    return apiFetch(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async delete(id) {
    return apiFetch(`/properties/${id}`, { method: 'DELETE' });
  },

  async list_for_sale(id, { price, description, biddingEnabled }) {
    return apiFetch(`/properties/${id}/list`, {
      method: 'POST',
      body: JSON.stringify({ price, description, biddingEnabled }),
    });
  },

  async unlist(id) {
    return apiFetch(`/properties/${id}/unlist`, { method: 'POST' });
  },

  async history(id) {
    return (await apiFetch(`/properties/${id}/history`)).data;
  },
};

// ── BIDS API ──────────────────────────────────────────────────────────────────
const BidsAPI = {
  async getBids(propertyId) {
    return (await apiFetch(`/bids/${propertyId}`)).data;
  },

  async placeBid(propertyId, { bidder_name, bidder_phone, bidder_email, amount }) {
    return apiFetch(`/bids/${propertyId}`, {
      method: 'POST',
      body: JSON.stringify({ bidder_name, bidder_phone, bidder_email, amount }),
    });
  },

  async declareWinner(propertyId) {
    return apiFetch(`/bids/${propertyId}/declare-winner`, { method: 'POST' });
  },
};

// ── REQUESTS API ──────────────────────────────────────────────────────────────
const RequestsAPI = {
  async list() {
    return (await apiFetch('/requests')).data;
  },

  async submit({ property_id, buyer_name, buyer_phone, buyer_email, message }) {
    return apiFetch('/requests', {
      method: 'POST',
      body: JSON.stringify({ property_id, buyer_name, buyer_phone, buyer_email, message }),
    });
  },

  async updateStatus(id, status, admin_notes) {
    return apiFetch(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_notes }),
    });
  },
};

// ── AI API ────────────────────────────────────────────────────────────────────
const AIAPI = {
  async fraudCheck(propertyId) {
    return (await apiFetch('/ai/fraud-check', {
      method: 'POST',
      body: JSON.stringify({ propertyId }),
    })).data;
  },

  async verifyDocument(propertyId, docType, extractedText) {
    return (await apiFetch('/ai/verify-document', {
      method: 'POST',
      body: JSON.stringify({ propertyId, docType, extractedText }),
    })).data;
  },

  async chat(message, history = []) {
    return (await apiFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    })).reply;
  },

  async matchSchemes({ propType, area, district, income }) {
    return (await apiFetch('/ai/match-schemes', {
      method: 'POST',
      body: JSON.stringify({ propType, area, district, income }),
    })).data;
  },

  async fraudAlerts() {
    return (await apiFetch('/ai/fraud-alerts')).data;
  },
};

// ── USERS API ──────────────────────────────────────────────────────────────────
const UsersAPI = {
  async list() {
    return (await apiFetch('/users')).data;
  },

  async create(data) {
    return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
  },

  async setStatus(id, status) {
    return apiFetch(`/users/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    });
  },

  async activity(params = {}) {
    const q = new URLSearchParams(params).toString();
    return (await apiFetch(`/users/activity?${q}`)).data;
  },

  async stats() {
    return (await apiFetch('/users/stats')).data;
  },
};

// ── Export globally ────────────────────────────────────────────────────────────
window.BhoomiAPI = { Auth, AuthAPI, PropertiesAPI, BidsAPI, RequestsAPI, AIAPI, UsersAPI, apiFetch };
console.log('✅ BhoomiAI API connector loaded. Backend: ' + API_BASE);
