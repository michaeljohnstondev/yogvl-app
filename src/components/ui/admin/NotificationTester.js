import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import VibeButton from './VibeButton';
import fcmService from '../../services/fcmServiceWrapper';
import { 
  notifyNewFollower, 
  notifyGuestInvitation,
  notifyCohostInvitation,
  notifyHostOfEventJoin
} from '../../services/notifications';
import { useAuth } from '../../auth/AuthContext';
import theme from '../../../theme/themes';
import { useScheduledNotifications } from '../../hooks/useScheduledNotifications';

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
    pendingCount 
  } = useScheduledNotifications();

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

      if (!token) {
        Alert.alert('Error', 'Failed to get push token. Are you on a physical device?');
        setTesting(false);
        return;
      }

      // Test 3: Register token for user
      if (currentUserId) {
        const registered = await fcmService.registerTokenForUser(currentUserId);
        console.log('📝 Token Registered:', registered);
        
        if (!registered) {
          Alert.alert('Error', 'Failed to register push token with user account.');
          setTesting(false);
          return;
        }
      }

      // Test 4: Send local notification
      await fcmService.sendLocalNotification(
        'Big Vibe Studios',
        'Test notification - your push notifications are working! 🎉',
        { type: 'test', timestamp: Date.now() }
      );

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
            screen: 'UserProfile'
          }
        },
        mutual_follow: {
          title: 'You\'re Now Friends! 🤝',
          body: 'You and TestUser123 are now following each other',
          data: { 
            type: 'mutual_follow', 
            userId: 'test_user_123',
            screen: 'UserProfile'
          }
        },
        event_reminder: {
          title: 'Event Starting Soon! ⏰',
          body: 'Your event "Test Party" starts in 15 minutes',
          data: { 
            type: 'event_reminder', 
            eventId: 'test_event_123',
            screen: 'EventDetail'
          }
        },
        event_updated: {
          title: 'Event Updated 📝',
          body: 'Host updated details for "Test Party"',
          data: { 
            type: 'event_updated', 
            eventId: 'test_event_123',
            screen: 'EventDetail'
          }
        },
        invitation_received: {
          title: 'Event Invitation! 🎉',
          body: 'You\'re invited to "Test Party" by TestHost',
          data: { 
            type: 'invitation_received', 
            eventId: 'test_event_123',
            screen: 'EventDetail'
          }
        },
        event_comment: {
          title: 'New Comment 💬',
          body: 'TestUser123 commented on "Test Party"',
          data: { 
            type: 'event_comment', 
            eventId: 'test_event_123',
            screen: 'EventDetail'
          }
        },
        default: {
          title: 'Big Vibe Studios 🎊',
          body: 'This is a general app notification test',
          data: { 
            type: 'general', 
            screen: 'Home'
          }
        },
        quick_test: {
          title: 'Background Test! 📱',
          body: 'Close the app now and this should appear in your notification tray',
          data: { 
            type: 'general', 
            screen: 'Home'
          }
        }
      };

      const notif = testNotifications[type];
      await fcmService.sendLocalNotification(notif.title, notif.body, notif.data);

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
        Alert.alert('Error', 'You must be logged in to test scheduled notifications.');
        return;
      }

      // Schedule a test reminder for 10 seconds from now
      const reminderTime = new Date();
      reminderTime.setSeconds(reminderTime.getSeconds() + 10);

      const scheduleId = await scheduleCustomNotification({
        userId: currentUserId,
        type: 'event_reminder',
        title: 'Test Event Reminder! ⏰',
        message: 'This scheduled reminder should appear in your notification tray!',
        data: { 
          type: 'event_reminder',
          eventId: 'test_event_123',
          screen: 'EventDetail',
          isTest: true
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
              console.log('[NotificationTester] User should close app now for best testing');
            }
          }
        ]
      );

    } catch (error) {
      console.error('[NotificationTester] Scheduled reminder test failed:', error);
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
        Alert.alert('Error', 'You must be logged in to test real notifications.');
        return;
      }

      console.log('\n🧪 === TESTING REAL NOTIFICATION FUNCTIONS ===\n');

      // Test follower notification
      console.log('🧪 Testing follower notification...');
      const followerResult = await notifyNewFollower({
        targetUserId: currentUserId,
        followerId: 'test_follower_123',
        followerName: 'Test Friend'
      });
      console.log('✅ Follower notification result:', followerResult);

      // Test guest invitation notification
      console.log('🧪 Testing guest invitation notification...');
      const guestResult = await notifyGuestInvitation({
        recipientId: currentUserId,
        inviterId: 'test_inviter_456',
        inviterName: 'Test Host',
        eventId: 'test_event_789',
        eventTitle: 'Test Party Event',
        invitationId: 'test_invitation_101'
      });
      console.log('✅ Guest invitation result:', guestResult);

      // Test cohost invitation notification
      console.log('🧪 Testing cohost invitation notification...');
      const cohostResult = await notifyCohostInvitation({
        recipientId: currentUserId,
        inviterId: 'test_inviter_456',
        inviterName: 'Test Host',
        eventId: 'test_event_789',
        eventTitle: 'Test Party Event',
        invitationId: 'test_cohost_102'
      });
      console.log('✅ Cohost invitation result:', cohostResult);

      const successCount = [followerResult, guestResult, cohostResult]
        .filter(r => r.success).length;

      Alert.alert(
        'Real Notification Test Complete!',
        `Sent ${successCount}/3 notifications successfully. Check your notifications and console for details.`,
        [{ text: 'Great!' }]
      );

    } catch (error) {
      console.error('[NotificationTester] Real notification test failed:', error);
      Alert.alert('Test Failed', `Error: ${error.message}`);
    } finally {
      setTestingType(null);
    }
  };

  const notificationTypes = [
    { key: 'default', label: '🎊 General', color: theme.colors.vibeBlue },
    { key: 'event_reminder', label: '⏰ Event Reminder', color: '#FF6B35' },
    { key: 'event_updated', label: '📝 Event Updated', color: '#FF6B35' },
    { key: 'event_comment', label: '💬 Event Comment', color: '#FF6B35' },
    { key: 'invitation_received', label: '🎉 Invitation', color: theme.colors.vibeGreen },
    { key: 'follow', label: '👥 New Follower', color: theme.colors.vibePink },
    { key: 'mutual_follow', label: '🤝 Now Friends', color: theme.colors.vibeGreen },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🔔 Push Notification Tester</Text>
      
      {permissionStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Permission Status:</Text>
          <Text style={[styles.statusText, { color: permissionStatus.granted ? theme.colors.vibeGreen : theme.colors.vibePink }]}>
            {permissionStatus.granted ? '✅ Granted' : `❌ ${permissionStatus.status}`}
          </Text>
        </View>
      )}

      {pushToken && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Push Token:</Text>
          <Text style={styles.tokenText}>
            {pushToken.substring(0, 30)}...
          </Text>
        </View>
      )}

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
            style={[
              styles.typeButton, 
              { backgroundColor: type.color }
            ]}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scheduled Event Reminders:</Text>
        
        {pendingCount > 0 && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Pending Reminders:</Text>
            <Text style={[styles.statusText, { color: theme.colors.vibeGreen }]}>
              {pendingCount} scheduled
            </Text>
            {upcomingReminders.slice(0, 3).map((reminder, index) => (
              <Text key={index} style={styles.reminderText}>
                • {reminder.title} at {reminder.scheduledFor.toLocaleTimeString()}
              </Text>
            ))}
          </View>
        )}

        <VibeButton
          label={testingType === 'scheduled_reminder' ? 'Scheduling...' : '⏰ Test Scheduled Reminder (10 sec)'}
          onPress={testScheduledReminder}
          disabled={testingType === 'scheduled_reminder'}
          style={[styles.typeButton, { backgroundColor: '#FF6B35' }]}
        />

        <VibeButton
          label={testingType === 'quick_test' ? 'Sending...' : '📱 Test Background (Close App After)'}
          onPress={() => testSpecificNotification('quick_test')}
          disabled={testingType === 'quick_test'}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibePink }]}
        />

        <VibeButton
          label={testingType === 'process_pending' ? 'Processing...' : '🔄 Process Pending Notifications'}
          onPress={testProcessPending}
          disabled={testingType === 'process_pending'}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibeGreen }]}
        />

        <VibeButton
          label={testingType === 'real_notifications' ? 'Testing...' : '🧪 Test Real Notification Functions'}
          onPress={testRealNotifications}
          disabled={testingType === 'real_notifications'}
          style={[styles.typeButton, { backgroundColor: theme.colors.vibePink }]}
        />
      </View>

      <Text style={styles.note}>
        🔧 Setup Test: Checks permissions, gets token, registers with your account
        {'\n\n'}
        📱 Notification Tests: Send different notification types with deep linking
        {'\n\n'}
        ⏰ Scheduled Tests: Test automatic event reminders & background processing
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