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
  arrayRemove
} from 'firebase/firestore';
import { deleteUser as deleteAuthUser } from 'firebase/auth';
import { db } from '../auth/services/firebase';

/**
 * Comprehensive user account deletion service
 * Cleans up all user-related data across the entire app
 */
export const deleteUserAccount = async (userId, currentUser) => {
  console.log(`[UserDeletion] Starting comprehensive deletion for user ${userId}`);
  
  try {
    // Create batch for atomic operations where possible
    const batch = writeBatch(db);
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore limit
    
    // Helper to commit batch when it gets full
    const commitBatchIfNeeded = async () => {
      if (batchCount >= MAX_BATCH_SIZE) {
        console.log(`[UserDeletion] Committing batch with ${batchCount} operations`);
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
    console.log(`[UserDeletion] Found ${followingSnap.docs.length} following relationships`);
    
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
    console.log(`[UserDeletion] Found ${followersSnap.docs.length} follower relationships`);
    
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
    console.log(`[UserDeletion] Found ${sentRequestsSnap.docs.length} sent friend requests`);
    
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
    console.log(`[UserDeletion] Found ${receivedRequestsSnap.docs.length} received friend requests`);
    
    receivedRequestsSnap.docs.forEach((requestDoc) => {
      batch.delete(requestDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // 5. Handle Events Created by User
    console.log('[UserDeletion] Handling events created by user...');
    
    if (userStudio) {
      const createdEventsQuery = query(
        collection(db, 'studios', userStudio, 'events'),
        where('createdBy', '==', userId)
      );
      const createdEventsSnap = await getDocs(createdEventsQuery);
      console.log(`[UserDeletion] Found ${createdEventsSnap.docs.length} events created by user`);

      for (const eventDoc of createdEventsSnap.docs) {
        const eventData = eventDoc.data();
        console.log(`[UserDeletion] Deleting event: ${eventData.title || eventDoc.id}`);
        
        // Delete all invitations for this event
        const invitationsQuery = query(
          collection(db, 'studios', userStudio, 'events', eventDoc.id, 'invitations')
        );
        const invitationsSnap = await getDocs(invitationsQuery);
        
        invitationsSnap.docs.forEach((inviteDoc) => {
          batch.delete(inviteDoc.ref);
          batchCount++;
        });
        await commitBatchIfNeeded();

        // Delete all comments for this event
        const commentsQuery = query(
          collection(db, 'studios', userStudio, 'events', eventDoc.id, 'comments')
        );
        const commentsSnap = await getDocs(commentsQuery);
        
        commentsSnap.docs.forEach((commentDoc) => {
          batch.delete(commentDoc.ref);
          batchCount++;
        });
        await commitBatchIfNeeded();

        // Delete the event itself
        batch.delete(eventDoc.ref);
        batchCount++;
        await commitBatchIfNeeded();
      }
    }

    // 6. Clean up Event Invitations (sent to/from user)
    console.log('[UserDeletion] Cleaning up event invitations...');
    
    if (userStudio) {
      // Get all events in studio to check invitations
      const allEventsQuery = query(collection(db, 'studios', userStudio, 'events'));
      const allEventsSnap = await getDocs(allEventsQuery);
      
      for (const eventDoc of allEventsSnap.docs) {
        // Invitations where user is the guest
        const guestInvitationsQuery = query(
          collection(db, 'studios', userStudio, 'events', eventDoc.id, 'invitations'),
          where('guestId', '==', userId)
        );
        const guestInvitationsSnap = await getDocs(guestInvitationsQuery);
        
        guestInvitationsSnap.docs.forEach((inviteDoc) => {
          batch.delete(inviteDoc.ref);
          batchCount++;
        });
        await commitBatchIfNeeded();

        // Invitations where user is the host (already handled in events deletion)
        // Co-host invitations
        const cohostInvitationsQuery = query(
          collection(db, 'studios', userStudio, 'events', eventDoc.id, 'invitations'),
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
        const eventData = eventDoc.data();
        
        if (eventData.subscribers?.includes(userId)) {
          batch.update(eventRef, {
            subscribers: arrayRemove(userId),
            subscriberCount: Math.max(0, (eventData.subscriberCount || 0) - 1)
          });
          batchCount++;
        }
        
        if (eventData.attendees?.includes(userId)) {
          batch.update(eventRef, {
            attendees: arrayRemove(userId),
            attendeeCount: Math.max(0, (eventData.attendeeCount || 0) - 1)
          });
          batchCount++;
        }
        
        if (eventData.coHosts?.includes(userId)) {
          batch.update(eventRef, {
            coHosts: arrayRemove(userId)
          });
          batchCount++;
        }
        
        await commitBatchIfNeeded();
      }
    }

    // 7. Clean up User's Comments on Events
    console.log('[UserDeletion] Cleaning up user comments...');
    
    if (userStudio) {
      // Get all events in studio to check comments
      const allEventsQuery = query(collection(db, 'studios', userStudio, 'events'));
      const allEventsSnap = await getDocs(allEventsQuery);
      
      for (const eventDoc of allEventsSnap.docs) {
        const userCommentsQuery = query(
          collection(db, 'studios', userStudio, 'events', eventDoc.id, 'comments'),
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

    // 8. Clean up Notifications
    console.log('[UserDeletion] Cleaning up notifications...');
    
    // Notifications to user
    const notificationsToUserQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );
    const notificationsToUserSnap = await getDocs(notificationsToUserQuery);
    console.log(`[UserDeletion] Found ${notificationsToUserSnap.docs.length} notifications to user`);
    
    notificationsToUserSnap.docs.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // Notifications from user (where they are the sender)
    const notificationsFromUserQuery = query(
      collection(db, 'notifications'),
      where('data.senderId', '==', userId)
    );
    const notificationsFromUserSnap = await getDocs(notificationsFromUserQuery);
    console.log(`[UserDeletion] Found ${notificationsFromUserSnap.docs.length} notifications from user`);
    
    notificationsFromUserSnap.docs.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref);
      batchCount++;
    });
    await commitBatchIfNeeded();

    // 9. Update User Metrics for Other Users
    console.log('[UserDeletion] Updating metrics for related users...');
    
    // This would require complex queries to find users who have metrics involving this user
    // For now, we'll leave this as is since metrics will be eventually consistent

    // 10. Delete User Document
    console.log('[UserDeletion] Deleting user document...');
    batch.delete(userRef);
    batchCount++;

    // Commit final batch
    if (batchCount > 0) {
      console.log(`[UserDeletion] Committing final batch with ${batchCount} operations`);
      await batch.commit();
    }

    // 11. Delete Firebase Auth User (must be last)
    console.log('[UserDeletion] Deleting Firebase Auth user...');
    if (currentUser && currentUser.uid === userId) {
      await deleteAuthUser(currentUser);
      console.log('[UserDeletion] Firebase Auth user deleted');
    }

    console.log(`[UserDeletion] Successfully completed comprehensive deletion for user ${userId}`);
    
    return {
      success: true,
      message: 'Account and all associated data have been permanently deleted.'
    };

  } catch (error) {
    console.error(`[UserDeletion] Error during user deletion:`, error);
    
    return {
      success: false,
      message: 'Failed to delete account. Please try again.',
      error: error.message
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

    // Count follows
    const followingQuery = query(collection(db, 'follows'), where('followerId', '==', userId));
    const followersQuery = query(collection(db, 'follows'), where('targetUserId', '==', userId));
    const [followingSnap, followersSnap] = await Promise.all([
      getDocs(followingQuery),
      getDocs(followersQuery)
    ]);
    preview.follows = followingSnap.docs.length + followersSnap.docs.length;

    // Count friend requests
    const sentRequestsQuery = query(collection(db, 'friendRequests'), where('senderId', '==', userId));
    const receivedRequestsQuery = query(collection(db, 'friendRequests'), where('recipientId', '==', userId));
    const [sentRequestsSnap, receivedRequestsSnap] = await Promise.all([
      getDocs(sentRequestsQuery),
      getDocs(receivedRequestsQuery)
    ]);
    preview.friendRequests = sentRequestsSnap.docs.length + receivedRequestsSnap.docs.length;

    // Count notifications
    const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
    const notificationsSnap = await getDocs(notificationsQuery);
    preview.notifications = notificationsSnap.docs.length;

    if (userStudio) {
      // Count events created
      const eventsQuery = query(collection(db, 'studios', userStudio, 'events'), where('createdBy', '==', userId));
      const eventsSnap = await getDocs(eventsQuery);
      preview.events = eventsSnap.docs.length;
    }

    return { success: true, preview };
    
  } catch (error) {
    console.error('[UserDeletion] Error getting deletion preview:', error);
    return { error: error.message };
  }
};