// FILE: screens/HostProfileScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  BackHandler,
} from 'react-native';
import VibeButton from '../components/ui/VibeButton';
import VibeScreen from '../components/ui/VibeScreen';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import { UserReliabilityCard } from '../events/components/UserReliabilityCard';
import { getUserEventStats } from '../events/lib/userMetrics';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import { getVisibleContactInfo, canViewUserStats } from '../services/privacyService';
import { followUser, unfollowUser, checkIfFollowing, getFollowStats } from '../services/followService';
import { reportUser } from '../services/reportingService';
import { blockingService } from '../services/blockingService';
import { useAuth } from '../auth/AuthContext';
import theme from '../theme/themes';


const HostProfileScreen = ({ navigation, route }) => {
  console.log('HostProfile component mounted/re-rendered with params:', !!route.params?.returnTo);
  const { hostData, eventId } = route.params;
  const { currentUserId, userData } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [visibleContactInfo, setVisibleContactInfo] = useState({});
  const [canViewStats, setCanViewStats] = useState(true);
  const [followStats, setFollowStats] = useState({
    followingCount: 0,
    followerCount: 0,
    mutualCount: 0
  });
  const [loadingFollowStats, setLoadingFollowStats] = useState(true);
  const [hasNavigatedAway, setHasNavigatedAway] = useState(false);
  const [blockStatus, setBlockStatus] = useState({ isBlocked: false, loading: true });
  const vibeAlert = useVibeAlert();

  // Load privacy-filtered contact information
  useEffect(() => {
    const loadVisibleInfo = async () => {
      if (!hostData || !currentUserId) return;

      try {
        const contactInfo = await getVisibleContactInfo(currentUserId, hostData);
        const statsVisible = await canViewUserStats(currentUserId, hostData);
        
        setVisibleContactInfo(contactInfo);
        setCanViewStats(statsVisible);
      } catch (error) {
        console.error('Error loading visible contact info:', error);
        // Fallback to basic info
        setVisibleContactInfo({
          firstName: hostData?.userdata?.contactInfo?.firstName,
          lastName: hostData?.userdata?.contactInfo?.lastName,
        });
      }
    };

    loadVisibleInfo();
  }, [hostData, currentUserId]);

  // Check follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!isCurrentUser && currentUserId && hostData.id) {
        try {
          const following = await checkIfFollowing(currentUserId, hostData.id);
          setIsFollowing(following);
        } catch (error) {
          console.error('Error checking follow status:', error);
        }
      }
    };
    
    checkFollowStatus();
  }, [currentUserId, hostData.id, isCurrentUser]);

  // Check block status and access restrictions
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!currentUserId || !hostData?.id) return;

      try {
        // Check if current user has blocked this host
        const hasBlockedResult = await blockingService.hasBlocked(currentUserId, hostData.id);
        setBlockStatus({ isBlocked: hasBlockedResult, loading: false });

        // Check if current user is blocked by this host
        const isBlockedByResult = await blockingService.isBlockedBy(currentUserId, hostData.id);
        
        if (isBlockedByResult) {
          console.log('[HostProfile] Access denied - user is blocked by host');
          vibeAlert.error('User Not Available', 'This user is not available.');
          setTimeout(() => navigation.goBack(), 1500);
          return;
        }
      } catch (error) {
        console.error('[HostProfile] Error checking block status:', error);
        setBlockStatus({ isBlocked: false, loading: false });
      }
    };

    checkBlockStatus();
  }, [currentUserId, hostData?.id, navigation, vibeAlert]);

  // Load follow statistics
  useEffect(() => {
    const loadFollowStats = async () => {
      if (!hostData.id) return;
      
      setLoadingFollowStats(true);
      try {
        const stats = await getFollowStats(hostData.id);
        setFollowStats(stats);
      } catch (error) {
        console.error('Error loading follow stats:', error);
      } finally {
        setLoadingFollowStats(false);
      }
    };

    loadFollowStats();
  }, [hostData.id]);

  // Handle Android hardware back button
  useEffect(() => {
    const backAction = () => {
      // Don't handle back button if we've already navigated away
      if (hasNavigatedAway) {
        console.log('HostProfile ignoring back button - already navigated away');
        return false; // Allow default back action
      }
      
      console.log('Android back button pressed in HostProfile');
      handleBack();
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [hasNavigatedAway]); // Re-run when navigation state changes

  if (!hostData) {
    return (
      <VibeScreen title="Host Profile" onBack={() => navigation.goBack()}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Host information not available</Text>
        </View>
      </VibeScreen>
    );
  }

  const contactInfo = hostData?.userdata?.contactInfo || {};
  const displayName =
    hostData.displayName ||
    `${visibleContactInfo.firstName || contactInfo.firstName || ''} ${visibleContactInfo.lastName || contactInfo.lastName || ''}`.trim() ||
    (visibleContactInfo.email || contactInfo.email || hostData.email)?.split('@')[0] ||
    'Unknown Host';

  const stats = getUserEventStats(hostData);
  const isCurrentUser = currentUserId === hostData.id;


  const handleFollow = async () => {
    if (!currentUserId || !hostData.id || !userData) {
      vibeAlert.error('Error', 'Unable to process follow request');
      return;
    }

    try {
      const hostName = displayName;
      
      if (isFollowing) {
        // Unfollow
        await unfollowUser(currentUserId, hostData.id);
        setIsFollowing(false);
        vibeAlert.error('Unfollowed', `You have unfollowed ${hostName}.`);
      } else {
        // Follow
        await followUser(currentUserId, hostData.id, userData);
        setIsFollowing(true);
        vibeAlert.success('Success', `You are following ${hostName}!`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      const action = isFollowing ? 'unfollow' : 'follow';
      vibeAlert.error('Error', `Failed to ${action} ${displayName}`);
    }
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

  const handleReport = async () => {
    vibeAlert.confirm(
      'Report User',
      `Report ${displayName} for inappropriate content?`,
      async () => {
        try {
          // reportUser now auto-detects the reported user's studio
          const result = await reportUser(currentUserId, hostData.id, 'Inappropriate content');
          
          if (result.success) {
            vibeAlert.success('Reported', result.message);
          } else {
            vibeAlert.error('Error', 'Failed to submit report. Please try again.');
          }
        } catch (error) {
          console.error('Error submitting user report:', error);
          vibeAlert.error('Error', error.message || 'Failed to submit report. Please try again.');
        }
      }
    );
  };

  const handleBlock = async () => {
    if (blockStatus.isBlocked) {
      // Unblock user
      vibeAlert.confirm(
        'Unblock User',
        `Unblock ${displayName}? They will be able to see your profile again.`,
        async () => {
          try {
            const result = await blockingService.unblockUser(currentUserId, hostData.id);
            if (result.success) {
              setBlockStatus({ isBlocked: false, loading: false });
              vibeAlert.success('Unblocked', `You have unblocked ${displayName}.`);
            } else {
              vibeAlert.error('Error', 'Failed to unblock user. Please try again.');
            }
          } catch (error) {
            console.error('[HostProfile] Error unblocking user:', error);
            vibeAlert.error('Error', 'Failed to unblock user. Please try again.');
          }
        }
      );
    } else {
      // Block user
      vibeAlert.confirm(
        'Block User',
        `Block ${displayName}? They won't be able to see your profile, events, or contact you. You will both be unfollowed.`,
        async () => {
          try {
            const result = await blockingService.blockUser(currentUserId, hostData.id);
            if (result.success) {
              setBlockStatus({ isBlocked: true, loading: false });
              setIsFollowing(false); // Update follow status since blocking removes follows
              vibeAlert.success('Blocked', `You have blocked ${displayName}.`);
            } else {
              vibeAlert.error('Error', 'Failed to block user. Please try again.');
            }
          } catch (error) {
            console.error('[HostProfile] Error blocking user:', error);
            vibeAlert.error('Error', 'Failed to block user. Please try again.');
          }
        }
      );
    }
  };

  const handleBack = () => {
    console.log('HostProfile handleBack called - using default navigation.goBack()');
    
    // Mark that we've navigated away to disable future back button handling
    setHasNavigatedAway(true);
    
    // Use standard back navigation - this will work correctly with the screen-based approach
    navigation.goBack();
  };

  return (
    <VibeScreen>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          {/* Close button - left side, aligned with top of picture */}
          <TouchableOpacity 
            onPress={() => {
              console.log('Back button touched!');
              handleBack();
            }} 
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Report button - right side, aligned with top of picture */}
          <TouchableOpacity onPress={handleReport} style={styles.reportButtonTop}>
            <Text style={styles.reportButtonText}>⚠️</Text>
          </TouchableOpacity>

          <ProfileAvatar 
            userData={hostData} 
            size={120}
            showBorder={true}
          />

          <Text style={styles.hostName}>{displayName}</Text>

          {hostData.bio && <Text style={styles.bio}>{hostData.bio}</Text>}

          <Text style={styles.joinDate}>
            {formatJoinDate(hostData.userdata?.metadata?.createdAt)}
          </Text>
        </View>

        {/* Contact Info */}
        {(() => {
          const contactItems = [];
          
          // Check email visibility
          if (visibleContactInfo.email) {
            contactItems.push(
              <TouchableOpacity
                key="email"
                style={styles.contactItem}
                onPress={() => {
                  const email = visibleContactInfo.email;
                  const subject = encodeURIComponent('Regarding your event');
                  const mailtoUrl = `mailto:${email}?subject=${subject}`;
                  Linking.openURL(mailtoUrl).catch(() => {
                    vibeAlert.error('Error', 'Unable to open email app');
                  });
                }}
              >
                <Text style={styles.contactIcon}>📧</Text>
                <Text style={styles.contactText}>{visibleContactInfo.email}</Text>
              </TouchableOpacity>
            );
          }

          // Check phone visibility
          if (visibleContactInfo.phone) {
            contactItems.push(
              <TouchableOpacity
                key="phone"
                style={styles.contactItem}
                onPress={() => Linking.openURL(`tel:${visibleContactInfo.phone}`)}
              >
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactText}>{visibleContactInfo.phone}</Text>
              </TouchableOpacity>
            );
          }

          // Check location visibility
          if (visibleContactInfo.location) {
            contactItems.push(
              <View key="location" style={styles.contactItem}>
                <Text style={styles.contactIcon}>📍</Text>
                <Text style={styles.contactText}>{visibleContactInfo.location}</Text>
              </View>
            );
          }

          if (hostData.website) {
            contactItems.push(
              <TouchableOpacity
                key="website"
                style={styles.contactItem}
                onPress={() => Linking.openURL(hostData.website)}
              >
                <Text style={styles.contactIcon}>🌐</Text>
                <Text style={styles.contactText}>{hostData.website}</Text>
              </TouchableOpacity>
            );
          }

          if (hostData.socialMedia) {
            contactItems.push(
              <TouchableOpacity
                key="social"
                style={styles.contactItem}
                onPress={() => Linking.openURL(hostData.socialMedia)}
              >
                <Text style={styles.contactIcon}>📱</Text>
                <Text style={styles.contactText}>Social Media</Text>
              </TouchableOpacity>
            );
          }

          // Remove margin from last item
          if (contactItems.length > 0) {
            const lastItem = contactItems[contactItems.length - 1];
            contactItems[contactItems.length - 1] = React.cloneElement(lastItem, {
              style: [lastItem.props.style, { marginBottom: 0 }]
            });
          }

          // Only show contact section if there are visible contact items
          return contactItems.length > 0 ? (
            <View style={styles.contactSection}>
              <View style={styles.contactContainer}>
                <Text style={styles.contactTitle}>Contact Info</Text>
                {contactItems}
              </View>
            </View>
          ) : null;
        })()}

        {/* User Metrics */}
        <View style={styles.metricsSection}>
          <View style={styles.metricsContainer}>
            <Text style={styles.metricsTitle}>Events</Text>
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.eventsCreated}</Text>
                <Text style={styles.statLabel}>Created</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.eventsAttended}</Text>
                <Text style={styles.statLabel}>Attended</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.averageAttendees.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Avg Attendees</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.noShows}</Text>
                <Text style={styles.statLabel}>No Shows</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Social Stats */}
        <View style={styles.socialSection}>
          <View style={styles.socialContainer}>
            <Text style={styles.socialTitle}>Social</Text>
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{loadingFollowStats ? '...' : followStats.mutualCount}</Text>
                <Text style={styles.statLabel}>Mutual Friends</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{loadingFollowStats ? '...' : followStats.followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{loadingFollowStats ? '...' : followStats.followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Event Statistics - Only show if user has been rated */}
        {canViewStats && (hostData?.ratings?.stars?.length > 0 || hostData?.userdata?.metrics?.engagement?.totalRatings > 0) && (
          <UserReliabilityCard userData={hostData} />
        )}


        {/* Host Highlights */}
        {(() => {
          const highlights = [];

          // Conditional highlights based on stats
          if (stats.eventsCreated > 10) {
            highlights.push(
              <View key="experienced" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🌟</Text>
                <Text style={styles.highlightText}>Experienced Host</Text>
              </View>
            );
          }

          if (stats.reliabilityScore > 95) {
            highlights.push(
              <View key="reliable" style={styles.highlight}>
                <Text style={styles.highlightIcon}>✅</Text>
                <Text style={styles.highlightText}>Highly Reliable</Text>
              </View>
            );
          }

          if (stats.eventsCreated > 20) {
            highlights.push(
              <View key="builder" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🏆</Text>
                <Text style={styles.highlightText}>Community Builder</Text>
              </View>
            );
          }

          // Social & Attendance Highlights
          if (stats.eventsAttended > 50) {
            highlights.push(
              <View key="social" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🎉</Text>
                <Text style={styles.highlightText}>Social Butterfly</Text>
              </View>
            );
          }

          if (stats.reliabilityScore === 100 && stats.eventsAttended > 10) {
            highlights.push(
              <View key="perfect" style={styles.highlight}>
                <Text style={styles.highlightIcon}>💎</Text>
                <Text style={styles.highlightText}>Perfect Attendance</Text>
              </View>
            );
          }

          if (stats.eventsCreated >= 5 && stats.reliabilityScore > 90) {
            highlights.push(
              <View key="trusted" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🛡️</Text>
                <Text style={styles.highlightText}>Trusted Organizer</Text>
              </View>
            );
          }

          // Popular Host - considering small groups like tennis/golf
          if (stats.eventsCreated > 3 && stats.averageEventsPerMonth > 2) {
            highlights.push(
              <View key="popular" style={styles.highlight}>
                <Text style={styles.highlightIcon}>👥</Text>
                <Text style={styles.highlightText}>Popular Host</Text>
              </View>
            );
          }

          // Time-based Highlights
          if (hostData?.userdata?.metadata?.createdAt) {
            const accountAge = Date.now() - (hostData.userdata.metadata.createdAt.toDate?.() || new Date(hostData.userdata.metadata.createdAt)).getTime();
            const yearsOld = accountAge / (1000 * 60 * 60 * 24 * 365);
            const monthsOld = accountAge / (1000 * 60 * 60 * 24 * 30);

            if (monthsOld > 6) {
              highlights.push(
                <View key="longtime" style={styles.highlight}>
                  <Text style={styles.highlightIcon}>📅</Text>
                  <Text style={styles.highlightText}>Long-time Member</Text>
                </View>
              );
            } else if (monthsOld < 3 && stats.eventsCreated > 2) {
              highlights.push(
                <View key="newactive" style={styles.highlight}>
                  <Text style={styles.highlightIcon}>⚡</Text>
                  <Text style={styles.highlightText}>Rising Star</Text>
                </View>
              );
            }
          }

          // Engagement Highlights
          if (stats.averageCommentsPerEvent > 5) {
            highlights.push(
              <View key="engaging" style={styles.highlight}>
                <Text style={styles.highlightIcon}>💬</Text>
                <Text style={styles.highlightText}>Engaging Host</Text>
              </View>
            );
          }

          // Consistency Highlights - based on regular hosting
          if (stats.eventsCreated >= 6 && stats.averageEventsPerMonth >= 1) {
            highlights.push(
              <View key="consistent" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🎯</Text>
                <Text style={styles.highlightText}>Consistent Host</Text>
              </View>
            );
          }

          // Active Community Member
          if (stats.totalEvents > 15) {
            highlights.push(
              <View key="diverse" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🌍</Text>
                <Text style={styles.highlightText}>Active Member</Text>
              </View>
            );
          }

          // Rating Highlights (if rating system exists)
          if (stats.averageEventRating > 4.5 && stats.totalRatings > 10) {
            highlights.push(
              <View key="toprated" style={styles.highlight}>
                <Text style={styles.highlightIcon}>⭐</Text>
                <Text style={styles.highlightText}>Top Rated</Text>
              </View>
            );
          }

          // Social Network Highlights
          if (stats.followersCount > 50) {
            highlights.push(
              <View key="connected" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🔗</Text>
                <Text style={styles.highlightText}>Well Connected</Text>
              </View>
            );
          }

          if (stats.profileViews > 100) {
            highlights.push(
              <View key="popular-profile" style={styles.highlight}>
                <Text style={styles.highlightIcon}>👁️</Text>
                <Text style={styles.highlightText}>Popular Profile</Text>
              </View>
            );
          }

          // High Comment Engagement
          if (stats.commentsPosted > 20) {
            highlights.push(
              <View key="communicator" style={styles.highlight}>
                <Text style={styles.highlightIcon}>💭</Text>
                <Text style={styles.highlightText}>Great Communicator</Text>
              </View>
            );
          }

          // VIP/Special Status
          if (hostData?.userdata?.membership?.tier === 'premium' || hostData?.userdata?.membership?.tier === 'vip') {
            highlights.push(
              <View key="vip" style={styles.highlight}>
                <Text style={styles.highlightIcon}>👑</Text>
                <Text style={styles.highlightText}>VIP Member</Text>
              </View>
            );
          }

          // Remove margin from last highlight
          if (highlights.length > 0) {
            const lastHighlight = highlights[highlights.length - 1];
            highlights[highlights.length - 1] = React.cloneElement(lastHighlight, {
              style: [lastHighlight.props.style, { marginBottom: 0 }]
            });
          }

          // Only show highlights section if there are highlights to display
          return highlights.length > 0 ? (
            <View style={styles.highlightsSection}>
              <View style={styles.highlightsContainer}>
                <Text style={styles.highlightsTitle}>Host Highlights</Text>
                {highlights}
              </View>
            </View>
          ) : null;
        })()}

        {/* Action Buttons */}
        {!isCurrentUser && (
          <View style={styles.buttonContainer}>
            <VibeButton
              label={isFollowing ? 'FOLLOWING' : 'FOLLOW HOST'}
              onPress={handleFollow}
              variant={isFollowing ? 'outline' : 'filled'}
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
              ]}
            />
            
            {/* Block/Unblock Button */}
            <VibeButton
              label={blockStatus.isBlocked ? "UNBLOCK USER" : "BLOCK USER"}
              onPress={handleBlock}
              variant="outline"
              style={styles.blockButton}
            />
          </View>
        )}
        
        {/* Safe area spacing */}
        <View style={styles.safeAreaBottom} />
      </ScrollView>
    </VibeScreen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  reportButtonTop: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  reportButtonText: {
    fontSize: 18,
  },
  hostName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  contactSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
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
  highlightsSection: {
    marginBottom: 20,
  },
  highlightsContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  highlightsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.vibeBlue,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.2)',
  },
  highlightIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  highlightText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  followButton: {
    // Default filled style
  },
  followingButton: {
    borderColor: theme.colors.vibeGreen,
  },
  blockButton: {
    borderColor: theme.colors.vibeRed,
    marginTop: 12,
  },
  metricsSection: {
    marginBottom: 20,
  },
  metricsContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  metricsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  socialSection: {
    marginBottom: 20,
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
  safeAreaBottom: {
    height: 100,
  },
});

export default HostProfileScreen;