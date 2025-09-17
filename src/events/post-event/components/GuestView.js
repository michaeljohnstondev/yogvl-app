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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Event Header */}
        <View
          style={[styles.headerCard, { borderLeftColor: attendanceInfo.color }]}
        >
          <Text style={styles.eventTitle}>{eventData.title}</Text>
          <Text style={styles.attendanceDescription}>
            {attendanceInfo.icon} {attendanceInfo.description}
          </Text>
          {attendanceInfo.impactNote && (
            <Text style={styles.impactNote}>{attendanceInfo.impactNote}</Text>
          )}
        </View>

        {/* Attendance Reporting */}
        {eventData.trackAttendance && !userStatus.hasReportedAttendance && (
          <View style={styles.attendanceReporting}>
            <Text style={styles.reportingTitle}>
              Did you attend this event?
            </Text>

            <View style={styles.reportingButtons}>
              <TouchableOpacity
                style={[styles.reportingButton, styles.attendedButton]}
                onPress={() => reportAttendance(true)}
                disabled={submitting}
              >
                <Text style={styles.reportingIcon}>🎉</Text>
                <Text style={styles.reportingButtonText}>I was there!</Text>
                <Text style={styles.reportingSubtext}>Yes, I attended</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportingButton, styles.missedButton]}
                onPress={() => reportAttendance(false)}
                disabled={submitting}
              >
                <Text style={styles.reportingIcon}>😔</Text>
                <Text style={styles.reportingButtonText}>Couldn't make it</Text>
                <Text style={styles.reportingSubtext}>I had to miss it</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Attendance Reported Status */}
        {userStatus.hasReportedAttendance && (
          <View style={styles.reportedStatus}>
            <View
              style={[
                styles.reportedBadge,
                userStatus.hasReportedAttendance === 'attended'
                  ? styles.reportedAttended
                  : styles.reportedMissed,
              ]}
            >
              <Text style={styles.reportedIcon}>
                {userStatus.hasReportedAttendance === 'attended' ? '✅' : '❌'}
              </Text>
              <Text style={styles.reportedText}>
                {userStatus.hasReportedAttendance === 'attended'
                  ? 'You marked that you attended'
                  : 'You marked that you missed it'}
              </Text>
            </View>
          </View>
        )}

        {/* Host Rating */}
        {userStatus.canRateHost &&
          userStatus.hasReportedAttendance === 'attended' &&
          !userStatus.hasRatedHost && (
            <StarRating
              title="Rate the host"
              description="How was your experience with the host?"
              onRating={submitHostRating}
              disabled={submitting}
              style={styles.ratingSection}
            />
          )}

        {/* Participants List */}
        <PostEventActions
          participants={participants}
          userStatus={userStatus}
          eventData={eventData}
          submitting={submitting}
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

  // Header Styles
  headerCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.vibeBlue,
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
    marginTop: 8,
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
