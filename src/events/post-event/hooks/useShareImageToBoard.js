// useShareImageToBoard.js — small hook that owns the "share an image
// to the event's message board" flow used from both HostView and
// GuestView recap actions. Opens the system Photo Picker (no broad
// permissions), uploads the chosen image via messageBoardImageService,
// then writes a comment doc with imageUrl so subscribers get the
// "X shared an image for Y" notification through the existing
// eventCommentNotifications Cloud Function.
//
// Returns { shareImage, isSharing } so the calling view renders a
// disabled "Sharing…" state during the upload.

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from '../../../lib/firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { uploadMessageBoardImage } from '../../../services/messageBoardImageService';

const useShareImageToBoard = ({
  studioId,
  eventId,
  currentUserId,
  displayName,
  userRole,
  vibeAlert,
}) => {
  const [isSharing, setIsSharing] = useState(false);

  const shareImage = async () => {
    if (isSharing || !currentUserId || !studioId || !eventId) return;
    setIsSharing(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const imageUrl = await uploadMessageBoardImage(
        studioId,
        eventId,
        result.assets[0].uri,
      );

      await addDoc(
        collection(db, `studios/${studioId}/events/${eventId}/comments`),
        {
          userId: currentUserId,
          userName: displayName || 'Guest',
          content: '',
          imageUrl,
          timestamp: serverTimestamp(),
          parentCommentId: null,
          level: 0,
          userRole: userRole || 'guest',
        },
      );

      vibeAlert?.success?.(
        'Shared',
        'Your image was posted to the message board.',
      );
    } catch (error) {
      console.error('[useShareImageToBoard] Share failed:', error);
      vibeAlert?.error?.(
        'Upload Failed',
        'Could not share the image. Try again.',
      );
    } finally {
      setIsSharing(false);
    }
  };

  return { shareImage, isSharing };
};

export default useShareImageToBoard;
