import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export const LoginForm = ({ onLoginSuccess }) => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'sans-serif', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#1e293b' }}>Support Desk Sign In</h2>

      {(localError || error) && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {localError || error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
        <p><strong>Demo Logins:</strong></p>
        <p>Customer: <code>alice@acme.com</code> / <code>Password123!</code></p>
        <p>Specialist: <code>specialist@supportdesk.internal</code> / <code>Specialist123!</code></p>
      </div>
    </div>
  );
};
