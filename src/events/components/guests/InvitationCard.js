// FILE: components/guests/InvitationCard.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { acceptInvitation, declineInvitation } from '../../services/invitations';
import { VibeButton } from '../../../components/ui';
import theme from '../../../theme/themes';

export default function InvitationCard({ invitation, currentUserId, onResponse }) {
  const [isResponding, setIsResponding] = useState(false);

  // Handle accepting invitation
  const handleAccept = async () => {
    if (!invitation || !currentUserId) return;

    setIsResponding(true);
    try {
      await acceptInvitation(invitation.id, currentUserId);
      Alert.alert(
        'Invitation Accepted!',
        `You're now attending "${invitation.eventData?.title || 'this event'}". Check your events list for details.`,
        [{ text: 'OK', onPress: () => onResponse && onResponse('accepted') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to accept invitation');
    } finally {
      setIsResponding(false);
    }
  };

  // Handle declining invitation
  const handleDecline = async () => {
    if (!invitation || !currentUserId) return;

    Alert.alert(
      'Decline Invitation',
      `Are you sure you want to decline the invitation to "${invitation.eventData?.title || 'this event'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Decline',
          style: 'destructive',
          onPress: async () => {
            setIsResponding(true);
            try {
              await declineInvitation(invitation.id, currentUserId);
              Alert.alert(
                'Invitation Declined',
                'You have declined this invitation.',
                [{ text: 'OK', onPress: () => onResponse && onResponse('declined') }]
              );
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to decline invitation');
            } finally {
              setIsResponding(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Date TBD';
    
    const eventDate = date.toDate ? date.toDate() : new Date(date);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    if (!date) return 'Time TBD';
    
    const eventDate = date.toDate ? date.toDate() : new Date(date);
    return eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!invitation || !invitation.eventData) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Invalid invitation data</Text>
      </View>
    );
  }

  const { eventData, hostData, status, invitedAt, message } = invitation;
  const isPending = status === 'pending';
  const isExpired = status === 'expired';

  return (
    <View style={[styles.card, !isPending && styles.respondedCard]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eventTitle}>{eventData.title}</Text>
        <View style={[styles.statusBadge, styles[`${status}Status`]]}>
          <Text style={styles.statusText}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Event Details */}
      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{formatDate(eventData.eventTimestamp)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>⏰</Text>
          <Text style={styles.detailText}>{formatTime(eventData.eventTimestamp)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{eventData.location || 'Location TBD'}</Text>
        </View>

        {eventData.address && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🏠</Text>
            <Text style={styles.detailText}>{eventData.address}</Text>
          </View>
        )}
      </View>

      {/* Host Info */}
      {hostData && (
        <View style={styles.hostInfo}>
          <Text style={styles.hostLabel}>Invited by:</Text>
          <Text style={styles.hostName}>{hostData.displayName || hostData.email || 'Unknown Host'}</Text>
        </View>
      )}

      {/* Personal Message */}
      {message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Personal message:</Text>
          <Text style={styles.messageText}>"{message}"</Text>
        </View>
      )}

      {/* Invitation Date */}
      <Text style={styles.invitedDate}>
        Invited {invitedAt.toLocaleDateString()}
      </Text>

      {/* Action Buttons */}
      {isPending && !isExpired && (
        <View style={styles.actionButtons}>
          <VibeButton
            title="Accept"
            onPress={handleAccept}
            disabled={isResponding}
            style={[styles.actionButton, styles.acceptButton]}
          />
          <VibeButton
            title="Decline"
            onPress={handleDecline}
            disabled={isResponding}
            style={[styles.actionButton, styles.declineButton]}
            variant="outline"
          />
        </View>
      )}

      {/* Status Messages */}
      {status === 'accepted' && (
        <View style={styles.statusMessage}>
          <Text style={styles.statusMessageText}>
            ✅ You're attending this event! Check your events list for details.
          </Text>
        </View>
      )}

      {status === 'declined' && (
        <View style={styles.statusMessage}>
          <Text style={styles.statusMessageText}>
            ❌ You declined this invitation.
          </Text>
        </View>
      )}

      {isExpired && (
        <View style={styles.statusMessage}>
          <Text style={styles.statusMessageText}>
            ⏰ This invitation has expired.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  respondedCard: {
    borderColor: theme.colors.gray,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eventTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  pendingStatus: {
    backgroundColor: theme.colors.vibeYellow,
  },
  acceptedStatus: {
    backgroundColor: theme.colors.vibeGreen,
  },
  declinedStatus: {
    backgroundColor: theme.colors.vibeRed,
  },
  expiredStatus: {
    backgroundColor: theme.colors.gray,
  },
  statusText: {
    color: theme.colors.black,
    fontSize: 11,
    fontWeight: '600',
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    color: theme.colors.white,
    fontSize: 14,
    flex: 1,
  },
  hostInfo: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
  },
  hostLabel: {
    color: theme.colors.gray,
    fontSize: 12,
    marginBottom: 4,
  },
  hostName: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: theme.colors.black,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageLabel: {
    color: theme.colors.gray,
    fontSize: 12,
    marginBottom: 4,
  },
  messageText: {
    color: theme.colors.white,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  invitedDate: {
    color: theme.colors.gray,
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  acceptButton: {
    backgroundColor: theme.colors.vibeGreen,
  },
  declineButton: {
    borderColor: theme.colors.vibeRed,
  },
  statusMessage: {
    backgroundColor: theme.colors.black,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statusMessageText: {
    color: theme.colors.gray,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: theme.colors.vibeRed,
    textAlign: 'center',
    fontSize: 14,
  },
});