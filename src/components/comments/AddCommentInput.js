import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import VibeInput from '../VibeInput';
import VibeButton from '../VibeButton';
import { validateComment } from './utils/commentUtils';
import theme from '../../themes/themes';

const AddCommentInput = ({ onAddComment, submitting, disabled }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    // Validate comment before submitting
    const validation = validateComment(comment);

    if (!validation.isValid) {
      Alert.alert('Invalid Comment', validation.error);
      return;
    }

    // Call the parent's add comment function
    const success = await onAddComment(comment);

    // Clear input only if comment was successfully added
    if (success) {
      setComment('');
    }
  };

  const canSubmit = comment.trim().length > 0 && !submitting && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <VibeInput
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment..."
          multiline
          style={styles.input}
          maxLength={500}
        />
      </View>

      <VibeButton
        label={submitting ? 'POSTING...' : 'POST'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.submitButton, !canSubmit && styles.disabledButton]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  submitButton: {
    paddingVertical: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default AddCommentInput;
