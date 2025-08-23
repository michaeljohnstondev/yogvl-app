export const filterAndSortAppUsers = (users, searchQuery, selectedGroup, showFavorites, showFriends, showLocalNode, selectedInterests = [], userInterestsMap = {}) => {
  return users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (selectedGroup) {
      return selectedGroup.members.includes(user.id);
    }
    
    const hasActiveFilters = showFavorites || showFriends || showLocalNode || (selectedInterests && selectedInterests.length > 0);
    if (!hasActiveFilters) {
      return true;
    }
    
    if (showFavorites && !user.isFavorite) return false;
    if (showFriends && !user.isFriend) return false;
    if (showLocalNode && !user.isLocalNode) {
      console.log(`[Filter] User ${user.name} filtered out by local filter - isLocalNode:`, user.isLocalNode);
      return false;
    }
    
    // Interest filtering
    if (selectedInterests && selectedInterests.length > 0) {
      const userInterests = userInterestsMap[user.id] || [];
      const hasMatchingInterest = selectedInterests.some(interest => 
        userInterests.some(userInterest => userInterest.toLowerCase() === interest.toLowerCase())
      );
      if (!hasMatchingInterest) return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (a.isFavorite && b.isFavorite) {
      return a.name.localeCompare(b.name);
    }
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    
    const aIsFriendOnly = a.isFriend && !a.isFavorite;
    const bIsFriendOnly = b.isFriend && !b.isFavorite;
    
    if (aIsFriendOnly && bIsFriendOnly) {
      return a.name.localeCompare(b.name);
    }
    if (aIsFriendOnly && !bIsFriendOnly) return -1;
    if (!aIsFriendOnly && bIsFriendOnly) return 1;
    
    const aIsLocalOnly = a.isLocalNode && !a.isFriend;
    const bIsLocalOnly = b.isLocalNode && !b.isFriend;
    
    if (aIsLocalOnly && bIsLocalOnly) {
      return a.name.localeCompare(b.name);
    }
    if (aIsLocalOnly && !bIsLocalOnly) return -1;
    if (!aIsLocalOnly && bIsLocalOnly) return 1;
    
    return a.name.localeCompare(b.name);
  });
};

export const filterPhoneContacts = (contacts, searchQuery) => {
  return contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.phone && contact.phone.includes(searchQuery))
  );
};

export const calculateTotals = (selectedUsers, selectedContacts, selectedPhoneContacts) => {
  return selectedUsers.length + selectedContacts.length + selectedPhoneContacts.length;
};

export const hasReachedLimit = (totalSelected, maxLimit) => {
  return maxLimit && totalSelected >= maxLimit;
};

export const getThemeColors = (isHostMode, theme) => {
  return {
    themeColor: theme.colors.vibeBlue,
    themeBgColor: theme.colors.vibeBackgroundBlue
  };
};

export const createManualContact = (name, email, phone, message, isHostMode) => {
  return {
    id: `manual_${Date.now()}`,
    name: name.trim(),
    email: email.trim() || null,
    phone: phone.trim() || null,
    message: message.trim() || null,
    role: isHostMode ? 'co-host' : 'guest',
  };
};