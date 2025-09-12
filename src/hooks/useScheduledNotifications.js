// hooks/useScheduledNotifications.js - Hook for managing scheduled notifications

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import ScheduledNotificationService from '../services/scheduledNotifications';

export const useScheduledNotifications = () => {
  const [isProcessorRunning, setIsProcessorRunning] = useState(false);
  const [processingStats, setProcessingStats] = useState(null);
  const [userScheduledNotifications, setUserScheduledNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const processorCleanup = useRef(null);
  const { currentUserId } = useAuth();

  /**
   * Start the background notification processor
   */
  const startNotificationProcessor = () => {
    if (isProcessorRunning) {
      console.log('Notification processor already running');
      return;
    }

    try {
      processorCleanup.current = ScheduledNotificationService.startBackgroundProcessor();
      setIsProcessorRunning(true);
      console.log('✅ Scheduled notification processor started');
    } catch (error) {
      console.error('Failed to start notification processor:', error);
    }
  };

  /**
   * Stop the background notification processor
   */
  const stopNotificationProcessor = () => {
    if (processorCleanup.current) {
      processorCleanup.current();
      processorCleanup.current = null;
      setIsProcessorRunning(false);
      console.log('⏹️ Scheduled notification processor stopped');
    }
  };

  /**
   * Schedule event reminder notifications
   */
  const scheduleEventReminders = async (eventData) => {
    try {
      setLoading(true);
      const result = await ScheduledNotificationService.scheduleEventReminders(eventData);
      console.log(`📅 Scheduled ${result.scheduledCount} event reminders for "${eventData.title}"`);
      
      // Refresh user notifications if this user is involved
      if (currentUserId && (eventData.subscribers?.includes(currentUserId) || eventData.createdBy === currentUserId)) {
        await loadUserScheduledNotifications();
      }
      
      return result;
    } catch (error) {
      console.error('Error scheduling event reminders:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel notifications for an event
   */
  const cancelEventNotifications = async (eventId, reason = 'Event cancelled') => {
    try {
      setLoading(true);
      const result = await ScheduledNotificationService.cancelEventNotifications(eventId, reason);
      console.log(`❌ Cancelled ${result.cancelledCount} notifications for event ${eventId}`);
      
      // Refresh user notifications
      if (currentUserId) {
        await loadUserScheduledNotifications();
      }
      
      return result;
    } catch (error) {
      console.error('Error cancelling event notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Manually process pending notifications (for testing/debugging)
   */
  const processPendingNotifications = async () => {
    try {
      setLoading(true);
      const result = await ScheduledNotificationService.processPendingNotifications();
      setProcessingStats(result);
      console.log(`🔄 Processed ${result.processedCount} scheduled notifications`);
      
      // Refresh user notifications
      if (currentUserId) {
        await loadUserScheduledNotifications();
      }
      
      return result;
    } catch (error) {
      console.error('Error processing notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load scheduled notifications for current user
   */
  const loadUserScheduledNotifications = async (includeSent = false) => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const notifications = await ScheduledNotificationService.getUserScheduledNotifications(currentUserId, includeSent);
      setUserScheduledNotifications(notifications);
      return notifications;
    } catch (error) {
      console.error('Error loading user scheduled notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Schedule a custom notification
   */
  const scheduleCustomNotification = async (notificationData) => {
    try {
      setLoading(true);
      const scheduleId = await ScheduledNotificationService.scheduleNotification(notificationData);
      console.log(`📝 Scheduled custom notification: ${scheduleId}`);
      
      // Refresh user notifications
      if (currentUserId) {
        await loadUserScheduledNotifications();
      }
      
      return scheduleId;
    } catch (error) {
      console.error('Error scheduling custom notification:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clean up old notifications
   */
  const cleanupOldNotifications = async (olderThanDays = 30) => {
    try {
      const result = await ScheduledNotificationService.cleanupOldNotifications(olderThanDays);
      console.log(`🧹 Cleaned up ${result.deletedCount} old scheduled notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw error;
    }
  };

  // DISABLED: Auto-start processor when hook mounts
  // Background processing moved to Cloud Functions for better performance
  useEffect(() => {
    // startNotificationProcessor(); // DISABLED - causes battery drain
    console.log('Scheduled notification processing handled by Cloud Functions');

    // Cleanup when component unmounts (still needed if manually started)
    return () => {
      stopNotificationProcessor();
    };
  }, []);

  // Load user notifications when user changes
  useEffect(() => {
    if (currentUserId) {
      loadUserScheduledNotifications();
    } else {
      setUserScheduledNotifications([]);
    }
  }, [currentUserId]);

  return {
    // State
    isProcessorRunning,
    processingStats,
    userScheduledNotifications,
    loading,

    // Actions
    startNotificationProcessor,
    stopNotificationProcessor,
    scheduleEventReminders,
    cancelEventNotifications,
    processPendingNotifications,
    loadUserScheduledNotifications,
    scheduleCustomNotification,
    cleanupOldNotifications,

    // Computed values
    pendingCount: userScheduledNotifications.filter(n => n.status === 'pending').length,
    sentCount: userScheduledNotifications.filter(n => n.status === 'sent').length,
    upcomingReminders: userScheduledNotifications
      .filter(n => n.status === 'pending' && n.scheduledFor > new Date())
      .sort((a, b) => a.scheduledFor - b.scheduledFor)
      .slice(0, 5), // Next 5 upcoming
  };
};

export default useScheduledNotifications;