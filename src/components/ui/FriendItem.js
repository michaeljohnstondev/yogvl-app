import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import theme from '../../theme/themes';

export default function FriendItem({ 
  friend, 
  isSelected, 
  onSelect, 
  disabled = false 
}) {
  const handlePress = () => {
    if (!disabled) {
      onSelect(friend.id);
    }
  };

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        isSelected && styles.selectedContainer,
        disabled && styles.disabledContainer,
        { opacity: pressed ? 0.7 : 1 }
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {friend.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      
      <View style={styles.info}>
        <Text style={[
          styles.name,
          isSelected && styles.selectedText,
          disabled && styles.disabledText
        ]}>
          {friend.name || 'Unknown'}
        </Text>
        {(friend.email || friend.phone) && (
          <Text style={[
            styles.contact,
            disabled && styles.disabledText
          ]}>
            {friend.email || friend.phone}
          </Text>
        )}
      </View>

      <View style={[
        styles.checkbox,
        isSelected && styles.selectedCheckbox,
        disabled && styles.disabledCheckbox
      ]}>
        {isSelected && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.sizes.borderRadius,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.background,
  },
  selectedContainer: {
    borderColor: theme.colors.vibeBlue || '#00C6FF',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
  },
  disabledContainer: {
    opacity: 0.5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.vibeBlue || '#00C6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    marginBottom: 2,
  },
  selectedText: {
    color: theme.colors.vibeBlue || '#00C6FF',
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
  contact: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.inputBorder,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheckbox: {
    borderColor: theme.colors.vibeBlue || '#00C6FF',
    backgroundColor: theme.colors.vibeBlue || '#00C6FF',
  },
  disabledCheckbox: {
    borderColor: theme.colors.textSecondary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});