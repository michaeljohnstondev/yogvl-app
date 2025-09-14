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

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={theme.colors.vibeRed} />
        <Text style={styles.loadingText}>Blocking...</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        { opacity: pressed ? 0.8 : disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={['#CC0022', '#FF0844', '#AA001B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>{label}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Main button styles (gradient)
  gradientBorder: {
    borderRadius: theme.sizes.buttonRadius,
    padding: 2,
    minWidth: 120,
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
