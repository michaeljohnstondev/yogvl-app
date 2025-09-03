// Test script to send push notifications to your app
// Run with: node scripts/testNotification.js

const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

async function sendTestNotification() {
  // Replace this with the actual Expo push token from your device
  const expoPushToken = 'ExponentPushToken[YOUR_DEVICE_TOKEN_HERE]';
  
  // Check that all your push tokens appear to be valid Expo push tokens
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.error(`Push token ${expoPushToken} is not a valid Expo push token`);
    return;
  }

  // Test notifications to send
  const messages = [
    {
      to: expoPushToken,
      sound: 'default',
      title: 'Big Vibe Studios',
      body: '🎉 Push notifications are working!',
      data: { 
        type: 'test',
        screen: 'HomeScreen'
      },
      channelId: 'default',
    },
    {
      to: expoPushToken,
      sound: 'default',
      title: 'Event Reminder',
      body: 'Your event "Studio Session" starts in 30 minutes',
      data: { 
        type: 'event_reminder',
        eventId: 'test-event-123'
      },
      channelId: 'event-reminders',
    },
    {
      to: expoPushToken,
      sound: 'default',
      title: 'New Follower',
      body: 'John Doe started following you',
      data: { 
        type: 'follow_notification',
        userId: 'test-user-456'
      },
      channelId: 'social',
    }
  ];

  try {
    console.log('Sending test notifications...');
    
    // Send all notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Sent chunk:', ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }
    
    console.log('All notifications sent!');
    console.log('Tickets:', tickets);
    
    // Check receipts after a delay
    setTimeout(async () => {
      await checkReceipts(tickets);
    }, 5000);
    
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

async function checkReceipts(tickets) {
  console.log('\nChecking receipts...');
  
  const receiptIds = [];
  for (let ticket of tickets) {
    if (ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  
  for (let chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      console.log('Receipts:', receipts);

      // Check for errors
      for (let receiptId in receipts) {
        const { status, message, details } = receipts[receiptId];
        if (status === 'ok') {
          console.log(`✅ Notification ${receiptId} delivered successfully`);
        } else if (status === 'error') {
          console.error(`❌ Error delivering notification ${receiptId}:`, message);
          if (details && details.error) {
            console.error('Error details:', details.error);
          }
        }
      }
    } catch (error) {
      console.error('Error getting receipts:', error);
    }
  }
}

// Instructions
console.log(`
🚀 Push Notification Test Script

Instructions:
1. Build and install your APK on an Android device
2. Open the app and allow notification permissions
3. Find your Expo push token in the app logs or Firebase console
4. Replace 'YOUR_DEVICE_TOKEN_HERE' with your actual token
5. Run: npm install expo-server-sdk
6. Run: node scripts/testNotification.js

Note: Make sure your app is closed or in background to see notifications
`);

if (process.argv[2]) {
  // If token provided as argument
  const token = process.argv[2];
  if (Expo.isExpoPushToken(token)) {
    console.log('Valid token provided, sending test notification...');
    sendTestNotification();
  } else {
    console.error('Invalid Expo push token provided');
  }
} else {
  console.log('Provide your Expo push token as an argument to send test notifications');
  console.log('Example: node scripts/testNotification.js ExponentPushToken[YOUR_TOKEN_HERE]');
}