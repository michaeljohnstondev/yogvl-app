import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from '../../../lib/firebase/auth';
import { auth } from '../../../auth/services/firebase';
import { useVibeAlert } from '../base/VibeAlertContext';
import CloseButton from '../buttons/CloseButton';
import theme from '../../../theme/themes';

function AccountSettingsDropdown({
  visible,
  onClose,
  navigation,
  userData,
}) {
  const vibeAlert = useVibeAlert();

  // Memoize user display data to prevent recalculation on every render
  const { displayName, studioName } = useMemo(() => {
    const firstName = userData?.userdata?.contactInfo?.firstName;
    const lastName = userData?.userdata?.contactInfo?.lastName;

    const name = firstName && lastName
      ? `${firstName} ${lastName}`
      : userData?.userdata?.contactInfo?.email || userData?.email || 'User';

    const studio = userData?.userdata?.studios?.default?.studioName || 'Studio not set';

    return {
      displayName: name,
      studioName: studio
    };
  }, [userData]);

  // Memoize all handler functions to prevent recreation on every render
  const handleLogout = useCallback(async () => {
    try {
      const userId = auth.currentUser?.uid;

      // Remove FCM token before logout to prevent cross-account notifications
      if (userId) {
        try {
          const fcmService = (await import('../../../services/fcmService')).default;
          await fcmService.removeTokenForUser(userId);
          console.log('[AccountSettings] ✅ FCM token removed for user:', userId);
        } catch (fcmError) {
          // Non-critical - continue with logout even if FCM cleanup fails
          console.warn('[AccountSettings] ⚠️  Failed to remove FCM token:', fcmError);
        }
      }

      await signOut(auth);
      console.log('User logged out successfully');
      onClose();
      // Navigation will automatically redirect to auth stack
    } catch (error) {
      console.error('Error logging out:', error);
      vibeAlert.error('Error', 'Failed to log out. Please try again.');
    }
  }, [onClose, vibeAlert]);

  const handleLocationSettings = useCallback(() => {
    onClose();
    navigation.navigate('Location');
  }, [onClose, navigation]);

  const handleNotificationSettings = useCallback(() => {
    onClose();
    navigation.navigate('NotificationSettings');
  }, [onClose, navigation]);

  const handlePrivacySettings = useCallback(() => {
    onClose();
    navigation.navigate('Privacy');
  }, [onClose, navigation]);

  const handleProfile = useCallback(() => {
    onClose();
    navigation.navigate('UserProfile');
  }, [onClose, navigation]);

  const handleInterests = useCallback(() => {
    onClose();
    navigation.navigate('Interests');
  }, [onClose, navigation]);

  // Memoize the gradient colors to prevent recreation
  const gradientColors = useMemo(() => theme.colors.backgroundGradient, []);

  if (!visible) return null;

  return (
    <View style={styles.dropdown}>
      <LinearGradient
        colors={gradientColors}
        style={styles.dropdownContent}
      >
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {displayName}
            </Text>
            <Text style={styles.profileEmail}>
              {studioName}
            </Text>
          </View>
          <CloseButton onPress={onClose} style={{ marginRight: -12 }} />
        </View>

        {/* Settings Options */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.settingItem, { marginTop: 2 }]} onPress={handleProfile} activeOpacity={1}>
            <Text style={styles.settingText}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleInterests} activeOpacity={1}>
            <Text style={styles.settingText}>Interests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleLocationSettings}
            activeOpacity={1}
          >
            <Text style={styles.settingText}>Studios</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleNotificationSettings}
            activeOpacity={1}
          >
            <Text style={styles.settingText}>Notification Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handlePrivacySettings}
            activeOpacity={1}
          >
            <Text style={styles.settingText}>Privacy Settings</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity style={[styles.settingItem, { marginBottom: 2 }]} onPress={handleLogout} activeOpacity={1}>
            <Text style={styles.settingText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

export default React.memo(AccountSettingsDropdown, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.userData === nextProps.userData &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.navigation === nextProps.navigation
  );
});

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    top: 7,
    right: 12,
    width: 250,
    zIndex: 1000,
    borderRadius: 12,
    overflow: 'hidden',
    // Simplified shadow for better performance
    shadowColor: '#00C6FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 198, 255, 0.3)',
  },
  dropdownContent: {
    padding: 0,
  },
  buttonContainer: {
    backgroundColor: theme.colors.vibeBlue,
    marginTop: 1,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 1,
    borderTopColor: '#00f2fe',
    borderLeftColor: '#00f2fe',
    borderRightColor: '#00f2fe',
    borderBottomColor: theme.colors.vibeBlue,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: theme.colors.vibeBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  profileEmail: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 198, 255, 0.2)',
    marginVertical: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 2,
    marginVertical: 1,
    backgroundColor: theme.colors.headerBackground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  settingText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
});
