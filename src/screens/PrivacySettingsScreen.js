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
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import VibeButton from '../components/ui/VibeButton';
import { useAuth } from '../auth/AuthContext';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import theme from '../theme/themes';

const VISIBILITY_OPTIONS = {
  NEVER: 'never',
  FRIENDS: 'friends',
  FOLLOWERS: 'followers', 
  ALWAYS: 'always'
};

const VISIBILITY_LABELS = {
  [VISIBILITY_OPTIONS.NEVER]: 'Never',
  [VISIBILITY_OPTIONS.FRIENDS]: 'Mutual Friends Only',
  [VISIBILITY_OPTIONS.FOLLOWERS]: 'Followers Only',
  [VISIBILITY_OPTIONS.ALWAYS]: 'Everyone'
};

function PrivacySettings({ navigation }) {
  const { userData, currentUserId } = useAuth();
  const vibeAlert = useVibeAlert();
  
  const [settings, setSettings] = useState({
    // Contact Information Visibility
    emailVisibility: userData?.userdata?.settings?.privacy?.emailVisibility ?? VISIBILITY_OPTIONS.FRIENDS,
    phoneVisibility: userData?.userdata?.settings?.privacy?.phoneVisibility ?? VISIBILITY_OPTIONS.FRIENDS,
    locationVisibility: userData?.userdata?.settings?.privacy?.locationVisibility ?? VISIBILITY_OPTIONS.FOLLOWERS,
    
    // Profile Visibility
    profileVisibility: userData?.userdata?.settings?.privacy?.profileVisibility ?? true,
    showOnlineStatus: userData?.userdata?.settings?.privacy?.showOnlineStatus ?? true,
    showLastSeen: userData?.userdata?.settings?.privacy?.showLastSeen ?? VISIBILITY_OPTIONS.FRIENDS,
    
    // Follow Privacy
    allowFollowRequests: userData?.userdata?.settings?.privacy?.allowFollowRequests ?? true,
    showFollowerCounts: userData?.userdata?.settings?.privacy?.showFollowerCounts ?? true,
    whoCanFollowMe: userData?.userdata?.settings?.privacy?.whoCanFollowMe ?? VISIBILITY_OPTIONS.ALWAYS,
    
    // Event Privacy
    allowEventDiscovery: userData?.userdata?.settings?.privacy?.allowEventDiscovery ?? true,
    requireFollowForEvents: userData?.userdata?.settings?.privacy?.requireFollowForEvents ?? false,
    shareEventHistory: userData?.userdata?.settings?.privacy?.shareEventHistory ?? VISIBILITY_OPTIONS.FOLLOWERS,
    showAttendanceStats: userData?.userdata?.settings?.privacy?.showAttendanceStats ?? true,
    eventJoinVisibility: userData?.userdata?.settings?.privacy?.eventJoinVisibility ?? VISIBILITY_OPTIONS.FOLLOWERS,
    
    // Activity Privacy
    showActivityStatus: userData?.userdata?.settings?.privacy?.showActivityStatus ?? VISIBILITY_OPTIONS.FRIENDS,
    shareRecentActivity: userData?.userdata?.settings?.privacy?.shareRecentActivity ?? VISIBILITY_OPTIONS.FOLLOWERS,
    
    // Data & Analytics
    dataCollectionConsent: userData?.userdata?.settings?.privacy?.dataCollectionConsent ?? true,
    shareLocation: userData?.userdata?.settings?.privacy?.shareLocation ?? false,
    personalizedAds: userData?.userdata?.settings?.privacy?.personalizedAds ?? true,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

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
              locationVisibility: VISIBILITY_OPTIONS.FOLLOWERS,
              profileVisibility: true,
              showOnlineStatus: true,
              showLastSeen: VISIBILITY_OPTIONS.FRIENDS,
              allowFollowRequests: true,
              showFollowerCounts: true,
              whoCanFollowMe: VISIBILITY_OPTIONS.ALWAYS,
              allowEventDiscovery: true,
              requireFollowForEvents: false,
              shareEventHistory: VISIBILITY_OPTIONS.FOLLOWERS,
              showAttendanceStats: true,
              eventJoinVisibility: VISIBILITY_OPTIONS.FOLLOWERS,
              showActivityStatus: VISIBILITY_OPTIONS.FRIENDS,
              shareRecentActivity: VISIBILITY_OPTIONS.FOLLOWERS,
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <Text style={styles.headerSubtitle}>
          Control who can see your information and how your data is used
        </Text>
      </View>

      {/* Contact Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
        <View style={styles.settingsGroup}>
          <VisibilitySettingItem
            title="Email Address"
            description="Who can see your email address"
            value={settings.emailVisibility}
            onValueChange={(value) => updateVisibilitySetting('emailVisibility', value)}
          />
          <VisibilitySettingItem
            title="Phone Number"
            description="Who can see your phone number"
            value={settings.phoneVisibility}
            onValueChange={(value) => updateVisibilitySetting('phoneVisibility', value)}
          />
          <VisibilitySettingItem
            title="Location"
            description="Who can see your location information"
            value={settings.locationVisibility}
            onValueChange={(value) => updateVisibilitySetting('locationVisibility', value)}
            isLast
          />
        </View>
      </View>

      {/* Profile Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PROFILE PRIVACY</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Profile Visibility"
            description="Allow others to find and view your profile"
            value={settings.profileVisibility}
            onToggle={() => toggleSetting('profileVisibility')}
          />
          <SettingItem
            title="Online Status"
            description="Show when you're active on the app"
            value={settings.showOnlineStatus}
            onToggle={() => toggleSetting('showOnlineStatus')}
          />
          <VisibilitySettingItem
            title="Last Seen"
            description="Who can see when you were last active"
            value={settings.showLastSeen}
            onValueChange={(value) => updateVisibilitySetting('showLastSeen', value)}
            isLast
          />
        </View>
      </View>

      {/* Follow Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FOLLOW PRIVACY</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Allow Follow Requests"
            description="Let others follow you to see your events"
            value={settings.allowFollowRequests}
            onToggle={() => toggleSetting('allowFollowRequests')}
          />
          <VisibilitySettingItem
            title="Who Can Follow Me"
            description="Control who is allowed to follow you"
            value={settings.whoCanFollowMe}
            onValueChange={(value) => updateVisibilitySetting('whoCanFollowMe', value)}
          />
          <SettingItem
            title="Show Follower Counts"
            description="Display your follower and following numbers publicly"
            value={settings.showFollowerCounts}
            onToggle={() => toggleSetting('showFollowerCounts')}
            isLast
          />
        </View>
      </View>

      {/* Event Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EVENT PRIVACY</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Event Discovery"
            description="Allow your public events to appear in discovery feeds"
            value={settings.allowEventDiscovery}
            onToggle={() => toggleSetting('allowEventDiscovery')}
          />
          <SettingItem
            title="Follower-Only Events"
            description="Require users to follow you to see your events"
            value={settings.requireFollowForEvents}
            onToggle={() => toggleSetting('requireFollowForEvents')}
          />
          <VisibilitySettingItem
            title="Event History"
            description="Who can see your past events"
            value={settings.shareEventHistory}
            onValueChange={(value) => updateVisibilitySetting('shareEventHistory', value)}
          />
          <VisibilitySettingItem
            title="Event Attendance"
            description="Who can see which events you've joined"
            value={settings.eventJoinVisibility}
            onValueChange={(value) => updateVisibilitySetting('eventJoinVisibility', value)}
          />
          <SettingItem
            title="Attendance Statistics"
            description="Show your reliability and attendance stats"
            value={settings.showAttendanceStats}
            onToggle={() => toggleSetting('showAttendanceStats')}
            isLast
          />
        </View>
      </View>

      {/* Activity Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVITY PRIVACY</Text>
        <View style={styles.settingsGroup}>
          <VisibilitySettingItem
            title="Activity Status"
            description="Who can see your recent app activity"
            value={settings.showActivityStatus}
            onValueChange={(value) => updateVisibilitySetting('showActivityStatus', value)}
          />
          <VisibilitySettingItem
            title="Recent Activity"
            description="Who can see your recent events and interactions"
            value={settings.shareRecentActivity}
            onValueChange={(value) => updateVisibilitySetting('shareRecentActivity', value)}
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
          <Text style={styles.helpLabel}>• Followers:</Text>
          <Text style={styles.helpText}>Anyone who follows you can see this</Text>
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
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
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