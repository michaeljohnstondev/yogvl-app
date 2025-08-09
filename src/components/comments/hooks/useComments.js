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
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { validateComment, sortComments } from '../utils/commentUtils';
import { useAuth } from '../../../AuthContext';
/**
 * Custom hook for managing comments on an event
 */
export const useComments = (eventId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { currentUserId, userData } = useAuth(); // ← This line might be causing the crash

  const getDisplayName = () => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    if (userData?.firstName) {
      return userData.firstName;
    }
    return 'Anonymous';
  };
  // Set up real-time listener for comments
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const commentsRef = collection(db, `events/${eventId}/comments`);
    const q = query(commentsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const commentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setComments(commentsData);
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
  }, [eventId]);

  /**
   * Add a new comment
   */
  const addComment = async (content) => {
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
      const commentsRef = collection(db, `events/${eventId}/comments`);

      const commentData = {
        userId: currentUserId,
        userName: getDisplayName(),
        content: content.trim(),
        timestamp: serverTimestamp(),
        parentCommentId: null,
        level: 0,
      };
      await addDoc(commentsRef, commentData);

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
   * Delete a comment (only if user owns it)
   */
  const deleteComment = async (commentId, commentUserId) => {
    if (!currentUserId || currentUserId !== commentUserId) {
      setError('You can only delete your own comments');
      return false;
    }

    try {
      const commentRef = doc(db, `events/${eventId}/comments`, commentId);
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
  };
};
