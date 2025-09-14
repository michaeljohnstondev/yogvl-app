import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import theme from '../../../theme/themes';

export default function FriendsBucket({
  title,
  memberCount = 0,
  isExpanded,
  onToggle,
  children,
  disabled = false,
  showMemberCount = false,
}) {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.header,
          disabled && styles.disabledHeader,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => {
          console.log('[FRIENDS BUCKET] onPress triggered, calling onToggle');
          onToggle && onToggle();
        }}
        disabled={disabled}
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.title, disabled && styles.disabledText]}>
            {title}
          </Text>
          {showMemberCount && (
            <Text style={[styles.memberCount, disabled && styles.disabledText]}>
              ({memberCount} {memberCount === 1 ? 'member' : 'members'})
            </Text>
          )}
        </View>

        <Text style={[styles.arrow, disabled && styles.disabledText]}>
          {isExpanded ? '▼' : '▶'}
        </Text>
      </Pressable>

      {isExpanded && !disabled && (
        <View style={styles.expandedContainer}>
          <ScrollView
            style={styles.scrollableContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {children}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue || '#00C6FF',
  },
  disabledHeader: {
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    borderColor: theme.colors.inputBorder,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    marginRight: 8,
  },
  memberCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
  },
  disabledText: {
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  arrow: {
    fontSize: 14,
    color: theme.colors.vibeBlue || '#00C6FF',
    fontWeight: 'bold',
  },
  expandedContainer: {
    marginTop: 8,
    backgroundColor: theme.colors.background,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    maxHeight: 400, // Fixed height to prevent infinite expansion
  },
  scrollableContent: {
    padding: 12,
    flexGrow: 0, // Don't grow beyond maxHeight
  },
});
