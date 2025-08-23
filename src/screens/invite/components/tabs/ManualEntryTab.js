import React from 'react';
import { View, Text } from 'react-native';
import VibeInput from '../../../../components/ui/VibeInput';
import VibeButton from '../../../../components/ui/VibeButton';
import { hasReachedLimit } from '../../utils/inviteScreenUtils';
import styles from '../../styles/inviteScreenStyles';

const ManualEntryTab = ({
  // Form state
  contactName,
  setContactName,
  contactEmail,
  setContactEmail,
  contactPhone,
  setContactPhone,
  personalMessage,
  setPersonalMessage,
  
  // Actions
  handleAddContact,
  clearManualForm,
  
  // UI state
  isHostMode,
  type,
  maxLimit,
  localSelectedUsers,
  localSelectedContacts,
  localSelectedPhoneContacts
}) => {
  const totalSelected = localSelectedUsers.length + localSelectedContacts.length + localSelectedPhoneContacts.length;
  const hasReachedMaxLimit = hasReachedLimit(totalSelected, maxLimit);

  const onAddContact = () => {
    handleAddContact(contactName, contactEmail, contactPhone, personalMessage, clearManualForm);
  };

  return (
    <View style={styles.manualForm}>
      <VibeInput
        placeholder="Name *"
        value={contactName}
        onChangeText={setContactName}
        style={styles.input}
      />
      <VibeInput
        placeholder="Email address"
        value={contactEmail}
        onChangeText={setContactEmail}
        keyboardType="email-address"
        style={styles.input}
      />
      <VibeInput
        placeholder="Phone number"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />
      {!isHostMode && (
        <VibeInput
          placeholder="Personal message (optional)"
          value={personalMessage}
          onChangeText={setPersonalMessage}
          multiline
          numberOfLines={3}
          style={styles.messageInput}
        />
      )}
      <VibeButton
        label={`Add ${isHostMode ? 'Co-Host' : 'Guest'}`}
        onPress={onAddContact}
        style={styles.addButton}
        disabled={hasReachedMaxLimit}
      />
      {hasReachedMaxLimit && (
        <Text style={styles.limitReachedText}>
          Maximum number of {type} reached
        </Text>
      )}
    </View>
  );
};

export default ManualEntryTab;