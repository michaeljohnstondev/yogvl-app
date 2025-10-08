import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { UserAvatar } from '../../../components/ui/profile';
import CloseButton from '../../../components/ui/buttons/CloseButton';
import theme from '../../../theme/themes';

export default function AttendeeSection({
  visible,
  onClose,
  attendees = [],
  eventData,
  currentUserId,
  isHost,
  onKickAttendee,
  navigation,
}) {
  const modalTitle = isHost ? 'Guests' : 'Friends Attending';

  const handleKickPress = (attendeeId, attendeeName) => {
    onClose();
    if (onKickAttendee) {
      onKickAttendee(attendeeId, attendeeName);
    }
  };

  const handleProfilePress = (attendeeId) => {
    onClose();
    if (navigation) {
      navigation.navigate('UserProfile', { userId: attendeeId });
    }
  };

  const canKickAttendee = (attendee) => {
    if (!isHost) return false;

    // Can't kick the event creator
    if (attendee.id === eventData?.createdBy) return false;

    // Can't kick cohosts
    if (eventData?.cohosts?.includes(attendee.id)) return false;

    // Can't kick yourself
    if (attendee.id === currentUserId) return false;

    return true;
  };

  const renderAttendeeItem = ({ item: attendee, index }) => (
    <View key={attendee.id || index} style={styles.attendeeItem}>
      <View style={styles.attendeeContent}>
        <UserAvatar
          userId={attendee.id}
          size={40}
          style={styles.avatarStyle}
          onPress={() => handleProfilePress(attendee.id)}
        />
        <View style={styles.attendeeInfo}>
          <Text style={styles.attendeeName}>{attendee.displayName}</Text>
          {attendee.id === eventData?.createdBy && (
            <Text style={styles.hostBadge}>Host</Text>
          )}
          {eventData?.cohosts?.includes(attendee.id) && (
            <Text style={styles.cohostBadge}>Co-host</Text>
          )}
        </View>
      </View>

      {canKickAttendee(attendee) && (
        <TouchableOpacity
          style={styles.kickButton}
          onPress={() => handleKickPress(attendee.id, attendee.displayName)}
          activeOpacity={0.7}
        >
          <Text style={styles.kickButtonText}>❌</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const getItemLayout = (data, index) => ({
    length: 64, // Approximate height of each item
    offset: 64 * index,
    index,
  });

  const keyExtractor = (item, index) => item.id || index.toString();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.attendeesModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <CloseButton onPress={onClose} />
          </View>

          <View style={styles.attendeesList}>
            {attendees.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {isHost ? 'No guests yet' : 'No friends attending'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={attendees}
                renderItem={renderAttendeeItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                maxToRenderPerBatch={10}
                windowSize={21}
                removeClippedSubviews={true}
                showsVerticalScrollIndicator={true}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>

          {attendees.length > 0 && (
            <View style={styles.modalFooter}>
              <Text style={styles.attendeeCount}>
                {attendees.length}{' '}
                {isHost
                  ? attendees.length === 1 ? 'guest' : 'guests'
                  : attendees.length === 1 ? 'attendee' : 'attendees'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  attendeesModal: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.sizes.borderRadius,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.vibeBlue,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  attendeesList: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  separator: {
    height: 1,
    backgroundColor: `${theme.colors.vibeBlue}30`,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 64,
  },
  attendeeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStyle: {
    // No additional margin needed - let attendeeInfo handle spacing
  },
  attendeeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  hostBadge: {
    fontSize: 12,
    color: theme.colors.vibeGreen,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cohostBadge: {
    fontSize: 12,
    color: theme.colors.vibeOrange,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  kickButton: {
    padding: 8,
    marginLeft: 12,
  },
  kickButtonText: {
    fontSize: 16,
    color: theme.colors.vibeRed,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.vibeBlue,
    alignItems: 'center',
  },
  attendeeCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
