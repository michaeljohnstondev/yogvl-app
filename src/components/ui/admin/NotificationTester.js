import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Clipboard } from 'react-native';
import { VibeButton } from '../';
import fcmService from '../../../services/fcmServiceWrapper';
import {
  notifyNewFollower,
  notifyEventInvitation,
  notifyCohostInvitation,
  notifyHostOfEventJoin,
} from '../../../services/notifications';
import { notificationEngine } from '../../../services/shared/NotificationEngine';
import { useAuth } from '../../../auth/AuthContext';
import theme from '../../../theme/themes';
import { useScheduledNotifications } from '../../../hooks/useScheduledNotifications';
import {
  testNotificationBanner,
  testAllNotificationTypes,
  NotificationTestButtons
} from '../../../services/notificationTester';
import { useEventForm } from '../../../events/hooks/useEventForm';
import { ScheduledNotificationCore } from '../../../services/scheduled/scheduledNotificationCore';

export default function NotificationTester() {
  const [testing, setTesting] = useState(false);
  const [testingType, setTestingType] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [pushToken, setPushToken] = useState(null);
  const { currentUserId, user } = useAuth();
  const {
    processPendingNotifications,
    userScheduledNotifications,
    scheduleCustomNotification,
    upcomingReminders,
    pendingCount,
  } = useScheduledNotifications();
  const { submitEvent } = useEventForm();

  const logTokenToConsole = async () => {
    try {
      const token = await fcmService.getExpoPushToken();

      console.log('');
      console.log('==========================================');
      console.log('🔥 FCM TOKEN FOR FIREBASE CONSOLE:');
      console.log('==========================================');
      console.log(token);
      console.log('==========================================');
      console.log('');

      setPushToken(token);
      Alert.alert('Token Logged!', 'Check your console for the FCM token');
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      Alert.alert('Error', 'Failed to get FCM token');
    }
  };

  const copyTokenToClipboard = async () => {
    try {
      if (!pushToken) {
        Alert.alert('No Token', 'Please run "Log FCM Token" first to get token');
        return;
      }

      await Clipboard.setString(pushToken);
      Alert.alert('Copied!', 'FCM token copied to clipboard for Firebase Console testing');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy token to clipboard');
    }
  };

  const testNotificationSetup = async () => {
    setTesting(true);
    try {
      // Test 1: Check permission status
      const permissions = await fcmService.getPermissionStatus();
      setPermissionStatus(permissions);
      console.log('🔔 Permission Status:', permissions);

      if (!permissions.granted) {
        Alert.alert(
          'Permission Required',
          'Push notifications require permission. Please grant permission in your device settings.',
          [{ text: 'OK' }]
        );
        setTesting(false);
        return;
      }

      // Test 2: Get push token
      const token = await fcmService.getExpoPushToken();
      setPushToken(token);
      console.log('🎫 Push Token:', token?.substring(0, 50) + '...');
      console.log('');
      console.log('==========================================');
      console.log('🔥 FCM TOKEN FOR FIREBASE CONSOLE:');
      console.log('==========================================');
      console.log(token);
      console.log('==========================================');
      console.log('');

      if (!token) {
        Alert.alert(
          'Error',
          'Failed to get push token. Are you on a physical device?'
        );
        setTesting(false);
        return;
      }

      // Test 3: Register token for user
      if (currentUserId) {
        const registered = await fcmService.registerTokenForUser(currentUserId);
        console.log('📝 Token Registered:', registered);

        if (!registered) {
          Alert.alert(
            'Error',
            'Failed to register push token with user account.'
          );
          setTesting(false);
          return;
        }
      }

      // Test 4: Send test notification using NotificationEngine
      const testResult = await notificationEngine.createNotification({
        userId: currentUserId,
        type: 'admin_notification',
        title: 'Big Vibe Studios',
        message: 'Test notification - your push notifications are working! 🎉',
        data: { type: 'test', timestamp: Date.now() },
      });

      console.log('🧪 Test notification result:', testResult);

      Alert.alert(
        'Test Complete!',
        'Check the notification that should have appeared. If you see it, push notifications are working correctly!',
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('❌ Notification test failed:', error);
      Alert.alert(
        'Test Failed',
        `Error: ${error.message}. Check console for details.`
      );
    } finally {
      setTesting(false);
    }
  };

  const testSpecificNotification = async (type) => {
    setTestingType(type);
    try {
      if (!currentUserId) {
        Alert.alert('Error', 'You must be logged in to test notifications.');
        return;
      }

      const testNotifications = {
        follow: {
          title: 'New Follower! 👥',
          body: 'TestUser123 started following you',
          data: {
            type: 'follow_notification',
            userId: 'test_user_123',
            screen: 'UserProfile',
          },
        },
        mutual_follow: {
          title: "You're Now Friends! 🤝",
          body: 'You and TestUser123 are now following each other',
          data: {
            type: 'mutual_follow',
            userId: 'test_user_123',
            screen: 'UserProfile',
          },
        },
        event_reminder: {
          title: 'Event Starting Soon! ⏰',
          body: 'Your event "Test Party" starts in 15 minutes',
          data: {
            type: 'event_reminder',
            eventId: 'test_event_123',
            screen: 'EventDetail',
          },
        },
        event_updated: {
          title: 'Event Updated 📝',
          body: 'Host updated details for "Test Party"',
          data: {
            type: 'event_update',
            eventId: 'test_event_123',
            screen: 'EventDetail',
          },
        },
        invitation_received: {
          title: 'Event Invitation! 🎉',
          body: 'You\'re invited to "Test Party" by TestHost',
          data: {
            type: 'invitation_received',
            eventId: 'test_event_123',
            screen: 'EventDetail',
          },
        },
        event_comment: {
          title: 'New Comment 💬',
          body: 'TestUser123 commented on "Test Party"',
          data: {
            type: 'event_comment',
            eventId: 'test_event_123',
            screen: 'EventDetail',
          },
        },
        default: {
          title: 'Big Vibe Studios 🎊',
          body: 'This is a general app notification test',
          data: {
            type: 'admin_notification',
            screen: 'Home',
          },
        },
        quick_test: {
          title: 'Background Test! 📱',
          body: 'Close the app now and this should appear in your notification tray',
          data: {
            type: 'admin_notification',
            screen: 'Home',
          },
        },
      };

      const notif = testNotifications[type];

      // Use NotificationEngine for consistent notification sending
      // For testing, send to a dummy user ID to avoid "send to self" restrictions
      // In a real scenario, you'd send to a different test user or a specific target.
      const testRecipientId = currentUserId; // Use current user as recipient for testing

      const testResult = await notificationEngine.createNotification({
        userId: testRecipientId,
        type: notif.data.type,
        title: notif.title,
        message: notif.body,
        data: notif.data,
        senderId: currentUserId, // Admin sending test notification
      });

      console.log(`🧪 ${type} notification result:`, testResult);

      Alert.alert(
        'Test Sent!',
        `${notif.title} notification sent. Check if you received it!`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error(`[NotificationTester] ${type} test failed:`, error);
      Alert.alert('Test Failed', `Error: ${error.message}`);
    } finally {
      setTestingType(null);
    }
  };

  const testScheduledReminder = async () => {
    setTestingType('scheduled_reminder');
    try {
      if (!currentUserId) {
        Alert.alert(
          'Error',
          'You must be logged in to test scheduled notifications.'
        );
        return;
      }

      // Schedule a test reminder for 10 seconds from now
      const reminderTime = new Date();
      reminderTime.setSeconds(reminderTime.getSeconds() + 10);

      const scheduleId = await scheduleCustomNotification({
        userId: currentUserId,
        type: 'event_reminder',
        title: 'Test Event Reminder! ⏰',
        message:
          'This scheduled reminder should appear in your notification tray!',
        data: {
          type: 'event_reminder',
          eventId: 'test_event_123',
          screen: 'EventDetail',
          isTest: true,
        },
        scheduledFor: reminderTime,
      });

      Alert.alert(
        'Scheduled!',
        `Test reminder scheduled for ${reminderTime.toLocaleTimeString()}. CLOSE THE APP NOW - notification should appear in 10 seconds!`,
        [
          {
            text: 'Close App Now!',
            onPress: () => {
              // Give user time to close the app
              console.log(
                '[NotificationTester] User should close app now for best testing'
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        '[NotificationTester] Scheduled reminder test failed:',
        error
      );
      Alert.alert('Test Failed', `Error: ${error.message}`);
    } finally {
      setTestingType(null);
    }
  };

  const testProcessPending = async () => {
    setTestingType('process_pending');
    try {
      const result = await processPendingNotifications();
      Alert.alert(
        'Processing Complete!',
        `Processed ${result.processedCount} scheduled notifications. Check console for details.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[NotificationTester] Process pending test failed:', error);
      Alert.alert('Test Failed', `Error: ${error.message}`);
    } finally {
      setTestingType(null);
    }
  };

  const testRealNotifications = async () => {
    setTestingType('real_notifications');
    try {
      if (!currentUserId) {
        Alert.alert(
          'Error',
          'You must be logged in to test real notifications.'
        );
        return;
      }

      console.log('\n🧪 === TESTING REAL NOTIFICATION FUNCTIONS ===\n');

      // Test follower notification
      console.log('🧪 Testing follower notification...');
      const followerResult = await notifyNewFollower({
        targetUserId: currentUserId,
        followerId: 'test_follower_123',
        followerName: 'Test Friend',
      });
      console.log('✅ Follower notification result:', followerResult);

      // Test event invitation notification (replaces notifyGuestInvitation)
      console.log('🧪 Testing event invitation notification...');
      const guestResult = await notifyEventInvitation({
        guestId: currentUserId,
        inviterId: 'test_inviter_456',
        inviterName: 'Test Host',
        eventId: 'test_event_789',
        eventTitle: 'Test Party Event',
        invitationId: 'test_invitation_101',
      });
      console.log('✅ Event invitation result:', guestResult);

      // Test cohost invitation notification
      console.log('🧪 Testing cohost invitation notification...');
      const cohostResult = await notifyCohostInvitation({
        inviteeId: currentUserId,
        hostId: 'test_inviter_456',
        hostName: 'Test Host',
        eventId: 'test_event_789',
        eventTitle: 'Test Party Event',
        invitationId: 'test_cohost_102',
      });
      console.log('✅ Cohost invitation result:', cohostResult);

      const successCount = [followerResult, guestResult, cohostResult].filter(
        (r) => r.success
      ).length;

      Alert.alert(
        'Real Notification Test Complete!',
        `Sent ${successCount}/3 notifications successfully. Check your notifications and console for details.`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error(
        '[NotificationTester] Real notification test failed:',
        error
      );
      Alert.alert('Test Failed', `Error: ${error.message}`);
    } finally {
      setTestingType(null);
    }
  };

  const createTestEventWithNotifications = async () => {
    setTestingType('test_event_creation');
    try {
      if (!currentUserId || !user) {
        Alert.alert(
          'Error',
          'You must be logged in with complete user data to create test events.'
        );
        return;
      }

      console.log('\n🎉 === CREATING REAL TEST EVENT WITH NOTIFICATIONS ===\n');

      // Calculate event time (5 minutes from now)
      const eventTime = new Date();
      eventTime.setMinutes(eventTime.getMinutes() + 5);

      // Calculate notification time (4 minutes 50 seconds from now = 10 seconds before event)
      const notificationTime = new Date();
      notificationTime.setMinutes(notificationTime.getMinutes() + 4);
      notificationTime.setSeconds(notificationTime.getSeconds() + 50);

      console.log('📅 Event scheduled for:', eventTime.toLocaleString());
      console.log('🔔 Notification scheduled for:', notificationTime.toLocaleString());

      // Create test event data
      const testFormData = {
        title: '🧪 Test Event - Notification Testing',
        location: 'Test Location - Admin Testing Suite',
        address: '123 Test Street, Test City, TC 12345',
        description: 'Automated test event created for notification testing. This event will trigger notifications in ~10 seconds.',
        isPrivate: false,
        maxGuests: 10,
        hasRsvpDeadline: false,
        contactInfo: '',
        entryFee: '',
        notificationSettings: {
          enabled: true,
          notifyOnJoin: true,
          notifyOnLeave: true,
          newComments: true,
          hostChanges: true,
          eventReminders: true,
          reminderTiming: '10seconds',
          dayBeforeReminder: false,
          hostComments: true,
          reminderTemplates: [
            {
              id: 'test_10sec',
              amount: 10,
              unit: 'seconds',
              enabled: true,
              label: '10 sec (TEST)',
            }
          ],
        },
      };

      // Create date/time values object
      const testDateTimeValues = {
        event: {
          value: eventTime,
          selected: true,
        },
        rsvpDeadline: {
          value: null,
          selected: false,
        },
      };

      // Mock validation functions
      const mockValidateForm = () => ({ isValid: true, errors: {} });
      const mockValidateDateTime = () => ({ isValid: true, message: '' });

      // Mock VibeAlert for the submitEvent function
      const mockVibeAlert = {
        success: (title, message, actions) => {
          console.log(`✅ ${title}: ${message}`);
          if (actions && actions[0] && actions[0].onPress) {
            actions[0].onPress();
          }
        },
        error: (title, message) => {
          console.error(`❌ ${title}: ${message}`);
        },
        confirm: (title, message, onConfirm, onCancel) => {
          console.log(`❓ ${title}: ${message}`);
          onConfirm();
        },
      };

      // Mock navigation
      const mockNavigation = {
        goBack: () => {
          console.log('📱 Navigation: Going back to previous screen');
        },
      };

      console.log('🔨 Creating test event...');

      // Submit the event using the real useEventForm hook
      await submitEvent({
        currentUserId,
        userData: user,
        formData: testFormData,
        dateTimeValues: testDateTimeValues,
        validateForm: mockValidateForm,
        validateDateTime: mockValidateDateTime,
        loadSuggestions: () => {}, // No-op
        resetForm: () => {}, // No-op
        resetDateTime: () => {}, // No-op
        navigation: mockNavigation,
        isEditing: false,
        eventId: null,
        selectedInvitations: {}, // No invitations for this test
        vibeAlert: mockVibeAlert,
        onSuccess: (invitationSummary) => {
          console.log('🎊 Event creation completed!');
          console.log('📊 Summary:', invitationSummary || 'Event created successfully');

          // Schedule manual test notification for comparison
          ScheduledNotificationCore.scheduleNotification({
            userId: currentUserId,
            type: 'event_reminder',
            title: '🧪 Manual Test Notification',
            message: 'This is a manually scheduled test notification for comparison with the automatic event reminder.',
            data: {
              type: 'event_reminder',
              screen: 'Home',
              isTest: true,
              testType: 'manual_comparison',
            },
            scheduledFor: notificationTime,
          }).then((scheduleId) => {
            console.log('📬 Manual test notification scheduled:', scheduleId);
          }).catch((error) => {
            console.error('❌ Failed to schedule manual test notification:', error);
          });
        },
      });

      Alert.alert(
        'Test Event Created! 🎉',
        `Created a real test event scheduled for ${eventTime.toLocaleTimeString()}.\n\nNotifications will be sent in ~${Math.round((notificationTime.getTime() - Date.now()) / 1000)} seconds.\n\nBoth automatic event reminders and manual test notifications will be triggered.\n\nClose the app now to test background notifications!`,
        [
          {
            text: 'Close App to Test Background',
            onPress: () => {
              console.log('📱 User should close app now for background notification testing');
            },
          },
        ]
      );

    } catch (error) {
      console.error('[NotificationTester] Test event creation failed:', error);
      Alert.alert(
        'Test Event Creation Failed',
        `Error: ${error.message}\n\nCheck console for details.`
      );
    } finally {
      setTestingType(null);
    }
  };

  /**
   * Create comprehensive test event with real notifications
   * Tests the complete notification pipeline end-to-end
   */
  const sendImmediateTestNotification = async () => {
    setTestingType('immediate_test');
    try {
      if (!currentUserId) {
        Alert.alert('Error', 'You must be logged in to send notifications.');
        return;
      }

      console.log('🚀 [ImmediateTest] Sending immediate FCM notification...');

      // Send immediate notification using the NotificationEngine
      const result = await NotificationEngine.sendNotificationToUser({
        userId: currentUserId,
        title: '🚀 Immediate Test Notification!',
        message: 'This notification was sent immediately - no waiting required!',
        data: {
          type: 'test_immediate',
          screen: 'Home',
          isTest: true,
        },
      });

      console.log('✅ [ImmediateTest] Notification sent:', result);

      Alert.alert(
        'Notification Sent!',
        'Check your notification tray right now - the notification should appear immediately!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[NotificationTester] Immediate test failed:', error);
      Alert.alert('Test Failed', `Error: ${error.message}`);
    } finally {
      setTestingType(null);
    }
  };

  const testInvitationNotification = async () => {
    setTestingType('invitation_test');
    try {
      if (!currentUserId) {
        Alert.alert('Error', 'You must be logged in to test invitations.');
        return;
      }

      console.log('💌 [InvitationTest] Testing invitation notification...');

      // Send test invitation notification to self
      const { notifyEventInvitation } = await import('../../../services/shared/invitationNotificationsService');

      const result = await notifyEventInvitation({
        guestId: currentUserId,
        inviterId: currentUserId,
        inviterName: user?.userdata?.contactInfo?.displayName || 'Test Host',
        eventId: 'test_event_invitation',
        eventTitle: 'Test Event - Invitation Notification',
        invitationId: `test_inv_${Date.now()}`,
      });

      console.log('✅ [InvitationTest] Invitation notification sent:', result);

      Alert.alert(
        'Invitation Notification Sent!',
        'Check your notifications - you should receive an event invitation!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[NotificationTester] Invitation test failed:', error);
      Alert.alert('Test Failed', `Error: ${error.message}`);
    } finally {
      setTestingType(null);
    }
  };

  const createComprehensiveTestEvent = async () => {
    setTestingType('comprehensive_test');
    try {
      if (!currentUserId) {
        Alert.alert('Error', 'You must be logged in to create test events.');
        return;
      }

      // For testing purposes, be more flexible with profile requirements
      const hostName = user?.userdata?.contactInfo?.displayName ||
                      user?.userdata?.contactInfo?.email ||
                      user?.email ||
                      `Test User ${currentUserId.substring(0, 6)}`;

      console.log('🎉 [ComprehensiveTest] Starting comprehensive test event creation...');

      // Event time: 16 minutes from now (meets 15 minute minimum requirement)
      const eventTime = new Date();
      eventTime.setMinutes(eventTime.getMinutes() + 16);

      // Notification time: 10 seconds from now (for quick testing!)
      const notificationTime = new Date();
      notificationTime.setSeconds(notificationTime.getSeconds() + 10);

      // Create test event form data (matches the working function structure)
      const testFormData = {
        title: 'Test Event - Notifications',
        location: 'Test Location',
        address: '123 Test Street, Test City, TC 12345',
        description: 'Comprehensive test event for notification pipeline validation. This event will test both foreground and background notification delivery.',
        isPrivate: false,
        maxGuests: 10,
        hasRsvpDeadline: false,
        contactInfo: '',
        entryFee: '',
        notificationSettings: {
          enabled: true,
          notifyOnJoin: true,
          notifyOnLeave: true,
          newComments: true,
          hostChanges: true,
          eventReminders: true,
          reminderTiming: '10seconds',
          dayBeforeReminder: false,
          hostComments: true,
          reminderTemplates: [
            {
              id: 'comprehensive_test_10sec',
              amount: 10,
              unit: 'seconds',
              enabled: true,
              label: '10 sec before (COMPREHENSIVE TEST)',
            }
          ],
        },
      };

      // Create date/time values object
      const testDateTimeValues = {
        event: {
          value: eventTime,
          selected: true,
        },
        rsvpDeadline: {
          value: null,
          selected: false,
        },
      };

      // Mock validation functions
      const mockValidateForm = () => ({ isValid: true, errors: {} });
      const mockValidateDateTime = () => ({ isValid: true, message: '' });

      // Mock VibeAlert for the submitEvent function
      const mockVibeAlert = {
        success: (title, message, actions) => {
          console.log(`✅ ${title}: ${message}`);
          if (actions && actions[0] && actions[0].onPress) {
            actions[0].onPress();
          }
        },
        error: (title, message) => {
          console.error(`❌ ${title}: ${message}`);
        },
        confirm: (title, message, onConfirm, onCancel) => {
          console.log(`❓ ${title}: ${message}`);
          onConfirm();
        },
      };

      // Mock navigation
      const mockNavigation = {
        goBack: () => {
          console.log('📱 Navigation: Going back to previous screen');
        },
      };

      console.log('🎉 [ComprehensiveTest] Creating event at:', eventTime.toLocaleString());
      console.log('🎉 [ComprehensiveTest] Notification scheduled for:', notificationTime.toLocaleString());

      console.log('🔨 Creating comprehensive test event...');

      // Submit the event using the correct parameter structure
      await submitEvent({
        currentUserId,
        userData: user,
        formData: testFormData,
        dateTimeValues: testDateTimeValues,
        validateForm: mockValidateForm,
        validateDateTime: mockValidateDateTime,
        loadSuggestions: () => {}, // No-op
        resetForm: () => {}, // No-op
        resetDateTime: () => {}, // No-op
        navigation: mockNavigation,
        isEditing: false,
        eventId: null,
        selectedInvitations: {}, // No invitations for this test
        vibeAlert: mockVibeAlert,
        onSuccess: (invitationSummary) => {
          console.log('🎊 Comprehensive test event creation completed!');
          console.log('📊 Summary:', invitationSummary || 'Event created successfully');

          // Schedule additional test notification using manual scheduling
          ScheduledNotificationCore.scheduleNotification({
            userId: currentUserId,
            type: 'event_reminder',
            title: 'COMPREHENSIVE TEST: Event Starting Soon! ⏰',
            message: `Your test event "${testFormData.title}" starts in 10 seconds! This tests the complete notification pipeline.`,
            data: {
              type: 'event_reminder',
              screen: 'EventDetail',
              isComprehensiveTest: true,
              testType: 'comprehensive',
            },
            scheduledFor: notificationTime,
            priority: 'high',
          }).then((scheduleId) => {
            console.log('🎉 [ComprehensiveTest] ✅ Manual notification scheduled:', scheduleId);
          }).catch((error) => {
            console.error('❌ Failed to schedule manual test notification:', error);
          });
        },
      });

      console.log('🎉 [ComprehensiveTest] ✅ Event creation process completed');

      Alert.alert(
        'Comprehensive Test Event Created! 🎉',
        `✅ Event: "${testFormData.title}"\n` +
        `⏰ Starts: ${eventTime.toLocaleTimeString()}\n` +
        `🔔 Notification: ${notificationTime.toLocaleTimeString()}\n\n` +
        `TESTING INSTRUCTIONS:\n` +
        `1. Close this app NOW for background testing\n` +
        `2. Wait ~4min 50sec for notification\n` +
        `3. Test both notification tray delivery\n` +
        `4. Open app to test foreground banners\n\n` +
        `This tests the COMPLETE notification pipeline!`,
        [
          {
            text: 'Close App Now for Background Test!',
            onPress: () => {
              console.log('🎉 [ComprehensiveTest] User should close app now for background testing');
            },
          },
        ]
      );

    } catch (error) {
      console.error('🎉 [ComprehensiveTest] ❌ Test failed:', error);
      Alert.alert(
        'Comprehensive Test Failed',
        `Error: ${error.message}\n\nCheck console for details.`
      );
    } finally {
      setTestingType(null);
    }
  };

  const notificationTypes = [
    { key: 'default', label: '🎊 General', color: theme.colors.vibeBlue },
    { key: 'event_reminder', label: '⏰ Event Reminder', color: '#FF6B35' },
    { key: 'event_updated', label: '📝 Event Updated', color: '#FF6B35' },
    { key: 'event_comment', label: '💬 Event Comment', color: '#FF6B35' },
    {
      key: 'invitation_received',
      label: '🎉 Invitation',
      color: theme.colors.vibeGreen,
    },
    { key: 'follow', label: '👥 New Follower', color: theme.colors.vibePink },
    {
      key: 'mutual_follow',
      label: '🤝 Now Friends',
      color: theme.colors.vibeGreen,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🔔 Push Notification Tester</Text>

      {permissionStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Permission Status:</Text>
          <Text
            style={[
              styles.statusText,
              {
                color: permissionStatus.granted
                  ? theme.colors.vibeGreen
                  : theme.colors.vibePink,
              },
            ]}
          >
            {permissionStatus.granted
              ? '✅ Granted'
              : `❌ ${permissionStatus.status}`}
          </Text>
        </View>
      )}

      {pushToken && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Push Token:</Text>
          <Text style={styles.tokenText}>{pushToken.substring(0, 30)}...</Text>
          <VibeButton
            label="📋 Copy Full Token for Firebase Console"
            onPress={copyTokenToClipboard}
            style={[styles.copyButton, { backgroundColor: theme.colors.vibeBlue }]}
          />
        </View>
      )}

      <VibeButton
        label="📝 Log FCM Token to Console"
        onPress={logTokenToConsole}
        style={[styles.testButton, { backgroundColor: theme.colors.vibeBlue }]}
      />

      <VibeButton
        label={testing ? 'Setting up...' : '🔧 Test Setup & Permissions'}
        onPress={testNotificationSetup}
        disabled={testing}
        style={[styles.testButton, { backgroundColor: theme.colors.vibeGreen }]}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Notification Types:</Text>

        {notificationTypes.map((type) => (
          <VibeButton
            key={type.key}
            label={testingType === type.key ? 'Sending...' : type.label}
            onPress={() => testSpecificNotification(type.key)}
            disabled={testingType === type.key}
            style={[styles.typeButton, { backgroundColor: type.color }]}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foreground Banner Testing:</Text>
        <Text style={styles.sectionNote}>
          Test notification banners that appear when app is in foreground
        </Text>

        <VibeButton
          label="🔔 Test Info Banner"
          onPress={() => testNotificationBanner('info')}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibeBlue }]}
        />

        <VibeButton
          label="✅ Test Success Banner"
          onPress={() => testNotificationBanner('success')}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibeGreen }]}
        />

        <VibeButton
          label="❌ Test Error Banner"
          onPress={() => testNotificationBanner('error')}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibeRed }]}
        />

        <VibeButton
          label="⚠️ Test Warning Banner"
          onPress={() => testNotificationBanner('warning')}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibeOrange }]}
        />

        <VibeButton
          label="📅 Test Event Reminder Banner"
          onPress={() => testNotificationBanner('event_reminder')}
          style={[styles.typeButton, { backgroundColor: '#FF6B35' }]}
        />

        <VibeButton
          label="👤 Test Follow Banner"
          onPress={() => testNotificationBanner('follow_notification')}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibePink }]}
        />

        <VibeButton
          label="🎉 Test Invitation Banner"
          onPress={() => testNotificationBanner('invitation_received')}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibePurple }]}
        />

        <VibeButton
          label="🚨 Test Admin Banner"
          onPress={() => testNotificationBanner('admin_notification')}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibeOrange }]}
        />

        <VibeButton
          label="🎊 Test All Banner Types"
          onPress={testAllNotificationTypes}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibeCyan }]}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scheduled Event Reminders:</Text>

        {pendingCount > 0 && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Pending Reminders:</Text>
            <Text
              style={[styles.statusText, { color: theme.colors.vibeGreen }]}
            >
              {pendingCount} scheduled
            </Text>
            {upcomingReminders.slice(0, 3).map((reminder, index) => (
              <Text key={index} style={styles.reminderText}>
                • {reminder.title} at{' '}
                {reminder.scheduledFor.toLocaleTimeString()}
              </Text>
            ))}
          </View>
        )}

        <VibeButton
          label={
            testingType === 'scheduled_reminder'
              ? 'Scheduling...'
              : '⏰ Test Scheduled Reminder (10 sec)'
          }
          onPress={testScheduledReminder}
          disabled={testingType === 'scheduled_reminder'}
          style={[styles.typeButton, { backgroundColor: '#FF6B35' }]}
        />

        <VibeButton
          label={
            testingType === 'quick_test'
              ? 'Sending...'
              : '📱 Test Background (Close App After)'
          }
          onPress={() => testSpecificNotification('quick_test')}
          disabled={testingType === 'quick_test'}
          style={[
            styles.typeButton,
            { backgroundColor: theme.colors.vibePink },
          ]}
        />

        <VibeButton
          label={
            testingType === 'process_pending'
              ? 'Processing...'
              : '🔄 Process Pending Notifications'
          }
          onPress={testProcessPending}
          disabled={testingType === 'process_pending'}
          style={[
            styles.typeButton,
            { backgroundColor: theme.colors.vibeGreen },
          ]}
        />

        <VibeButton
          label={
            testingType === 'real_notifications'
              ? 'Testing...'
              : '🧪 Test Real Notification Functions'
          }
          onPress={testRealNotifications}
          disabled={testingType === 'real_notifications'}
          style={[
            styles.typeButton,
            { backgroundColor: theme.colors.vibePink },
          ]}
        />

        <VibeButton
          label={
            testingType === 'test_event_creation'
              ? 'Creating Event...'
              : '🎉 Create Real Test Event (5min + Notifications)'
          }
          onPress={createTestEventWithNotifications}
          disabled={testingType === 'test_event_creation'}
          style={[
            styles.typeButton,
            { backgroundColor: theme.colors.vibeGreen },
          ]}
        />

        <VibeButton
          label={
            testingType === 'immediate_test'
              ? 'Sending...'
              : '⚡ IMMEDIATE TEST - Send Notification NOW!'
          }
          onPress={sendImmediateTestNotification}
          disabled={testingType === 'immediate_test'}
          style={[
            styles.typeButton,
            { backgroundColor: theme.colors.vibeGreen, borderColor: theme.colors.vibeYellow, borderWidth: 2 },
          ]}
        />

        <VibeButton
          label={
            testingType === 'invitation_test'
              ? 'Sending...'
              : '💌 INVITATION TEST - Event Invitation Notification'
          }
          onPress={testInvitationNotification}
          disabled={testingType === 'invitation_test'}
          style={[
            styles.typeButton,
            { backgroundColor: theme.colors.vibePink, borderColor: theme.colors.vibeBlue, borderWidth: 2 },
          ]}
        />

        <VibeButton
          label={
            testingType === 'comprehensive_test'
              ? 'Creating Comprehensive Test...'
              : '🚀 COMPREHENSIVE TEST - Real Event + 10sec Notifications'
          }
          onPress={createComprehensiveTestEvent}
          disabled={testingType === 'comprehensive_test'}
          style={[
            styles.typeButton,
            { backgroundColor: theme.colors.vibeBlue, borderColor: theme.colors.vibeGreen, borderWidth: 2 },
          ]}
        />
      </View>

      <Text style={styles.note}>
        🔧 Setup Test: Checks permissions, gets token, registers with your
        account
        {'\n\n'}
        📱 Notification Tests: Send different notification types with deep
        linking
        {'\n\n'}⏰ Scheduled Tests: Test automatic event reminders & background
        processing
        {'\n\n'}🎉 Real Event Test: Creates actual event with real scheduling (5min) and notification reminders (10sec before event). Tests complete notification flow.
        {'\n\n'}
        Tap notifications to test navigation to different screens!
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.3)',
    margin: 16,
  },
  title: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusTitle: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tokenText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  copyButton: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  reminderText: {
    color: theme.colors.gray,
    fontSize: 11,
    marginTop: 2,
  },
  testButton: {
    marginVertical: 16,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionNote: {
    color: theme.colors.gray,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  typeButton: {
    marginVertical: 8,
    paddingVertical: 12,
  },
  note: {
    color: theme.colors.gray,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 20,
  },
});
