import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Clipboard } from 'react-native';
import VibeButton from '../base/VibeButton';
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
import { followUser } from '../../../services/followService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';

export default function NotificationTester() {
  const [testing, setTesting] = useState(false);
  const [testingType, setTestingType] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [pushToken, setPushToken] = useState(null);
  const [generatingClaude, setGeneratingClaude] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [followingClaude, setFollowingClaude] = useState(false);
  const { currentUserId, user } = useAuth();
  const {
    processPendingNotifications,
    userScheduledNotifications,
    scheduleCustomNotification,
    upcomingReminders,
    pendingCount,
  } = useScheduledNotifications();
  const { submitEvent } = useEventForm();

  const generateClaudeUser = async () => {
    setGeneratingClaude(true);
    try {
      const { setDoc, doc } = await import('../../../lib/firebase');
      const { db } = await import('../../../auth/services/firebase');

      const claudeUserId = 'claude_ai_test_user';
      const studioId = 'greenville_sc';

      console.log('🤖 [GenerateClaude] Creating Claude test user...');

      // Create complete user document following DATABASE.md schema
      const claudeUserData = {
        email: 'claude@anthropic.com',
        phoneNumber: '+15552528233',
        userdata: {
          contactInfo: {
            displayName: 'Claude Assistant',
            firstName: 'Claude',
            lastName: 'Assistant',
            email: 'claude@anthropic.com',
            phone: '+15552528233',
            phoneNumber: '+15552528233',
            profilePicture: '' // No profile picture for now
          },
          bio: "AI assistant by Anthropic. Here to help test your Greenville events and make them epic! 🤖✨",
          location: {
            city: 'Greenville',
            state: 'SC',
            country: 'USA'
          },
          interests: ['Technology', 'AI', 'Coding', 'Music', 'Events', 'Community Building'],
          followerCount: 0,
          lastUpdated: new Date(),
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          },
          metrics: {
            engagement: {},
            events: {},
            social: {}
          },
          settings: {
            accessibility: {},
            display: {},
            preferences: {},
            notifications: {
              app: {
                pushNotifications: true,
                newFollowers: true,
                eventInvitations: true,
                suggestedEvents: true
              },
              hosting: {
                enabled: true,
                hostComments: true,
                newComments: true,
                notifyOnJoin: true,
                notifyOnLeave: true,
                eventRecap: true,
                reminderTemplates: {
                  '15m': true,
                  '30m': true,
                  '1h': true,
                  '2h': false,
                  '1d': false,
                  '1w': false
                }
              },
              attending: {
                enabled: true,
                hostChanges: true,
                hostComments: true,
                newComments: true,
                reminderTemplates: {
                  '15m': true,
                  '30m': true,
                  '1h': true,
                  '2h': false,
                  '1d': false,
                  '1w': false
                }
              }
            },
            privacy: {
              emailVisibility: 'friends',
              phoneVisibility: 'never'
            }
          },
          studios: {
            default: {
              studioId: studioId
            }
          }
        }
      };

      // Create user document
      await setDoc(doc(db, 'users', claudeUserId), claudeUserData);
      console.log('✅ [GenerateClaude] User document created');

      // Add Claude to Greenville studio
      const { arrayUnion, updateDoc, getDoc } = await import('../../../lib/firebase');
      const studioRef = doc(db, 'studios', studioId);
      const studioSnap = await getDoc(studioRef);

      if (studioSnap.exists()) {
        await updateDoc(studioRef, {
          users: arrayUnion(claudeUserId)
        });
        console.log('✅ [GenerateClaude] Added to Greenville studio');
      } else {
        console.warn('[GenerateClaude] Greenville studio not found, user created but not added to studio');
      }

      Alert.alert(
        'Claude Generated! 🤖',
        `Test user "Claude Assistant" created successfully!\n\nUser ID: ${claudeUserId}\nStudio: Greenville, SC\n\nYou can now use this user for testing notifications, follows, and invitations!`,
        [{ text: 'Great!' }]
      );

    } catch (error) {
      console.error('[GenerateClaude] Failed to create Claude user:', error);
      Alert.alert('Error', `Failed to create Claude user: ${error.message}`);
    } finally {
      setGeneratingClaude(false);
    }
  };

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

  const handleClaudeFollowMe = async () => {
    const CLAUDE_USER_ID = 'claude_ai_test_user';
    setFollowingClaude(true);
    try {
      // Claude follows me (so I get the notification)
      const claudeUserDoc = await getDoc(doc(db, 'users', CLAUDE_USER_ID));
      if (!claudeUserDoc.exists()) {
        throw new Error('Claude user not found. Generate Claude first!');
      }
      const claudeUserData = claudeUserDoc.data();

      await followUser(CLAUDE_USER_ID, currentUserId, claudeUserData, user);
      Alert.alert('Success! 🔔', 'Claude is now following you! Check your notifications to test the follow notification system.');
    } catch (error) {
      console.error('Error with Claude follow:', error);
      Alert.alert('Error', `Failed: ${error.message}`);
    } finally {
      setFollowingClaude(false);
    }
  };

  const createClaudeTestEvent = async () => {
    setCreatingEvent(true);
    try {
      if (!currentUserId || !user) {
        Alert.alert('Error', 'You must be logged in to create events');
        return;
      }

      const { setDoc, doc } = await import('../../../lib/firebase');
      const { db } = await import('../../../auth/services/firebase');

      const claudeUserId = 'claude_ai_test_user';

      // Random time between 1 hour and 7 days from now
      const minHours = 1;
      const maxHours = 168; // 7 days
      const randomHours = Math.floor(Math.random() * (maxHours - minHours + 1)) + minHours;

      const eventTime = new Date();
      eventTime.setHours(eventTime.getHours() + randomHours);

      const eventId = `claude_test_event_${Date.now()}`;
      const studioId = 'greenville_sc';

      console.log(`🎉 [CreateClaudeEvent] Creating event at ${eventTime.toLocaleString()}`);

      const eventData = {
        title: '🤖 Claude Test Music Event',
        description: 'Automated test event created by Claude for testing purposes. Feel free to join, comment, or use this for notification testing! Great music and community vibes!',
        location: 'The Velo Fellow',
        address: '1 N Main St, Greenville, SC 29601',
        eventTimestamp: eventTime,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: claudeUserId,
        hostName: 'Claude Assistant',
        studioId: studioId,
        isPrivate: false,
        maxGuests: 50,
        hasRsvpDeadline: false,
        subscribers: [claudeUserId],
        subscriberCount: 1,
        invitations: [], // Will be added by sendCohostInvitation below
        cohosts: [],
        notificationSettings: {
          enabled: true,
          notifyOnJoin: true,
          notifyOnLeave: true,
          newComments: true,
          hostChanges: true,
          eventReminders: true,
          reminderTiming: '15m',
          hostComments: true
        },
        status: 'active'
      };

      // Create event document (with currentUserId in invitations to prevent interest notification)
      await setDoc(doc(db, 'studios', studioId, 'events', eventId), eventData);
      console.log('✅ [CreateClaudeEvent] Event created successfully');

      // Import and send cohost invitation to current user
      console.log('📨 [CreateClaudeEvent] Sending cohost invitation to current user:', currentUserId);
      try {
        const { sendCohostInvitation } = await import('../../../services/shared/cohostInvitationsService');

        // Get Claude's user data
        const claudeUserDoc = await getDoc(doc(db, 'users', claudeUserId));
        const claudeUserData = claudeUserDoc.exists() ? claudeUserDoc.data() : null;

        await sendCohostInvitation(
          claudeUserId,        // inviterId (Claude)
          currentUserId,       // recipientId (You)
          eventId,             // eventId
          claudeUserData,      // inviterData
          eventData,           // eventData
          studioId             // studioId
        );

        console.log('✅ [CreateClaudeEvent] Cohost invitation sent successfully to:', currentUserId);

        Alert.alert(
          'Claude Test Event Created! 🎉',
          `Event created successfully!\n\nEvent ID: ${eventId}\nTime: ${eventTime.toLocaleString()}\n(${randomHours} hours from now)\n\nLocation: The Velo Fellow, Greenville\n\n🎯 You've been invited as a cohost!\nCheck your notifications to accept!`,
          [{ text: 'Great!' }]
        );
      } catch (inviteError) {
        console.error('❌ [CreateClaudeEvent] Failed to send cohost invitation:', inviteError);
        Alert.alert(
          'Event Created (Invite Failed)',
          `Event created but cohost invitation failed!\n\nEvent ID: ${eventId}\nError: ${inviteError.message}\n\nCheck console for details.`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('[CreateClaudeEvent] Failed to create event:', error);
      Alert.alert('Error', `Failed to create event: ${error.message}`);
    } finally {
      setCreatingEvent(false);
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
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Admin Testing Tools</Text>

      <VibeButton
        label="📝 Log FCM Token to Console"
        onPress={logTokenToConsole}
        style={[styles.testButton, { backgroundColor: theme.colors.vibeBlue }]}
      />

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
        label={generatingClaude ? 'Generating Claude...' : '🤖 Generate Claude'}
        onPress={generateClaudeUser}
        disabled={generatingClaude}
        style={[styles.testButton, { backgroundColor: theme.colors.vibeGreen }]}
      />

      <VibeButton
        label={creatingEvent ? 'Creating Event...' : '🎉 Create Claude Test Event'}
        onPress={createClaudeTestEvent}
        disabled={creatingEvent}
        style={[styles.testButton, { backgroundColor: theme.colors.vibePink }]}
      />

      <VibeButton
        label={followingClaude ? 'Processing...' : '👥 Claude Follow Me'}
        onPress={handleClaudeFollowMe}
        disabled={followingClaude}
        style={[styles.testButton, { backgroundColor: theme.colors.vibeOrange }]}
      />
    </View>
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
