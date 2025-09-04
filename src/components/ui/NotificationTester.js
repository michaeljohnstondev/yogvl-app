import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import VibeButton from './VibeButton';
import fcmService from '../../services/fcmService';
import { notifyNewFollower } from '../../services/notifications';
import { useAuth } from '../../auth/AuthContext';
import theme from '../../theme/themes';

export default function NotificationTester() {
  const [testing, setTesting] = useState(false);
  const [testingFollow, setTestingFollow] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [pushToken, setPushToken] = useState(null);
  const { currentUserId, user } = useAuth();

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

  const testFollowNotification = async () => {
    setTestingFollow(true);
    try {
      if (!currentUserId) {
        Alert.alert('Error', 'You must be logged in to test follow notifications.');
        return;
      }

      console.log('🔔 [NotificationTester] Testing follow notification to current user');
      console.log('🔔 [NotificationTester] Target user ID:', currentUserId);
      
      // Send a test follow notification to the current user (as if someone followed them)
      const result = await notifyNewFollower({
        targetUserId: currentUserId,
        followerId: 'test_user_' + Date.now(),
        followerName: 'Test User (Notification Test)'
      });

      console.log('🔔 [NotificationTester] Follow notification test result:', result);

      if (result.success) {
        Alert.alert(
          'Test Complete!',
          'Follow notification sent! Check if you received a push notification.',
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert(
          'Test Failed',
          `Follow notification failed: ${result.reason || 'Unknown error'}. Check console for details.`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('[NotificationTester] Follow notification test failed:', error);
      Alert.alert(
        'Test Failed', 
        `Error: ${error.message}. Check console for details.`
      );
    } finally {
      setTestingFollow(false);
    }
  };

  return (
    <View style={styles.container}>
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
        label={testing ? 'Testing...' : 'Test Push Notifications'}
        onPress={testNotificationSetup}
        disabled={testing}
        style={styles.testButton}
      />

      <VibeButton
        label={testingFollow ? 'Testing...' : 'Test Follow Notification'}
        onPress={testFollowNotification}
        disabled={testingFollow}
        style={[styles.testButton, { backgroundColor: theme.colors.vibePink }]}
      />

      <Text style={styles.note}>
        This will:
        {'\n'}• Check notification permissions
        {'\n'}• Get your push token  
        {'\n'}• Register token with your account
        {'\n'}• Send a test notification
      </Text>
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
  },
  testButton: {
    marginVertical: 16,
  },
  note: {
    color: theme.colors.gray,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});