// FILE: EventWrapUpScreen.js - Main Event Wrap-Up Screen (Host + Guest)

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { VibeView } from '../../../components/ui/base';
import { useAuth } from '../../../auth/AuthContext';
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
        <Text style={styles.loadingText}>Loading event data...</Text>
      </View>
    );
  }

  if (!eventData) {
    return (
      <VibeView>
        <View style={styles.container}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </VibeView>
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
        navigation={navigation}
        studioId={studioId}
        eventId={eventId}
      />
    );
  }

  return (
    <GuestView
      eventData={eventData}
      participants={participants}
      userStatus={userStatus}
      submitting={submitting}
      reportAttendance={reportAttendance}
      submitHostRating={submitHostRating}
      onNavigateBack={handleNavigateBack}
      onNavigateHome={handleNavigateHome}
      navigation={navigation}
      studioId={studioId}
      eventId={eventId}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    color: theme.colors.vibeRed,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default EventWrapUpScreen;
