import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SellForm from './pages/SellForm.jsx';
import Confirmation from './pages/Confirmation.jsx';
import { getSession } from './api.js';

function RequireSession({ children }) {
  if (!getSession()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireSession>
              <Dashboard />
            </RequireSession>
          }
        />
        <Route
          path="/sell/:holdingId"
          element={
            <RequireSession>
              <SellForm />
            </RequireSession>
          }
        />
        <Route
          path="/confirmation/:txnId"
          element={
            <RequireSession>
              <Confirmation />
            </RequireSession>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
