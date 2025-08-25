// FILE: screens/GuestEventWrapUpScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { useAuth } from '../auth/AuthContext';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import VibeScreen from '../components/ui/VibeScreen';
import VibeButton from '../components/ui/VibeButton';
import VibeSegmentedControl from '../components/ui/VibeSegmentedControl';
import { updateEventAttendance, updateNoShow } from '../events/lib/userMetrics';
import { checkIfFollowing, followUser, unfollowUser } from '../services/followService';
import theme from '../theme/themes';

const GuestEventWrapUpScreen = ({ navigation, route }) => {
  const { eventId, studioId: routeStudioId } = route.params;
  const { currentUserId, userData } = useAuth();
  
  // Use studioId from route, or fallback to user's default studio
  const studioId = routeStudioId || userData?.userdata?.studios?.default?.studioId;
  const vibeAlert = useVibeAlert();

  const [eventData, setEventData] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [followingStatus, setFollowingStatus] = useState({}); // {userId: boolean}
  const [mutualFollowStatus, setMutualFollowStatus] = useState({}); // {userId: boolean}
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null); // 'attended', 'missed', or null
  const [hasReported, setHasReported] = useState(false);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      // Get event data from studio-specific path
      const eventDoc = await getDoc(doc(db, 'studios', studioId, 'events', eventId));
      if (!eventDoc.exists()) {
        vibeAlert.error('Error', 'Event not found');
        return;
      }

      const event = { id: eventDoc.id, ...eventDoc.data() };
      setEventData(event);

      // Load subscriber data for attendees list
      if (event.subscribers && event.subscribers.length > 0) {
        const subscriberPromises = event.subscribers.map(async (userId) => {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            return { id: userId, ...userDoc.data() };
          }
          return null;
        });

        const subscriberData = await Promise.all(subscriberPromises);
        const validSubscribers = subscriberData.filter((user) => user !== null);
        setSubscribers(validSubscribers);

        // Check follow status and mutual follows for all subscribers
        if (validSubscribers.length > 0) {
          const followStatusPromises = validSubscribers.map(async (user) => {
            if (user.id === currentUserId) return [user.id, false, false]; // Can't follow yourself
            
            // Check if I follow them (their ID is in my following collection)
            const followingDoc = await getDoc(doc(db, 'users', currentUserId, 'following', user.id));
            const iFollowThem = followingDoc.exists();
            
            // Check if they follow me (their ID is in my followers collection)  
            const followerDoc = await getDoc(doc(db, 'users', currentUserId, 'followers', user.id));
            const theyFollowMe = followerDoc.exists();
            
            // They are a friend if both follow each other
            const isMutualFriend = iFollowThem && theyFollowMe;
            
            console.log(`[GuestWrapUp] User ${user.userdata?.contactInfo?.displayName || user.userdata?.contactInfo?.firstName}: iFollow=${iFollowThem}, theyFollowMe=${theyFollowMe}, isFriend=${isMutualFriend}`);
            
            return [user.id, iFollowThem, isMutualFriend];
          });

          const followStatusResults = await Promise.all(followStatusPromises);
          const followStatusMap = {};
          const mutualFollowMap = {};
          
          followStatusResults.forEach(([userId, isFollowing, isMutual]) => {
            followStatusMap[userId] = isFollowing;
            mutualFollowMap[userId] = isMutual;
          });
          
          console.log('[GuestWrapUp] Follow status map:', followStatusMap);
          console.log('[GuestWrapUp] Mutual follow map:', mutualFollowMap);
          
          setFollowingStatus(followStatusMap);
          setMutualFollowStatus(mutualFollowMap);
        }
      }

      // Check if user already reported attendance
      if (event.guestAttendanceReports) {
        const userReport = event.guestAttendanceReports.find(
          report => report.userId === currentUserId
        );
        if (userReport) {
          setAttendanceStatus(userReport.status);
          setHasReported(true);
        }
      }

      // If event is completed and user was marked by host, show that status
      if (event.status === 'completed') {
        if (event.finalAttendees?.includes(currentUserId)) {
          setAttendanceStatus('attended');
          setHasReported(true);
        } else if (event.noShows?.includes(currentUserId)) {
          setAttendanceStatus('missed');
          setHasReported(true);
        }
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      vibeAlert.error('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (targetUserId) => {
    if (targetUserId === currentUserId) return; // Can't follow yourself

    try {
      const targetUser = subscribers.find(user => user.id === targetUserId);
      const userName = targetUser?.userdata?.contactInfo?.firstName || 
                      targetUser?.userdata?.contactInfo?.displayName || 'user';
      const isCurrentlyFollowing = followingStatus[targetUserId];
      
      if (isCurrentlyFollowing) {
        // Unfollow
        await unfollowUser(currentUserId, targetUserId);
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: false }));
        vibeAlert.error('Unfollowed', `You have unfollowed ${userName}.`);
      } else {
        // Follow
        await followUser(currentUserId, targetUserId, userData);
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: true }));
        vibeAlert.success('Success', `You are following ${userName}!`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      const targetUser = subscribers.find(user => user.id === targetUserId);
      const userName = targetUser?.userdata?.contactInfo?.firstName || 
                      targetUser?.userdata?.contactInfo?.displayName || 'user';
      vibeAlert.error('Error', `Failed to ${followingStatus[targetUserId] ? 'unfollow' : 'follow'} ${userName}`);
    }
  };

  const getAttendanceTypeInfo = () => {
    switch (eventData?.attendanceType) {
      case 'casual':
        return {
          title: '🌊 How was the event?',
          description: 'Let us know if you made it - no worries if you missed it!',
          icon: '🌊',
          color: theme.colors.vibeBlue,
          impactNote: 'This is a casual event - no impact on your reliability score.'
        };
      case 'strict':
        return {
          title: '🎯 Confirm your attendance',
          description: 'Please confirm if you attended - this affects reliability scores.',
          icon: '🎯',
          color: theme.colors.vibeOrange,
          impactNote: 'This is a strict event - attendance affects your reliability score.'
        };
      default:
        return {
          title: 'Event Feedback',
          description: 'How was the event?',
          icon: '📋',
          color: theme.colors.vibeBlue,
          impactNote: ''
        };
    }
  };

  const handleAttendanceReport = async (attended) => {
    setSubmitting(true);
    try {
      const status = attended ? 'attended' : 'missed';
      setAttendanceStatus(status);

      // Update event document with guest self-report
      const guestAttendanceReports = eventData.guestAttendanceReports || [];
      const existingReportIndex = guestAttendanceReports.findIndex(
        report => report.userId === currentUserId
      );

      const newReport = {
        userId: currentUserId,
        status,
        reportedAt: Timestamp.now(),
        selfReported: true
      };

      if (existingReportIndex >= 0) {
        guestAttendanceReports[existingReportIndex] = newReport;
      } else {
        guestAttendanceReports.push(newReport);
      }

      await updateDoc(doc(db, 'studios', studioId, 'events', eventId), {
        guestAttendanceReports
      });

      // Update user metrics based on attendance type
      if (eventData.attendanceType === 'strict') {
        if (attended) {
          await updateEventAttendance(currentUserId, eventId, eventData.attendanceType);
        } else {
          await updateNoShow(currentUserId, eventId, eventData.attendanceType);
        }
      } else if (eventData.attendanceType === 'casual' && attended) {
        // For casual events, only track positive attendance (no penalties)
        await updateEventAttendance(currentUserId, eventId, eventData.attendanceType);
      }

      setHasReported(true);

      const thankYouMessage = attended 
        ? `Thanks for confirming you attended! ${eventData.attendanceType === 'casual' ? 'No worries about casual events.' : 'Your reliability score has been updated.'}`
        : `Thanks for letting us know. ${eventData.attendanceType === 'casual' ? 'No penalties for missing casual events!' : 'This has been noted in your reliability score.'}`;

      vibeAlert.success('Thanks!', thankYouMessage, [
        { text: 'Done', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error('Error reporting attendance:', error);
      vibeAlert.error('Error', 'Failed to report attendance. Please try again.');
      setAttendanceStatus(null); // Reset on error
    } finally {
      setSubmitting(false);
    }
  };

  const renderAttendanceButtons = () => {
    if (hasReported) {
      return (
        <View style={styles.reportedContainer}>
          <View style={[
            styles.reportedStatus,
            { backgroundColor: attendanceStatus === 'attended' ? theme.colors.vibeBackgroundGreen : theme.colors.vibeBackgroundOrange }
          ]}>
            <Text style={styles.reportedIcon}>
              {attendanceStatus === 'attended' ? '✅' : '❌'}
            </Text>
            <Text style={styles.reportedText}>
              {attendanceStatus === 'attended' 
                ? 'You marked that you attended'
                : 'You marked that you missed it'
              }
            </Text>
          </View>
          <Text style={styles.reportedNote}>
            {eventData.attendanceType === 'casual'
              ? 'Thanks for the update! No impact on your profile.'
              : 'Your reliability score has been updated accordingly.'
            }
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.attendanceButtons}>
        <TouchableOpacity
          style={[styles.attendanceButton, styles.attendedButton]}
          onPress={() => handleAttendanceReport(true)}
          disabled={submitting}
        >
          <Text style={styles.attendanceButtonIcon}>🎉</Text>
          <Text style={styles.attendanceButtonText}>I was there!</Text>
          <Text style={styles.attendanceButtonSubtext}>Yes, I attended</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.attendanceButton, styles.missedButton]}
          onPress={() => handleAttendanceReport(false)}
          disabled={submitting}
        >
          <Text style={styles.attendanceButtonIcon}>😔</Text>
          <Text style={styles.attendanceButtonText}>Couldn't make it</Text>
          <Text style={styles.attendanceButtonSubtext}>I had to miss it</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFutureFeatures = () => {
    if (!hasReported) return null;

    return (
      <View style={styles.futureSection}>
        <Text style={styles.futureSectionTitle}>Coming Soon</Text>
        
        <View style={styles.futureFeature}>
          <Text style={styles.futureFeatureIcon}>⭐</Text>
          <View style={styles.futureFeatureContent}>
            <Text style={styles.futureFeatureTitle}>Rate This Event</Text>
            <Text style={styles.futureFeatureDescription}>
              Share your experience and help others discover great events
            </Text>
          </View>
        </View>

        <View style={styles.futureFeature}>
          <Text style={styles.futureFeatureIcon}>📸</Text>
          <View style={styles.futureFeatureContent}>
            <Text style={styles.futureFeatureTitle}>Share Photos</Text>
            <Text style={styles.futureFeatureDescription}>
              Add photos from the event for everyone to see
            </Text>
          </View>
        </View>

        <View style={styles.futureFeature}>
          <Text style={styles.futureFeatureIcon}>👥</Text>
          <View style={styles.futureFeatureContent}>
            <Text style={styles.futureFeatureTitle}>See Who Attended</Text>
            <Text style={styles.futureFeatureDescription}>
              Connect with other attendees and build your network
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <VibeScreen title="Event Wrap-Up">
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading event data...</Text>
        </View>
      </VibeScreen>
    );
  }

  if (!eventData) {
    return (
      <VibeScreen title="Event Wrap-Up">
        <View style={styles.container}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </VibeScreen>
    );
  }

  // Handle events without attendance tracking or open events
  if (eventData.attendanceType === 'open' || !eventData.trackAttendance) {
    const isOpenEvent = eventData.attendanceType === 'open';
    const title = isOpenEvent ? "Thanks for joining!" : "Event Completed!";
    const description = isOpenEvent 
      ? "This was an open event with no individual attendance tracking. Hope you had a great time!"
      : "This event didn't track individual attendance, so there's nothing to report. Hope you had a great time!";

    return (
      <VibeScreen title="Event Wrap-Up">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Event Header - Green Box with Check Icon */}
            <View style={[styles.headerCard, { 
              borderLeftColor: theme.colors.vibeGreen,
              backgroundColor: theme.colors.vibeBackgroundGreen,
              borderColor: theme.colors.vibeGreen
            }]}>
              <View style={styles.headerContent}>
                <View style={styles.checkIconContainer}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.attendanceDescription}>
                    Attendance was not recorded for this event.
                  </Text>
                </View>
              </View>
            </View>

            {/* Show attendees list if available */}
            <View style={styles.attendeesSection}>
              <Text style={styles.attendeesTitle}>Debug: Subscribers count: {subscribers?.length || 0}</Text>
              <Text style={styles.attendeesSubtitle}>
                Event subscribers: {eventData?.subscribers?.length || 0}
              </Text>
              
              {subscribers && subscribers.length > 0 ? (
                <View style={styles.attendeesList}>
                  {subscribers.map((user) => {
                    const isFollowing = followingStatus[user.id];
                    const isMutualFriend = mutualFollowStatus[user.id];
                    const isCurrentUser = user.id === currentUserId;
                    
                    // For friends (mutual follows), show displayName, for others show numbered attendee
                    const attendeeIndex = subscribers.findIndex(sub => sub.id === user.id) + 1;
                    
                    // Temporarily show all info for debugging
                    const displayName = user.userdata?.contactInfo?.displayName || 
                                       user.userdata?.contactInfo?.firstName || 
                                       `Debug Attendee ${attendeeIndex}`;
                    
                    // TODO: Restore this logic once we confirm data is loading
                    // const displayName = isMutualFriend && user.userdata?.contactInfo?.displayName
                    //   ? user.userdata.contactInfo.displayName
                    //   : `Attendee ${attendeeIndex}`;
                    
                    const avatarInitial = user.userdata?.contactInfo?.firstName?.charAt(0).toUpperCase() || 
                                         user.userdata?.contactInfo?.displayName?.charAt(0).toUpperCase() || '?';
                    
                    return (
                      <TouchableOpacity 
                        key={user.id} 
                        style={styles.attendeeItem}
                        onPress={() => !isCurrentUser && handleToggleFollow(user.id)}
                        disabled={isCurrentUser}
                      >
                        <View style={styles.attendeeAvatar}>
                          <Text style={styles.attendeeAvatarText}>
                            {avatarInitial}
                          </Text>
                        </View>
                        <View style={styles.attendeeInfo}>
                          <Text style={styles.attendeeName}>
                            {displayName}
                            {isCurrentUser && ' (You)'}
                          </Text>
                          {!isCurrentUser && (
                            <Text style={[styles.attendeeFollow, isFollowing && styles.attendeeFollowing]}>
                              {isMutualFriend 
                                ? 'Friend • Tap to unfollow'
                                : isFollowing 
                                  ? 'Following • Tap to unfollow' 
                                  : 'Tap to follow'
                              }
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.attendeesSubtitle}>No subscribers loaded yet</Text>
              )}
            </View>

            <VibeButton
              label="BACK TO EVENT"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.backButton}
            />

            <VibeButton
              label="BACK TO HOME"
              onPress={() => navigation.navigate('Home')}
              variant="outline"
              style={styles.backButton}
            />
          </View>
        </ScrollView>
      </VibeScreen>
    );
  }

  const attendanceInfo = getAttendanceTypeInfo();

  return (
    <VibeScreen title={attendanceInfo.title}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Event Header */}
          <View style={[styles.headerCard, { borderLeftColor: attendanceInfo.color }]}>
            <Text style={styles.eventTitle}>{eventData.title}</Text>
            <Text style={styles.attendanceDescription}>
              {attendanceInfo.icon} {attendanceInfo.description}
            </Text>
            {attendanceInfo.impactNote && (
              <Text style={styles.impactNote}>
                {attendanceInfo.impactNote}
              </Text>
            )}
          </View>

          {/* Attendance Reporting Section */}
          <View style={styles.attendanceSection}>
            {renderAttendanceButtons()}
          </View>

          {/* Future Features */}
          {renderFutureFeatures()}

          {/* Bottom Actions */}
          {!submitting && (
            <>
              <VibeButton
                label="BACK TO EVENT"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.backButton}
              />

              <VibeButton
                label="BACK TO HOME"
                onPress={() => navigation.navigate('Home')}
                variant="outline"
                style={styles.backButton}
              />
            </>
          )}
        </View>
      </ScrollView>
    </VibeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.vibeGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  checkIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  headerText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 8,
  },
  attendanceDescription: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '500',
  },
  impactNote: {
    fontSize: 12,
    color: theme.colors.vibeOrange,
    fontStyle: 'italic',
  },
  
  // Attendance Section
  attendanceSection: {
    marginBottom: 40,
  },
  attendanceButtons: {
    gap: 16,
  },
  attendanceButton: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  attendedButton: {
    borderColor: theme.colors.vibeGreen,
    backgroundColor: theme.colors.vibeBackgroundGreen,
  },
  missedButton: {
    borderColor: theme.colors.vibeOrange,
    backgroundColor: theme.colors.vibeBackgroundOrange,
  },
  attendanceButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  attendanceButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 4,
  },
  attendanceButtonSubtext: {
    fontSize: 14,
    color: theme.colors.gray,
  },

  // Reported Status
  reportedContainer: {
    alignItems: 'center',
  },
  reportedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    minWidth: '80%',
    justifyContent: 'center',
  },
  reportedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reportedText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  reportedNote: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Future Features
  futureSection: {
    marginBottom: 40,
  },
  futureSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  futureFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    opacity: 0.6,
  },
  futureFeatureIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  futureFeatureContent: {
    flex: 1,
  },
  futureFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 4,
  },
  futureFeatureDescription: {
    fontSize: 12,
    color: theme.colors.gray,
  },

  // No Tracking State
  noTrackingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noTrackingIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  noTrackingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  noTrackingDescription: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  encouragementSection: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  encouragementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.vibeBlue,
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
  },

  // Attendees Section
  attendeesSection: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  attendeesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 8,
  },
  attendeesSubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 16,
    lineHeight: 20,
  },
  attendeesList: {
    gap: 12,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.vibeBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attendeeAvatarText: {
    fontSize: 16,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 2,
  },
  attendeeFollow: {
    fontSize: 12,
    color: theme.colors.vibeBlue,
  },
  attendeeFollowing: {
    color: theme.colors.vibeGreen,
  },

  // Common Styles
  backButton: {
    marginTop: 0,
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    color: theme.colors.vibeRed,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default GuestEventWrapUpScreen;