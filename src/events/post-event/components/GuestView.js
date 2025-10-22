// FILE: GuestView.js - Guest-specific Event Completion View

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { VibeButton } from '../../../components/ui';
import ScreenHeader from '../../../components/ui/layout/ScreenHeader';
import PostEventActions from './PostEventActions';
import StarRating from '../../../components/ui/feedback/StarRating';
import { useAuth } from '../../../auth/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';
import theme from '../../../theme/themes';

const GuestView = ({
  eventData,
  participants,
  userStatus,
  submitting,
  reportAttendance,
  submitHostRating,
  onNavigateBack,
  onNavigateHome,
  navigation,
  studioId,
  eventId,
}) => {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();
  const [addingToInterests, setAddingToInterests] = useState(false);

  // Check if event name is already in user's interests
  const eventName = eventData?.eventName || '';
  const userInterests = userData?.userdata?.preferences?.interests || [];
  const isAlreadyInInterests = userInterests.includes(eventName);

  const handleAddToInterests = async () => {
    if (!currentUserId || !eventName) return;

    setAddingToInterests(true);
    try {
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        'userdata.preferences.interests': arrayUnion(eventName),
      });

      vibeAlert.success('Added to Interests', `"${eventName}" has been added to your interests!`);
    } catch (error) {
      console.error('[GuestView] Error adding to interests:', error);
      vibeAlert.error('Error', 'Failed to add to interests. Please try again.');
    } finally {
      setAddingToInterests(false);
    }
  };

  const getAttendanceTypeInfo = () => {
    switch (eventData.attendanceType) {
      case 'casual':
        return {
          title: '🌊 How was the event?',
          description:
            'Let us know if you made it - no worries if you missed it!',
          icon: '🌊',
          color: theme.colors.vibeBlue,
          impactNote:
            'This is a casual event - no impact on your reliability score.',
        };
      case 'strict':
        return {
          title: '🎯 Confirm your attendance',
          description:
            'Please confirm if you attended - this affects reliability scores.',
          icon: '🎯',
          color: theme.colors.vibeOrange,
          impactNote:
            'This is a strict event - attendance affects your reliability score.',
        };
      default:
        return {
          title: 'Event Feedback',
          description: 'How was the event?',
          icon: '📋',
          color: theme.colors.vibeBlue,
          impactNote: '',
        };
    }
  };

  const attendanceInfo = getAttendanceTypeInfo();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Event Recap" onClose={onNavigateBack} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Host Rating */}
          {userStatus.canRateHost && !userStatus.hasRatedHost && (
            <StarRating
              title="Rate the host"
              description="How was your experience with the host?"
              onRating={submitHostRating}
              disabled={submitting}
            />
          )}

          {/* Participants List */}
          <PostEventActions
            participants={participants}
            userStatus={userStatus}
            eventData={eventData}
            submitting={submitting}
            navigation={navigation}
            eventId={eventId}
            studioId={studioId}
          />

          {/* Add to Interests Button */}
          {!isAlreadyInInterests && eventName && (
            <View style={styles.interestsSection}>
              <Text style={styles.interestsPrompt}>
                Enjoyed this event? Add it to your interests!
              </Text>
              <VibeButton
                label={`ADD "${eventName.toUpperCase()}" TO MY INTERESTS`}
                onPress={handleAddToInterests}
                variant="outline"
                loading={addingToInterests}
                disabled={addingToInterests}
                style={styles.interestsButton}
              />
            </View>
          )}

          {/* Already Added Message */}
          {isAlreadyInInterests && (
            <View style={styles.interestsAdded}>
              <Text style={styles.interestsAddedIcon}>✓</Text>
              <Text style={styles.interestsAddedText}>
                "{eventName}" is already in your interests
              </Text>
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <VibeButton
              label="BACK TO EVENT"
              onPress={onNavigateBack}
              variant="outline"
              style={styles.navButton}
            />

            <VibeButton
              label="BACK TO HOME"
              onPress={onNavigateHome}
              variant="outline"
              style={styles.navButton}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },

  // Host Rating Card
  ratingCard: {
    backgroundColor: theme.colors.vibeBackgroundPurple,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: theme.colors.vibePurple,
  },

  // Attendance Reporting
  attendanceReporting: {
    marginBottom: 24,
  },
  reportingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  reportingButtons: {
    gap: 16,
  },
  reportingButton: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  attendedButton: {
    borderColor: theme.colors.vibeGreen,
    backgroundColor: theme.colors.vibeBackgroundGreen,
  },
  missedButton: {
    borderColor: theme.colors.vibeOrange,
    backgroundColor: theme.colors.vibeBackgroundOrange,
  },
  reportingIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  reportingButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 4,
  },
  reportingSubtext: {
    fontSize: 14,
    color: theme.colors.gray,
  },

  // Reported Status
  reportedStatus: {
    alignItems: 'center',
    marginBottom: 24,
  },
  reportedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: '80%',
    justifyContent: 'center',
  },
  reportedAttended: {
    backgroundColor: theme.colors.vibeBackgroundGreen,
  },
  reportedMissed: {
    backgroundColor: theme.colors.vibeBackgroundOrange,
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

  // Host Rating
  ratingSection: {
    marginBottom: 24,
  },

  // Add to Interests
  interestsSection: {
    marginTop: 24,
    marginBottom: 24,
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  interestsPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  interestsButton: {
    marginVertical: 0,
  },
  interestsAdded: {
    marginTop: 24,
    marginBottom: 24,
    backgroundColor: theme.colors.vibeBackgroundGreen,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.vibeGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestsAddedIcon: {
    fontSize: 24,
    color: theme.colors.vibeGreen,
    marginRight: 12,
  },
  interestsAddedText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },

  // Navigation
  navigationButtons: {
    gap: 12,
    marginTop: 20,
  },
  navButton: {
    marginVertical: 0,
  },
});

export default GuestView;
