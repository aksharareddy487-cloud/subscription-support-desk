import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export const SignupForm = ({ onSignupSuccess }) => {
  const { signup, error } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    try {
      const res = await signup({ name, email, password, organizationName });
      setSuccessInfo(res);
      if (onSignupSuccess) onSignupSuccess(res.user);
    } catch (err) {
      setLocalError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '2rem auto', padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontFamily: 'sans-serif', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '0.5rem', textAlign: 'center', color: '#1e293b' }}>Create Customer Account</h2>
      <p style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
        Register your organization for product support. (Staff accounts are pre-provisioned).
      </p>

      {successInfo && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          <strong>Registration complete!</strong> {successInfo.message}
          {successInfo.demoVerificationToken && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              <span>Verification Token: </span>
              <code>{successInfo.demoVerificationToken.substring(0, 16)}...</code>
            </div>
          )}
        </div>
      )}

      {(localError || error) && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {localError || error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>Work Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>Organization / Company Name</label>
          <input
            type="text"
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Acme Corp"
            style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>Password (min 8 characters)</label>
          <input
            type="password"
            required
            minLength={8}
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
            backgroundColor: isSubmitting ? '#93c5fd' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Creating Account...' : 'Sign Up as Customer'}
        </button>
      </form>
    </div>
  );
};
