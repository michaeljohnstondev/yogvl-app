// Event poster image picker. Stores either:
//   - '' (no poster)
//   - a local picker URI (file://, content://, ph://) prior to upload
//   - a Firebase Storage URL after upload
// The actual upload happens at submit time inside useEventForm; this
// component only owns the picker UI and preview.

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import theme from '../../../theme/themes';

export const PosterImage = ({
  formData,
  updateField,
  styles,
  setFieldRef,
}) => {
  const [picking, setPicking] = useState(false);
  const posterImage = formData.posterImage || '';

  const handlePick = async () => {
    if (picking) return;
    setPicking(true);
    try {
      // No permission request — launchImageLibraryAsync routes through
      // Android's system Photo Picker on API 33+, which hands us only
      // the single picked image and never touches READ_MEDIA_IMAGES.
      // Google Play's photo/video permissions policy is satisfied
      // because we declare no broad gallery permission at all.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // 4:5 portrait — flyer-ish without forcing square
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        updateField('posterImage', result.assets[0].uri);
      }
    } catch (error) {
      console.error('[PosterImage] Picker failed:', error);
      Alert.alert('Error', 'Could not open the image picker.');
    } finally {
      setPicking(false);
    }
  };

  const handleRemove = () => {
    updateField('posterImage', '');
  };

  return (
    <View ref={setFieldRef && setFieldRef('posterImage')}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Poster Image</Text>
      </View>

      {posterImage ? (
        <View style={localStyles.previewContainer}>
          <Image
            source={{ uri: posterImage }}
            style={localStyles.preview}
            resizeMode="cover"
          />
          <View style={localStyles.buttonRow}>
            <TouchableOpacity
              onPress={handlePick}
              style={localStyles.actionBtn}
              disabled={picking}
            >
              <Text style={localStyles.actionText}>
                {picking ? 'Opening…' : 'Replace'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRemove}
              style={[localStyles.actionBtn, localStyles.removeBtn]}
            >
              <Text style={[localStyles.actionText, localStyles.removeText]}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handlePick}
          style={localStyles.pickBtn}
          disabled={picking}
        >
          <Text style={localStyles.pickText}>
            {picking ? 'Opening…' : '+ Add a poster image'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  helperText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    fontSize: 12,
    marginBottom: 8,
  },
  previewContainer: {
    marginTop: 4,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  actionText: {
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontWeight: '600',
    fontSize: 14,
  },
  removeBtn: {
    borderColor: theme.colors.vibePink,
  },
  removeText: {
    color: theme.colors.vibePink,
  },
  pickBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    marginTop: 4,
  },
  pickText: {
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default PosterImage;
