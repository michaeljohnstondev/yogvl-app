// FILE: services/moderationService.js - User Moderation System
// ⚠️ WARNING: This service creates notificationTriggers documents which have been ELIMINATED
// ⚠️ Push notifications from this service are DISABLED to prevent zombie collection resurrection
// ⚠️ Moderation notifications need to be migrated to direct Firebase function triggers

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { adminNotificationService } from './adminNotificationService';

/**
 * DATABASE STRUCTURE FOR MODERATION:
 *
 * /users/{userId}/moderation
 * {
 *   strikes: [
 *     {
 *       id: string,
 *       issuedAt: Timestamp,
 *       issuedBy: string, // admin userId
 *       reason: string,
 *       reportId: string,
 *       type: 'user' | 'event', // what was reported
 *       active: boolean, // strikes can expire after time
 *       expiresAt?: Timestamp
 *     }
 *   ],
 *   warnings: [
 *     {
 *       id: string,
 *       issuedAt: Timestamp,
 *       issuedBy: string,
 *       reason: string,
 *       reportId: string,
 *       type: 'user' | 'event'
 *     }
 *   ],
 *   bans: {
 *     tempBans: [
 *       {
 *         id: string,
 *         issuedAt: Timestamp,
 *         issuedBy: string,
 *         reason: string,
 *         reportId: string,
 *         expiresAt: Timestamp,
 *         active: boolean
 *       }
 *     ],
 *     permBan?: {
 *       issuedAt: Timestamp,
 *       issuedBy: string,
 *       reason: string,
 *       reportId: string,
 *       active: boolean
 *     }
 *   },
 *   stats: {
 *     totalStrikes: number,
 *     activeStrikes: number,
 *     totalWarnings: number,
 *     lastStrikeDate?: Timestamp,
 *     lastWarningDate?: Timestamp,
 *     lastBanDate?: Timestamp
 *   }
 * }
 */

class ModerationService {
  /**
   * Get current admin user ID (this would be passed from the calling component)
   * For now, we'll use a placeholder but this should be the actual admin user ID
   * @param {string} adminUserId - Admin user ID from auth context
   * @returns {string} Admin user ID
   */
  getAdminUserId(adminUserId = null) {
    // In real implementation, this would come from the calling component's auth context
    return adminUserId || 'system_admin';
  }

