import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import VibeButton from '../components/ui/VibeButton';
import VibeInput from '../components/ui/VibeInput';
import CloseButton from '../components/ui/CloseButton';
import AttendanceStats from '../components/ui/AttendanceStats';
import ReliabilityBadge from '../components/ui/ReliabilityBadge';
import { useAuth } from '../auth/AuthContext';
import { getFollowStats } from '../services/followService';
import { deleteUserAccount, getUserDeletionPreview } from '../services/userDeletionService';
import { auth } from '../auth/services/firebase';
import theme from '../theme/themes';

function UserProfile({ navigation }) {
  const { userData, logout, currentUserId } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [followStats, setFollowStats] = useState({
    followingCount: 0,
    followerCount: 0,
    mutualCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const contactInfo = userData?.userdata?.contactInfo || {};
  
  // Debug log to see the actual data structure
  console.log('[UserProfile] userData:', userData);
  console.log('[UserProfile] contactInfo:', contactInfo);
  
  const [editedData, setEditedData] = useState({
    firstName: contactInfo.firstName || '',
    lastName: contactInfo.lastName || '',
    email: contactInfo.email || userData?.email || '',
    phone: contactInfo.phone || contactInfo.phoneNumber || userData?.phone || userData?.phoneNumber || '',
    bio: userData?.bio || '',
    location: userData?.location || '',
  });

  const handleSave = async () => {
    // TODO: Save to Firebase
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  };

  const handleDeleteAccount = async () => {
    if (isDeleting) return;

    // First confirmation
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: showDeletionPreview,
        },
      ],
    );
  };

  const showDeletionPreview = async () => {
    try {
      const previewResult = await getUserDeletionPreview(currentUserId);
      
      if (previewResult.error) {
        Alert.alert('Error', 'Unable to preview deletion details.');
        return;
      }

      const { preview } = previewResult;
      const details = [
        `• ${preview.events} events you created will be deleted`,
        `• ${preview.follows} follow relationships will be removed`,
        `• ${preview.notifications} notifications will be deleted`,
        `• ${preview.friendRequests} friend requests will be removed`,
        preview.studios > 0 ? `• You will be removed from ${preview.studios} studio(s)` : '',
        '• All your comments and invitations will be deleted',
        '• Your profile and account will be permanently removed'
      ].filter(Boolean).join('\n');

      // Final confirmation with details
      Alert.alert(
        'Final Confirmation',
        `This will permanently delete:\n\n${details}\n\nType 'DELETE' to confirm this action.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'DELETE ACCOUNT',
            style: 'destructive',
            onPress: performAccountDeletion,
          },
        ],
      );
    } catch (error) {
      console.error('Error showing deletion preview:', error);
      Alert.alert('Error', 'Unable to preview deletion. Please try again.');
    }
  };

  const performAccountDeletion = async () => {
    setIsDeleting(true);
    
    try {
      console.log('[UserProfile] Starting account deletion for:', currentUserId);
      
      const result = await deleteUserAccount(currentUserId, auth.currentUser);
      
      if (result.success) {
        Alert.alert(
          'Account Deleted',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Landing' }],
                });
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        throw new Error(result.message || 'Deletion failed');
      }
    } catch (error) {
      console.error('[UserProfile] Account deletion failed:', error);
      Alert.alert(
        'Deletion Failed',
        error.message || 'Unable to delete account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Load follow statistics
  useEffect(() => {
    const loadFollowStats = async () => {
      if (!currentUserId) return;
      
      setLoadingStats(true);
      try {
        console.log('[UserProfile] Loading follow stats for user:', currentUserId);
        const stats = await getFollowStats(currentUserId);
        setFollowStats(stats);
        console.log('[UserProfile] Follow stats loaded:', stats);
      } catch (error) {
        console.error('[UserProfile] Failed to load follow stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadFollowStats();
  }, [currentUserId]);

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return null;
    
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format US phone numbers (10 digits)
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Format US phone numbers with country code (11 digits starting with 1)
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    // For other formats, just return the original
    return phoneNumber;
  };

  const StatCard = ({ title, value, color = theme.colors.vibeBlue }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

      {/* Profile Picture & Basic Info */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <CloseButton onPress={() => navigation.goBack()} style={styles.closeButton} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {contactInfo?.firstName ? contactInfo.firstName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.profileInfo}>
          {isEditing ? (
            <>
              <VibeInput
                placeholder="First Name"
                value={editedData.firstName}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, firstName: text }))}
                style={styles.editInput}
              />
              <VibeInput
                placeholder="Last Name"
                value={editedData.lastName}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, lastName: text }))}
                style={styles.editInput}
              />
            </>
          ) : (
            <Text style={styles.userName}>
              {contactInfo?.firstName} {contactInfo?.lastName}
            </Text>
          )}
          
          <View style={styles.reliabilityContainer}>
            <ReliabilityBadge 
              userData={userData} 
              size="large"
            />
          </View>
        </View>
      </View>

      {/* Bio Section - Only show if has content OR in edit mode */}
      {(userData?.bio || isEditing) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.bioContainer}>
            {isEditing ? (
              <VibeInput
                placeholder="Tell others about yourself..."
                value={editedData.bio}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, bio: text }))}
                multiline
                numberOfLines={4}
                style={styles.bioInput}
              />
            ) : (
              <Text style={styles.bioText}>
                {userData?.bio}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONTACT</Text>
        <View style={styles.contactContainer}>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Location</Text>
            <Text style={styles.contactValue}>
              {userData?.location || userData?.userdata?.studios?.default?.studioName || 'Not set'}
            </Text>
          </View>
          <View style={styles.contactDivider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Phone *</Text>
            {isEditing ? (
              <VibeInput
                placeholder="Phone number (required)"
                value={editedData.phone}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, phone: text }))}
                style={styles.contactInput}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.contactValue, !(contactInfo?.phone || contactInfo?.phoneNumber || userData?.phone || userData?.phoneNumber) && styles.requiredMissing]}>
                {formatPhoneNumber(contactInfo?.phone || contactInfo?.phoneNumber || userData?.phone || userData?.phoneNumber) || 'Required - Please add phone number'}
              </Text>
            )}
          </View>
          <View style={styles.contactDivider} />
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>Email</Text>
            {isEditing ? (
              <VibeInput
                placeholder="Email address"
                value={editedData.email}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, email: text }))}
                style={styles.contactInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.contactValue}>
                {contactInfo?.email || userData?.email || 'Not set'}
              </Text>
            )}
          </View>
        </View>
      </View>


      {/* Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVITY</Text>
        <View style={styles.statsTable}>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Events Hosted</Text>
            <Text style={styles.statsValue}>
              {userData?.userdata?.metrics?.events?.created || 0}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Events Attended</Text>
            <Text style={styles.statsValue}>
              {userData?.userdata?.metrics?.events?.attended || 0}
            </Text>
          </View>
          <View style={[styles.statsRow, styles.lastRow]}>
            <Text style={styles.statsLabel}>No Shows</Text>
            <Text style={styles.statsValue}>
              {userData?.userdata?.metrics?.events?.noShows || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Social Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SOCIAL</Text>
        <View style={styles.statsTable}>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Mutual Friends</Text>
            <Text style={styles.statsValue}>
              {loadingStats ? '...' : followStats.mutualCount}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Following</Text>
            <Text style={styles.statsValue}>
              {loadingStats ? '...' : followStats.followingCount}
            </Text>
          </View>
          <View style={[styles.statsRow, styles.lastRow]}>
            <Text style={styles.statsLabel}>Followers</Text>
            <Text style={styles.statsValue}>
              {loadingStats ? '...' : followStats.followerCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Attendance Details */}
      {userData?.attendanceStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ATTENDANCE BREAKDOWN</Text>
          <AttendanceStats stats={userData.attendanceStats} />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {isEditing ? (
          <VibeButton
            label="SAVE CHANGES"
            onPress={handleSave}
            style={styles.saveButton}
          />
        ) : (
          <>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Privacy')}
            >
              <Text style={styles.settingsButtonText}>Privacy Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.settingsButtonText}>Notification Settings</Text>
            </TouchableOpacity>

            <View style={styles.buttonSeparator} />

            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting Account...' : 'Delete Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

export default UserProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  avatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    top: 0,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.vibeBlue,
    position: 'absolute',
    right: 20,
    top: 10,
  },
  editButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.vibeBlue,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.vibeBlue,
    shadowColor: theme.colors.vibeBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  avatarText: {
    color: theme.colors.vibeBlue,
    fontSize: 40,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  changePhotoButton: {
    marginTop: 10,
  },
  changePhotoText: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
    textShadowColor: theme.colors.vibeBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  userEmail: {
    color: theme.colors.gray,
    fontSize: 16,
    marginBottom: 15,
    fontFamily: theme.fonts.main,
  },
  reliabilityContainer: {
    marginTop: 10,
  },
  editInput: {
    marginBottom: 10,
    width: 250,
  },
  contactContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  contactDivider: {
    height: 1,
    backgroundColor: theme.colors.vibeBlue,
  },
  contactLabel: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    minWidth: 80,
    marginRight: 20,
  },
  contactValue: {
    color: theme.colors.gray,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    textAlign: 'right',
    flex: 1,
    flexWrap: 'wrap',
  },
  requiredMissing: {
    color: theme.colors.vibeRed,
    fontStyle: 'italic',
  },
  contactInput: {
    marginBottom: 0,
    flex: 1,
    marginLeft: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  sectionTitle: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
    fontFamily: theme.fonts.main,
    textTransform: 'uppercase',
  },
  bioContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    padding: 15,
  },
  bioText: {
    color: theme.colors.white,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: theme.fonts.main,
  },
  bioInput: {
    minHeight: 100,
  },
  statsTable: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.vibeBlue,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  statsLabel: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    textAlign: 'right',
    color: theme.colors.white,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    width: '100%',
  },
  settingsButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    padding: 18,
    marginBottom: 12,
  },
  settingsButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.fonts.main,
  },
  buttonSeparator: {
    height: 1,
    backgroundColor: theme.colors.vibeBlue,
    marginVertical: 20,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.vibeRed,
    padding: 18,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: theme.colors.vibeRed,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: theme.fonts.main,
    textTransform: 'uppercase',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
    borderColor: theme.colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.vibeRed,
    padding: 18,
    marginTop: 20,
  },
  logoutButtonText: {
    color: theme.colors.vibeRed,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: theme.fonts.main,
    textTransform: 'uppercase',
  },
});