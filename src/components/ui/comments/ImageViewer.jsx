// ImageViewer.jsx - Fullscreen image preview + share/save flow for
// message board image attachments.
//
// Tap an image in CommentItem → this modal opens fullscreen. The
// "Share/Save" button downloads the remote image to a temp file via
// expo-file-system, then opens the OS share sheet via expo-sharing.
// On both iOS and Android the share sheet includes a native "Save
// Image" / "Save to Photos" option, so the user can save to their
// gallery without us needing expo-media-library — which would re-add
// READ_MEDIA_IMAGES/VIDEO to the manifest and violate the photo
// permissions policy we just fixed.

import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import theme from '../../../theme/themes';

const ImageViewer = ({ visible, imageUrl, onClose }) => {
  const [busy, setBusy] = useState(false);

  const handleShare = async () => {
    if (busy || !imageUrl) return;
    setBusy(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Sharing Unavailable',
          'Your device does not support the share sheet.'
        );
        return;
      }

      // Pull the remote image into a cache file so the share sheet can
      // hand it off as a local file (required on Android). Use a
      // timestamped filename so concurrent shares don't collide.
      const cacheUri = `${FileSystem.cacheDirectory}msg-${Date.now()}.jpg`;
      const { uri: localUri } = await FileSystem.downloadAsync(
        imageUrl,
        cacheUri
      );

      await Sharing.shareAsync(localUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share or save image',
      });
    } catch (error) {
      console.error('[ImageViewer] Share/save failed:', error);
      Alert.alert('Error', 'Could not prepare the image. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.closeArea}
          activeOpacity={1}
          onPress={onClose}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.action, busy && styles.actionDisabled]}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={styles.actionText}>Share / Save</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.action}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.actionText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  closeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: theme.colors.vibeCyan,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ImageViewer;
