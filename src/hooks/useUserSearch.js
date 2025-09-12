import { useState, useEffect, useMemo } from 'react';
import { filterUsersByQuery } from '../lib/searchUtils';

export const useUserSearch = (users) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    return filterUsersByQuery(users, searchQuery);
  }, [users, searchQuery]);

  // Clear search when users array changes (e.g., switching list types)
  useEffect(() => {
    setSearchQuery('');
  }, [users]);

  return {
    searchQuery,
    setSearchQuery,
    filteredUsers,
    hasResults: filteredUsers.length > 0,
    hasSearch: searchQuery.trim().length > 0
  };
};