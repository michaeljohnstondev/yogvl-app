export const getUserDisplayName = (user) => {
  if (!user) return 'User';
  
  return user.displayName || 
         `${user.userdata?.contactInfo?.firstName || ''} ${user.userdata?.contactInfo?.lastName || ''}`.trim() ||
         user.email?.split('@')[0] || 
         'User';
};

export const getUserEmail = (user) => {
  if (!user) return '';
  return user.userdata?.contactInfo?.email || user.email || '';
};

export const getUserFullName = (user) => {
  if (!user) return '';
  const firstName = user.userdata?.contactInfo?.firstName || '';
  const lastName = user.userdata?.contactInfo?.lastName || '';
  return `${firstName} ${lastName}`.trim();
};