  /**
   * Get user's moderation record (stored in main user document)
   * @param {string} userId - User ID
   * @returns {Object|null} Moderation record or null if none exists
   */
  async getModerationRecord(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      return userData.moderation || null;
    } catch (error) {
      console.error(
        '[moderationService] Error getting moderation record:',
        error
      );
      throw error;
    }
  }

  /**
   * Initialize or update moderation stats (stored in main user document)
   * @param {string} userId - User ID
   * @param {Object} updates - Updates to apply
   */
  async updateModerationRecord(userId, updates) {
    try {
      const userRef = doc(db, 'users', userId);
      const currentRecord = await this.getModerationRecord(userId);

      // Initialize default structure if no record exists
      const defaultRecord = {
        strikes: [],
        warnings: [],
        bans: {
          tempBans: [],
          permBan: null,
        },
        stats: {
          totalStrikes: 0,
          activeStrikes: 0,
          totalWarnings: 0,
        },
      };

      const updatedRecord = {
        ...defaultRecord,
        ...currentRecord,
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Update the moderation field in the user document
      await updateDoc(userRef, {
        moderation: updatedRecord,
      });

      return updatedRecord;
    } catch (error) {
      console.error(
        '[moderationService] Error updating moderation record:',
        error
      );
      throw error;
    }
  }

  /**
   * Issue a warning to a user
   * @param {Object} report - The report object
   * @param {string} adminUserId - Admin user ID issuing the warning
   * @param {string} customMessage - Optional custom message for the user
   */
  async issueWarning(report, adminUserId = null, customMessage = null) {
    try {
      const targetUserId =
        report.type === 'user'
          ? report.reportedUser.id
          : report.reportedEvent.createdBy ||
            report.reportedEvent.eventData.createdBy;

      const warning = {
        id: `warning_${Date.now()}`,
        issuedAt: Timestamp.now(),
        issuedBy: this.getAdminUserId(adminUserId),
        reason: report.reason,
        customMessage: customMessage || `Warning: ${report.reason}`,
        reportId: report.id,
        type: report.type,
      };

      const currentRecord = await this.getModerationRecord(targetUserId);
      const warnings = [...(currentRecord?.warnings || []), warning];

      const updatedRecord = await this.updateModerationRecord(targetUserId, {
        warnings,
        stats: {
          ...currentRecord?.stats,
          totalWarnings: warnings.length,
          lastWarningDate: Timestamp.now(),
        },
      });

      // Send notification to user
      await adminNotificationService.sendWarningNotification(
        targetUserId,
        customMessage || `Warning: ${report.reason}`,
        this.getAdminUserId(adminUserId),
        report.id
      );

      // Delete the report after taking action
      await this.deleteReport(report);

      console.log(
        `[moderationService] Warning issued to user ${targetUserId}, notification sent, report deleted`
      );
      return { success: true, totalWarnings: warnings.length };
    } catch (error) {
      console.error('[moderationService] Error issuing warning:', error);
      throw error;
    }
  }

  /**
   * Issue a strike to a user
   * @param {Object} report - The report object
   * @param {string} adminUserId - Admin user ID issuing the strike
   * @param {string} customMessage - Optional custom message for the user
   */
  async issueStrike(report, adminUserId = null, customMessage = null) {
    try {
      const targetUserId =
        report.type === 'user'
          ? report.reportedUser.id
          : report.reportedEvent.createdBy ||
            report.reportedEvent.eventData.createdBy;

      const strike = {
        id: `strike_${Date.now()}`,
        issuedAt: Timestamp.now(),
        issuedBy: this.getAdminUserId(adminUserId),
        reason: report.reason,
        customMessage: customMessage || `Strike issued: ${report.reason}`,
        reportId: report.id,
        type: report.type,
        active: true,
        // Strikes expire after 6 months of good behavior
        expiresAt: new Timestamp(Date.now() / 1000 + 6 * 30 * 24 * 60 * 60, 0),
      };

      const currentRecord = await this.getModerationRecord(targetUserId);
      const strikes = [...(currentRecord?.strikes || []), strike];
      const activeStrikes = strikes.filter((s) => s.active).length;

      const updatedRecord = await this.updateModerationRecord(targetUserId, {
        strikes,
        stats: {
          ...currentRecord?.stats,
          totalStrikes: strikes.length,
          activeStrikes: activeStrikes,
          lastStrikeDate: Timestamp.now(),
        },
      });

      // Send notification to user
      await adminNotificationService.sendStrikeNotification(
        targetUserId,
        customMessage || `Strike issued: ${report.reason}`,
        this.getAdminUserId(adminUserId),
        report.id,
        activeStrikes
      );

      // Delete the report first
      await this.deleteReport(report);

      // Check if user should be auto-banned (3 active strikes = temp ban, 5 = perm ban)
      if (activeStrikes >= 5) {
        console.log(
          `[moderationService] Auto-escalating to permanent ban for user ${targetUserId}`
        );
        // Note: Don't pass the report since it's already deleted
        await this.issuePermBanDirect(
          targetUserId,
          'Automatic ban: 5+ active strikes',
          adminUserId
        );
      } else if (activeStrikes >= 3) {
        console.log(
          `[moderationService] Auto-escalating to temp ban for user ${targetUserId}`
        );
        // Note: Don't pass the report since it's already deleted
        await this.issueTempBanDirect(
          targetUserId,
          30,
          'Automatic temp ban: 3+ active strikes',
          adminUserId
        );
      }

      console.log(
        `[moderationService] Strike issued to user ${targetUserId} (${activeStrikes} active), notification sent, report deleted`
      );
      return { success: true, totalStrikes: strikes.length, activeStrikes };
    } catch (error) {
      console.error('[moderationService] Error issuing strike:', error);
      throw error;
    }
  }

  /**
   * Issue a temporary ban to a user
   * @param {Object} report - The report object
   * @param {number} days - Number of days for the ban
   * @param {string} customReason - Optional custom reason
   * @param {string} adminUserId - Admin user ID issuing the ban
   */
  async issueTempBan(
    report,
    days = 7,
    customReason = null,
    adminUserId = null
  ) {
    try {
      const targetUserId =
        report.type === 'user'
          ? report.reportedUser.id
          : report.reportedEvent.createdBy ||
            report.reportedEvent.eventData.createdBy;

      const result = await this.issueTempBanDirect(
        targetUserId,
        days,
        customReason || report.reason,
        adminUserId,
        report.id
      );

      // Delete the report after taking action
      await this.deleteReport(report);

      console.log(
        `[moderationService] Temp ban (${days} days) issued to user ${targetUserId}, report deleted`
      );
      return result;
    } catch (error) {
      console.error('[moderationService] Error issuing temp ban:', error);
      throw error;
    }
  }

  /**
   * Issue a temporary ban directly to a user (without report)
   * @param {string} targetUserId - Target user ID
   * @param {number} days - Number of days for the ban
   * @param {string} reason - Reason for ban
   * @param {string} adminUserId - Admin user ID issuing the ban
   * @param {string} reportId - Optional report ID
   */
  async issueTempBanDirect(
    targetUserId,
    days = 7,
    reason = 'Policy violation',
    adminUserId = null,
    reportId = null
  ) {
    try {
      const expiresAt = new Timestamp(
        Date.now() / 1000 + days * 24 * 60 * 60,
        0
      );

      const tempBan = {
        id: `tempban_${Date.now()}`,
        issuedAt: Timestamp.now(),
        issuedBy: this.getAdminUserId(adminUserId),
        reason,
        customMessage: reason, // For bans, the custom message is the reason
        reportId,
        expiresAt,
        active: true,
        days,
      };

      const currentRecord = await this.getModerationRecord(targetUserId);
      const tempBans = [...(currentRecord?.bans?.tempBans || []), tempBan];

      await this.updateModerationRecord(targetUserId, {
        bans: {
          ...currentRecord?.bans,
          tempBans,
        },
        stats: {
          ...currentRecord?.stats,
          lastBanDate: Timestamp.now(),
        },
      });

      // Send ban notification
      const banStatus = {
        type: 'temporary',
        reason,
        issuedAt: tempBan.issuedAt,
        expiresAt,
        daysRemaining: days,
        isBanned: true,
      };
      await this.sendBanNotification(
        targetUserId,
        banStatus,
        this.getAdminUserId(adminUserId)
      );

      console.log(
        `[moderationService] Temp ban (${days} days) issued directly to user ${targetUserId}`
      );
      return { success: true, days, expiresAt };
    } catch (error) {
      console.error(
        '[moderationService] Error issuing direct temp ban:',
        error
      );
      throw error;
    }
  }

  /**
   * Issue a permanent ban to a user
   * @param {Object} report - The report object
   * @param {string} customReason - Optional custom reason
   * @param {string} adminUserId - Admin user ID issuing the ban
   */
  async issuePermBan(report, customReason = null, adminUserId = null) {
    try {
      const targetUserId =
        report.type === 'user'
          ? report.reportedUser.id
          : report.reportedEvent.createdBy ||
            report.reportedEvent.eventData.createdBy;

      const result = await this.issuePermBanDirect(
        targetUserId,
        customReason || report.reason,
        adminUserId,
        report.id
      );

      // Delete the report after taking action
      await this.deleteReport(report);

      console.log(
        `[moderationService] Permanent ban issued to user ${targetUserId}, report deleted`
      );
      return result;
    } catch (error) {
      console.error('[moderationService] Error issuing perm ban:', error);
      throw error;
    }
  }

  /**
   * Issue a permanent ban directly to a user (without report)
   * @param {string} targetUserId - Target user ID
   * @param {string} reason - Reason for ban
   * @param {string} adminUserId - Admin user ID issuing the ban
   * @param {string} reportId - Optional report ID
   */
  async issuePermBanDirect(
    targetUserId,
    reason = 'Severe policy violation',
    adminUserId = null,
    reportId = null
  ) {
    try {
      const permBan = {
        issuedAt: Timestamp.now(),
        issuedBy: this.getAdminUserId(adminUserId),
        reason,
        customMessage: reason, // For bans, the custom message is the reason
        reportId,
        active: true,
      };

      const currentRecord = await this.getModerationRecord(targetUserId);

      await this.updateModerationRecord(targetUserId, {
        bans: {
          ...currentRecord?.bans,
          permBan,
        },
        stats: {
          ...currentRecord?.stats,
          lastBanDate: Timestamp.now(),
        },
      });

      // Send ban notification
      const banStatus = {
        type: 'permanent',
        reason,
        issuedAt: permBan.issuedAt,
        isBanned: true,
      };
      await this.sendBanNotification(
        targetUserId,
        banStatus,
        this.getAdminUserId(adminUserId)
      );

      console.log(
        `[moderationService] Permanent ban issued directly to user ${targetUserId}`
      );
      return { success: true };
    } catch (error) {
      console.error(
        '[moderationService] Error issuing direct perm ban:',
        error
      );
      throw error;
    }
  }

  /**
   * Dismiss a report without action
   * @param {Object} report - The report object
   * @param {string} internalNotes - Optional internal notes for dismissal
   */
  async dismissReport(report, internalNotes = null) {
    try {
      // Delete the report document
      await this.deleteReport(report);

      const logMessage = internalNotes
        ? `[moderationService] Report ${report.id} dismissed and deleted (Notes: ${internalNotes})`
        : `[moderationService] Report ${report.id} dismissed and deleted`;
      console.log(logMessage);
      return { success: true };
    } catch (error) {
      console.error('[moderationService] Error dismissing report:', error);
      throw error;
    }
  }

  /**
   * Update report status in the database
   * @param {Object} report - The report object
   * @param {string} status - New status
   */
  async updateReportStatus(report, status) {
    try {
      const reportRef = doc(db, 'studios', report.studioId, 'admin', report.id);

      await updateDoc(reportRef, {
        status,
        resolvedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
      });
    } catch (error) {
      console.error('[moderationService] Error updating report status:', error);
      throw error;
    }
  }

  /**
   * Delete a report from the database
   * @param {Object} report - The report object
   */
  async deleteReport(report) {
    try {
      const reportRef = doc(db, 'studios', report.studioId, 'admin', report.id);
      await deleteDoc(reportRef);
    } catch (error) {
      console.error('[moderationService] Error deleting report:', error);
      throw error;
    }
  }

  /**
   * Check if user is currently banned
   * @param {string} userId - User ID to check
   * @returns {Object} Ban status information
   */
  async getBanStatus(userId) {
    try {
      const moderationRecord = await this.getModerationRecord(userId);

      if (!moderationRecord) {
        return { isBanned: false };
      }

      // Auto-expire strikes that are past their expiration date
      let strikeUpdateNeeded = false;
      const now = Date.now();

      const updatedStrikes =
        moderationRecord.strikes?.map((strike) => {
          if (
            strike.active &&
            strike.expiresAt &&
            strike.expiresAt.seconds * 1000 <= now
          ) {
            console.log(
              `[moderationService] Auto-expiring strike for user ${userId}:`,
              strike.id
            );
            strikeUpdateNeeded = true;
            return { ...strike, active: false, expiredAt: Timestamp.now() };
          }
          return strike;
        }) || [];

      // Update database if any strikes expired
      if (strikeUpdateNeeded) {
        const activeStrikes = updatedStrikes.filter((s) => s.active).length;
        await this.updateModerationRecord(userId, {
          strikes: updatedStrikes,
          stats: {
            ...moderationRecord.stats,
            activeStrikes: activeStrikes,
          },
        });
        console.log(
          `[moderationService] Updated expired strikes for user ${userId}, now has ${activeStrikes} active strikes`
        );
      }

      // Check permanent ban
      if (moderationRecord.bans?.permBan?.active) {
        return {
          isBanned: true,
          type: 'permanent',
          reason: moderationRecord.bans.permBan.reason,
          issuedAt: moderationRecord.bans.permBan.issuedAt,
        };
      }

      // Check temp bans and automatically expire them
      let needsUpdate = false;

      // Check all temp bans for expiration
      const updatedTempBans =
        moderationRecord.bans?.tempBans?.map((ban) => {
          if (ban.active && ban.expiresAt.seconds * 1000 <= now) {
            console.log(
              `[moderationService] Auto-expiring temp ban for user ${userId}:`,
              ban.id
            );
            needsUpdate = true;
            return { ...ban, active: false, expiredAt: Timestamp.now() };
          }
          return ban;
        }) || [];

      // Update database if any bans expired
      if (needsUpdate) {
        await this.updateModerationRecord(userId, {
          bans: {
            ...moderationRecord.bans,
            tempBans: updatedTempBans,
          },
        });
        console.log(
          `[moderationService] Updated expired temp bans for user ${userId}`
        );
      }

      // Find active (non-expired) temp ban
      const activeTempBan = updatedTempBans.find(
        (ban) => ban.active && ban.expiresAt.seconds * 1000 > now
      );

      if (activeTempBan) {
        return {
          isBanned: true,
          type: 'temporary',
          reason: activeTempBan.reason,
          issuedAt: activeTempBan.issuedAt,
          expiresAt: activeTempBan.expiresAt,
          daysRemaining: Math.ceil(
            (activeTempBan.expiresAt.seconds * 1000 - now) /
              (24 * 60 * 60 * 1000)
          ),
        };
      }

      return { isBanned: false };
    } catch (error) {
      console.error('[moderationService] Error checking ban status:', error);
      return { isBanned: false, error: error.message };
    }
  }

  /**
   * Send push notification for ban enforcement
   * @param {string} userId - Banned user ID
   * @param {Object} banStatus - Ban status data
   * @param {string} adminUserId - Admin who issued the ban
   */
  async sendBanNotification(userId, banStatus, adminUserId) {
    console.warn('[moderationService] sendBanNotification disabled - notificationTriggers collection eliminated');
    console.warn('Ban notifications need direct Firebase function trigger implementation');
    return { success: false, reason: 'notificationTriggers collection eliminated' };

    /* REMOVED - WAS CREATING ZOMBIE notificationTriggers COLLECTION
    try {
      // Create notification trigger for push notification
      const triggerId = `ban_${banStatus.type}_${userId}_${Date.now()}`;
      const notificationTriggerRef = doc(db, 'notificationTriggers', triggerId);

      const title =
        banStatus.type === 'permanent'
          ? '🚫 Account Permanently Banned'
          : `⏳ Account Temporarily Banned (${banStatus.daysRemaining} days)`;

      const message =
        banStatus.reason ||
        'Your account has been restricted due to community violations.';

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
        },
      });

      console.log(
        `[moderationService] Ban notification trigger created: ${triggerId}`
      );
    } catch (error) {
      console.error(
        '[moderationService] Error sending ban notification:',
        error
      );
      // Don't throw - ban should still be enforced even if notification fails
    }
    */
  }
}

// Export singleton instance
export const moderationService = new ModerationService();
