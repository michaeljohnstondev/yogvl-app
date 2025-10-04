// FILE: services/banEnforcementService.js - Ban Enforcement System
// ⚠️ WARNING: This service creates notificationTriggers documents which have been ELIMINATED
// ⚠️ Push notifications from this service are DISABLED to prevent zombie collection resurrection
// ⚠️ Ban notifications need to be migrated to direct Firebase function triggers

import { moderationService } from './moderationService';
import { doc, setDoc, Timestamp } from '../lib/firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Service to enforce user bans throughout the application
 */
class BanEnforcementService {
  constructor() {
    // Cache ban status checks to avoid repeated Firebase calls (cache for 30 seconds)
    this.banStatusCache = new Map();
    this.cacheTimeout = 30 * 1000; // 30 seconds

    // Clean cache every 5 minutes to prevent memory leaks
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired cache entries to prevent memory leaks
   */
  cleanupCache() {
    const now = Date.now();
    for (const [userId, cached] of this.banStatusCache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.banStatusCache.delete(userId);
      }
    }
  }
  
  /**
   * Check if user is currently banned and throw error if they are - optimized non-blocking version
   * @param {string} userId - User ID to check
   * @param {string} action - Action being attempted (for error message)
   * @throws {Error} If user is banned
   */
  async enforceUserNotBanned(userId, action = 'perform this action') {
    try {
      // Use non-blocking checkBanStatus to avoid UI thread blocking
      const banStatus = await this.checkBanStatus(userId);

      if (banStatus.isBanned) {
        const errorMessage = this.getBanErrorMessage(banStatus, action);
        const error = new Error(errorMessage);
        error.isBanError = true;
        error.banStatus = banStatus;
        throw error;
      }

      return true;
    } catch (error) {
      if (error.isBanError) {
        throw error;
      }
      // If there's an error checking ban status, log it but don't block user
      console.warn('[banEnforcementService] Error checking ban status:', error);
      return true;
    }
  }

  /**
   * Get appropriate error message for ban status
   * @param {Object} banStatus - Ban status from moderationService
   * @param {string} action - Action being attempted
   * @returns {string} Error message
   */
  getBanErrorMessage(banStatus, action) {
    if (banStatus.type === 'permanent') {
      return `Your account has been permanently banned and cannot ${action}.\n\nReason: ${banStatus.reason}\n\nDate: ${this.formatBanDate(banStatus.issuedAt)}`;
    } else if (banStatus.type === 'temporary') {
      return `Your account is temporarily banned and cannot ${action}.\n\nReason: ${banStatus.reason}\nTime Remaining: ${banStatus.daysRemaining} days\n\nExpires: ${this.formatBanDate(banStatus.expiresAt)}`;
    }
    return `Your account is restricted and cannot ${action}.`;
  }

  /**
   * Format ban date for display
   * @param {Object} timestamp - Firestore timestamp
   * @returns {string} Formatted date
   */
  formatBanDate(timestamp) {
    if (!timestamp || !timestamp.seconds) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  /**
   * Check ban status without throwing error (for UI display) - optimized non-blocking version with caching
   * @param {string} userId - User ID to check
   * @returns {Promise<Object>} Ban status or null if error
   */
  async checkBanStatus(userId) {
    try {
      // Check cache first
      const cached = this.banStatusCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Make this operation non-blocking by using setTimeout to yield control
      return await new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const banStatus = await moderationService.getBanStatus(userId);

            // Cache the result
            this.banStatusCache.set(userId, {
              data: banStatus,
              timestamp: Date.now()
            });

            resolve(banStatus);
          } catch (error) {
            console.warn('[banEnforcementService] Error checking ban status for UI:', error);
            const errorResult = { isBanned: false, error: true };

            // Cache error result for shorter time (5 seconds)
            this.banStatusCache.set(userId, {
              data: errorResult,
              timestamp: Date.now() - this.cacheTimeout + 5000
            });

            resolve(errorResult);
          }
        }, 0);
      });
    } catch (error) {
      console.warn('[banEnforcementService] Error in checkBanStatus wrapper:', error);
      return { isBanned: false, error: true };
    }
  }

  /**
   * Middleware function to check bans before actions
   * @param {string} userId - User ID
   * @param {string} actionName - Name of action being attempted
   * @param {Function} actionFunction - Function to execute if not banned
   * @returns {Promise} Result of action or throws ban error
   */
  async withBanCheck(userId, actionName, actionFunction) {
    await this.enforceUserNotBanned(userId, actionName);
    return await actionFunction();
  }

  /**
   * Send push notification for ban enforcement
   * @param {string} userId - Banned user ID
   * @param {Object} banStatus - Ban status data
   * @param {string} adminUserId - Admin who issued the ban
   */
  async sendBanNotification(userId, banStatus, adminUserId) {
    console.warn('[banEnforcementService] sendBanNotification disabled - notificationTriggers collection eliminated');
    console.warn('Ban notifications need direct Firebase function trigger implementation');
    return { success: false, reason: 'notificationTriggers collection eliminated' };

    /* REMOVED - WAS CREATING ZOMBIE notificationTriggers COLLECTION
    try {
      // Create notification trigger for push notification
      const triggerId = `ban_${banStatus.type}_${userId}_${Date.now()}`;
      const notificationTriggerRef = doc(db, 'notificationTriggers', triggerId);
      
      const title = banStatus.type === 'permanent' 
        ? '🚫 Account Permanently Banned'
        : `⏳ Account Temporarily Banned (${banStatus.daysRemaining} days)`;
      
      const message = banStatus.reason || 'Your account has been restricted due to community violations.';
      
      await setDoc(notificationTriggerRef, {
        type: 'ban_notification',
        subType: banStatus.type, // permanent, temporary
        userId: userId,
        priority: 'high',
        title: title,
        message: message.substring(0, 100),
        banType: banStatus.type,
        reason: banStatus.reason,
        issuedBy: adminUserId || 'system_admin',
        expiresAt: banStatus.expiresAt,
        daysRemaining: banStatus.daysRemaining,
        createdAt: Timestamp.now(),
        processed: false,
        data: {
          type: 'ban_notification',
          banType: banStatus.type,
          priority: 'high',
          screen: 'Home', // Navigate to home where banned modal will show
        }
      });

      console.log(`[banEnforcementService] Ban notification trigger created: ${triggerId}`);
    } catch (error) {
      console.error('[banEnforcementService] Error sending ban notification:', error);
      // Don't throw - ban should still be enforced even if notification fails
    }
    */
  }

  /**
   * Actions that should be blocked for banned users
   */
  static BLOCKED_ACTIONS = {
    CREATE_EVENT: 'create events',
    JOIN_EVENT: 'join events',
    COMMENT: 'comment on events',
    FOLLOW_USER: 'follow other users',
    RATE_HOST: 'rate hosts',
    SEND_MESSAGES: 'send messages',
    REPORT_USER: 'report users',
    REPORT_EVENT: 'report events'
  };
}

// Export singleton instance
export const banEnforcementService = new BanEnforcementService();