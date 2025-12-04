import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../../../auth/services/firebase';
import { validateComment, sortComments } from '../utils/commentUtils';
import { blockingService } from '../../../../services/blockingService';
import { messageBoardSubscriptionService } from '../../../../services/messageBoardSubscriptionService';
import { useAuth } from '../../../../auth/AuthContext';

/**
 * Custom hook for managing comments on an event
 */
export const useComments = (eventId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [eventData, setEventData] = useState(null);

  const { currentUserId, userData } = useAuth();
  const studioId = userData?.userdata?.studios?.default?.studioId;

  const getDisplayName = () => {
    const contactInfo = userData?.userdata?.contactInfo || {};
    if (contactInfo?.firstName && contactInfo?.lastName) {
      return `${contactInfo.firstName} ${contactInfo.lastName}`;
    }
    if (contactInfo?.firstName) {
      return contactInfo.firstName;
    }
    return contactInfo?.email || userData?.email || 'Anonymous';
  };

  // Fetch event data to determine hosts/admins
  useEffect(() => {
    if (!eventId || !studioId) return;

    const fetchEventData = async () => {
      try {
        const eventRef = doc(db, 'studios', studioId, 'events', eventId);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          setEventData(eventSnap.data());
        }
      } catch (err) {
        console.error('Error fetching event data:', err);
      }
    };

    fetchEventData();
  }, [eventId, studioId]);

  // Determine role for current user (used for permissions and when creating comments)
  const getCurrentUserRole = () => {
    if (!eventData || !currentUserId) return 'attendee';

    // Check if current user is admin
    if (userData && userData.isAdmin === true) {
      return 'admin';
    }

    // Check if current user is the event creator/host
    if (eventData.hostId === currentUserId) {
      return 'host';
    }

    // Check if current user is creator or cohost
    if (
      eventData.createdBy === currentUserId ||
      (eventData.cohosts && eventData.cohosts.includes(currentUserId))
    ) {
      return 'host';
    }

    return 'attendee';
  };

  // Set up real-time listener for comments
  useEffect(() => {
    if (!eventId || !studioId) {
      setLoading(false);
      return;
    }

    const commentsRef = collection(
      db,
      `studios/${studioId}/events/${eventId}/comments`
    );
    const q = query(commentsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const commentsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Use the stored userRole from comment data, fallback to 'attendee' if not present
            userRole: data.userRole || 'attendee',
          };
        });

        // Filter out comments from blocked users
        let filteredComments = commentsData;
        if (currentUserId && commentsData.length > 0) {
          try {
            // Get all unique user IDs from comments
            const commentUserIds = [
              ...new Set(commentsData.map((comment) => comment.userId)),
            ];

            // Filter out blocked users
            const allowedUserIds = await blockingService.filterBlockedUsers(
              currentUserId,
              commentUserIds
            );

            // Filter comments to only include allowed users
            filteredComments = commentsData.filter((comment) =>
              allowedUserIds.includes(comment.userId)
            );
          } catch (error) {
            console.error(
              '[useComments] Error filtering blocked users:',
              error
            );
            // On error, show all comments to avoid breaking the UI
          }
        }

        setComments(filteredComments);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId, studioId, currentUserId]);

  /**
   * Add a new comment
   */
  const addComment = async (content, parentCommentId = null) => {
    if (!currentUserId || !eventId) {
      console.log('Missing currentUserId or eventId');
      setError('You must be logged in to comment');
      return false;
    }

    // Validate comment
    const validation = validateComment(content);
    if (!validation.isValid) {
      console.log('Validation failed:', validation.error);
      setError(validation.error);
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      const commentsRef = collection(
        db,
        `studios/${studioId}/events/${eventId}/comments`
      );

      // Calculate thread level if this is a reply
      let level = 0;
      if (parentCommentId) {
        const parentComment = comments.find((c) => c.id === parentCommentId);
        level = parentComment ? (parentComment.level || 0) + 1 : 1;
      }

      const commentData = {
        userId: currentUserId,
        userName: getDisplayName(),
        content: content.trim(),
        timestamp: serverTimestamp(),
        parentCommentId: parentCommentId,
        level: level,
        // Store the current user's role at comment creation time
        userRole: getCurrentUserRole(),
      };

      await addDoc(commentsRef, commentData);

      // Auto-subscribe user to message board notifications
      // This happens in the background and won't block comment posting
      messageBoardSubscriptionService.subscribeToMessageBoard(
        studioId,
        eventId,
        currentUserId
      ).catch(err => {
        console.error('[useComments] Error auto-subscribing to message board:', err);
        // Don't fail the comment if subscription fails
      });

      setSubmitting(false);
      return true;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
      setSubmitting(false);
      return false;
    }
  };

  /**
   * Delete a comment (only if user owns it or is admin/host)
   */
  const deleteComment = async (commentId, commentUserId) => {
    if (!currentUserId) {
      setError('You must be logged in to delete comments');
      return false;
    }

    const currentUserRole = getCurrentUserRole();
    const isOwner = currentUserId === commentUserId;
    const canDelete =
      isOwner || currentUserRole === 'admin' || currentUserRole === 'host';

    if (!canDelete) {
      setError('You can only delete your own comments');
      return false;
    }

    try {
      const commentRef = doc(
        db,
        `studios/${studioId}/events/${eventId}/comments`,
        commentId
      );
      await deleteDoc(commentRef);
      return true;
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
      return false;
    }
  };

  /**
   * Clear any error messages
   */
  const clearError = () => {
    setError(null);
  };

  return {
    comments,
    loading,
    error,
    submitting,
    addComment,
    deleteComment,
    clearError,
    eventData,
    getCurrentUserRole,
  };
};
