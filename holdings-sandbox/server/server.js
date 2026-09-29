// Holdings Sandbox — in-memory Express API
//
// Deliberately NOT production auth/security. This exists to give Day 2
// Playwright labs a real client-server boundary: parallel-safe test data
// (via /api/test/seed-account), a couple of API-only endpoints for
// API-UI hybrid tests, and a network boundary worth intercepting with
// page.route().

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ---------------------------------------------------------------------
// In-memory data
// ---------------------------------------------------------------------

const AREAS = ['Retail Banking', 'Corporate Banking', 'NRI Services'];
const MARKETS = ['NSE', 'BSE'];

let accounts = [];
let transactions = [];
let nextAccountId = 1;
let nextHoldingId = 1;
let nextTxnId = 1;

function makeHolding(name, market, quantity, avgPrice) {
  return { id: String(nextHoldingId++), name, market, quantity, avgPrice };
}

function makeDefaultHoldings() {
  return [
    makeHolding('Bluechip Growth Fund', 'NSE', 120, 245.5),
    makeHolding('National Infra Bond', 'BSE', 40, 1020.0),
    makeHolding('Global Equity Index', 'NSE', 75, 88.25),
  ];
}

function createAccount({ area, username, password, balance, holdings }) {
  const account = {
    id: String(nextAccountId++),
    area,
    username,
    password,
    balance: balance ?? 125000.5,
    holdings: holdings ?? makeDefaultHoldings(),
  };
  accounts.push(account);
  return account;
}

// Stable accounts for manual exploration / the non-parallel labs — each
// covers a different scenario worth clicking through by hand. Named
// accounts (as opposed to /api/test/seed-account accounts) survive
// /api/test/reset.
const STABLE_USERNAMES = ['demo', 'demo2', 'demo3', 'emptyholder'];

createAccount({
  area: 'Retail Banking',
  username: 'demo',
  password: 'demo1234',
  // default holdings: Bluechip Growth Fund, National Infra Bond, Global Equity Index
});

createAccount({
  area: 'Corporate Banking',
  username: 'demo2',
  password: 'demo1234',
  balance: 842300.75,
  holdings: [
    makeHolding('Corporate Debt Fund', 'NSE', 500, 102.4),
    makeHolding('Treasury Bill Ladder', 'BSE', 250, 998.1),
  ],
});

createAccount({
  area: 'NRI Services',
  username: 'demo3',
  password: 'demo1234',
  balance: 15200.0,
  holdings: [
    // Boundary case: exactly 1 unit available — good for "sell the max
    // quantity" and "quantity goes to 0" assertions.
    makeHolding('NRE Fixed Maturity Plan', 'BSE', 1, 5400.0),
  ],
});

createAccount({
  area: 'Retail Banking',
  username: 'emptyholder',
  password: 'demo1234',
  balance: 500.0,
  holdings: [],
  // Edge case: dashboard with no holdings to sell — nothing to click into.
});

function publicAccount(account) {
  const { password, ...rest } = account;
  return rest;
}

function findAccount({ area, username, password }) {
  return accounts.find(
    (a) => a.area === area && a.username === username && a.password === password
  );
}

// ---------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/areas', (_req, res) => {
  res.json({ areas: AREAS });
});

app.get('/api/markets', (_req, res) => {
  res.json({ markets: MARKETS });
});

app.post('/api/login', (req, res) => {
  const { area, username, password } = req.body || {};
  if (!area || !username || !password) {
    return res.status(400).json({ error: 'area, username and password are all required' });
  }
  const account = findAccount({ area, username, password });
  if (!account) {
    return res.status(401).json({ error: 'Invalid area, username or password' });
  }
  // Not a real token — the accountId doubles as the bearer token for this
  // training sandbox. Good enough for UI + API-hybrid test exercises.
  res.json({ accountId: account.id, account: publicAccount(account) });
});

function requireAccount(req, res, next) {
  const id = req.params.id || req.body?.accountId || req.query.accountId;
  const account = accounts.find((a) => a.id === String(id));
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  req.account = account;
  next();
}

app.get('/api/account/:id', requireAccount, (req, res) => {
  res.json({ account: publicAccount(req.account) });
});

app.get('/api/account/:id/transactions', requireAccount, (req, res) => {
  const accountTxns = transactions.filter((t) => t.accountId === req.account.id);
  res.json({ transactions: accountTxns });
});

// The core workflow: sell/redeem a holding against cash or cheque
// settlement. Deliberately validates enough to make failure-path tests
// meaningful (wrong quantity, missing confirmation, missing cheque
// details) without being a real trading engine.
app.post('/api/sell', requireAccount, (req, res) => {
  const { holdingId, market, quantity, settlementType, chequeBranch, confirmed } = req.body || {};
  const account = req.account;

  if (!confirmed) {
    return res.status(400).json({ error: 'You must confirm the details before submitting' });
  }
  if (!market || !MARKETS.includes(market)) {
    return res.status(400).json({ error: 'A valid market must be selected' });
  }
  if (!settlementType || !['cash', 'cheque'].includes(settlementType)) {
    return res.status(400).json({ error: 'Settlement type must be cash or cheque' });
  }
  if (settlementType === 'cheque' && !chequeBranch) {
    return res.status(400).json({ error: 'Cheque settlement requires a branch' });
  }

  const holding = account.holdings.find((h) => h.id === String(holdingId));
  if (!holding) {
    return res.status(404).json({ error: 'Holding not found' });
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number' });
  }
  if (qty > holding.quantity) {
    return res.status(400).json({ error: `Only ${holding.quantity} units available to sell` });
  }

  holding.quantity -= qty;

  const transaction = {
    id: String(nextTxnId++),
    accountId: account.id,
    holdingId: holding.id,
    holdingName: holding.name,
    market,
    quantity: qty,
    settlementType,
    chequeBranch: settlementType === 'cheque' ? chequeBranch : null,
    status: 'processing',
    createdAt: new Date().toISOString(),
  };
  transactions.push(transaction);

  res.status(201).json({ transaction });
});

app.get('/api/transaction/:id', (req, res) => {
  const txn = transactions.find((t) => t.id === req.params.id);
  if (!txn) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json({ transaction: txn });
});

// ---------------------------------------------------------------------
// Test-only endpoints — not part of the "product", exist purely so
// Playwright tests can get isolated, parallel-safe data without going
// through the UI and without racing other workers over shared accounts.
// ---------------------------------------------------------------------

app.post('/api/test/seed-account', (req, res) => {
  const {
    area = AREAS[0],
    balance = 125000.5,
    holdings,
    usernamePrefix = 'qa',
  } = req.body || {};

  // Unique per call, so two parallel workers never collide.
  const unique = `${usernamePrefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const account = createAccount({
    area,
    username: unique,
    password: 'Test@1234',
    balance,
    holdings, // undefined -> makeDefaultHoldings() default applies
  });

  res.status(201).json({
    accountId: account.id,
    area: account.area,
    username: account.username,
    password: account.password,
    balance: account.balance,
    holdings: account.holdings,
  });
});

// Wipes every /api/test/seed-account account, keeps the stable named
// ones (demo, demo2, demo3, emptyholder). Handy between local test runs;
// never call this against anything but your own machine.
app.post('/api/test/reset', (_req, res) => {
  accounts = accounts.filter((a) => STABLE_USERNAMES.includes(a.username));
  transactions = [];
  nextHoldingId = Math.max(1, ...accounts.flatMap((a) => a.holdings.map((h) => Number(h.id) + 1)), 1);
  nextTxnId = 1;
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Holdings Sandbox API listening on http://localhost:${PORT}`);
});
