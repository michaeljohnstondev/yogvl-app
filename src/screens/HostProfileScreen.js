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
  SafeAreaView,
} from 'react-native';
import { VibeButton } from '../components/ui';
import { BlockButton, FollowButton, CloseButton } from '../components/ui/buttons';
import { ProfileAvatar } from '../components/ui/profile';
import { UserReliabilityCard } from '../events/components/UserReliabilityCard';
import { getUserEventStats } from '../events/lib/userMetrics';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import {
  getVisibleContactInfo,
  canViewUserStats,
} from '../services/privacyService';
import { calculateHostRating } from '../lib/ratingUtils';
import {
  followUser,
  unfollowUser,
  checkIfFollowing,
  getFollowStats,
} from '../services/followService';
import { reportUser } from '../services/reportingService';
import { blockingService } from '../services/blockingService';
import { useAuth } from '../auth/AuthContext';
import theme from '../theme/themes';

const HostProfileScreen = ({ navigation, route }) => {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();

  // Security validation of route parameters
  useEffect(() => {
    if (!route.params?.hostData || typeof route.params.hostData !== 'object') {
      console.error('[HostProfile] Invalid hostData parameter');
      vibeAlert.error('Error', 'Invalid user profile data');
      navigation.goBack();
      return;
    }

    const { hostData } = route.params;
    if (!hostData.id || typeof hostData.id !== 'string') {
      console.error('[HostProfile] Invalid hostData.id');
      vibeAlert.error('Error', 'Invalid user ID');
      navigation.goBack();
      return;
    }
  }, [route.params, navigation, vibeAlert]);

  const { hostData, eventId } = route.params || {};
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [visibleContactInfo, setVisibleContactInfo] = useState({});
  const [canViewStats, setCanViewStats] = useState(true);
  const [followStats, setFollowStats] = useState({
    followingCount: 0,
    followerCount: 0,
    mutualCount: 0,
  });
  const [loadingFollowStats, setLoadingFollowStats] = useState(true);
  const [hasNavigatedAway, setHasNavigatedAway] = useState(false);
  const [blockStatus, setBlockStatus] = useState({
    isBlocked: false,
    loading: true,
  });

  // Load privacy-filtered contact information
  useEffect(() => {
    const loadVisibleInfo = async () => {
      if (!hostData || !currentUserId) return;

      try {
        const contactInfo = await getVisibleContactInfo(
          currentUserId,
          hostData
        );
        const statsVisible = await canViewUserStats(currentUserId, hostData);

        setVisibleContactInfo(contactInfo);
        setCanViewStats(statsVisible);
      } catch (error) {
        console.error(
          '[HostProfile] Error loading visible contact info:',
          error.message
        );
        // Security: Never fallback to raw data on privacy service failure
        setVisibleContactInfo({
          firstName: 'User',
          lastName: '',
          // All other fields remain undefined to respect privacy
        });
        setCanViewStats(false);
      }
    };

    loadVisibleInfo();
  }, [hostData, currentUserId]);

  // Check follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!isCurrentUser && currentUserId && hostData?.id) {
        try {
          const following = await checkIfFollowing(currentUserId, hostData.id);
          setIsFollowing(following);
        } catch (error) {
          console.error('[HostProfile] Error checking follow status:', error);
          // Set default state on error to prevent blocking UI
          setIsFollowing(false);
        }
      }
    };

    checkFollowStatus();
  }, [currentUserId, hostData?.id, isCurrentUser]);

  // Check block status and access restrictions
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!currentUserId || !hostData?.id) {
        setBlockStatus({ isBlocked: false, loading: false });
        return;
      }

      try {
        // Check if current user has blocked this host
        const hasBlockedResult = await blockingService.hasBlocked(
          currentUserId,
          hostData.id
        );
        setBlockStatus({ isBlocked: hasBlockedResult, loading: false });

        // Check if current user is blocked by this host
        const isBlockedByResult = await blockingService.isBlockedBy(
          currentUserId,
          hostData.id
        );

        if (isBlockedByResult) {
          console.log('[HostProfile] Access denied - user is blocked by host');
          vibeAlert.error('User Not Available', 'This user is not available.');
          setTimeout(() => navigation.goBack(), 1500);
          return;
        }
      } catch (error) {
        console.error('[HostProfile] Error checking block status:', error);
        // Set safe defaults on error
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
        return false; // Allow default back action
      }

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
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Host information not available</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const contactInfo = hostData?.userdata?.contactInfo || {};
  const displayName =
    hostData.userdata?.contactInfo?.displayName ||
    `${visibleContactInfo.firstName || contactInfo.firstName || ''} ${visibleContactInfo.lastName || contactInfo.lastName || ''}`.trim() ||
    (visibleContactInfo.email || contactInfo.email || hostData.email)?.split('@')?.[0] ||
    'Unknown Host';

  const stats = getUserEventStats(hostData);
  const isCurrentUser = currentUserId === hostData.id;

  const handleFollowClick = async () => {
    if (!currentUserId || !hostData.id || !userData || isFollowLoading) {
      return;
    }

    // Optimistic update: increment follower count immediately
    setFollowStats((prev) => ({
      ...prev,
      followerCount: prev.followerCount + 1,
    }));
    setIsFollowing(true);
    setIsFollowLoading(true);

    const result = await followUser(currentUserId, hostData.id, userData, hostData);

    // Check if operation succeeded
    const succeeded = !result || result.success !== false;

    // Rollback if operation was blocked (throttled/cooldown) or failed
    if (!succeeded) {
      setFollowStats((prev) => ({
        ...prev,
        followerCount: prev.followerCount - 1,
      }));
      setIsFollowing(false);
    }

    setIsFollowLoading(false);
  };

  const handleUnfollowClick = async () => {
    if (!currentUserId || !hostData.id || !userData || isFollowLoading) {
      return;
    }

    // Optimistic update: decrement follower count immediately
    setFollowStats((prev) => ({
      ...prev,
      followerCount: Math.max(0, prev.followerCount - 1),
    }));
    setIsFollowing(false);
    setIsFollowLoading(true);

    const result = await unfollowUser(currentUserId, hostData.id);

    // Check if operation succeeded
    const succeeded = !result || result.success !== false;

    // Rollback if operation was blocked (throttled/cooldown) or failed
    if (!succeeded) {
      setFollowStats((prev) => ({
        ...prev,
        followerCount: prev.followerCount + 1,
      }));
      setIsFollowing(true);
    }

    setIsFollowLoading(false);
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
          const result = await reportUser(
            currentUserId,
            hostData.id,
            'Inappropriate content'
          );

          if (result.success) {
            vibeAlert.success('Reported', result.message);
          } else {
            vibeAlert.error(
              'Error',
              'Failed to submit report. Please try again.'
            );
          }
        } catch (error) {
          console.error('Error submitting user report:', error);
          vibeAlert.error(
            'Error',
            error.message || 'Failed to submit report. Please try again.'
          );
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
          setBlockStatus({ isBlocked: true, loading: true });
          try {
            const result = await blockingService.unblockUser(
              currentUserId,
              hostData.id
            );
            if (result.success) {
              setBlockStatus({ isBlocked: false, loading: false });
            } else {
              setBlockStatus({ isBlocked: true, loading: false });
              vibeAlert.error(
                'Error',
                'Failed to unblock user. Please try again.'
              );
            }
          } catch (error) {
            console.error('[HostProfile] Error unblocking user:', error);
            setBlockStatus({ isBlocked: true, loading: false });
            vibeAlert.error(
              'Error',
              'Failed to unblock user. Please try again.'
            );
          }
        }
      );
    } else {
      // Block user
      vibeAlert.confirm(
        'Block User',
        `Block ${displayName}? They won't be able to see your profile, events, or contact you. You will both be unfollowed.`,
        async () => {
          setBlockStatus({ isBlocked: false, loading: true });
          try {
            const result = await blockingService.blockUser(
              currentUserId,
              hostData.id
            );
            if (result.success) {
              setBlockStatus({ isBlocked: true, loading: false });
              setIsFollowing(false); // Update follow status since blocking removes follows
            } else {
              setBlockStatus({ isBlocked: false, loading: false });
              vibeAlert.error(
                'Error',
                'Failed to block user. Please try again.'
              );
            }
          } catch (error) {
            console.error('[HostProfile] Error blocking user:', error);
            setBlockStatus({ isBlocked: false, loading: false });
            vibeAlert.error('Error', 'Failed to block user. Please try again.');
          }
        }
      );
    }
  };

  const handleBack = () => {
    // Mark that we've navigated away to disable future back button handling
    setHasNavigatedAway(true);

    // Use standard back navigation - this will work correctly with the screen-based approach
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info - No Card */}
        <View style={styles.profileSection}>
          {/* Close button - left side */}
          <CloseButton onPress={handleBack} style={styles.closeButton} />

          {/* Report button - only show for other users' profiles */}
          {hostData?.id && currentUserId && hostData.id !== currentUserId && (
            <TouchableOpacity
              onPress={handleReport}
              style={styles.reportButtonTop}
            >
              <Text style={styles.reportButtonText}>⚠️</Text>
            </TouchableOpacity>
          )}

          <View style={styles.avatarContainer}>
            <ProfileAvatar userData={hostData} size={120} showBorder={true} />
          </View>

          <Text style={styles.hostName}>{displayName}</Text>

          {hostData.bio && <Text style={styles.bio}>{hostData.bio}</Text>}

          <Text style={styles.joinDate}>
            {formatJoinDate(hostData.userdata?.metadata?.createdAt)}
          </Text>
        </View>

        {/* Contact Info */}
        <View style={styles.infoSection}>
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
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>
                      {visibleContactInfo.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }

            // Check phone visibility
            if (visibleContactInfo.phone) {
              contactItems.push(
                <TouchableOpacity
                  key="phone"
                  style={styles.contactItem}
                  onPress={() =>
                    Linking.openURL(`tel:${visibleContactInfo.phone}`)
                  }
                >
                  <Text style={styles.contactIcon}>📞</Text>
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>
                      {visibleContactInfo.phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }

            // Check location visibility
            if (visibleContactInfo.location) {
              contactItems.push(
                <View key="location" style={styles.contactItem}>
                  <Text style={styles.contactIcon}>📍</Text>
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Location</Text>
                    <Text style={styles.contactValue}>
                      {visibleContactInfo.location}
                    </Text>
                  </View>
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
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Website</Text>
                    <Text style={styles.contactValue}>{hostData.website}</Text>
                  </View>
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
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Social Media</Text>
                    <Text style={styles.contactValue}>View Profile</Text>
                  </View>
                </TouchableOpacity>
              );
            }

            // Remove margin from last item
            if (contactItems.length > 0) {
              const lastItem = contactItems[contactItems.length - 1];
              contactItems[contactItems.length - 1] = React.cloneElement(
                lastItem,
                {
                  style: [lastItem.props.style, { marginBottom: 0 }],
                }
              );
            }

            // Only show contact section if there are visible contact items
            return contactItems.length > 0 ? (
              <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Contact Info</Text>
                {contactItems}
              </View>
            ) : null;
          })()}
        </View>

        {/* User Metrics */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Events</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.eventsCreated}</Text>
                  <Text style={styles.statLabel}>Created</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.eventsAttended}</Text>
                  <Text style={styles.statLabel}>Attended</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {stats.averageAttendees === 0 ? '0' : stats.averageAttendees.toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>Avg Attendees</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.noShows}</Text>
                  <Text style={styles.statLabel}>No Shows</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Social Stats */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Social</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {loadingFollowStats ? '...' : followStats.followingCount}
                  </Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {loadingFollowStats ? '...' : followStats.followerCount}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Event Statistics - Only show if user has been rated */}
        {canViewStats &&
          (hostData?.ratings?.stars?.length > 0 ||
            hostData?.userdata?.metrics?.engagement?.totalRatings > 0) && (
            <UserReliabilityCard userData={hostData} />
          )}

        {/* Host Highlights */}
        {(() => {
          const highlights = [];

          // Host Rating - Add as first highlight if they have ratings
          const rating = calculateHostRating(hostData);
          if (rating.count > 0) {
            highlights.push(
              <View key="host-rating" style={styles.highlight}>
                <Text style={styles.highlightIcon}>⭐</Text>
                <Text style={styles.highlightText}>
                  {rating.average} Rating ({rating.count} review{rating.count !== 1 ? 's' : ''})
                </Text>
              </View>
            );
          }

          // Conditional highlights based on stats

          // New Host badge for users with little event history
          if (stats.eventsCreated <= 3 && stats.totalRSVPs < 3) {
            highlights.push(
              <View key="new-host" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🆕</Text>
                <Text style={styles.highlightText}>New Host</Text>
              </View>
            );
          } else if (stats.eventsCreated > 10) {
            highlights.push(
              <View key="experienced" style={styles.highlight}>
                <Text style={styles.highlightIcon}>🌟</Text>
                <Text style={styles.highlightText}>Experienced Host</Text>
              </View>
            );
          }

          // Only show "Highly Reliable" if they have sufficient event history (5+ events) AND high score
          if (stats.reliabilityScore > 95 && stats.totalRSVPs >= 5) {
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

          // Require event history for reliability-based badges
          if (
            stats.eventsCreated >= 5 &&
            stats.reliabilityScore > 90 &&
            stats.totalRSVPs >= 5
          ) {
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
            const accountAge =
              Date.now() -
              (
                hostData.userdata.metadata.createdAt.toDate?.() ||
                new Date(hostData.userdata.metadata.createdAt)
              ).getTime();
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
          if (
            hostData?.userdata?.membership?.tier === 'premium' ||
            hostData?.userdata?.membership?.tier === 'vip'
          ) {
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
            highlights[highlights.length - 1] = React.cloneElement(
              lastHighlight,
              {
                style: [lastHighlight.props.style, { marginBottom: 0 }],
              }
            );
          }

          // Only show highlights section if there are highlights to display
          return highlights.length > 0 ? (
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>Host Highlights</Text>
                {highlights}
              </View>
            </View>
          ) : null;
        })()}

        {/* Action Buttons */}
        {!isCurrentUser && (
          <View style={styles.infoSection}>
            <View style={styles.buttonContainer}>
              {/* Only show Follow button if user is not blocked */}
              {!blockStatus.isBlocked && (
                <FollowButton
                  isFollowing={isFollowing}
                  isLoading={isFollowLoading}
                  onFollow={handleFollowClick}
                  onUnfollow={handleUnfollowClick}
                  style={styles.followButton}
                />
              )}

              {/* Block/Unblock Button */}
              <BlockButton
                label={blockStatus.isBlocked ? 'UNBLOCK USER' : 'BLOCK USER'}
                onPress={handleBlock}
                isLoading={blockStatus.loading}
                style={styles.blockButton}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: theme.sizes.borderRadius,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.comicBold,
    color: theme.colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    position: 'relative',
  },
  profileContent: {
    alignItems: 'center',
    position: 'relative',
  },
  avatarContainer: {
    marginVertical: 8,
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    top: 18,
    zIndex: 10,
  },
  reportButtonTop: {
    position: 'absolute',
    right: 20,
    top: 18,
    borderRadius: theme.sizes.borderRadius,
    padding: 8,
    zIndex: 10,
  },
  reportButtonText: {
    fontSize: 18,
  },
  hostName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: theme.sizes.borderRadius,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue + '33',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    lineHeight: 22,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: theme.sizes.borderRadius,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.vibeBlue,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue + '33',
  },
  highlightIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  highlightText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 0,
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
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsGrid: {
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemSingle: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.vibeBlue,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default HostProfileScreen;
