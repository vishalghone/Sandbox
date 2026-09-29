import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTransaction } from '../api.js';

export default function Confirmation() {
  const { txnId } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getTransaction(txnId)
      .then((res) => setTransaction(res.transaction))
      .catch((err) => setError(err.message));
  }, [txnId]);

  if (error) {
    return (
      <main className="page">
        <p role="alert" className="error">
          {error}
        </p>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  if (!transaction) {
    return (
      <main className="page">
        <p>Loading transaction…</p>
      </main>
    );
  }

  return (
    <main className="page confirmation-page">
      <h1 data-testid="confirmation-heading">Transaction submitted and under process</h1>
      <dl className="txn-details">
        <dt>Transaction ID</dt>
        <dd>{transaction.id}</dd>
        <dt>Holding</dt>
        <dd>{transaction.holdingName}</dd>
        <dt>Market</dt>
        <dd>{transaction.market}</dd>
        <dt>Quantity</dt>
        <dd>{transaction.quantity}</dd>
        <dt>Settlement</dt>
        <dd>{transaction.settlementType}</dd>
        <dt>Status</dt>
        <dd data-testid="transaction-status">{transaction.status}</dd>
      </dl>
      <Link to="/dashboard">Back to dashboard</Link>
    </main>
  );
}
