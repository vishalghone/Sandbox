import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getAccount, getMarkets, sellHolding, getSession } from '../api.js';

export default function SellForm() {
  const { holdingId } = useParams();
  const navigate = useNavigate();

  const [holding, setHolding] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [market, setMarket] = useState('');
  const [quantity, setQuantity] = useState('');
  const [settlementType, setSettlementType] = useState('cash');
  const [chequeBranch, setChequeBranch] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const accountId = getSession();

  useEffect(() => {
    Promise.all([getAccount(accountId), getMarkets()])
      .then(([accountRes, marketsRes]) => {
        const h = accountRes.account.holdings.find((x) => x.id === holdingId);
        if (!h) {
          setError('That holding was not found on this account.');
          return;
        }
        setHolding(h);
        setMarket(h.market);
        setMarkets(marketsRes.markets);
      })
      .catch((err) => setError(err.message));
  }, [accountId, holdingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await sellHolding(accountId, {
        holdingId,
        market,
        quantity,
        settlementType,
        chequeBranch: settlementType === 'cheque' ? chequeBranch : undefined,
        confirmed,
      });
      navigate(`/confirmation/${res.transaction.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !holding) {
    return (
      <main className="page">
        <p role="alert" className="error">
          {error}
        </p>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  if (!holding) {
    return (
      <main className="page">
        <p>Loading holding…</p>
      </main>
    );
  }

  return (
    <main className="page sell-page">
      <h1>Sell / Redeem — {holding.name}</h1>
      <p className="holding-meta">
        Available quantity: <strong>{holding.quantity}</strong>
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="field">
          <legend>Market</legend>
          {markets.map((m) => (
            <label key={m} className="radio-label">
              <input
                type="radio"
                name="market"
                value={m}
                checked={market === m}
                onChange={() => setMarket(m)}
              />
              {m}
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="quantity">Quantity to sell</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            max={holding.quantity}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <fieldset className="field">
          <legend>Settlement type</legend>
          <label className="radio-label">
            <input
              type="radio"
              name="settlementType"
              value="cash"
              checked={settlementType === 'cash'}
              onChange={() => setSettlementType('cash')}
            />
            Cash
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="settlementType"
              value="cheque"
              checked={settlementType === 'cheque'}
              onChange={() => setSettlementType('cheque')}
            />
            Cheque
          </label>
        </fieldset>

        {settlementType === 'cheque' && (
          <div className="field" data-testid="cheque-branch-field">
            <label htmlFor="chequeBranch">Cheque branch</label>
            <input
              id="chequeBranch"
              name="chequeBranch"
              type="text"
              value={chequeBranch}
              onChange={(e) => setChequeBranch(e.target.value)}
              required
            />
          </div>
        )}

        <div className="field checkbox-field">
          <label>
            <input
              type="checkbox"
              name="confirmed"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I confirm the above details are correct
          </label>
        </div>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for Redemption'}
          </button>
          <Link to="/dashboard">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
