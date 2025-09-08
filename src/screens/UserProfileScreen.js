import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import VibeButton from '../components/ui/VibeButton';
import VibeInput from '../components/ui/VibeInput';
import CloseButton from '../components/ui/CloseButton';
import AttendanceStats from '../components/ui/AttendanceStats';
import ReliabilityBadge from '../components/ui/ReliabilityBadge';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import QRCodeGenerator from '../components/ui/QRCodeGenerator';
import { useAuth } from '../auth/AuthContext';
import { getFollowStats } from '../services/followService';
import { deleteUserAccount, getUserDeletionPreview } from '../services/userDeletionService';
import { uploadProfilePicture, removeProfilePicture, hasProfilePicture } from '../services/profilePictureService';
import { blockingService } from '../services/blockingService';
import { getVisibleContactInfo } from '../services/privacyService';
import { reportUser } from '../services/reportingService';
import { auth } from '../auth/services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import theme from '../theme/themes';

function UserProfile({ navigation, route }) {
  const { userData, logout, currentUserId } = useAuth();
  const vibeAlert = useVibeAlert();
  
  // Check if viewing someone else's profile or own profile
  const targetUserId = route?.params?.userId || currentUserId;
  const isOwnProfile = targetUserId === currentUserId;
  
  const [isEditing, setIsEditing] = useState(false);
  const [followStats, setFollowStats] = useState({
    followingCount: 0,
    followerCount: 0,
    mutualCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [targetUserData, setTargetUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [visibleContactInfo, setVisibleContactInfo] = useState({});
  
  // Use target user's data if viewing someone else, otherwise use current user's data
  const displayUserData = isOwnProfile ? userData : targetUserData;
  const contactInfo = isOwnProfile ? (displayUserData?.userdata?.contactInfo || {}) : visibleContactInfo;
  
  const [editedData, setEditedData] = useState({
    firstName: contactInfo.firstName || '',
    lastName: contactInfo.lastName || '',
    email: contactInfo.email || displayUserData?.email || '',
    phone: contactInfo.phone || contactInfo.phoneNumber || displayUserData?.phone || displayUserData?.phoneNumber || '',
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
        'bio': editedData.bio.trim(),
        'location': editedData.location.trim(),
        'userdata.lastUpdated': new Date()
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
      'Cancel'
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
      vibeAlert.menu(
        'Profile Picture',
        'Choose an option',
        [
          { text: 'Take Photo', onPress: openCamera },
          { text: 'Choose from Library', onPress: openImageLibrary },
          ...(hasProfilePicture(userData) ? [{ text: 'Remove Photo', onPress: handleRemovePhoto, style: 'destructive' }] : []),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      vibeAlert.error('Permission needed', 'Camera permission is required to take photos.');
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
      vibeAlert.error('Permission needed', 'Photo library permission is required to choose photos.');
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
      const result = await uploadProfilePicture(currentUserId, imageUri, userData);
      if (result.success) {
        vibeAlert.success('Success', 'Profile picture updated!');
        // The UI will automatically update when the user data refreshes
      } else {
        console.error('Upload failed:', result.error);
        vibeAlert.error('Error', result.error || 'Failed to update profile picture');
      }
    } catch (error) {
      console.error('Upload error:', error);
      vibeAlert.error('Error', 'Failed to update profile picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    console.log('🚨 handleRemovePhoto called');
    // Small delay to allow the menu alert to close first
    setTimeout(() => {
      vibeAlert.confirm(
        'Remove Photo',
        'Are you sure you want to remove your profile picture?',
        async () => {
          console.log('🚨 Confirm pressed - starting removal');
          setUploadingPhoto(true);
          try {
            const result = await removeProfilePicture(currentUserId, userData);
            if (result.success) {
              vibeAlert.success('Success', 'Profile picture removed!');
            } else {
              vibeAlert.error('Error', result.error || 'Failed to remove profile picture');
            }
          } catch (error) {
            vibeAlert.error('Error', 'Failed to remove profile picture');
          } finally {
            setUploadingPhoto(false);
          }
        },
        () => {
          console.log('🚨 Cancel pressed');
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
          onPress: () => submitUserReport('inappropriate_content')
        },
        { 
          text: 'Spam/Fake Profile',
          onPress: () => submitUserReport('spam')
        },
        { 
          text: 'Harassment/Bullying',
          onPress: () => submitUserReport('harassment')
        },
        { 
          text: 'Other Violation',
          onPress: () => submitUserReport('other')
        },
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {}
        }
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
      vibeAlert.error('Error', error.message || 'Failed to submit report. Please try again.');
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
        error.message || 'Unable to delete account. Please try again or contact support.',
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
          const visibleInfo = await getVisibleContactInfo(currentUserId, userData);
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
        phone: contactInfo.phone || contactInfo.phoneNumber || displayUserData?.phone || displayUserData?.phoneNumber || '',
        bio: displayUserData?.bio || '',
        location: displayUserData?.location || '',
      });
    }
  }, [displayUserData]);

  useEffect(() => {
    loadFollowStats();
  }, [currentUserId, targetUserId, isOwnProfile]);

  // Check for blocking restrictions when viewing other profiles
  useEffect(() => {
    const checkProfileAccess = async () => {
      // Only check if viewing someone else's profile
      if (isOwnProfile || !targetUserId || !currentUserId) return;

      try {
        // Check if current user is blocked by the target user
        const isBlockedByResult = await blockingService.isBlockedBy(currentUserId, targetUserId);
        
        if (isBlockedByResult) {
          console.log('[UserProfile] Access denied - user is blocked by target');
          vibeAlert.error('User Not Available', 'This user is not available.');
          setTimeout(() => navigation.goBack(), 1500);
          return;
        }
      } catch (error) {
        console.error('[UserProfile] Error checking profile access:', error);
      }
    };

    checkProfileAccess();
  }, [currentUserId, targetUserId, isOwnProfile, navigation, vibeAlert]);

  // Detect if we're returning from navigation with an activeTab set

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

  const StatCard = ({ title, value, color = theme.colors.vibeBlue }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  // Show loading while fetching target user data
  if (!isOwnProfile && loadingUserData) {
    return (
      <View style={styles.container}>
        <CloseButton onPress={() => navigation.goBack()} style={styles.closeButton} />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* Main Profile Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

      {/* Top buttons row */}
      <View style={styles.topButtonsRow}>
        <CloseButton onPress={() => navigation.goBack()} style={styles.closeButton} />
        
        <View style={styles.topButtonsRightSide}>
          {!isOwnProfile && (
            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleReportUser}
            >
              <Text style={styles.reportButtonText}>⚠️</Text>
            </TouchableOpacity>
          )}
          
          {isOwnProfile && (
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Centered Profile Picture */}
      <View style={styles.profilePictureSection}>
        <TouchableOpacity onPress={isOwnProfile ? handleProfilePicturePress : undefined}>
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
        {(displayUserData?.ratings?.stars?.length > 0 || displayUserData?.userdata?.metrics?.engagement?.totalRatings > 0) && (
          <View style={styles.reliabilityContainer}>
            <ReliabilityBadge 
              userData={displayUserData} 
              size="large"
            />
          </View>
        )}
      </View>

      {/* Bio Section - Only show if has content OR in edit mode */}
      {(displayUserData?.bio || isEditing) && (
        <View style={styles.aboutSection}>
          <View style={styles.aboutContainer}>
            <Text style={styles.aboutTitle}>About Me</Text>
            {isEditing ? (
              <VibeInput
                placeholder="Tell others about yourself..."
                value={editedData.bio}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, bio: text }))}
                multiline
                numberOfLines={4}
                maxLength={300}
                style={styles.bioInput}
              />
            ) : (
              <Text style={styles.aboutText}>
                {displayUserData?.bio}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Contact Section */}
      <View style={styles.contactSection}>
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Contact Info</Text>
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>👤</Text>
            {isEditing ? (
              <View style={styles.nameEditContainer}>
                <VibeInput
                  placeholder="First Name"
                  value={editedData.firstName}
                  onChangeText={(text) => setEditedData(prev => ({ ...prev, firstName: text }))}
                  style={styles.nameInput}
                />
                <VibeInput
                  placeholder="Last Name"
                  value={editedData.lastName}
                  onChangeText={(text) => setEditedData(prev => ({ ...prev, lastName: text }))}
                  style={styles.nameInput}
                />
              </View>
            ) : (
              <Text style={styles.contactText}>
                {contactInfo?.firstName && contactInfo?.lastName 
                  ? `${contactInfo.firstName} ${contactInfo.lastName}`
                  : contactInfo?.firstName || contactInfo?.lastName || contactInfo?.email?.split('@')[0] || displayUserData?.email?.split('@')[0] || 'User'}
              </Text>
            )}
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>📍</Text>
            <Text style={styles.contactText}>
              {isOwnProfile 
                ? (displayUserData?.location || displayUserData?.userdata?.studios?.default?.studioName || 'Not set')
                : (contactInfo?.location || 'Not shared')}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>📞</Text>
            {isEditing ? (
              <VibeInput
                placeholder="Phone number (required)"
                value={editedData.phone}
                onChangeText={(text) => setEditedData(prev => ({ ...prev, phone: text }))}
                style={styles.contactInput}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.contactText, !contactInfo?.phone && isOwnProfile && styles.requiredMissing]}>
                {isOwnProfile 
                  ? (formatPhoneNumber(contactInfo?.phone || contactInfo?.phoneNumber || displayUserData?.phone || displayUserData?.phoneNumber) || 'Required - Please add phone number')
                  : (contactInfo?.phone ? formatPhoneNumber(contactInfo.phone) : 'Not shared')}
              </Text>
            )}
          </View>
          <View style={[styles.contactItem, { marginBottom: 0 }]}>
            <Text style={styles.contactIcon}>📧</Text>
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
              <Text style={styles.contactText}>
                {isOwnProfile 
                  ? (contactInfo?.email || displayUserData?.email || 'Not set')
                  : (contactInfo?.email || 'Not shared')}
              </Text>
            )}
          </View>
        </View>
      </View>


      {/* Activity Section */}
      <View style={styles.activitySection}>
        <View style={styles.activityContainer}>
          <Text style={styles.activityTitle}>Events</Text>
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{displayUserData?.userdata?.metrics?.events?.created || 0}</Text>
              <Text style={styles.statLabel}>Hosted</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{displayUserData?.userdata?.metrics?.events?.attended || 0}</Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{displayUserData?.userdata?.metrics?.events?.noShows || 0}</Text>
              <Text style={styles.statLabel}>No Shows</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Social Section */}
      <View style={styles.socialSection}>
        <View style={styles.socialContainer}>
          <Text style={styles.socialTitle}>Social</Text>
          <View style={styles.quickStats}>
            {isOwnProfile ? (
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('SocialList', {
                  userId: currentUserId,
                  type: 'friends',
                  onStatsChange: loadFollowStats
                })}
              >
                <Text style={styles.statNumber}>{loadingStats ? '...' : followStats.mutualCount}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{loadingStats ? '...' : followStats.mutualCount}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
            )}
            {isOwnProfile ? (
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('SocialList', {
                  userId: currentUserId,
                  type: 'following',
                  onStatsChange: loadFollowStats
                })}
              >
                <Text style={styles.statNumber}>{loadingStats ? '...' : followStats.followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{loadingStats ? '...' : followStats.followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            )}
            {isOwnProfile ? (
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('SocialList', {
                  userId: currentUserId,
                  type: 'followers',
                  onStatsChange: loadFollowStats
                })}
              >
                <Text style={styles.statNumber}>{loadingStats ? '...' : followStats.followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{loadingStats ? '...' : followStats.followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* QR Code Section - Only for own profile */}
      {isOwnProfile && (
        <View style={styles.qrSection}>
          <View style={styles.qrContainer}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>Share Profile</Text>
              <TouchableOpacity
                style={styles.toggleQRButton}
                onPress={() => setShowQRCode(!showQRCode)}
              >
                <Text style={styles.toggleQRButtonText}>
                  {showQRCode ? 'Hide QR' : 'Show QR'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {showQRCode && (
              <QRCodeGenerator
                type="user"
                data={currentUserId}
                size={180}
                showShareButton={false}
              />
            )}
          </View>
        </View>
      )}

      {/* Attendance Details */}
      {displayUserData?.attendanceStats && (
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Attendance Breakdown</Text>
          <View style={styles.contactSection}>
            <AttendanceStats stats={userData.attendanceStats} />
          </View>
        </View>
      )}

      {/* Action Buttons - Only show for own profile */}
      {isOwnProfile && (
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <VibeButton
              label={isSaving ? "SAVING..." : "SAVE CHANGES"}
              onPress={handleSave}
              style={styles.saveButton}
              disabled={isSaving}
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
      )}
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
    // Default CloseButton styling
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.vibeBlue,
  },
  editButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  topButtonsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  topButtonsRightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonText: {
    fontSize: 18,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  profileInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  profilePictureContainer: {
    alignItems: 'center',
    gap: 12,
  },
  editingSection: {
    width: '100%',
    gap: 12,
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
  joinDate: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
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
  requiredMissing: {
    color: theme.colors.vibeRed,
    fontStyle: 'italic',
  },
  requiredText: {
    color: theme.colors.vibeRed,
    fontSize: 12,
  },
  contactInput: {
    marginBottom: 0,
    flex: 1,
  },
  nameEditContainer: {
    flex: 1,
    gap: 8,
  },
  nameInput: {
    marginBottom: 0,
  },
  cardSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  aboutSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  aboutContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  aboutTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  aboutItem: {
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  aboutText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  activitySection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  activityContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  activityTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  socialSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  socialContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  socialTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00C6FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  contactSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  contactContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  contactTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  bioCard: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  bioText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  bioInput: {
    minHeight: 100,
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
  qrSection: {
    marginBottom: 20,
    marginHorizontal: 20,
  },
  qrContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleQRButton: {
    backgroundColor: theme.colors.vibeBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleQRButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});