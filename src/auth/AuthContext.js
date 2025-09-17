import React, { createContext, useContext, useMemo } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children, user, userData }) => {
  const value = useMemo(() => {
    // Extract contact info and location once
    const contactInfo = userData?.userdata?.contactInfo;
    const defaultStudio = userData?.userdata?.studios?.default;

    const hasCompletedContactInfo = !!(
      contactInfo?.firstName && contactInfo?.lastName
    );
    const hasSelectedLocation = !!defaultStudio?.studioId;

    return {
      user,
      userData,
      currentUserId: user?.uid || null,
      isAuthenticated: !!user,
      hasCompletedContactInfo,
      hasSelectedLocation,
      hasCompletedOnboarding: hasCompletedContactInfo && hasSelectedLocation,
    };
  }, [
    user?.uid,
    userData?.userdata?.contactInfo?.firstName,
    userData?.userdata?.contactInfo?.lastName,
    userData?.userdata?.contactInfo?.profilePicture,
    userData?.userdata?.studios?.default?.studioId,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
