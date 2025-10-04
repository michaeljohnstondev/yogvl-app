import React from 'react';
import {
  Pressable,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../../theme/themes';

const BlockButton = ({
  onPress,
  isLoading = false,
  disabled = false,
  style,
  label = 'Block User',
}) => {
  const handlePress = () => {
    if (disabled || isLoading) return;
    onPress?.();
  };

  // Determine if this is unblock mode based on label
  const isUnblockMode = label.toLowerCase().includes('unblock');

  // Use blue gradient for unblock, red for block
  const gradientColors = isUnblockMode
    ? ['#0066CC', '#0088FF', '#0055AA'] // Blue gradient for unblock
    : ['#CC0022', '#FF0844', '#AA001B']; // Red gradient for block

  const borderColor = isUnblockMode ? '#00FFFF' : '#FFCC66'; // Cyan for unblock, orange for block

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        { opacity: pressed ? 0.8 : disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <View style={[styles.outerBorder, { borderColor }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.buttonContent}>
            {isLoading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator size="small" color={theme.colors.white} />
                <Text style={styles.buttonText}>
                  {isUnblockMode ? 'Unblocking...' : 'Blocking...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>{label}</Text>
            )}
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Main button styles (gradient) - borderColor is now dynamic
  outerBorder: {
    borderBottomWidth: 4,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderRadius: theme.sizes.buttonRadius,
    marginVertical: 10,
  },
  gradientBorder: {
    borderRadius: theme.sizes.buttonRadius - 4,
    padding: 2,
    minWidth: 120,
    marginBottom: -0.5,
    marginLeft: -0.5,
    overflow: 'hidden',
  },
  buttonContent: {
    backgroundColor: 'transparent',
    borderRadius: theme.sizes.buttonRadius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Loading state
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    borderRadius: theme.sizes.buttonRadius,
    borderWidth: 2,
    borderColor: theme.colors.vibeRed,
    backgroundColor: 'transparent',
    gap: 8,
  },
  loadingText: {
    color: theme.colors.vibeRed,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
});

export default BlockButton;
