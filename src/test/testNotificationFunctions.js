// Test script to verify notification functions work
// Run this manually to test each notification type

import {
  notifyNewFollower,
  notifyGuestInvitation,
  notifyCohostInvitation,
  notifyHostOfEventJoin,
  notifyHostOfEventLeave,
  notifyFriendRequest,
  notifyFriendAccepted
} from '../services/notifications';

// Mock test data
const testData = {
  userId: 'test_user_123',
  followerId: 'test_follower_456',
  eventId: 'test_event_789',
  eventTitle: 'Test Party Event',
  invitationId: 'test_invite_101',
};

export const testNotificationFunctions = async () => {
  console.log('\n🧪 === NOTIFICATION FUNCTION TESTS ===\n');
  
  const tests = [
    {
      name: 'Follow Notification',
      test: () => notifyNewFollower({
        targetUserId: testData.userId,
        followerId: testData.followerId,
        followerName: 'Test Follower'
      })
    },
    {
      name: 'Guest Invitation Notification',
      test: () => notifyGuestInvitation({
        recipientId: testData.userId,
        inviterId: testData.followerId,
        inviterName: 'Test Inviter',
        eventId: testData.eventId,
        eventTitle: testData.eventTitle,
        invitationId: testData.invitationId
      })
    },
    {
      name: 'Cohost Invitation Notification', 
      test: () => notifyCohostInvitation({
        recipientId: testData.userId,
        inviterId: testData.followerId,
        inviterName: 'Test Host',
        eventId: testData.eventId,
        eventTitle: testData.eventTitle,
        invitationId: testData.invitationId
      })
    },
    {
      name: 'Event Join Notification',
      test: () => notifyHostOfEventJoin({
        eventId: testData.eventId,
        eventTitle: testData.eventTitle,
        hostId: testData.userId,
        joinedUserId: testData.followerId,
        joinedUserName: 'Test Joiner'
      })
    },
    {
      name: 'Event Leave Notification',
      test: () => notifyHostOfEventLeave({
        eventId: testData.eventId,
        eventTitle: testData.eventTitle,
        hostId: testData.userId,
        leftUserId: testData.followerId,
        leftUserName: 'Test Leaver'
      })
    }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      const result = await test();
      console.log(`✅ ${name}: SUCCESS`);
      console.log(`   Result:`, result);
      results.push({ name, success: true, result });
    } catch (error) {
      console.error(`❌ ${name}: FAILED`);
      console.error(`   Error:`, error.message);
      results.push({ name, success: false, error: error.message });
    }
  }
  
  console.log('\n📊 === TEST SUMMARY ===');
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Passed: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successCount}/${results.length}`);
  
  results.forEach(({ name, success, error }) => {
    if (!success) {
      console.log(`❌ ${name}: ${error}`);
    }
  });
  
  return results;
};

// Test user preferences loading
export const testUserNotificationPreferences = async (userId) => {
  try {
    console.log(`\n🔍 Testing user preferences for ${userId}`);
    
    // Import FCM service to test preferences
    const { fcmService } = await import('../services/fcmServiceWrapper');
    const preferences = await fcmService.getUserNotificationPreferences(userId);
    
    console.log('📋 User notification preferences:');
    console.log(JSON.stringify(preferences, null, 2));
    
    // Check if push notifications are enabled
    const pushEnabled = preferences?.app?.pushNotifications !== false;
    console.log(`📱 Push notifications enabled: ${pushEnabled ? '✅ YES' : '❌ NO'}`);
    
    return preferences;
  } catch (error) {
    console.error('❌ Failed to get user preferences:', error);
    return null;
  }
};

// Test push token registration
export const testPushTokenRegistration = async (userId) => {
  try {
    console.log(`\n🎫 Testing push token for user ${userId}`);
    
    const { fcmService } = await import('../services/fcmServiceWrapper');
    
    // Check current token
    const currentToken = fcmService.getCurrentToken();
    console.log(`🎫 Current token: ${currentToken ? currentToken.substring(0, 30) + '...' : 'NONE'}`);
    
    // Get new token
    const token = await fcmService.getExpoPushToken();
    console.log(`🎫 Fresh token: ${token ? token.substring(0, 30) + '...' : 'FAILED'}`);
    
    // Test registration
    if (token) {
      const registered = await fcmService.registerTokenForUser(userId);
      console.log(`📝 Token registration: ${registered ? '✅ SUCCESS' : '❌ FAILED'}`);
      return { token, registered };
    }
    
    return { token: null, registered: false };
  } catch (error) {
    console.error('❌ Push token test failed:', error);
    return { token: null, registered: false, error: error.message };
  }
};

console.log('📋 Notification test functions loaded. Use:');
console.log('   testNotificationFunctions()');
console.log('   testUserNotificationPreferences(userId)'); 
console.log('   testPushTokenRegistration(userId)');