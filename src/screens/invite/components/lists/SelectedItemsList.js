import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from '../../styles/inviteScreenStyles';

const SelectedItem = ({ item, onRemove, showRole, isHostMode, themeColor }) => {
  if (!item) {
    console.warn('[SelectedItem] Invalid item passed:', item);
    return null;
  }

  return (
    <View style={[styles.selectedItem, { borderColor: themeColor }]}>
      <View style={styles.selectedInfo}>
        <Text style={styles.selectedName}>{item.name || 'Unknown'}</Text>
        {item.email && <Text style={styles.selectedDetail}>{item.email}</Text>}
        {item.phone && <Text style={styles.selectedDetail}>{item.phone}</Text>}
        {showRole && (
          <Text style={[styles.roleText, { color: themeColor }]}>
            {item.role || (isHostMode ? 'Co-Host' : 'Guest')}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const SelectedItemsList = ({
  localSelectedUsers,
  localSelectedPhoneContacts,
  localSelectedContacts,
  removeUser,
  removePhoneContact,
  removeContact,
  isHostMode,
  themeColor,
}) => {
  const totalSelected =
    localSelectedUsers.length +
    localSelectedPhoneContacts.length +
    localSelectedContacts.length;

  if (totalSelected === 0) return null;

  return (
    <View style={styles.selectedSection}>
      <Text style={styles.selectedTitle}>
        Selected {isHostMode ? 'Co-Hosts' : 'Guests'}:
      </Text>

      {localSelectedUsers.map((item) => (
        <View key={item.id}>
          <SelectedItem
            item={item}
            onRemove={() => removeUser(item.id)}
            showRole={isHostMode}
            isHostMode={isHostMode}
            themeColor={themeColor}
          />
        </View>
      ))}

      {localSelectedPhoneContacts.map((item) => (
        <View key={item.id}>
          <SelectedItem
            item={item}
            onRemove={() => removePhoneContact(item.id)}
            showRole={isHostMode}
            isHostMode={isHostMode}
            themeColor={themeColor}
          />
        </View>
      ))}

      {localSelectedContacts.map((item) => (
        <View key={item.id}>
          <SelectedItem
            item={item}
            onRemove={() => removeContact(item.id)}
            showRole={isHostMode}
            isHostMode={isHostMode}
            themeColor={themeColor}
          />
        </View>
      ))}
    </View>
  );
};

export default SelectedItemsList;
