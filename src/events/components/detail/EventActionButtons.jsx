import React, { memo } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
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
}) {
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
        onSave: (selectedData) => {
          vibeAlert.success(
            'Success',
            `Connected with ${selectedData.users.length} people! They can now see your events.`
          );
          navigation.goBack();
        },
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

  return (
    <View style={styles.container}>
      {/* Action Buttons for Active Events */}
      <View style={styles.buttonContainer}>
        {/* Non-host user buttons */}
        {!isEventPast && !permissions.canEdit && (
          <>
            {/* Invite guests button for non-hosts (public events or private with guest invites allowed) */}
            {(!event?.isPrivate || (event?.allowGuestInvites && isSubscribed)) && (
              <VibeButton
                label="INVITE GUESTS"
                onPress={handleInviteGuests}
                style={styles.inviteButton}
              />
            )}

            {/* Join/Leave event button */}
            <VibeButton
              label={isSubscribed ? 'LEAVE EVENT' : 'JOIN EVENT'}
              onPress={onSubscribe}
              disabled={isLoading || (!isSubscribed && !joinConstraints.canJoin)}
              style={[
                styles.joinLeaveButton,
                (isLoading || (!isSubscribed && !joinConstraints.canJoin)) && styles.disabledButton,
              ]}
            />
          </>
        )}

        {/* Host buttons for active events */}
        {!isEventPast && permissions.canEdit && (
          <>
            {/* Manage Attendance */}
            {permissions.canManageAttendance && (
              <VibeButton
                label="MANAGE ATTENDANCE"
                onPress={handleManageAttendance}
                style={styles.actionButton}
              />
            )}

            {/* Host invite button */}
            <VibeButton
              label="INVITE GUESTS"
              onPress={handleInviteGuests}
              style={[styles.inviteButton, styles.tightButton]}
            />

            {/* Edit Event */}
            <VibeButton
              label="EDIT EVENT"
              onPress={handleEditEvent}
              style={[styles.actionButton, styles.tightButton]}
            />

            {/* Delete Event */}
            {permissions.canDelete && (
              <VibeButton
                label="DELETE EVENT"
                onPress={onDelete}
                style={[styles.actionButton, styles.tightButton, styles.dangerButton]}
              />
            )}
          </>
        )}
      </View>

      {/* Past Event Actions */}
      {isEventPast && (
        <View style={styles.pastEventContainer}>
          {/* Save as Template for hosts */}
          {permissions.canEdit && (
            <VibeButton
              label="SAVE AS TEMPLATE"
              onPress={handleSaveAsTemplate}
              variant="outline"
              style={styles.templateButton}
            />
          )}

          {/* Event Recap for hosts/cohosts/admins */}
          {(permissions.isCreator || permissions.isCohost || permissions.isAdmin) && (
            <VibeButton
              label={event.status === 'completed' ? 'VIEW RECAP' : 'EVENT RECAP'}
              onPress={onEventRecap}
              style={styles.recapButton}
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
    gap: 12,
  },
  actionButton: {
    borderRadius: theme.sizes.buttonRadius,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    backgroundColor: theme.colors.vibeBackgroundBlue,
  },
  primaryActionButton: {
    borderColor: theme.colors.vibeGreen,
    backgroundColor: theme.colors.vibeBackgroundGreen,
  },
  inviteButton: {
    borderRadius: theme.sizes.buttonRadius,
  },
  joinLeaveButton: {
    borderRadius: theme.sizes.buttonRadius,
  },
  tightButton: {
    marginVertical: 4,
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: theme.colors.textSecondary,
    backgroundColor: theme.colors.vibeBackgroundBlue,
  },
  dangerButton: {
    borderColor: theme.colors.vibeRed,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  pastEventContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.vibeBlue,
    gap: 12,
  },
  templateButton: {
    borderColor: theme.colors.vibePurple,
    backgroundColor: theme.colors.vibeBackgroundPurple,
  },
  recapButton: {
    borderColor: theme.colors.vibeYellow,
    backgroundColor: theme.colors.vibeBackgroundYellow,
  },
});