// FILE: services/notificationTester.js
// Testing utility for foreground notification banners
// Use this to test notification display without requiring actual FCM messages

import { notificationDisplayService } from './notificationDisplayService';

/**
 * Test foreground notification banner display
 * Call this from any component to test the notification system
 */
export const testNotificationBanner = (type = 'info') => {
  const testMessages = {
    info: {
      title: 'Test Notification',
      message: 'This is a test notification banner',
      type: 'info',
    },
    success: {
      title: 'Success!',
      message: 'Operation completed successfully',
      type: 'success',
    },
    error: {
      title: 'Error Occurred',
      message: 'Something went wrong, please try again',
      type: 'error',
    },
    warning: {
      title: 'Warning',
      message: 'Please check your internet connection',
      type: 'warning',
    },
    event_reminder: {
      title: 'Event Starting Soon',
      message: 'Your event "Big Vibe Party" starts in 15 minutes',
      type: 'event_reminder',
    },
    follow_notification: {
      title: 'New Follower',
      message: 'John Doe started following you',
      type: 'follow_notification',
    },
    invitation_received: {
      title: 'Event Invitation',
      message: 'You\'ve been invited to "Summer Vibes"',
      type: 'invitation_received',
    },
    admin_notification: {
      title: 'Admin Notice',
      message: 'System maintenance scheduled for tonight',
      type: 'admin_notification',
    },
  };

  const testData = testMessages[type] || testMessages.info;

  const mockFCMMessage = {
    notification: {
      title: testData.title,
      body: testData.message,
    },
    data: {
      type: testData.type,
      title: testData.title,
      message: testData.message,
    },
  };

  console.log('[NotificationTester] Testing notification banner:', testData);

  const success = notificationDisplayService.displayForegroundNotification(
    mockFCMMessage,
    () => {
      console.log('[NotificationTester] Test notification banner pressed!');
    }
  );

  if (!success) {
    console.error('[NotificationTester] Failed to display test notification');
  }

  return success;
};

/**
 * Test all notification types sequentially
 */
export const testAllNotificationTypes = () => {
  const types = [
    'info',
    'success',
    'error',
    'warning',
    'event_reminder',
    'follow_notification',
    'invitation_received',
    'admin_notification',
  ];

  let delay = 0;
  types.forEach((type) => {
    setTimeout(() => {
      testNotificationBanner(type);
    }, delay);
    delay += 1000; // 1 second delay between each test
  });
};

/**
 * Test FCM-style notification data structure
 */
export const testFCMNotification = (customData = {}) => {
  const mockFCMMessage = {
    messageId: 'test-message-' + Date.now(),
    notification: {
      title: customData.title || 'FCM Test Notification',
      body: customData.message || 'This is a test FCM notification',
    },
    data: {
      type: customData.type || 'info',
      eventId: customData.eventId || null,
      userId: customData.userId || null,
      screen: customData.screen || null,
      ...customData,
    },
    from: 'test-sender',
    sentTime: Date.now(),
  };

  console.log('[NotificationTester] Testing FCM notification structure:', mockFCMMessage);

  return notificationDisplayService.displayWithNavigation(
    mockFCMMessage,
    (data) => {
      console.log('[NotificationTester] Test navigation called with data:', data);
    }
  );
};

/**
 * Quick test buttons for development
 * Add these to any screen for easy testing
 */
export const NotificationTestButtons = {
  testInfo: () => testNotificationBanner('info'),
  testSuccess: () => testNotificationBanner('success'),
  testError: () => testNotificationBanner('error'),
  testWarning: () => testNotificationBanner('warning'),
  testEvent: () => testNotificationBanner('event_reminder'),
  testFollow: () => testNotificationBanner('follow_notification'),
  testInvitation: () => testNotificationBanner('invitation_received'),
  testAdmin: () => testNotificationBanner('admin_notification'),
  testAll: testAllNotificationTypes,
};

export default {
  testNotificationBanner,
  testAllNotificationTypes,
  testFCMNotification,
  NotificationTestButtons,
};