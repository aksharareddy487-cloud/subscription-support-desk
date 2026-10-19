import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Route protection component for React Router v6.
 * Enforces session authentication and optionally restricts access by role.
 * 
 * Usage:
 * <Route path="/tickets" element={
 *   <ProtectedRoute allowedRoles={['customer']}>
 *     <CustomerTicketTimeline />
 *   </ProtectedRoute>
 * } />
 */
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated user to login, preserving intended path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles required, check authorization
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Access Denied (403 Forbidden)</h2>
        <p>Your current role (<strong>{user.role}</strong>) does not have permission to view this page.</p>
        <p>Allowed roles: {allowedRoles.join(', ')}</p>
        <a href="/" style={{ color: '#2563eb' }}>Return to Home</a>
      </div>
    );
  }

  return children;
};
