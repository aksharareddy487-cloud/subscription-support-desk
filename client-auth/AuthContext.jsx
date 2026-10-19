import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from './apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check active session on initial load
  const refreshUser = async () => {
    try {
      setLoading(true);
      const data = await apiClient('/auth/me');
      setUser(data.user);
      setOrganization(data.organization);
      setError(null);
      return data.user;
    } catch (err) {
      // 401 just means user is not currently logged in
      setUser(null);
      setOrganization(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      // Fetch full org details
      await refreshUser();
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signup = async ({ name, email, password, organizationName }) => {
    setError(null);
    try {
      const data = await apiClient('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, organizationName }),
      });
      setUser(data.user);
      await refreshUser();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setOrganization(null);
    }
  };

  const forgotPassword = async (email) => {
    return apiClient('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const resetPassword = async (token, newPassword) => {
    return apiClient('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  };

  const value = {
    user,
    organization,
    loading,
    error,
    login,
    signup,
    logout,
    refreshUser,
    forgotPassword,
    resetPassword,
    isAuthenticated: Boolean(user),
    isCustomer: user?.role === 'customer',
    isSpecialist: user?.role === 'support_specialist',
    isKnowledgeManager: user?.role === 'knowledge_manager',
    isSupervisor: user?.role === 'supervisor',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
