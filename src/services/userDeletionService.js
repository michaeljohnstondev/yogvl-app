// FILE: services/userDeletionService.js - Comprehensive User Account Deletion Service

import {
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  arrayRemove,
} from '../lib/firebase/firestore';
import { deleteUser as deleteAuthUser } from '../lib/firebase/auth';
import { db } from '../auth/services/firebase';

/**
 * Comprehensive user account deletion service
 * Cleans up all user-related data across the entire app
 */
export const deleteUserAccount = async (userId, currentUser) => {
  console.log(
    `[UserDeletion] Starting comprehensive deletion for user ${userId}`
  );

  try {
    // Create batch for atomic operations where possible
    const batch = writeBatch(db);
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore limit

    // Helper to commit batch when it gets full
    const commitBatchIfNeeded = async () => {
      if (batchCount >= MAX_BATCH_SIZE) {
        console.log(
          `[UserDeletion] Committing batch with ${batchCount} operations`
        );
        await batch.commit();
        batchCount = 0;
      }
    };

    // 1. Get user data first for reference
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    const userStudio = userData?.userdata?.studios?.default?.studioId;

    console.log(`[UserDeletion] Found user in studio: ${userStudio}`);

    // 2. Clean up Studio Membership
    if (userStudio) {
      console.log(`[UserDeletion] Removing user from studio: ${userStudio}`);
      const studioRef = doc(db, 'studios', userStudio);
      const studioSnap = await getDoc(studioRef);

      if (studioSnap.exists()) {
        await updateDoc(studioRef, {
          users: arrayRemove(userId),
          lastUpdated: new Date(),
        });
        console.log(`[UserDeletion] Removed user from studio ${userStudio}`);
      }
    }

    // 3. Clean up Follow Relationships (both directions)
    console.log('[UserDeletion] Cleaning up follow relationships...');

    // Remove where user is following others
    const followingQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', userId)
    );
    const followingSnap = await getDocs(followingQuery);
    console.log(
      `[UserDeletion] Found ${followingSnap.docs.length} following relationships`
    );

    followingSnap.docs.forEach((followDoc) => {
      batch.delete(followDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // Remove where others are following user
    const followersQuery = query(
      collection(db, 'follows'),
      where('targetUserId', '==', userId)
    );
    const followersSnap = await getDocs(followersQuery);
    console.log(
      `[UserDeletion] Found ${followersSnap.docs.length} follower relationships`
    );

    followersSnap.docs.forEach((followDoc) => {
      batch.delete(followDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // 4. Clean up Friend Requests (both directions)
    console.log('[UserDeletion] Cleaning up friend requests...');

    // Requests sent by user
    const sentRequestsQuery = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', userId)
    );
    const sentRequestsSnap = await getDocs(sentRequestsQuery);
    console.log(
      `[UserDeletion] Found ${sentRequestsSnap.docs.length} sent friend requests`
    );

    sentRequestsSnap.docs.forEach((requestDoc) => {
      batch.delete(requestDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // Requests received by user
    const receivedRequestsQuery = query(
      collection(db, 'friendRequests'),
      where('recipientId', '==', userId)
    );
    const receivedRequestsSnap = await getDocs(receivedRequestsQuery);
    console.log(
      `[UserDeletion] Found ${receivedRequestsSnap.docs.length} received friend requests`
    );

    receivedRequestsSnap.docs.forEach((requestDoc) => {
      batch.delete(requestDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // 5. Collect Events Created by User (for later deletion)
    console.log('[UserDeletion] Collecting events created by user...');

    let userCreatedEventIds = [];
    if (userStudio) {
      const createdEventsQuery = query(
        collection(db, 'studios', userStudio, 'events'),
        where('createdBy', '==', userId)
      );
      const createdEventsSnap = await getDocs(createdEventsQuery);
      userCreatedEventIds = createdEventsSnap.docs.map(doc => doc.id);
      console.log(
        `[UserDeletion] Found ${userCreatedEventIds.length} events created by user`
      );
    }

    // 6. Clean up Event Invitations and Participations (sent to/from user)
    console.log('[UserDeletion] Cleaning up event invitations and participations...');

    if (userStudio) {
      // Get all events in studio to check invitations
      const allEventsQuery = query(
        collection(db, 'studios', userStudio, 'events')
      );
      const allEventsSnap = await getDocs(allEventsQuery);

      for (const eventDoc of allEventsSnap.docs) {
        const eventData = eventDoc.data();

        // Skip events created by this user - they'll be deleted entirely later
        if (userCreatedEventIds.includes(eventDoc.id)) {
          console.log(`[UserDeletion] Skipping user's own event: ${eventData.title || eventDoc.id}`);
          continue;
        }

        // Invitations where user is the guest
        const guestInvitationsQuery = query(
          collection(
            db,
            'studios',
            userStudio,
            'events',
            eventDoc.id,
            'invitations'
          ),
          where('guestId', '==', userId)
        );
        const guestInvitationsSnap = await getDocs(guestInvitationsQuery);

        guestInvitationsSnap.docs.forEach((inviteDoc) => {
          batch.delete(inviteDoc.ref);
          batchCount++;
        });
        await commitBatchIfNeeded();

        // Co-host invitations
        const cohostInvitationsQuery = query(
          collection(
            db,
            'studios',
            userStudio,
            'events',
            eventDoc.id,
            'invitations'
          ),
          where('recipientId', '==', userId)
        );
        const cohostInvitationsSnap = await getDocs(cohostInvitationsQuery);

        cohostInvitationsSnap.docs.forEach((inviteDoc) => {
          batch.delete(inviteDoc.ref);
          batchCount++;
        });
        await commitBatchIfNeeded();

        // Remove user from event subscribers/attendees
        const eventRef = doc(db, 'studios', userStudio, 'events', eventDoc.id);

        if (eventData.subscribers?.includes(userId)) {
          batch.update(eventRef, {
            subscribers: arrayRemove(userId),
            subscriberCount: Math.max(0, (eventData.subscriberCount || 0) - 1),
          });
          batchCount++;
        }

        if (eventData.coHosts?.includes(userId)) {
          batch.update(eventRef, {
            coHosts: arrayRemove(userId),
          });
          batchCount++;
        }

        if (eventData.cohosts?.includes(userId)) {
          batch.update(eventRef, {
            cohosts: arrayRemove(userId),
          });
          batchCount++;
        }

        await commitBatchIfNeeded();
      }
    }

    // 7. Clean up User's Comments on Events (excluding user's own events)
    console.log('[UserDeletion] Cleaning up user comments...');

    if (userStudio) {
      // Get all events in studio to check comments
      const allEventsQuery = query(
        collection(db, 'studios', userStudio, 'events')
      );
      const allEventsSnap = await getDocs(allEventsQuery);

      for (const eventDoc of allEventsSnap.docs) {
        // Skip events created by this user - they'll be deleted entirely later
        if (userCreatedEventIds.includes(eventDoc.id)) {
          continue;
        }

        const userCommentsQuery = query(
          collection(
            db,
            'studios',
            userStudio,
            'events',
            eventDoc.id,
            'comments'
          ),
          where('userId', '==', userId)
        );
        const userCommentsSnap = await getDocs(userCommentsQuery);

        userCommentsSnap.docs.forEach((commentDoc) => {
          batch.delete(commentDoc.ref);
          batchCount++;
        });
        await commitBatchIfNeeded();
      }
    }

    // 8. Clean up Notifications (from user's subcollection)
    console.log('[UserDeletion] Cleaning up notifications...');

    // Delete all notifications for this user from their notifications subcollection
    const userNotificationsRef = collection(
      db,
      'users',
      userId,
      'notifications'
    );
    const userNotificationsSnap = await getDocs(userNotificationsRef);
    console.log(
      `[UserDeletion] Found ${userNotificationsSnap.docs.length} notifications for user`
    );

    userNotificationsSnap.docs.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // Note: Notifications from this user to others would remain in their respective
    // user subcollections, but the sender reference becomes invalid.
    // This is acceptable since the user is being deleted.

    // 9. Delete User's Events (separate operation to avoid delete-then-update conflicts)
    console.log('[UserDeletion] Deleting user\'s events...');

    if (userStudio && userCreatedEventIds.length > 0) {
      for (const eventId of userCreatedEventIds) {
        console.log(`[UserDeletion] Deleting event: ${eventId}`);

        // Delete all invitations for this event
        const invitationsQuery = query(
          collection(db, 'studios', userStudio, 'events', eventId, 'invitations')
        );
        const invitationsSnap = await getDocs(invitationsQuery);

        invitationsSnap.docs.forEach((inviteDoc) => {
          batch.delete(inviteDoc.ref);
          batchCount++;
        });
        await commitBatchIfNeeded();

        // Delete all comments for this event
        const commentsQuery = query(
          collection(db, 'studios', userStudio, 'events', eventId, 'comments')
        );
        const commentsSnap = await getDocs(commentsQuery);

        commentsSnap.docs.forEach((commentDoc) => {
          batch.delete(commentDoc.ref);
          batchCount++;
        });
        await commitBatchIfNeeded();

        // Delete the event itself
        const eventRef = doc(db, 'studios', userStudio, 'events', eventId);
        batch.delete(eventRef);
        batchCount++;
        await commitBatchIfNeeded();
      }
    }

    // 10. Update User Metrics for Other Users
    console.log('[UserDeletion] Updating metrics for related users...');

    // This would require complex queries to find users who have metrics involving this user
    // For now, we'll leave this as is since metrics will be eventually consistent

    // 11. Delete User Document
    console.log('[UserDeletion] Deleting user document...');
    batch.delete(userRef);
    batchCount++;

    // Commit final batch
    if (batchCount > 0) {
      console.log(
        `[UserDeletion] Committing final batch with ${batchCount} operations`
      );
      await batch.commit();
    }

    // 12. Delete Firebase Auth User (must be last)
    console.log('[UserDeletion] Deleting Firebase Auth user...');
    if (currentUser && currentUser.uid === userId) {
      await deleteAuthUser(currentUser);
      console.log('[UserDeletion] Firebase Auth user deleted');
    }

    console.log(
      `[UserDeletion] Successfully completed comprehensive deletion for user ${userId}`
    );

    return {
      success: true,
      message: 'Account and all associated data have been permanently deleted.',
    };
  } catch (error) {
    console.error(`[UserDeletion] Error during user deletion:`, error);

    return {
      success: false,
      message: 'Failed to delete account. Please try again.',
      error: error.message,
    };
  }
};

/**
 * Helper function to get deletion preview (what will be deleted)
 */
export const getUserDeletionPreview = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { error: 'User not found' };
    }

    const userData = userSnap.data();
    const userStudio = userData?.userdata?.studios?.default?.studioId;

    const preview = {
      user: true,
      studios: userStudio ? 1 : 0,
      events: 0,
      invitations: 0,
      comments: 0,
      follows: 0,
      notifications: 0,
      friendRequests: 0,
    };

    // Count follows (using subcollections under users)
    const followingRef = collection(db, 'users', userId, 'following');
    const followersRef = collection(db, 'users', userId, 'followers');
    const [followingSnap, followersSnap] = await Promise.all([
      getDocs(followingRef),
      getDocs(followersRef),
    ]);
    preview.follows = followingSnap.docs.length + followersSnap.docs.length;

    // Count friend requests (if collection exists)
    try {
      const sentRequestsQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', userId)
      );
      const receivedRequestsQuery = query(
        collection(db, 'friendRequests'),
        where('recipientId', '==', userId)
      );
      const [sentRequestsSnap, receivedRequestsSnap] = await Promise.all([
        getDocs(sentRequestsQuery),
        getDocs(receivedRequestsQuery),
      ]);
      preview.friendRequests =
        sentRequestsSnap.docs.length + receivedRequestsSnap.docs.length;
    } catch (error) {
      console.warn('[UserDeletion] Friend requests collection not accessible:', error.message);
      preview.friendRequests = 0;
    }

    // Count notifications
    try {
      const userNotificationsRef = collection(
        db,
        'users',
        userId,
        'notifications'
      );
      const notificationsSnap = await getDocs(userNotificationsRef);
      preview.notifications = notificationsSnap.docs.length;
    } catch (error) {
      console.warn('[UserDeletion] Notifications collection not accessible:', error.message);
      preview.notifications = 0;
    }

    if (userStudio) {
      // Count events created
      try {
        const eventsQuery = query(
          collection(db, 'studios', userStudio, 'events'),
          where('createdBy', '==', userId)
        );
        const eventsSnap = await getDocs(eventsQuery);
        preview.events = eventsSnap.docs.length;
      } catch (error) {
        console.warn('[UserDeletion] Events collection not accessible:', error.message);
        preview.events = 0;
      }
    }

    return { success: true, preview };
  } catch (error) {
    console.error('[UserDeletion] Error getting deletion preview:', error);
    return { error: error.message };
  }
};
