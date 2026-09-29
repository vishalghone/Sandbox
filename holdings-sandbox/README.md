# Holdings Sandbox

A small, deliberately boring banking-style app: log in, see an account
balance and holdings, sell/redeem a holding against cash or cheque
settlement, get a confirmation screen. Built as a stable, self-contained
replacement for today's flaky public demo sites, and shaped specifically
around what Day 2 needs.

It exists because `the-internet.herokuapp.com` went down mid-session on
Day 1. Nothing here depends on the network — it's a React frontend and an
Express API, both running on your own machine, both scriptable, both
guaranteed to be up tomorrow morning.

## Running it

```bash
npm run install:all   # once
npm run dev            # starts API (port 4000) and UI (port 5173) together
```

Then open `http://localhost:5173`. Four stable accounts exist for manual
poking-around, each covering a different scenario — all use password
**demo1234**:

| Username | Area | What it's for |
|---|---|---|
| `demo` | Retail Banking | Normal case — three holdings, plenty of quantity |
| `demo2` | Corporate Banking | Different area, larger balance/holdings |
| `demo3` | NRI Services | Boundary case — exactly 1 unit of one holding (sell-the-max, quantity-hits-0) |
| `emptyholder` | Retail Banking | Edge case — zero holdings, nothing to click into |

These four are stable and shared — fine for manual exploration, but
**not** for automated tests (two tests logging into `demo` in parallel
will race each other). For tests, seed a throwaway account instead (see
below). `POST /api/test/reset` wipes any seeded accounts back to just
these four.

Run client/server separately if you ever need to: `npm run server` /
`npm run client`.

## The workflow, in one paragraph

Login (area dropdown + username + password) → Dashboard (cash balance +
a list of holdings) → pick a holding → Sell/Redeem form (market: radio,
quantity: number input, settlement type: radio for cash/cheque, a cheque
branch field that only appears when "Cheque" is selected, a required
confirmation checkbox) → Confirmation page reading "Transaction submitted
and under process."

## Where this maps to Day 2

**Parallel execution.** Nothing in the app serializes requests or shares
mutable state across "sessions" beyond each account's own data — run
`npx playwright test --workers=4` against it and nothing will collide,
*provided* each test uses its own account (next point).

**Test-data isolation.** `POST /api/test/seed-account` creates a brand-new
account with a unique username/password and a fresh set of holdings, and
returns the credentials in the response body:

```bash
curl -X POST http://localhost:4000/api/test/seed-account -H 'Content-Type: application/json' -d '{}'
```

Call this in a `beforeEach` (or a fixture — see below) and every test gets
its own account, so two tests selling the same holding in parallel never
step on each other. This is the fix for exactly the shared-state /
order-dependency problem covered on Day 1. A natural custom fixture:

```typescript
export const test = base.extend<{ seededAccount: SeededAccount }>({
  seededAccount: async ({ request }, use) => {
    const res = await request.post('http://localhost:4000/api/test/seed-account', { data: {} });
    const account = await res.json();
    await use(account);
  },
});
```

**API-UI hybrid testing.** Every screen has a matching API endpoint, so a
test can set up state via the API (fast, no UI flake) and verify outcomes
through either the UI or the API:

- `POST /api/login`
- `GET /api/account/:id`
- `GET /api/account/:id/transactions`
- `POST /api/sell`
- `GET /api/transaction/:id`

For example: seed an account, `POST /api/sell` directly to create a
transaction, then log in through the UI and assert the confirmation page
or dashboard reflects it — or the reverse, submit through the UI and
verify the result with `GET /api/transaction/:id`.

**Network interception.** The client calls the API through Vite's `/api`
proxy, so every request Playwright sees is same-origin
(`http://localhost:5173/api/...`) — a clean target for `page.route()`
exercises: stub a failed `/api/sell`, delay `/api/account/:id` to test a
loading state, or assert on the request payload itself.

**Real locators to practice on.** Every field has a proper `<label>`
(`getByLabel` works throughout, no placeholder-guessing needed), radio
groups use `<fieldset>`/`<legend>`, and there are a few `data-testid`s
(`account-balance`, `holding-<id>`, `cheque-branch-field`,
`confirmation-heading`, `transaction-status`) for the handful of cases
where a role/label isn't the natural pick.

## Error paths worth testing

- Wrong area/username/password → `401`, and the login page shows a
  `role="alert"` with the message.
- Selling more than the available quantity → `400`,
  `"Only N units available to sell"`.
- Submitting without the confirmation checkbox → `400`.
- Choosing cheque settlement without a branch → `400`, and the branch
  field only renders once "Cheque" is selected (a real conditional-UI
  case, not a trick).

## Resetting local state

```bash
curl -X POST http://localhost:4000/api/test/reset
```

Wipes every seeded test account and transaction, keeps the four stable
named accounts (`demo`, `demo2`, `demo3`, `emptyholder`). Data is
in-memory only — restarting the server does the same thing.

## What's deliberately not here

No real authentication, no persistence beyond process memory, no
password hashing. This is a test target, not a reference for how to
build a banking app.
