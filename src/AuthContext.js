import React, { createContext, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children, user, userData }) => {
  const value = {
    user,
    userData,
    currentUserId: user?.uid || null,
    isAuthenticated: !!user,
    hasCompletedOnboarding: userData?.hasCompletedContactInfo || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
