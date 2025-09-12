import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
} from 'react-native';
import theme from '../../theme/themes';

/**
 * Reusable notification setting item component
 * Extracted from NotificationSettingsScreen to eliminate code duplication
 */
export default function NotificationSettingItem({ 
  title, 
  description, 
  value, 
  onToggle, 
  isLast = false 
}) {
  return (
    <View style={[styles.settingItem, !isLast && styles.settingBorder]}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: theme.colors.darkGray,
          true: theme.colors.vibeGreen,
        }}
        thumbColor={value ? theme.colors.white : theme.colors.gray}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  settingContent: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  settingDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});