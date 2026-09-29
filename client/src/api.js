// Thin fetch wrapper around the Express API. Kept deliberately simple —
// no axios, no state library — so it's easy to point Playwright's
// page.route() at specific calls during the network-interception lab.

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request to ${path} failed with ${res.status}`);
  }
  return body;
}

export function login({ area, username, password }) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ area, username, password }),
  });
}

export function getAreas() {
  return request('/areas');
}

export function getMarkets() {
  return request('/markets');
}

export function getAccount(accountId) {
  return request(`/account/${accountId}`);
}

export function sellHolding(accountId, payload) {
  return request('/sell', {
    method: 'POST',
    body: JSON.stringify({ accountId, ...payload }),
  });
}

export function getTransaction(id) {
  return request(`/transaction/${id}`);
}

const STORAGE_KEY = 'holdingsSandbox.accountId';

export function saveSession(accountId) {
  localStorage.setItem(STORAGE_KEY, accountId);
}

export function getSession() {
  return localStorage.getItem(STORAGE_KEY);
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
