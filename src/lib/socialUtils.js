export const getSocialListTitle = (type) => {
  switch (type) {
    case 'friends': return 'Mutual Friends';
    case 'following': return 'Following';
    case 'followers': return 'Followers';
    default: return 'Social';
  }
};

export const getSocialListEmptyMessage = (type) => {
  switch (type) {
    case 'friends': return 'No mutual friends yet';
    case 'following': return 'Not following anyone yet';
    case 'followers': return 'No followers yet';
    default: return 'No users found';
  }
};

export const getSocialListPlaceholder = (type) => {
  switch (type) {
    case 'friends': return 'Search mutual friends...';
    case 'following': return 'Search following...';
    case 'followers': return 'Search followers...';
    default: return 'Search users...';
  }
};