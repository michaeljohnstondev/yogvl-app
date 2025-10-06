import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AVATARS } from '../../utils/inviteScreenConstants';
import styles from '../../styles/inviteScreenStyles';
import theme from '../../../../theme/themes';

const UserListItem = ({
  item,
  isSelected,
  canSelect,
  themeColor,
  themeBgColor,
  onPress,
  onAvatarPress,
}) => {
  if (!item || !item.id) {
    console.warn('[UserListItem] Invalid item passed:', item);
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.personItem,
        {
          borderColor: themeColor, // Always show blue border
          backgroundColor: themeBgColor, // Always show blue background tint
        },
        !canSelect && !isSelected && styles.disabledItem,
      ]}
      onPress={onPress}
      disabled={!canSelect && !isSelected}
      activeOpacity={1} // No visual feedback on tap
    >
      <View style={styles.personInfo}>
        <TouchableOpacity style={styles.avatarButton} onPress={onAvatarPress}>
          <Text style={styles.personAvatar}>
            {item.isFavorite ? '⭐' : item.isFriend ? '👫' : '🌐'}
          </Text>
        </TouchableOpacity>
        <View style={styles.personDetails}>
          <Text style={styles.personName}>{item.name || 'Unknown User'}</Text>
        </View>
      </View>
      <View style={[styles.selectionIndicator, { borderColor: themeColor }]}>
        {isSelected && (
          <Text style={[styles.checkmark, { color: theme.colors.vibeGreen }]}>✓</Text>
        )}
        {!canSelect && !isSelected && <Text style={styles.maxText}>Max</Text>}
      </View>
    </TouchableOpacity>
  );
};

export default UserListItem;
