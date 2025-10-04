// FILE: components/ui/notifications/VibeNotificationBanner.jsx
// Top notification banner for foreground FCM notifications
// Displays at top of screen with auto-dismiss functionality
// Uses unified vibeBlue design for all notification types

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import theme from '../../../theme/themes';

const { width: screenWidth } = Dimensions.get('window');

const VibeNotificationBanner = ({
  title,
  message,
  visible = false,
  onPress,
  onDismiss,
  autoHide = true,
  duration = 7000,
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible && !isVisible) {
      // Show banner
      setIsVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto hide after duration
      if (autoHide) {
        const timer = setTimeout(() => {
          hideBanner();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else if (!visible && isVisible) {
      // Hide banner
      hideBanner();
    }
  }, [visible]);

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    hideBanner();
  };

  const getBannerColors = () => {
    // Dark background with glowing vibeBlue accents
    return {
      background: '#0A0A0A', // Very dark background
      border: theme.colors.vibeBlue,
      textColor: theme.colors.vibeBlue, // Glowing blue title
      subtextColor: '#FFFFFF', // White for message text
      icon: '🔔' // Single notification icon
    };
  };

  if (!isVisible) {
    return null;
  }

  const colors = getBannerColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{colors.icon}</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textColor, textShadowColor: colors.textColor, textShadowRadius: 8 }]} numberOfLines={1}>
            {title}
          </Text>
          {message && (
            <Text style={[styles.message, { color: colors.subtextColor }]} numberOfLines={2}>
              {message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={hideBanner}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={[styles.dismissText, { color: colors.textColor }]}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below status bar - consider using SafeAreaView.paddingTop
    left: 16,
    right: 16,
    zIndex: 999999,
    borderRadius: 12,
    borderWidth: 4,
    backgroundColor: '#0A0A0A', // Very dark background
    // Glow effect on border (punk aesthetic)
    shadowColor: '#00C6FF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
  },
  dismissButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 20,
  },
});

export default VibeNotificationBanner;