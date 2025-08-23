import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { auth } from '../../auth/services/firebase';
import { useVibeAlert } from './VibeAlertContext';
import CloseButton from './CloseButton';
import theme from '../../theme/themes';

export default function AccountSettingsDropdown({ visible, onClose, navigation, userData }) {
  const vibeAlert = useVibeAlert();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out successfully');
      onClose();
      // Navigation will automatically redirect to auth stack
    } catch (error) {
      console.error('Error logging out:', error);
      vibeAlert.error('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleLocationSettings = () => {
    onClose();
    navigation.navigate('Location');
  };

  const handleNotificationSettings = () => {
    onClose();
    navigation.navigate('NotificationSettings');
  };

  const handlePrivacySettings = () => {
    onClose();
    navigation.navigate('Privacy');
  };

  const handleProfile = () => {
    onClose();
    navigation.navigate('UserProfile');
  };

  const handleInterests = () => {
    onClose();
    navigation.navigate('Interests');
  };

  if (!visible) return null;

  return (
    <View style={styles.dropdown}>
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        style={styles.dropdownContent}
      >
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userData?.userdata?.contactinfo?.firstName && userData?.userdata?.contactinfo?.lastName 
                ? `${userData.userdata.contactinfo.firstName} ${userData.userdata.contactinfo.lastName}`
                : userData?.userdata?.contactinfo?.email || userData?.email || 'User'}
            </Text>
            <Text style={styles.profileEmail}>{userData?.userdata?.studios?.default?.studioName || 'Studio not set'}</Text>
          </View>
          <CloseButton onPress={onClose} />
        </View>

        {/* Settings Options */}
        <View style={styles.separator} />
        
        <TouchableOpacity style={styles.settingItem} onPress={handleProfile}>
          <Text style={styles.settingText}>My Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleInterests}>
          <Text style={styles.settingText}>Interests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleLocationSettings}>
          <Text style={styles.settingText}>Studio Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleNotificationSettings}>
          <Text style={styles.settingText}>Notification Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handlePrivacySettings}>
          <Text style={styles.settingText}>Privacy Settings</Text>
        </TouchableOpacity>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Logout Button */}
        <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
          <Text style={styles.settingText}>Log Out</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    top: 60, // Position below the header
    right: 16,
    width: 250,
    zIndex: 1000,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: theme.colors.vibeBlue,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.3)',
  },
  dropdownContent: {
    padding: 0,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 198, 255, 0.2)',
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
    marginVertical: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  settingText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
});