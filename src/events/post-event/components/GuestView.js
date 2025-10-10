// FILE: GuestView.js - Guest-specific Event Completion View

import React from 'react';
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
            <View style={styles.ratingCard}>
              <StarRating
                title="Rate the host"
                description="How was your experience with the host?"
                onRating={submitHostRating}
                disabled={submitting}
              />
            </View>
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
