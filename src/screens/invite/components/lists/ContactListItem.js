import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AVATARS } from '../../utils/inviteScreenConstants';
import styles from '../../styles/inviteScreenStyles';

const ContactListItem = ({
  item,
  isSelected,
  canSelect,
  themeColor,
  themeBgColor,
  onPress,
}) => {
  if (!item || !item.id) {
    console.warn('[ContactListItem] Invalid phone contact passed:', item);
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.personItem,
        isSelected && {
          borderColor: themeColor,
          backgroundColor: themeBgColor,
        },
        !canSelect && !isSelected && styles.disabledItem,
      ]}
      onPress={onPress}
      disabled={!canSelect && !isSelected}
    >
      <View style={styles.personInfo}>
        <Text style={styles.personAvatar}>
          {item.avatar || AVATARS.PHONE_CONTACT}
        </Text>
        <View style={styles.personDetails}>
          <Text style={styles.personName}>
            {item.name || 'Unknown Contact'}
          </Text>
          <Text style={styles.personEmail}>{item.phone || 'No phone'}</Text>
        </View>
      </View>
      <View style={[styles.selectionIndicator, { borderColor: themeColor }]}>
        {isSelected && (
          <Text style={[styles.checkmark, { color: themeColor }]}>✓</Text>
        )}
        {!canSelect && !isSelected && <Text style={styles.maxText}>Max</Text>}
      </View>
    </TouchableOpacity>
  );
};

export default ContactListItem;
