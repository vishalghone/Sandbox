import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccount, getSession, clearSession } from '../api.js';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function Dashboard() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const accountId = getSession();
    getAccount(accountId)
      .then((res) => setAccount(res.account))
      .catch((err) => setError(err.message));
  }, []);

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  if (error) {
    return (
      <main className="page">
        <p role="alert" className="error">
          {error}
        </p>
        <button onClick={handleLogout}>Back to login</button>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="page">
        <p>Loading account…</p>
      </main>
    );
  }

  return (
    <main className="page dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {account.username}</h1>
          <p className="area-badge">{account.area}</p>
        </div>
        <button onClick={handleLogout}>Log Out</button>
      </header>

      <section aria-label="Account balance" className="balance-card">
        <p className="balance-label">Available cash balance</p>
        <p className="balance-value" data-testid="account-balance">
          {currency.format(account.balance)}
        </p>
      </section>

      <section aria-label="Holdings">
        <h2>Your Holdings</h2>
        {account.holdings.length === 0 && <p>No holdings remaining.</p>}
        <ul className="holdings-list">
          {account.holdings.map((h) => (
            <li key={h.id} className="holding-row" data-testid={`holding-${h.id}`}>
              <div>
                <p className="holding-name">{h.name}</p>
                <p className="holding-meta">
                  {h.market} · Qty {h.quantity} · Avg price {currency.format(h.avgPrice)}
                </p>
              </div>
              <a
                href={`/sell/${h.id}`}
                role="button"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/sell/${h.id}`);
                }}
              >
                Sell / Redeem
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
