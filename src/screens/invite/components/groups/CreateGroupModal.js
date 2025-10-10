import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import AutoCompleteInput from '../../../../components/ui/forms/AutoCompleteInput';
import { getEmojiForText } from '../../../../lib/emojiUtils';
import { VibeAlertProvider } from '../../../../components/ui/base/VibeAlertContext';
import styles from '../../styles/inviteScreenStyles';

// Helper to check if text already starts with an emoji
const hasEmojiAtStart = (text) => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
  return emojiRegex.test(trimmed);
};

const CreateGroupModal = ({
  visible,
  onClose,
  newGroupName,
  setNewGroupName,
  onCreateGroup,
}) => {
  const handleCreate = async () => {
    const success = await onCreateGroup(newGroupName);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <VibeAlertProvider>
        <View style={styles.createGroupModalContainer}>
        <View style={styles.createGroupModalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.createGroupModalTitle}>New Group</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!newGroupName.trim()}
          >
            <Text
              style={[
                styles.createButtonText,
                !newGroupName.trim() && styles.disabledButtonText,
              ]}
            >
              Create
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.createGroupContent}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Group Name</Text>
            <AutoCompleteInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              onSuggestionSelect={(suggestion) => {
                console.log('Selected suggestion:', suggestion);
              }}
              context="group"
              placeholder="Enter group name..."
              maxSuggestions={5}
              showEmojis={true}
              usePortal={false}
              inputProps={{
                autoFocus: true,
                maxLength: 30,
              }}
              style={styles.groupNameInput}
            />

            <Text style={styles.inputHint}>
              Keep it short and simple - just type keywords like "beach trip
              friends"
            </Text>
          </View>

          <View style={styles.emojiPreview}>
            <Text style={styles.emojiPreviewLabel}>Preview:</Text>
            <Text style={styles.emojiPreviewText}>
              {hasEmojiAtStart(newGroupName)
                ? newGroupName || 'Group Name'
                : `${getEmojiForText(newGroupName || 'Group')} ${newGroupName || 'Group Name'}`
              }
            </Text>
          </View>
        </View>
      </View>
      </VibeAlertProvider>
    </Modal>
  );
};

export default CreateGroupModal;
