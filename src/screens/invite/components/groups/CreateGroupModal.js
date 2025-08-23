import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import AutoCompleteInput from '../../../../components/ui/AutoCompleteInput';
import { getEmojiForText } from '../../../../lib/emojiUtils';
import styles from '../../styles/inviteScreenStyles';

const CreateGroupModal = ({
  visible,
  onClose,
  newGroupName,
  setNewGroupName,
  onCreateGroup
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
            <Text style={[
              styles.createButtonText,
              !newGroupName.trim() && styles.disabledButtonText
            ]}>
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
              inputProps={{
                autoFocus: true,
                maxLength: 30
              }}
              style={styles.groupNameInput}
            />
            
            <Text style={styles.inputHint}>
              Keep it short and simple - just type keywords like "beach trip friends"
            </Text>
          </View>

          <View style={styles.emojiPreview}>
            <Text style={styles.emojiPreviewLabel}>Preview:</Text>
            <Text style={styles.emojiPreviewText}>
              {getEmojiForText(newGroupName || 'Group')} {newGroupName || 'Group Name'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateGroupModal;