import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { doc, updateDoc, getDoc } from '../lib/firebase';
import { db } from '../auth/services/firebase';
import { VibeButton } from '../components/ui';
import ScreenHeader from '../components/ui/layout/ScreenHeader';
import { useAuth } from '../auth/AuthContext';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import { blockingService } from '../services/blockingService';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../theme/themes';

const VISIBILITY_OPTIONS = {
  NEVER: 'never',
  FRIENDS: 'friends',
  ALWAYS: 'always',
};

const VISIBILITY_LABELS = {
  [VISIBILITY_OPTIONS.NEVER]: 'Never',
  [VISIBILITY_OPTIONS.FRIENDS]: 'Mutual Friends Only',
  [VISIBILITY_OPTIONS.ALWAYS]: 'Everyone',
};

function PrivacySettings({ navigation }) {
  const { userData, currentUserId } = useAuth();
  const vibeAlert = useVibeAlert();

  const [settings, setSettings] = useState({
    // Contact Information Visibility
    emailVisibility:
      userData?.userdata?.settings?.privacy?.emailVisibility ??
      VISIBILITY_OPTIONS.FRIENDS,
    phoneVisibility:
      userData?.userdata?.settings?.privacy?.phoneVisibility ??
      VISIBILITY_OPTIONS.FRIENDS,
    locationVisibility:
      userData?.userdata?.settings?.privacy?.locationVisibility ??
      VISIBILITY_OPTIONS.ALWAYS,

    // Event Privacy
    requireFollowForEvents:
      userData?.userdata?.settings?.privacy?.requireFollowForEvents ?? false,
  });

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedUsersData, setBlockedUsersData] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const saveTimeoutRef = useRef(null);
  const settingsRef = useRef(settings);

  // Keep settingsRef in sync
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Save immediately when screen unmounts
  useEffect(() => {
    return () => {
      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Save immediately on unmount
      if (!isFirstRender && currentUserId) {
        const userRef = doc(db, 'users', currentUserId);
        updateDoc(userRef, {
          'userdata.settings.privacy': settingsRef.current,
          'userdata.settings.lastUpdated': new Date(),
        }).then(() => {
          console.log('[PrivacySettings] Settings saved on unmount');
        }).catch((error) => {
          console.error('[PrivacySettings] Error saving on unmount:', error);
        });
      }
    };
  }, [currentUserId, isFirstRender]);

  const toggleSetting = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const updateVisibilitySetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Auto-save settings when they change (with debounce)
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!currentUserId) return;

      try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
          'userdata.settings.privacy': settings,
          'userdata.settings.lastUpdated': new Date(),
        });
        console.log('[PrivacySettings] Privacy settings auto-saved');
      } catch (error) {
        console.error('[PrivacySettings] Error auto-saving privacy settings:', error);
        vibeAlert.error(
          'Error',
          'Failed to save privacy settings. Please try again.'
        );
      }
    }, 500); // 500ms debounce
  }, [settings, currentUserId, isFirstRender, vibeAlert]);

  // Load blocked users
  useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!currentUserId) return;

      try {
        const result = await blockingService.getBlockedUsers(currentUserId);
        if (result.blockedUsers) {
          setBlockedUsers(result.blockedUsers);

          // Load user data for blocked users
          const usersData = [];
          for (const userId of result.blockedUsers) {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const contactInfo = userData.userdata?.contactInfo || {};
                usersData.push({
                  id: userId,
                  name:
                    contactInfo.firstName && contactInfo.lastName
                      ? `${contactInfo.firstName} ${contactInfo.lastName}`
                      : contactInfo.firstName ||
                        contactInfo.email ||
                        userData.email ||
                        'User',
                  email: contactInfo.email || userData.email,
                });
              }
            } catch (error) {
              console.error('Error loading blocked user data:', error);
            }
          }
          setBlockedUsersData(usersData);
        }
      } catch (error) {
        console.error('Error loading blocked users:', error);
      } finally {
        setLoadingBlocked(false);
      }
    };

    loadBlockedUsers();
  }, [currentUserId]);

  const handleUnblockUser = async (userId, userName) => {
    vibeAlert.confirm(
      'Unblock User',
      `Unblock ${userName}? They will be able to see your profile again.`,
      async () => {
        try {
          const result = await blockingService.unblockUser(
            currentUserId,
            userId
          );
          if (result.success) {
            setBlockedUsers((prev) => prev.filter((id) => id !== userId));
            setBlockedUsersData((prev) =>
              prev.filter((user) => user.id !== userId)
            );
            vibeAlert.success('Unblocked', `You have unblocked ${userName}.`);
          } else {
            vibeAlert.error(
              'Error',
              'Failed to unblock user. Please try again.'
            );
          }
        } catch (error) {
          console.error('Error unblocking user:', error);
          vibeAlert.error('Error', 'Failed to unblock user. Please try again.');
        }
      }
    );
  };

  // Simple toggle setting component
  const SettingItem = ({
    title,
    description,
    value,
    onToggle,
    isLast = false,
  }) => (
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

  // Visibility picker component
  const VisibilitySettingItem = ({
    title,
    description,
    value,
    onValueChange,
    isLast = false,
  }) => (
    <View style={[styles.settingItem, !isLast && styles.settingBorder]}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
        <View style={styles.visibilityOptions}>
          {Object.entries(VISIBILITY_OPTIONS).map(([key, optionValue]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.visibilityOption,
                value === optionValue && styles.visibilityOptionSelected,
              ]}
              onPress={() => onValueChange(optionValue)}
            >
              <Text
                style={[
                  styles.visibilityOptionText,
                  value === optionValue && styles.visibilityOptionTextSelected,
                ]}
              >
                {VISIBILITY_LABELS[optionValue]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Privacy Settings"
        onClose={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false}>

      {/* Contact Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
        <View style={styles.settingsGroup}>
          <VisibilitySettingItem
            title="Email Address"
            description="Email address visibility"
            value={settings.emailVisibility}
            onValueChange={(value) =>
              updateVisibilitySetting('emailVisibility', value)
            }
          />
          <VisibilitySettingItem
            title="Phone Number"
            description="Phone number visibility"
            value={settings.phoneVisibility}
            onValueChange={(value) =>
              updateVisibilitySetting('phoneVisibility', value)
            }
          />
          <VisibilitySettingItem
            title="Location"
            description="Location information visibility"
            value={settings.locationVisibility}
            onValueChange={(value) =>
              updateVisibilitySetting('locationVisibility', value)
            }
            isLast
          />
        </View>
      </View>

      {/* Profile Privacy Section */}

      {/* Event Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EVENT PRIVACY</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Friends-Only Events"
            description="Only friends can see your events"
            value={settings.requireFollowForEvents}
            onToggle={() => toggleSetting('requireFollowForEvents')}
            isLast
          />
        </View>
      </View>

      {/* Blocked Users Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BLOCKED USERS</Text>
        <View style={styles.settingsGroup}>
          {loadingBlocked ? (
            <View style={styles.blockedUserItem}>
              <Text style={styles.blockedUserText}>
                Loading blocked users...
              </Text>
            </View>
          ) : blockedUsersData.length === 0 ? (
            <View style={styles.blockedUserItem}>
              <Text style={styles.blockedUserText}>No blocked users</Text>
            </View>
          ) : (
            blockedUsersData.map((user, index) => (
              <View
                key={user.id}
                style={[
                  styles.blockedUserItem,
                  index < blockedUsersData.length - 1 && styles.settingBorder,
                ]}
              >
                <View style={styles.blockedUserInfo}>
                  <Text style={styles.blockedUserName}>{user.name}</Text>
                  <Text style={styles.blockedUserEmail}>{user.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleUnblockUser(user.id, user.name)}
                  style={styles.unblockButton}
                >
                  <Text style={styles.unblockButtonText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LEGAL</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity
            style={styles.legalItem}
            onPress={() => Linking.openURL('https://bigvibestudios.com/privacy')}
          >
            <Text style={styles.legalText}>Privacy Policy</Text>
            <Text style={styles.legalArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.settingBorder} />

          <TouchableOpacity
            style={styles.legalItem}
            onPress={() => Linking.openURL('mailto:support@bigvibestudios.com')}
          >
            <Text style={styles.legalText}>Contact Support</Text>
            <Text style={styles.legalArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: 40 }} />

      </ScrollView>
    </View>
  );
}

export default PrivacySettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontFamily: theme.fonts.comicBold,
    letterSpacing: 1,
    marginBottom: 15,
  },
  settingsGroup: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
  },
  settingItem: {
    padding: 20,
  },
  settingBorder: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.vibeBlue,
  },
  settingContent: {
    flex: 1,
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
    marginBottom: 15,
  },

  // Visibility Options
  visibilityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visibilityOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
  },
  visibilityOptionSelected: {
    borderColor: theme.colors.vibeBlue,
    backgroundColor: theme.colors.vibeBlue + '20',
  },
  visibilityOptionText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  visibilityOptionTextSelected: {
    color: theme.colors.vibeBlue,
    fontWeight: '600',
  },

  // Buttons
  buttonContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  saveButton: {
    width: '100%',
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Blocked Users Section
  blockedUserItem: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockedUserInfo: {
    flex: 1,
  },
  blockedUserName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  blockedUserEmail: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  blockedUserText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  unblockButton: {
    backgroundColor: theme.colors.vibeBlue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  unblockButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  // Legal Section
  legalItem: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legalText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  legalArrow: {
    color: theme.colors.vibeBlue,
    fontSize: 20,
    fontWeight: '600',
  },
});
