// FILE: EventWrapUpScreen.js - Main Event Wrap-Up Screen (Host + Guest)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../../auth/AuthContext';
import VibeScreen from '../../../components/ui/base/VibeScreen';
import { useEventCompletion } from '../hooks/useEventCompletion';
import { useAttendanceTracking } from '../hooks/useAttendanceTracking';
import HostView from '../components/HostView';
import GuestView from '../components/GuestView';
import theme from '../../../theme/themes';

const EventWrapUpScreen = ({ navigation, route }) => {
  const { eventId, studioId: routeStudioId } = route.params;
  const { currentUserId, userData } = useAuth();

  // Use studioId from route, or fallback to user's default studio
  const studioId =
    routeStudioId || userData?.userdata?.studios?.default?.studioId;

  // Main event completion hook
  const {
    eventData,
    participants,
    attendance,
    userStatus,
    loading,
    submitting,
    completeEvent,
    reportAttendance,
    submitHostRating,
    deleteEvent,
    refreshData,
  } = useEventCompletion(studioId, eventId, currentUserId);

  // Attendance tracking hook (for hosts)
  const attendanceTracking = useAttendanceTracking(
    studioId,
    eventId,
    participants
  );

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

  const getScreenTitle = () => {
    if (userStatus.isHost) {
      return eventData.status === 'completed'
        ? 'Event Completed'
        : 'Complete Event';
    }
    return 'Event Recap';
  };

  const handleNavigateBack = () => navigation.goBack();
  const handleNavigateHome = () => navigation.navigate('Home');

  // Render appropriate view based on user status
  if (userStatus.isHost) {
    return (
      <VibeScreen title={getScreenTitle()}>
        <HostView
          eventData={eventData}
          participants={participants}
          attendance={attendance}
          userStatus={userStatus}
          submitting={submitting}
          attendanceTracking={attendanceTracking}
          completeEvent={completeEvent}
          deleteEvent={deleteEvent}
          onNavigateBack={handleNavigateBack}
          onNavigateHome={handleNavigateHome}
        />
      </VibeScreen>
    );
  }

  return (
    <VibeScreen title={getScreenTitle()}>
      <GuestView
        eventData={eventData}
        participants={participants}
        userStatus={userStatus}
        submitting={submitting}
        reportAttendance={reportAttendance}
        submitHostRating={submitHostRating}
        onNavigateBack={handleNavigateBack}
        onNavigateHome={handleNavigateHome}
      />
    </VibeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
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

export default EventWrapUpScreen;
