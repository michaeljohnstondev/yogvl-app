import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import VibeButton from '../components/ui/VibeButton';
import CloseButton from '../components/ui/CloseButton';
import { useAuth } from '../auth/AuthContext';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import { blockingService } from '../services/blockingService';
import theme from '../theme/themes';

const VISIBILITY_OPTIONS = {
  NEVER: 'never',
  FRIENDS: 'friends',
  ALWAYS: 'always'
};

const VISIBILITY_LABELS = {
  [VISIBILITY_OPTIONS.NEVER]: 'Never',
  [VISIBILITY_OPTIONS.FRIENDS]: 'Mutual Friends Only',
  [VISIBILITY_OPTIONS.ALWAYS]: 'Everyone'
};

function PrivacySettings({ navigation }) {
  const { userData, currentUserId } = useAuth();
  const vibeAlert = useVibeAlert();
  
  const [settings, setSettings] = useState({
    // Contact Information Visibility
    emailVisibility: userData?.userdata?.settings?.privacy?.emailVisibility ?? VISIBILITY_OPTIONS.FRIENDS,
    phoneVisibility: userData?.userdata?.settings?.privacy?.phoneVisibility ?? VISIBILITY_OPTIONS.FRIENDS,
    locationVisibility: userData?.userdata?.settings?.privacy?.locationVisibility ?? VISIBILITY_OPTIONS.ALWAYS,
    
    
    
    // Event Privacy
    requireFollowForEvents: userData?.userdata?.settings?.privacy?.requireFollowForEvents ?? false,
    
    // Data & Analytics
    dataCollectionConsent: userData?.userdata?.settings?.privacy?.dataCollectionConsent ?? true,
    shareLocation: userData?.userdata?.settings?.privacy?.shareLocation ?? false,
    personalizedAds: userData?.userdata?.settings?.privacy?.personalizedAds ?? true,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedUsersData, setBlockedUsersData] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  const toggleSetting = (key) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: !prev[key]
      };
      setHasChanges(true);
      return newSettings;
    });
  };

  const updateVisibilitySetting = (key, value) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: value
      };
      setHasChanges(true);
      return newSettings;
    });
  };

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
                  name: contactInfo.firstName && contactInfo.lastName 
                    ? `${contactInfo.firstName} ${contactInfo.lastName}`
                    : contactInfo.firstName || contactInfo.email || userData.email || 'User',
                  email: contactInfo.email || userData.email
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
          const result = await blockingService.unblockUser(currentUserId, userId);
          if (result.success) {
            setBlockedUsers(prev => prev.filter(id => id !== userId));
            setBlockedUsersData(prev => prev.filter(user => user.id !== userId));
            vibeAlert.success('Unblocked', `You have unblocked ${userName}.`);
          } else {
            vibeAlert.error('Error', 'Failed to unblock user. Please try again.');
          }
        } catch (error) {
          console.error('Error unblocking user:', error);
          vibeAlert.error('Error', 'Failed to unblock user. Please try again.');
        }
      }
    );
  };

  const saveSettings = async () => {
    if (!currentUserId) return;
    
    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        'userdata.settings.privacy': settings,
        'userdata.settings.lastUpdated': new Date()
      });
      
      setHasChanges(false);
      vibeAlert.success('Settings Saved', 'Your privacy preferences have been updated successfully.');
      console.log('[PrivacySettings] Privacy settings saved successfully');
      
    } catch (error) {
      console.error('[PrivacySettings] Error saving privacy settings:', error);
      vibeAlert.error('Error', 'Failed to save privacy settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Privacy Settings',
      'Are you sure you want to reset all privacy settings to their defaults? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setSettings({
              emailVisibility: VISIBILITY_OPTIONS.FRIENDS,
              phoneVisibility: VISIBILITY_OPTIONS.FRIENDS,
              locationVisibility: VISIBILITY_OPTIONS.ALWAYS,
              requireFollowForEvents: false,
              dataCollectionConsent: true,
              shareLocation: false,
              personalizedAds: true,
            });
            setHasChanges(true);
          }
        }
      ]
    );
  };

  // Simple toggle setting component
  const SettingItem = ({ title, description, value, onToggle, isLast = false }) => (
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
          true: theme.colors.vibeBlue,
        }}
        thumbColor={value ? theme.colors.white : theme.colors.gray}
      />
    </View>
  );

  // Visibility picker component
  const VisibilitySettingItem = ({ title, description, value, onValueChange, isLast = false }) => (
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
                value === optionValue && styles.visibilityOptionSelected
              ]}
              onPress={() => onValueChange(optionValue)}
            >
              <Text style={[
                styles.visibilityOptionText,
                value === optionValue && styles.visibilityOptionTextSelected
              ]}>
                {VISIBILITY_LABELS[optionValue]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Privacy Settings</Text>
            <Text style={styles.headerSubtitle}>
              Control who can see your information and how your data is used
            </Text>
          </View>
          <CloseButton onPress={() => navigation.goBack()} />
        </View>
      </View>

      {/* Contact Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
        <View style={styles.settingsGroup}>
          <VisibilitySettingItem
            title="Email Address"
            description="Email address visibility"
            value={settings.emailVisibility}
            onValueChange={(value) => updateVisibilitySetting('emailVisibility', value)}
          />
          <VisibilitySettingItem
            title="Phone Number"
            description="Phone number visibility"
            value={settings.phoneVisibility}
            onValueChange={(value) => updateVisibilitySetting('phoneVisibility', value)}
          />
          <VisibilitySettingItem
            title="Location"
            description="Location information visibility"
            value={settings.locationVisibility}
            onValueChange={(value) => updateVisibilitySetting('locationVisibility', value)}
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


      {/* Data & Analytics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA & ANALYTICS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Location Sharing"
            description="Share your location for better event recommendations"
            value={settings.shareLocation}
            onToggle={() => toggleSetting('shareLocation')}
          />
          <SettingItem
            title="Data Collection"
            description="Allow analytics to improve your experience"
            value={settings.dataCollectionConsent}
            onToggle={() => toggleSetting('dataCollectionConsent')}
          />
          <SettingItem
            title="Personalized Content"
            description="Use your activity to personalize content and ads"
            value={settings.personalizedAds}
            onToggle={() => toggleSetting('personalizedAds')}
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
              <Text style={styles.blockedUserText}>Loading blocked users...</Text>
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
                  index < blockedUsersData.length - 1 && styles.settingBorder
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

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <VibeButton
          label={saving ? "SAVING..." : "SAVE SETTINGS"}
          onPress={saveSettings}
          disabled={!hasChanges || saving}
          style={[
            styles.saveButton,
            (!hasChanges || saving) && styles.disabledButton
          ]}
        />
        
        <TouchableOpacity
          onPress={resetToDefaults}
          style={styles.resetButton}
        >
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Privacy Levels Explained</Text>
        <View style={styles.helpItem}>
          <Text style={styles.helpLabel}>• Never:</Text>
          <Text style={styles.helpText}>Information is never visible to anyone</Text>
        </View>
        <View style={styles.helpItem}>
          <Text style={styles.helpLabel}>• Mutual Friends:</Text>
          <Text style={styles.helpText}>Only people you both follow can see this</Text>
        </View>
        <View style={styles.helpItem}>
          <Text style={styles.helpLabel}>• Everyone:</Text>
          <Text style={styles.helpText}>All app users can see this information</Text>
        </View>
      </View>
    </ScrollView>
  );
}

export default PrivacySettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    marginRight: 15,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
  },
  settingsGroup: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  settingItem: {
    padding: 20,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
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
  resetButton: {
    padding: 15,
    alignItems: 'center',
  },
  resetButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
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
  
  // Help Section
  helpSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    marginTop: 20,
  },
  helpTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  helpItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  helpLabel: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
    width: 100,
  },
  helpText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});