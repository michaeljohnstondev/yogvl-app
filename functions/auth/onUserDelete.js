/**
 * FIREBASE AUTH USER DELETION TRIGGER
 *
 * Automatically cleans up all user data when Firebase Auth account is deleted
 * This ensures complete cleanup regardless of how the account was deleted
 *
 * TRIGGERS: When user deletes account via Firebase Auth
 *
 * CLEANUP ACTIONS:
 * 1. Remove from studio members (decrement memberCount)
 * 2. Clean up social relationships (both directions + metrics)
 *    - Delete user's followers/following subcollections
 *    - Remove from other users' followers/following subcollections
 *    - Decrement follower/following counts for affected users
 *    - Delete user's friends subcollection
 *    - Remove from other users' friends subcollections
 *    - Delete user's friend requests subcollection
 * 3. Delete user's created events AND related data
 *    - Delete all event messages/comments
 *    - Delete the event documents
 *    - Delete ALL users' scheduled notifications for those events
 * 4. Remove from event subscriptions (subscribers, cohosts, invitations)
 * 5. Clean up user's own scheduled notifications
 * 6. Remove from other users' favorites
 * 7. Remove from other users' invite groups
 * 8. Delete Firestore user document
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;
  console.log(`[AuthDeletion] 🗑️  User authentication deleted: ${userId}`);
  console.log(`[AuthDeletion] Email: ${user.email || 'N/A'}`);

  const db = admin.firestore();
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_LIMIT = 400; // Firestore batch limit is 500, use 400 for safety

  const commitBatchIfNeeded = async () => {
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      console.log(`[AuthDeletion] Committed batch of ${batchCount} operations`);
      batch = db.batch();
      batchCount = 0;
    }
  };

  try {
    // Get user document to find their studio
    const userRef = db.doc(`users/${userId}`);
    const userDoc = await userRef.get();

    let userStudio = null;
    if (userDoc.exists) {
      const userData = userDoc.data();
      userStudio = userData?.userdata?.studios?.default?.studioId;
      console.log(`[AuthDeletion] User studio: ${userStudio || 'None'}`);
    }

    // 1. Remove from studio members
    if (userStudio) {
      const studioRef = db.doc(`studios/${userStudio}`);
      batch.update(studioRef, {
        members: FieldValue.arrayRemove(userId),
        memberCount: FieldValue.increment(-1)
      });
      batchCount++;
      console.log(`[AuthDeletion] Removing user from studio ${userStudio}`);
    }

    // 2. Clean up follow relationships (BOTH DIRECTIONS)
    console.log('[AuthDeletion] Cleaning up follow relationships...');

    // Get users this user was following
    const followingRef = db.collection(`users/${userId}/following`);
    const followingSnap = await followingRef.get();
    console.log(`[AuthDeletion] Found ${followingSnap.docs.length} following relationships`);

    // For each user this user was following
    for (const followDoc of followingSnap.docs) {
      const targetUserId = followDoc.id;

      // Delete this user's following relationship
      batch.delete(followDoc.ref);
      batchCount++;
      await commitBatchIfNeeded();

      // Delete the reverse follower relationship from the target user
      const reverseFollowerRef = db.doc(`users/${targetUserId}/followers/${userId}`);
      batch.delete(reverseFollowerRef);
      batchCount++;
      await commitBatchIfNeeded();

      // Decrement the target user's follower count
      const targetUserRef = db.doc(`users/${targetUserId}`);
      batch.update(targetUserRef, {
        'userdata.metrics.social.followersCount': FieldValue.increment(-1)
      });
      batchCount++;
      await commitBatchIfNeeded();

      console.log(`[AuthDeletion] Cleaned up following relationship with ${targetUserId}`);
    }

    // Get users following this user
    const followersRef = db.collection(`users/${userId}/followers`);
    const followersSnap = await followersRef.get();
    console.log(`[AuthDeletion] Found ${followersSnap.docs.length} follower relationships`);

    // For each user following this user
    for (const followDoc of followersSnap.docs) {
      const followerUserId = followDoc.id;

      // Delete this user's follower relationship
      batch.delete(followDoc.ref);
      batchCount++;
      await commitBatchIfNeeded();

      // Delete the reverse following relationship from the follower
      const reverseFollowingRef = db.doc(`users/${followerUserId}/following/${userId}`);
      batch.delete(reverseFollowingRef);
      batchCount++;
      await commitBatchIfNeeded();

      // Decrement the follower's following count
      const followerUserRef = db.doc(`users/${followerUserId}`);
      batch.update(followerUserRef, {
        'userdata.metrics.social.followingCount': FieldValue.increment(-1)
      });
      batchCount++;
      await commitBatchIfNeeded();

      console.log(`[AuthDeletion] Cleaned up follower relationship with ${followerUserId}`);
    }

    // 2b. Clean up friends relationships (mutual friends subcollections)
    console.log('[AuthDeletion] Cleaning up friends relationships...');

    const friendsRef = db.collection(`users/${userId}/friends`);
    const friendsSnap = await friendsRef.get();
    console.log(`[AuthDeletion] Found ${friendsSnap.docs.length} friends`);

    // For each friend, remove this user from their friends subcollection
    for (const friendDoc of friendsSnap.docs) {
      const friendUserId = friendDoc.id;

      // Delete this user's friend relationship
      batch.delete(friendDoc.ref);
      batchCount++;
      await commitBatchIfNeeded();

      // Delete the reverse friend relationship
      const reverseFriendRef = db.doc(`users/${friendUserId}/friends/${userId}`);
      batch.delete(reverseFriendRef);
      batchCount++;
      await commitBatchIfNeeded();

      console.log(`[AuthDeletion] Cleaned up friend relationship with ${friendUserId}`);
    }

    // 2c. Clean up friend requests (subcollection under user)
    console.log('[AuthDeletion] Cleaning up friend requests...');

    const friendRequestsRef = db.collection(`users/${userId}/friendRequests`);
    const friendRequestsSnap = await friendRequestsRef.get();
    console.log(`[AuthDeletion] Found ${friendRequestsSnap.docs.length} friend requests`);

    friendRequestsSnap.docs.forEach((requestDoc) => {
      batch.delete(requestDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // 3. Delete user's created events AND cleanup related data
    if (userStudio) {
      console.log('[AuthDeletion] Deleting user-created events...');
      const createdEventsQuery = db.collection(`studios/${userStudio}/events`)
        .where('createdBy', '==', userId);
      const createdEventsSnap = await createdEventsQuery.get();

      console.log(`[AuthDeletion] Found ${createdEventsSnap.docs.length} events created by user`);

      // Track event IDs for notification cleanup
      const deletedEventIds = [];

      for (const eventDoc of createdEventsSnap.docs) {
        deletedEventIds.push(eventDoc.id);

        // Delete all messages/comments in the event's message board
        const messagesRef = db.collection(`studios/${userStudio}/events/${eventDoc.id}/messages`);
        const messagesSnap = await messagesRef.get();

        console.log(`[AuthDeletion] Deleting ${messagesSnap.docs.length} messages from event ${eventDoc.id}`);

        for (const messageDoc of messagesSnap.docs) {
          batch.delete(messageDoc.ref);
          batchCount++;
          await commitBatchIfNeeded();
        }

        // Delete the event document
        batch.delete(eventDoc.ref);
        batchCount++;
        await commitBatchIfNeeded();
      }

      // Delete all scheduled notifications for the deleted events (ALL USERS)
      if (deletedEventIds.length > 0) {
        console.log(`[AuthDeletion] Cleaning up scheduled notifications for ${deletedEventIds.length} deleted events...`);

        // Firestore 'in' query limit is 10 items, so batch the event IDs
        for (let i = 0; i < deletedEventIds.length; i += 10) {
          const eventBatch = deletedEventIds.slice(i, i + 10);
          const eventNotificationsQuery = db.collection('scheduledNotifications')
            .where('eventId', 'in', eventBatch);
          const eventNotificationsSnap = await eventNotificationsQuery.get();

          console.log(`[AuthDeletion] Found ${eventNotificationsSnap.docs.length} notifications for event batch ${i / 10 + 1}`);

          eventNotificationsSnap.docs.forEach((notificationDoc) => {
            batch.delete(notificationDoc.ref);
            batchCount++;
          });
          await commitBatchIfNeeded();
        }
      }
    }

    // 4. Remove from event subscriptions
    if (userStudio) {
      console.log('[AuthDeletion] Removing from event subscriptions...');
      const allEventsQuery = db.collection(`studios/${userStudio}/events`);
      const allEventsSnap = await allEventsQuery.get();

      for (const eventDoc of allEventsSnap.docs) {
        const eventData = eventDoc.data();

        // Remove from subscribers array
        if (eventData.subscribers?.includes(userId)) {
          batch.update(eventDoc.ref, {
            subscribers: FieldValue.arrayRemove(userId),
            subscriberCount: FieldValue.increment(-1)
          });
          batchCount++;
          await commitBatchIfNeeded();
        }

        // Remove from cohosts array
        if (eventData.cohosts?.includes(userId)) {
          batch.update(eventDoc.ref, {
            cohosts: FieldValue.arrayRemove(userId)
          });
          batchCount++;
          await commitBatchIfNeeded();
        }
      }
    }

    // 5. Clean up scheduled notifications for this user
    console.log('[AuthDeletion] Cleaning up scheduled notifications...');
    const scheduledNotificationsQuery = db.collection('scheduledNotifications')
      .where('userId', '==', userId);
    const scheduledNotificationsSnap = await scheduledNotificationsQuery.get();

    console.log(`[AuthDeletion] Found ${scheduledNotificationsSnap.docs.length} scheduled notifications`);

    scheduledNotificationsSnap.docs.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // 6. Remove from other users' favorites
    console.log('[AuthDeletion] Cleaning up favorites...');
    const allUsersSnap = await db.collection('users').get();

    for (const otherUserDoc of allUsersSnap.docs) {
      if (otherUserDoc.id === userId) continue; // Skip deleted user

      // Check if this user has deleted user in favorites
      const favoriteRef = db.doc(`users/${otherUserDoc.id}/favorites/${userId}`);
      const favoriteDoc = await favoriteRef.get();

      if (favoriteDoc.exists) {
        batch.delete(favoriteRef);
        batchCount++;
        await commitBatchIfNeeded();
        console.log(`[AuthDeletion] Removed from ${otherUserDoc.id}'s favorites`);
      }
    }

    // 7. Remove from other users' invite groups
    console.log('[AuthDeletion] Cleaning up invite groups...');

    for (const otherUserDoc of allUsersSnap.docs) {
      if (otherUserDoc.id === userId) continue; // Skip deleted user

      const otherUserData = otherUserDoc.data();
      const inviteGroups = otherUserData?.userdata?.inviteGroups || [];

      // Check if deleted user is in any invite groups
      let groupsModified = false;
      const updatedGroups = inviteGroups.map(group => {
        if (group.members?.includes(userId)) {
          groupsModified = true;
          return {
            ...group,
            members: group.members.filter(memberId => memberId !== userId)
          };
        }
        return group;
      });

      // Update user document if any groups were modified
      if (groupsModified) {
        batch.update(otherUserDoc.ref, {
          'userdata.inviteGroups': updatedGroups
        });
        batchCount++;
        await commitBatchIfNeeded();
        console.log(`[AuthDeletion] Removed from ${otherUserDoc.id}'s invite groups`);
      }
    }

    // 8. Delete user document (last)
    console.log('[AuthDeletion] Deleting user document...');
    batch.delete(userRef);
    batchCount++;

    // Commit final batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`[AuthDeletion] Committed final batch of ${batchCount} operations`);
    }

    console.log(`[AuthDeletion] ✅ Successfully cleaned up all data for user ${userId}`);

    return {
      success: true,
      userId,
      message: 'User data cleanup completed'
    };

  } catch (error) {
    console.error(`[AuthDeletion] ❌ Error cleaning up user ${userId}:`, error);

    // Try to commit any pending batch operations before failing
    if (batchCount > 0) {
      try {
        await batch.commit();
        console.log(`[AuthDeletion] Committed partial batch of ${batchCount} operations before error`);
      } catch (batchError) {
        console.error('[AuthDeletion] Failed to commit partial batch:', batchError);
      }
    }

    throw error;
  }
});
