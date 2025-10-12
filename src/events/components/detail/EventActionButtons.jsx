import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { VibeButton } from '../../../components/ui';
import theme from '../../../theme/themes';

const EventActionButtons = memo(function EventActionButtons({
  event,
  isEventPast,
  isSubscribed,
  isLoading,
  permissions,
  joinConstraints,
  onSubscribe,
  onInvite,
  onEdit,
  onDelete,
  onManageAttendance,
  onSaveAsTemplate,
  onEventRecap,
  navigation,
  eventId,
  studioId,
  vibeAlert,
  currentUserId, // Add currentUserId prop for validation
  pendingCohostInvitation,
  onAcceptCohostInvitation,
  onShareEvent,
}) {
  // Handle invite completion results
  const handleInviteResult = useCallback((selectedData) => {
    vibeAlert.success(
      'Success',
      `Connected with ${selectedData.users.length} people! They can now see your events.`
    );
  }, [vibeAlert]);

  // Navigation event listener for invite results
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('inviteComplete', (e) => {
        const { inviteType, users, contacts, phoneContacts } = e.data || {};
        if (inviteType === 'host_guests') {
          handleInviteResult({ users, contacts, phoneContacts });
        }
      });
      return unsubscribe;
    }, [navigation, handleInviteResult])
  );

  // Simplified validation for admin view
  React.useEffect(() => {
    if (
      event &&
      permissions &&
      permissions.isAdmin &&
      !permissions.isCreator &&
      !permissions.isCohost
    ) {
      console.log('[EventActionButtons] Admin viewing event:', event.title);
    }
  }, [event, permissions]);
  const handleInviteGuests = () => {
    if (permissions.canEdit) {
      // Host invite
      navigation.navigate('Invite', {
        type: 'guests',
        selectedUsers: [],
        selectedContacts: [],
        selectedPhoneContacts: [],
        eventTitle: event.title,
        eventId: event.id,
        source: 'host_invite',
        inviteType: 'host_guests',
      });
    } else if (onInvite) {
      // Guest invite
      onInvite();
    }
  };

  const handleEditEvent = () => {
    navigation.navigate('EditEvent', {
      eventId,
      eventData: event,
      studioId,
    });
  };

  const handleManageAttendance = () => {
    navigation.navigate('EventAttendance', { eventId, studioId });
  };

  // Calculate time-based attendance management availability
  const getAttendanceManagementAvailability = () => {
    if (!event || !event.eventTimestamp) return false;

    const now = new Date();
    const eventTime = new Date(event.eventTimestamp.seconds * 1000);
    const threeHoursBefore = new Date(eventTime.getTime() - 3 * 60 * 60 * 1000); // 3 hours before
    const thirtyMinutesAfter = new Date(eventTime.getTime() + 30 * 60 * 1000); // 30 minutes after

    // Available from 3 hours before until 30 minutes after event
    return now >= threeHoursBefore && now <= thirtyMinutesAfter;
  };

  const shouldShowManageAttendance = permissions.canManageAttendance && getAttendanceManagementAvailability();

  const handleSaveAsTemplate = () => {
    vibeAlert.confirm(
      'Save as Template',
      `Save "${event.title}" as a reusable template for future events?`,
      () => {
        navigation.navigate('CreateEvent', {
          templateFromEvent: {
            title: `${event.title} (Copy)`,
            location: event.location,
            address: event.address,
            details: event.description,
            maxGuests: event.maxGuests?.toString() || '',
            hasFee: event.hasFee || false,
            entryFee: event.entryFee?.toString() || '',
            isPrivate: event.isPrivate || false,
            showHostContact: event.showHostContact,
            trackAttendance: event.trackAttendance || false,
            attendanceType: event.attendanceType || 'casual',
            whatsProvided: event.whatsProvided || '',
            whatToBring: event.whatToBring || '',
            parkingInstructions: event.parkingInstructions || '',
            dressCode: event.dressCode || '',
            ageRestrictions: event.ageRestrictions || '',
          },
        });
        vibeAlert.turquoise(
          'Template Created',
          'Event loaded as template in Create Event!'
        );
      },
      () => {}
    );
  };

  if (!event) return null;

  // Debug: Log pending cohost invitation
  React.useEffect(() => {
    console.log('[EventActionButtons] 🎯 pendingCohostInvitation:', pendingCohostInvitation);
  }, [pendingCohostInvitation]);

  // Additional safeguard: Double-check permissions before rendering
  const isActualCreator = event.createdBy === currentUserId;
  const isActualCohost = event.cohosts?.includes(currentUserId) || false;
  const isActualAdmin = permissions?.isAdmin || false;
  const shouldShowHostView =
    permissions?.canEdit &&
    (isActualCreator || isActualCohost || isActualAdmin);
  const shouldShowGuestView = !shouldShowHostView;

  // Log warning if there's a mismatch
  if (permissions?.canEdit && !shouldShowHostView) {
    console.warn('[EventActionButtons] BLOCKED INCORRECT HOST VIEW:', {
      permissionsCanEdit: permissions.canEdit,
      isActualCreator,
      isActualCohost,
      isActualAdmin,
      shouldShowHostView,
    });
  }

  return (
    <View style={styles.container}>
      {/* Action Buttons for Active Events */}
      <View style={styles.buttonContainer}>
        {/* Cohost invitation button - show for ALL users (guest or admin) with pending invitation */}
        {!isEventPast && pendingCohostInvitation && !isActualCohost && (
          <VibeButton
            label="JOIN AS COHOST"
            onPress={onAcceptCohostInvitation}
            disabled={isLoading}
            variant="green"
          />
        )}

        {/* Admin Join/Leave button (show for admins who aren't creators) */}
        {!isEventPast &&
          permissions?.isAdmin &&
          !isActualCreator &&
          !isActualCohost && (
            <VibeButton
              label={isSubscribed ? 'LEAVE EVENT' : 'JOIN EVENT'}
              onPress={onSubscribe}
              disabled={
                isLoading || (!isSubscribed && !joinConstraints.canJoin)
              }
              variant={!isSubscribed ? 'green' : 'default'}
            />
          )}

        {/* Non-host user buttons */}
        {!isEventPast && shouldShowGuestView && (
          <>

            {/* Join/Leave event button */}
            <VibeButton
              label={isSubscribed ? 'LEAVE EVENT' : 'JOIN EVENT'}
              onPress={onSubscribe}
              disabled={
                isLoading || (!isSubscribed && !joinConstraints.canJoin)
              }
              variant={!isSubscribed ? 'green' : 'default'}
            />

            {/* Invite guests button for non-hosts (public events or private with guest invites allowed) */}
            {(!event?.isPrivate ||
              (event?.allowGuestInvites && isSubscribed)) && (
              <>
                <VibeButton
                  label="INVITE GUESTS"
                  onPress={handleInviteGuests}
                />
                <VibeButton
                  label="SHARE EVENT"
                  onPress={onShareEvent}
                />
              </>
            )}
          </>
        )}

        {/* Manage Attendance - Available 3hrs before to 30min after event */}
        {shouldShowHostView && shouldShowManageAttendance && (
          <VibeButton
            label="MANAGE ATTENDANCE"
            onPress={handleManageAttendance}
          />
        )}

        {/* Host buttons for active events */}
        {!isEventPast && shouldShowHostView && (
          <>

            {/* Host invite button */}
            <VibeButton
              label="INVITE GUESTS"
              onPress={handleInviteGuests}
            />

            {/* Share Event */}
            <VibeButton
              label="SHARE EVENT"
              onPress={onShareEvent}
            />

            {/* Edit Event */}
            <VibeButton
              label="EDIT EVENT"
              onPress={handleEditEvent}
            />

            {/* Delete Event */}
            {permissions.canDelete && (
              <VibeButton
                label="DELETE EVENT"
                onPress={onDelete}
                variant="red"
              />
            )}
          </>
        )}
      </View>

      {/* Past Event Actions */}
      {isEventPast && (
        <View style={styles.pastEventContainer}>
          {/* Save as Template for hosts */}
          {shouldShowHostView && (
            <VibeButton
              label="SAVE AS TEMPLATE"
              onPress={handleSaveAsTemplate}
              variant="outline"
            />
          )}

          {/* Event Recap for hosts/cohosts/admins AND subscribed guests */}
          {(permissions.isCreator ||
            permissions.isCohost ||
            permissions.isAdmin ||
            isSubscribed) && (
            <VibeButton
              label={
                event.status === 'completed' ? 'VIEW RECAP' : 'EVENT RECAP'
              }
              onPress={onEventRecap}
            />
          )}
        </View>
      )}
    </View>
  );
});

export default EventActionButtons;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonContainer: {
    gap: 0,
  },
  pastEventContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.vibeBlue,
    gap: 12,
  },
  cohostButton: {
    borderColor: theme.colors.vibeGreen,
    borderWidth: 2,
    backgroundColor: theme.colors.vibeGreen + '20', // 20% opacity
  },
});
