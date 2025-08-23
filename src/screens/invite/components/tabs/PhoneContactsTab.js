import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import VibeInput from '../../../../components/ui/VibeInput';
import VibeButton from '../../../../components/ui/VibeButton';
import ContactListItem from '../lists/ContactListItem';
import { filterPhoneContacts } from '../../utils/inviteScreenUtils';
import styles from '../../styles/inviteScreenStyles';

const PhoneContactsTab = ({
  // Data
  phoneContacts,
  loadingContacts,
  contactsLoaded,
  searchQuery,
  setSearchQuery,
  localSelectedPhoneContacts,
  loadDeviceContacts,
  
  // Selection
  togglePhoneContactSelection,
  
  // UI state
  themeColor,
  themeBgColor,
  maxLimit,
  localSelectedUsers,
  localSelectedContacts
}) => {
  const filteredPhoneContacts = filterPhoneContacts(phoneContacts, searchQuery);
  const totalSelected = localSelectedUsers.length + localSelectedContacts.length + localSelectedPhoneContacts.length;
  const hasReachedLimit = maxLimit && totalSelected >= maxLimit;

  if (loadingContacts) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Loading your contacts...</Text>
      </View>
    );
  }

  return (
    <View>
      <VibeInput
        placeholder="Search phone contacts..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
      />
      <View style={styles.itemsList}>
        {filteredPhoneContacts.map((item) => {
          const isSelected = localSelectedPhoneContacts.some(c => c.id === item.id);
          const canSelect = !isSelected && !hasReachedLimit;
          
          return (
            <View key={item.id}>
              <ContactListItem
                item={item}
                isSelected={isSelected}
                canSelect={canSelect}
                themeColor={themeColor}
                themeBgColor={themeBgColor}
                onPress={() => togglePhoneContactSelection(item)}
              />
            </View>
          );
        })}
        {contactsLoaded && filteredPhoneContacts.length === 0 && (
          <Text style={styles.emptyText}>No contacts found</Text>
        )}
        {!contactsLoaded && !loadingContacts && (
          <VibeButton
            label="Load Contacts"
            onPress={loadDeviceContacts}
            style={styles.loadButton}
          />
        )}
      </View>
    </View>
  );
};

export default PhoneContactsTab;