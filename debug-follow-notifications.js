// Debug script to test follow notifications manually
// Run this in Firebase Console or as a script

const admin = require('firebase-admin');

// Test function to check if follow notification system works
async function testFollowNotification(userId, followerId) {
  try {
    console.log(`Testing follow notification: ${followerId} follows ${userId}`);

    // 1. Check if user exists and has FCM token
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      console.error(`❌ User ${userId} not found`);
      return;
    }

    const userData = userDoc.data();
    const fcmToken = userData?.deviceInfo?.fcmToken;

    console.log(`FCM Token exists: ${!!fcmToken}`);
    console.log(`Notifications enabled: ${userData?.userdata?.settings?.notifications?.app?.newFollowers}`);

    // 2. Check if follower exists
    const followerDoc = await admin.firestore().doc(`users/${followerId}`).get();
    if (!followerDoc.exists) {
      console.error(`❌ Follower ${followerId} not found`);
      return;
    }

    const followerData = followerDoc.data();
    const followerName = followerData?.userdata?.contactInfo?.displayName || 'Someone';

    console.log(`Follower name: ${followerName}`);

    // 3. Manually create follower document to trigger Cloud Function
    await admin.firestore().doc(`users/${userId}/followers/${followerId}`).set({
      id: followerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      firstName: followerData?.userdata?.contactInfo?.firstName || 'Test',
      lastName: followerData?.userdata?.contactInfo?.lastName || 'User',
      profilePicture: followerData?.userdata?.contactInfo?.profilePicture || null,
    });

    console.log(`✅ Created follower document - Cloud Function should trigger`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Example usage:
// testFollowNotification('TARGET_USER_ID', 'FOLLOWER_USER_ID');