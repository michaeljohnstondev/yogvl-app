import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  VibeButton,
  VibeInput,
  CloseButton,
  FollowButton,
  BlockButton,
  AttendanceStats,
  ReliabilityBadge,
  ProfileAvatar,
  QRCodeGenerator,
  ProfileSectionCard,
  ContactItem,
  UserStatsGrid,
  ProfileActionButtons,
} from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import {
  getFollowStats,
  getUserRelationshipStatus,
} from '../services/followService';
import { useFollowActions } from '../hooks/useFollowActions';
import {
  deleteUserAccount,
  getUserDeletionPreview,
} from '../services/userDeletionService';
import {
  uploadProfilePicture,
  removeProfilePicture,
  hasProfilePicture,
} from '../services/profilePictureService';
import { blockingService } from '../services/blockingService';
import { getVisibleContactInfo } from '../services/privacyService';
import { reportUser } from '../services/reportingService';
import { auth } from '../auth/services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import theme from '../theme/themes';
import { styles } from './UserProfileScreen.styles';

function UserProfile({ navigation, route }) {
  const { userData, logout, currentUserId } = useAuth();
  const vibeAlert = useVibeAlert();

  // Check if viewing someone else's profile or own profile
  const targetUserId = route?.params?.userId || currentUserId;
  const isOwnProfile = targetUserId === currentUserId;

  // Debug logging
  console.log('[UserProfile] Debug - currentUserId:', currentUserId);
  console.log('[UserProfile] Debug - targetUserId:', targetUserId);
  console.log('[UserProfile] Debug - isOwnProfile:', isOwnProfile);
  console.log('[UserProfile] Debug - route params:', route?.params);

  const [isEditing, setIsEditing] = useState(false);
  const [followStats, setFollowStats] = useState({
    followingCount: 0,
    followerCount: 0,
    mutualCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [targetUserData, setTargetUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [visibleContactInfo, setVisibleContactInfo] = useState({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Use existing follow actions hook
  const {
    handleFollow: followAction,
    handleUnfollow: unfollowAction,
    isActionLoading,
  } = useFollowActions(currentUserId, userData, loadFollowStats, null);

  // Wrapper functions to handle targetUserId
  const handleFollow = () => followAction(targetUserId);
  const handleUnfollow = () => unfollowAction(targetUserId);
  const followLoading = isActionLoading(targetUserId);

  const handleBlockUser = async () => {
    if (!currentUserId || !targetUserId) return;

    vibeAlert.confirm(
      'Block User',
      'Are you sure you want to block this user? They will not be able to see your profile or invite you to events.',
      async () => {
        try {
          const result = await blockingService.blockUser(
            currentUserId,
            targetUserId
          );

          if (result.success) {
            setIsBlocked(true);
            vibeAlert.success('User Blocked', 'This user has been blocked');
            // Navigate back since we blocked them
            setTimeout(() => navigation.goBack(), 1500);
          } else {
            vibeAlert.error('Error', result.message || 'Failed to block user');
          }
        } catch (error) {
          console.error('[UserProfile] Error blocking user:', error);
          vibeAlert.error('Error', 'Failed to block user');
        }
      }
    );
  };

  // Use target user's data if viewing someone else, otherwise use current user's data
  const displayUserData = isOwnProfile ? userData : targetUserData;
  const contactInfo = isOwnProfile
    ? displayUserData?.userdata?.contactInfo || {}
    : visibleContactInfo;

  const [editedData, setEditedData] = useState({
    firstName: contactInfo.firstName || '',
    lastName: contactInfo.lastName || '',
    email: contactInfo.email || displayUserData?.email || '',
    phone:
      contactInfo.phone ||
      contactInfo.phoneNumber ||
      displayUserData?.phone ||
      displayUserData?.phoneNumber ||
      '',
    bio: displayUserData?.bio || '',
    location: displayUserData?.location || '',
  });

  const handleSave = async () => {
    if (!currentUserId || isSaving) {
      vibeAlert.error('Error', 'Unable to save profile changes');
      return;
    }

    // Validate required fields
    if (!editedData.firstName.trim()) {
      vibeAlert.error('Error', 'First name is required');
      return;
    }

    if (!editedData.phone.trim()) {
      vibeAlert.error('Error', 'Phone number is required');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare the update data
      const updateData = {
        'userdata.contactInfo.firstName': editedData.firstName.trim(),
        'userdata.contactInfo.lastName': editedData.lastName.trim(),
        'userdata.contactInfo.email': editedData.email.trim(),
        'userdata.contactInfo.phone': editedData.phone.trim(),
        bio: editedData.bio.trim(),
        location: editedData.location.trim(),
        'userdata.lastUpdated': new Date(),
      };

      // Update the user document in Firestore
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, updateData);

      vibeAlert.success('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      vibeAlert.error('Error', 'Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePicturePress = () => {
    if (uploadingPhoto) return;

    const options = [
      'Take Photo',
      'Choose from Library',
      ...(hasProfilePicture(userData) ? ['Remove Photo'] : []),
      'Cancel',
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: hasProfilePicture(userData) ? 2 : undefined,
          title: 'Profile Picture',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openCamera();
          } else if (buttonIndex === 1) {
            openImageLibrary();
          } else if (buttonIndex === 2 && hasProfilePicture(userData)) {
            handleRemovePhoto();
          }
        }
      );
    } else {
      vibeAlert.menu('Profile Picture', 'Choose an option', [
        { text: 'Take Photo', onPress: openCamera },
        { text: 'Choose from Library', onPress: openImageLibrary },
        ...(hasProfilePicture(userData)
          ? [
              {
                text: 'Remove Photo',
                onPress: handleRemovePhoto,
                style: 'destructive',
              },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      vibeAlert.error(
        'Permission needed',
        'Camera permission is required to take photos.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageUpload(result.assets[0].uri);
    }
  };

  const openImageLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      vibeAlert.error(
        'Permission needed',
        'Photo library permission is required to choose photos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageUpload(result.assets[0].uri);
    }
  };

  const handleImageUpload = async (imageUri) => {
    if (!imageUri) {
      vibeAlert.error('Error', 'No image selected');
      return;
    }

    setUploadingPhoto(true);
    try {
      console.log('Uploading image:', imageUri);
      const result = await uploadProfilePicture(
        currentUserId,
        imageUri,
        userData
      );
      if (result.success) {
        vibeAlert.success('Success', 'Profile picture updated!');
        // The UI will automatically update when the user data refreshes
      } else {
        console.error('Upload failed:', result.error);
        vibeAlert.error(
          'Error',
          result.error || 'Failed to update profile picture'
        );
      }
    } catch (error) {
      console.error('Upload error:', error);
      vibeAlert.error('Error', 'Failed to update profile picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    // Small delay to allow the menu alert to close first
    setTimeout(() => {
      vibeAlert.confirm(
        'Remove Photo',
        'Are you sure you want to remove your profile picture?',
        async () => {
          setUploadingPhoto(true);
          try {
            const result = await removeProfilePicture(currentUserId, userData);
            if (result.success) {
              vibeAlert.success('Success', 'Profile picture removed!');
            } else {
              vibeAlert.error(
                'Error',
                result.error || 'Failed to remove profile picture'
              );
            }
          } catch (error) {
            vibeAlert.error('Error', 'Failed to remove profile picture');
          } finally {
            setUploadingPhoto(false);
          }
        }
      );
    }, 100);
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  };

  // Report user functionality
  const handleReportUser = () => {
    if (!targetUserData || !currentUserId) {
      vibeAlert.error('Error', 'Unable to report user at this time.');
      return;
    }

    // Show report categories directly
    vibeAlert.redmenu(
      'Report User',
      'Select the reason for reporting this user:',
      [
        {
          text: 'Inappropriate Content',
          onPress: () => submitUserReport('inappropriate_content'),
        },
        {
          text: 'Spam/Fake Profile',
          onPress: () => submitUserReport('spam'),
        },
        {
          text: 'Harassment/Bullying',
          onPress: () => submitUserReport('harassment'),
        },
        {
          text: 'Other Violation',
          onPress: () => submitUserReport('other'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {},
        },
      ]
    );
  };

  const submitUserReport = async (reason) => {
    try {
      const result = await reportUser(currentUserId, targetUserId, reason);

      if (result.success) {
        vibeAlert.success('Report Submitted', result.message);
      } else {
        vibeAlert.error('Error', 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('[UserProfile] Error reporting user:', error);
      vibeAlert.error(
        'Error',
        error.message || 'Failed to submit report. Please try again.'
      );
    }
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
      ]
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
        preview.studios > 0
          ? `• You will be removed from ${preview.studios} studio(s)`
          : '',
        '• All your comments and invitations will be deleted',
        '• Your profile and account will be permanently removed',
      ]
        .filter(Boolean)
        .join('\n');

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
        ]
      );
    } catch (error) {
      console.error('Error showing deletion preview:', error);
      Alert.alert('Error', 'Unable to preview deletion. Please try again.');
    }
  };

  const performAccountDeletion = async () => {
    setIsDeleting(true);

    try {
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
      Alert.alert(
        'Deletion Failed',
        error.message ||
          'Unable to delete account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Load follow statistics
  const loadFollowStats = async () => {
    const profileUserId = isOwnProfile ? currentUserId : targetUserId;
    if (!profileUserId) return;

    setLoadingStats(true);
    try {
      const stats = await getFollowStats(profileUserId);
      setFollowStats(stats);
    } catch (error) {
      console.error('[UserProfile] Failed to load follow stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch target user's data if viewing someone else's profile
  useEffect(() => {
    const fetchTargetUserData = async () => {
      if (isOwnProfile || !targetUserId || !currentUserId) {
        setTargetUserData(null);
        setVisibleContactInfo({});
        return;
      }

      setLoadingUserData(true);
      try {
        const userRef = doc(db, 'users', targetUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = { id: userSnap.id, ...userSnap.data() };
          setTargetUserData(userData);

          // Get visible contact info based on privacy settings
          const visibleInfo = await getVisibleContactInfo(
            currentUserId,
            userData
          );
          setVisibleContactInfo(visibleInfo);
        } else {
          vibeAlert.error('User Not Found', 'This user does not exist.');
          navigation.goBack();
        }
      } catch (error) {
        console.error('[UserProfile] Error fetching target user data:', error);
        vibeAlert.error('Error', 'Failed to load user profile.');
        navigation.goBack();
      } finally {
        setLoadingUserData(false);
      }
    };

    fetchTargetUserData();
  }, [targetUserId, isOwnProfile, currentUserId, navigation, vibeAlert]);

  // Update editedData when displayUserData changes
  useEffect(() => {
    if (displayUserData) {
      const contactInfo = displayUserData?.userdata?.contactInfo || {};
      setEditedData({
        firstName: contactInfo.firstName || '',
        lastName: contactInfo.lastName || '',
        email: contactInfo.email || displayUserData?.email || '',
        phone:
          contactInfo.phone ||
          contactInfo.phoneNumber ||
          displayUserData?.phone ||
          displayUserData?.phoneNumber ||
          '',
        bio: displayUserData?.bio || '',
        location: displayUserData?.location || '',
      });
    }
  }, [displayUserData]);

  useEffect(() => {
    loadFollowStats();
  }, [currentUserId, targetUserId, isOwnProfile]);

  // OPTIMIZED: Single useEffect for all relationship status checks
  useEffect(() => {
    const checkAllRelationshipStatus = async () => {
      if (isOwnProfile || !currentUserId || !targetUserId) return;

      try {
        // Single optimized call that gets follow + block status in 3 Firebase reads instead of 4-5
        const relationshipStatus = await getUserRelationshipStatus(
          currentUserId,
          targetUserId
        );

        if (!relationshipStatus.success) {
          console.error(
            '[UserProfile] Failed to get relationship status:',
            relationshipStatus.error
          );
          return;
        }

        setIsFollowing(relationshipStatus.isFollowing);
        setIsBlocked(relationshipStatus.isBlocked);

        // Handle blocked by target user - redirect away from profile
        if (relationshipStatus.isBlockedBy) {
          console.log(
            '[UserProfile] Access denied - user is blocked by target'
          );
          vibeAlert.error('User Not Available', 'This user is not available.');
          setTimeout(() => navigation.goBack(), 1500);
          return;
        }
      } catch (error) {
        console.error(
          '[UserProfile] Error checking relationship status:',
          error
        );
      }
    };

    checkAllRelationshipStatus();
  }, [currentUserId, targetUserId, isOwnProfile, navigation, vibeAlert]);

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

  const formatJoinDate = (timestamp) => {
    if (!timestamp) return 'Recently joined';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const options = { year: 'numeric', month: 'long' };
      return `Joined ${date.toLocaleDateString(undefined, options)}`;
    } catch {
      return 'Recently joined';
    }
  };

  // Show loading while fetching target user data
  if (!isOwnProfile && loadingUserData) {
    return (
      <View style={styles.container}>
        <CloseButton
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        />
        <View
          style={[
            styles.container,
            { justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Profile Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Top buttons row */}
        <View style={styles.topButtonsRow}>
          <CloseButton
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          />
          {(() => {
            const actionButtons = ProfileActionButtons({
              isOwnProfile,
              targetUserId,
              currentUserId,
              isEditing,
              setIsEditing,
              onReportUser: handleReportUser,
            });
            return actionButtons.topButtons;
          })()}
        </View>

        {/* Centered Profile Picture */}
        <View style={styles.profilePictureSection}>
          <TouchableOpacity
            onPress={isOwnProfile ? handleProfilePicturePress : undefined}
          >
            <ProfileAvatar
              userData={displayUserData}
              size={120}
              isLoading={uploadingPhoto}
              showBorder={true}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Info Section */}
        <View style={styles.profileInfoSection}>
          <Text style={styles.joinDate}>
            {formatJoinDate(displayUserData?.userdata?.metadata?.createdAt)}
          </Text>

          {/* Only show reliability badge if user has been rated */}
          {(displayUserData?.ratings?.stars?.length > 0 ||
            displayUserData?.userdata?.metrics?.engagement?.totalRatings >
              0) && (
            <View style={styles.reliabilityContainer}>
              <ReliabilityBadge userData={displayUserData} size="large" />
            </View>
          )}
        </View>

        {/* Bio Section - Only show if has content OR in edit mode */}
        {(displayUserData?.bio || isEditing) && (
          <ProfileSectionCard title="About Me">
            {isEditing ? (
              <VibeInput
                placeholder="Tell others about yourself..."
                value={editedData.bio}
                onChangeText={(text) =>
                  setEditedData((prev) => ({ ...prev, bio: text }))
                }
                multiline
                numberOfLines={4}
                maxLength={300}
                style={styles.bioInput}
              />
            ) : (
              <Text style={styles.aboutText}>{displayUserData?.bio}</Text>
            )}
          </ProfileSectionCard>
        )}

        {/* Contact Section */}
        <ProfileSectionCard title="Contact Info">
          <ContactItem icon="👤">
            {isEditing ? (
              <View style={styles.nameEditContainer}>
                <VibeInput
                  placeholder="First Name"
                  value={editedData.firstName}
                  onChangeText={(text) =>
                    setEditedData((prev) => ({ ...prev, firstName: text }))
                  }
                  style={styles.nameInput}
                />
                <VibeInput
                  placeholder="Last Name"
                  value={editedData.lastName}
                  onChangeText={(text) =>
                    setEditedData((prev) => ({ ...prev, lastName: text }))
                  }
                  style={styles.nameInput}
                />
              </View>
            ) : (
              <Text style={styles.contactText}>
                {contactInfo?.firstName && contactInfo?.lastName
                  ? `${contactInfo.firstName} ${contactInfo.lastName}`
                  : contactInfo?.firstName ||
                    contactInfo?.lastName ||
                    contactInfo?.email?.split('@')[0] ||
                    displayUserData?.email?.split('@')[0] ||
                    'User'}
              </Text>
            )}
          </ContactItem>
          {(isOwnProfile
            ? displayUserData?.location ||
              displayUserData?.userdata?.studios?.default?.studioName
            : contactInfo?.location) && (
            <ContactItem
              icon="📍"
              text={
                isOwnProfile
                  ? displayUserData?.location ||
                    displayUserData?.userdata?.studios?.default?.studioName ||
                    'Not set'
                  : contactInfo?.location
              }
            />
          )}
          {(isEditing || isOwnProfile || contactInfo?.phone) && (
            <ContactItem icon="📞">
              {isEditing ? (
                <VibeInput
                  placeholder="Phone number (required)"
                  value={editedData.phone}
                  onChangeText={(text) =>
                    setEditedData((prev) => ({ ...prev, phone: text }))
                  }
                  style={styles.contactInput}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text
                  style={[
                    styles.contactText,
                    !contactInfo?.phone &&
                      isOwnProfile &&
                      styles.requiredMissing,
                  ]}
                >
                  {isOwnProfile
                    ? formatPhoneNumber(
                        contactInfo?.phone ||
                          contactInfo?.phoneNumber ||
                          displayUserData?.phone ||
                          displayUserData?.phoneNumber
                      ) || 'Required - Please add phone number'
                    : formatPhoneNumber(contactInfo?.phone)}
                </Text>
              )}
            </ContactItem>
          )}
          {(isEditing || isOwnProfile || contactInfo?.email) && (
            <ContactItem icon="📧" isLast={true}>
              {isEditing ? (
                <VibeInput
                  placeholder="Email address"
                  value={editedData.email}
                  onChangeText={(text) =>
                    setEditedData((prev) => ({ ...prev, email: text }))
                  }
                  style={styles.contactInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.contactText}>
                  {isOwnProfile
                    ? contactInfo?.email || displayUserData?.email || 'Not set'
                    : contactInfo?.email}
                </Text>
              )}
            </ContactItem>
          )}
        </ProfileSectionCard>

        {/* Activity Section */}
        <ProfileSectionCard title="Events">
          <UserStatsGrid
            stats={[
              {
                value: displayUserData?.userdata?.metrics?.events?.created || 0,
                label: 'Hosted',
              },
              {
                value:
                  displayUserData?.userdata?.metrics?.events?.attended || 0,
                label: 'Attended',
              },
              {
                value: displayUserData?.userdata?.metrics?.events?.noShows || 0,
                label: 'No Shows',
              },
            ]}
          />
        </ProfileSectionCard>

        {/* Social Section */}
        <ProfileSectionCard title="Social">
          <UserStatsGrid
            stats={[
              {
                value: loadingStats ? '...' : followStats.mutualCount,
                label: 'Friends',
                onPress: isOwnProfile
                  ? () =>
                      navigation.navigate('SocialList', {
                        userId: currentUserId,
                        type: 'friends',
                        onStatsChange: loadFollowStats,
                      })
                  : undefined,
              },
              {
                value: loadingStats ? '...' : followStats.followingCount,
                label: 'Following',
                onPress: isOwnProfile
                  ? () =>
                      navigation.navigate('SocialList', {
                        userId: currentUserId,
                        type: 'following',
                        onStatsChange: loadFollowStats,
                      })
                  : undefined,
              },
              {
                value: loadingStats ? '...' : followStats.followerCount,
                label: 'Followers',
                onPress: isOwnProfile
                  ? () =>
                      navigation.navigate('SocialList', {
                        userId: currentUserId,
                        type: 'followers',
                        onStatsChange: loadFollowStats,
                      })
                  : undefined,
              },
            ]}
            isOwnProfile={isOwnProfile}
          />
        </ProfileSectionCard>

        {/* QR Code Section - Only for own profile */}
        {isOwnProfile && (
          <ProfileSectionCard title="Share Profile">
            <QRCodeGenerator
              type="user"
              data={currentUserId}
              size={180}
              showShareButton={false}
            />
          </ProfileSectionCard>
        )}

        {/* Attendance Details */}
        {displayUserData?.attendanceStats && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Attendance Breakdown</Text>
            <View style={styles.contactSection}>
              <AttendanceStats stats={displayUserData.attendanceStats} />
            </View>
          </View>
        )}

        {/* Bottom Action Buttons */}
        {isEditing ? (
          <View style={styles.buttonContainer}>
            <VibeButton
              label={isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              onPress={handleSave}
              style={styles.saveButton}
              disabled={isSaving}
            />
          </View>
        ) : (
          (() => {
            const actionButtons = ProfileActionButtons({
              isOwnProfile,
              targetUserId,
              currentUserId,
              isEditing,
              setIsEditing,
              onReportUser: handleReportUser,
              // Follow/block props
              isFollowing,
              isFollowLoading: followLoading,
              onFollow: handleFollow,
              onUnfollow: handleUnfollow,
              isBlocked,
              isBlockLoading: false, // Add if needed
              onBlock: handleBlockUser,
              onUnblock: handleBlockUser, // Same handler for now
              // Own profile actions
              onSettings: () => navigation.navigate('Settings'),
              onNotificationSettings: () =>
                navigation.navigate('Notifications'),
              onPrivacySettings: () => navigation.navigate('Privacy'),
              onLogout: handleLogout,
              onDeleteAccount: handleDeleteAccount,
            });
            return actionButtons.bottomButtons;
          })()
        )}
      </ScrollView>
    </View>
  );
}

export default UserProfile;
