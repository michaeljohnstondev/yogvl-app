// FILE: screens/HostProfileScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import VibeButton from '../components/ui/VibeButton';
import VibeScreen from '../components/ui/VibeScreen';
import { UserReliabilityCard } from '../events/components/UserReliabilityCard';
import { getUserEventStats } from '../events/lib/userMetrics';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import theme from '../theme/themes';

// Privacy helper functions
const checkContactInfoVisibility = (hostData, currentUserId, contactType) => {
  // If it's the current user viewing their own profile, always show
  if (currentUserId === hostData.id) return true;

  // Get privacy settings with fallbacks to default
  const privacySettings = hostData?.userdata?.settings?.privacy || {};
  const visibilitySetting = contactType === 'email' 
    ? (privacySettings.emailVisibility || 'friends')
    : (privacySettings.phoneVisibility || 'friends');

  switch (visibilitySetting) {
    case 'never':
      return false;
    case 'always':
      return true;
    case 'friends':
      // Check if current user is a friend of the host
      return checkIfFriend(hostData, currentUserId);
    case 'followers': 
      // Check if current user follows the host
      return checkIfFollowing(hostData, currentUserId);
    default:
      return false; // Default to private for unknown settings
  }
};

const checkIfFriend = (hostData, currentUserId) => {
  // Check if current user is in host's friends list
  const hostFriends = hostData?.userdata?.social?.friends || [];
  return hostFriends.includes(currentUserId);
};

const checkIfFollowing = (hostData, currentUserId) => {
  // Check if current user is in host's followers list or if mutual
  const hostFollowers = hostData?.userdata?.social?.followers || [];
  const hostFollowing = hostData?.userdata?.social?.following || [];
  return hostFollowers.includes(currentUserId) || hostFollowing.includes(currentUserId);
};

const HostProfileScreen = ({ navigation, route }) => {
  const { hostData, currentUserId, eventId } = route.params;
  const [isFollowing, setIsFollowing] = useState(false); // Future: check actual follow status
  const vibeAlert = useVibeAlert();

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
    `${contactInfo.firstName || ''} ${contactInfo.lastName || ''}`.trim() ||
    (contactInfo.email || hostData.email)?.split('@')[0] ||
    'Unknown Host';

  const stats = getUserEventStats(hostData);
  const isCurrentUser = currentUserId === hostData.id;


  const handleFollow = () => {
    // Future implementation
    setIsFollowing(!isFollowing);
    vibeAlert.info('Follow Feature', 'Follow functionality coming soon!');
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

  return (
    <VibeScreen title="Host Profile" onBack={() => navigation.goBack()}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.hostName}>{displayName}</Text>

          {hostData.bio && <Text style={styles.bio}>{hostData.bio}</Text>}

          <Text style={styles.joinDate}>
            {formatJoinDate(hostData.userdata?.metadata?.createdAt)}
          </Text>
        </View>

        {/* Event Statistics */}
        <UserReliabilityCard userData={hostData} />

        {/* Contact Info */}
        {(() => {
          const contactItems = [];
          
          // Check email visibility
          if (hostData.userdata?.contactInfo?.email && checkContactInfoVisibility(hostData, currentUserId, 'email')) {
            contactItems.push(
              <TouchableOpacity
                key="email"
                style={styles.contactItem}
                onPress={() => {
                  const email = hostData.userdata.contactInfo.email;
                  const subject = encodeURIComponent('Regarding your event');
                  const mailtoUrl = `mailto:${email}?subject=${subject}`;
                  Linking.openURL(mailtoUrl).catch(() => {
                    vibeAlert.error('Error', 'Unable to open email app');
                  });
                }}
              >
                <Text style={styles.contactIcon}>📧</Text>
                <Text style={styles.contactText}>{hostData.userdata.contactInfo.email}</Text>
              </TouchableOpacity>
            );
          }

          // Check phone visibility
          if (hostData.userdata?.contactInfo?.phoneNumber && checkContactInfoVisibility(hostData, currentUserId, 'phone')) {
            contactItems.push(
              <TouchableOpacity
                key="phone"
                style={styles.contactItem}
                onPress={() => Linking.openURL(`tel:${hostData.userdata.contactInfo.phoneNumber}`)}
              >
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactText}>{hostData.userdata.contactInfo.phoneNumber}</Text>
              </TouchableOpacity>
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
          </View>
        )}
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
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
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
});

export default HostProfileScreen;