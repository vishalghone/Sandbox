import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getAreas, saveSession } from '../api.js';

export default function Login() {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [area, setArea] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAreas()
      .then((res) => {
        setAreas(res.areas);
        setArea(res.areas[0] ?? '');
      })
      .catch(() => setError('Could not load business areas. Is the API running?'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login({ area, username, password });
      saveSession(res.accountId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page login-page">
      <h1>Holdings Sandbox — Sign In</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="area">Business area</label>
          <select id="area" name="area" value={area} onChange={(e) => setArea(e.target.value)} required>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Log In'}
        </button>
      </form>

      <p className="hint">
        Demo account: area <strong>Retail Banking</strong>, username <strong>demo</strong>,
        password <strong>demo1234</strong>. For automated tests, seed an isolated account via{' '}
        <code>POST /api/test/seed-account</code> instead of reusing this one.
      </p>
    </main>
  );
}
