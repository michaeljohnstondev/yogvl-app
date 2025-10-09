// FILE: services/favoriteService.js - Favorite user system wrapper
// Wraps userRelationshipsService favorite functionality for easier imports

import {
  addToFavorites,
  removeFromFavorites,
  checkIfFavorite,
} from './shared/userRelationshipsService';

/**
 * Add a user to favorites
 * @param {string} currentUserId - User adding to favorites
 * @param {string} targetUserId - User being favorited
 */
export const addFavorite = async (currentUserId, targetUserId) => {
  return await addToFavorites(currentUserId, targetUserId);
};

/**
 * Remove a user from favorites
 * @param {string} currentUserId - User removing from favorites
 * @param {string} targetUserId - User being unfavorited
 */
export const removeFavorite = async (currentUserId, targetUserId) => {
  return await removeFromFavorites(currentUserId, targetUserId);
};

/**
 * Check if a user is favorited
 * @param {string} currentUserId - User checking favorites
 * @param {string} targetUserId - User to check
 * @returns {Promise<boolean>}
 */
export const isFavorite = async (currentUserId, targetUserId) => {
  return await checkIfFavorite(currentUserId, targetUserId);
};
