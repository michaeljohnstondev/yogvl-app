export const filterUsersByQuery = (users, query) => {
  if (!query?.trim()) return users;
  
  const normalizedQuery = query.toLowerCase();
  
  return users.filter(user => {
    const name = `${user.userdata?.contactInfo?.firstName || ''} ${user.userdata?.contactInfo?.lastName || ''}`.trim().toLowerCase();
    const email = (user.userdata?.contactInfo?.email || user.email || '').toLowerCase();
    const displayName = (user.displayName || '').toLowerCase();
    
    return name.includes(normalizedQuery) || 
           email.includes(normalizedQuery) ||
           displayName.includes(normalizedQuery);
  });
};

export const normalizeSearchQuery = (query) => {
  return query?.trim()?.toLowerCase() || '';
};

export const createUserSearchIndex = (user) => {
  const firstName = user.userdata?.contactInfo?.firstName || '';
  const lastName = user.userdata?.contactInfo?.lastName || '';
  const email = user.userdata?.contactInfo?.email || user.email || '';
  const displayName = user.displayName || '';
  
  return `${firstName} ${lastName} ${email} ${displayName}`.toLowerCase();
};