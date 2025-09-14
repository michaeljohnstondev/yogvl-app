// PhoneInviteList.js - Component to display and manage phone invitations for an event

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../../theme/themes';
import VibeButton from '../base/VibeButton';
import { useVibeAlert } from '../base/VibeAlertContext';

export default function PhoneInviteList({
  eventId,
  studioId,
  eventData,
  isHost = false,
  onUpdate = null,
}) {
  const [loading, setLoading] = useState(true);
  const [invitedPhones, setInvitedPhones] = useState([]);
  const [removing, setRemoving] = useState(null);
  const vibeAlert = useVibeAlert();

  // Load invited phone numbers
  useEffect(() => {
    loadInvitedPhones();
  }, [eventId, eventData]);

  const loadInvitedPhones = () => {
    try {
      setLoading(true);
      const phones = eventData?.invitedPhones || [];
      setInvitedPhones(phones);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';

    // Format for display (e.g., +1234567890 -> +1 (234) 567-0890)
    if (phone.startsWith('+1') && phone.length === 12) {
      const digits = phone.substring(2);
      return `+1 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }

    return phone; // Return as-is if we can't format it
  };

  const removePhoneNumber = async (phoneToRemove) => {
    if (!isHost) return;

    Alert.alert(
      'Remove Phone Number',
      `Remove ${formatPhoneNumber(phoneToRemove)} from the invite list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(phoneToRemove);
            try {
              const { removePhoneFromEventAccess } = await import(
                '../../services/phoneAccessService'
              );
              await removePhoneFromEventAccess(studioId, eventId, [
                phoneToRemove,
              ]);

              // Update local state
              setInvitedPhones((prev) =>
                prev.filter((phone) => phone !== phoneToRemove)
              );

              vibeAlert.success(
                'Removed',
                'Phone number removed from invite list'
              );

              // Notify parent component
              if (onUpdate) {
                onUpdate();
              }
            } catch (error) {
              console.error('Error removing phone from invite list:', error);
              vibeAlert.error('Error', 'Failed to remove phone number');
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  const getInviteStatus = (phone) => {
    // This could be enhanced to check if the phone number is registered in the app
    return 'Invited'; // For now, just show "Invited"
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading phone invites...</Text>
      </View>
    );
  }

  if (invitedPhones.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No phone invitations sent</Text>
        <Text style={styles.emptySubtext}>
          SMS invites will appear here after you send them
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Phone Invitations</Text>
        <Text style={styles.subtitle}>
          {invitedPhones.length} phone number
          {invitedPhones.length > 1 ? 's' : ''} invited
        </Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {invitedPhones.map((phone, index) => (
          <LinearGradient
            key={phone}
            colors={theme.colors.cardGradient}
            style={styles.phoneCard}
          >
            <View style={styles.phoneInfo}>
              <Text style={styles.phoneNumber}>{formatPhoneNumber(phone)}</Text>
              <Text style={styles.status}>{getInviteStatus(phone)}</Text>
            </View>

            {isHost && (
              <TouchableOpacity
                style={[
                  styles.removeButton,
                  removing === phone && styles.removeButtonDisabled,
                ]}
                onPress={() => removePhoneNumber(phone)}
                disabled={removing === phone}
              >
                {removing === phone ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <Text style={styles.removeButtonText}>Remove</Text>
                )}
              </TouchableOpacity>
            )}
          </LinearGradient>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
    marginTop: 10,
  },
  emptyText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    marginBottom: 15,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  list: {
    maxHeight: 200, // Limit height to avoid taking too much space
  },
  phoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 8,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.border + '40',
  },
  phoneInfo: {
    flex: 1,
  },
  phoneNumber: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  status: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
    backgroundColor: theme.colors.error + '10',
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
});
