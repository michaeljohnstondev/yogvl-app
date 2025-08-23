// FILE: components/guests/GuestManager.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { 
  getEventInvitations, 
  cancelInvitation,
  INVITATION_STATUS 
} from '../../services/invitations';
import VibeButton from '../../../components/ui/VibeButton';
import theme from '../../../theme/themes';

export default function GuestManager({ eventId, hostId, onInvitePress }) {
  const [invitations, setInvitations] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'accepted', 'declined'

  // Load invitations and attendees
  useEffect(() => {
    loadGuestData();
  }, [eventId]);

  const loadGuestData = useCallback(async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);
      
      // Load invitations
      const eventInvitations = await getEventInvitations(eventId);
      setInvitations(eventInvitations);

      // Separate accepted invitations as attendees
      const acceptedInvitations = eventInvitations.filter(
        inv => inv.status === INVITATION_STATUS.ACCEPTED
      );
      setAttendees(acceptedInvitations);

    } catch (error) {
      console.error('Error loading guest data:', error);
      Alert.alert('Error', 'Failed to load guest information');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadGuestData();
    setIsRefreshing(false);
  }, [loadGuestData]);

  // Cancel an invitation
  const handleCancelInvitation = useCallback(async (invitationId, guestName) => {
    Alert.alert(
      'Cancel Invitation',
      `Are you sure you want to cancel the invitation for ${guestName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvitation(invitationId, hostId);
              Alert.alert('Success', 'Invitation cancelled successfully');
              loadGuestData(); // Refresh the list
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to cancel invitation');
            }
          },
        },
      ]
    );
  }, [hostId, loadGuestData]);

  // Filter invitations based on active filter
  const filteredInvitations = invitations.filter(invitation => {
    if (activeFilter === 'all') return true;
    return invitation.status === activeFilter;
  });

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case INVITATION_STATUS.PENDING: return theme.colors.vibeYellow;
      case INVITATION_STATUS.ACCEPTED: return theme.colors.vibeGreen;
      case INVITATION_STATUS.DECLINED: return theme.colors.vibeRed;
      case INVITATION_STATUS.EXPIRED: return theme.colors.gray;
      default: return theme.colors.gray;
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case INVITATION_STATUS.PENDING: return 'Pending';
      case INVITATION_STATUS.ACCEPTED: return 'Accepted';
      case INVITATION_STATUS.DECLINED: return 'Declined';
      case INVITATION_STATUS.EXPIRED: return 'Expired';
      default: return 'Unknown';
    }
  };

  // Get guest display name
  const getGuestDisplayName = (invitation) => {
    if (invitation.guestData?.displayName) {
      return invitation.guestData.displayName;
    }
    if (invitation.guestEmail) {
      return invitation.guestEmail;
    }
    return 'Unknown Guest';
  };

  // Render filter button
  const renderFilterButton = (filter, label, count) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilter]}
        onPress={() => setActiveFilter(filter)}
      >
        <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
          {label} {count > 0 && `(${count})`}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render invitation item
  const renderInvitationItem = ({ item }) => {
    const guestName = getGuestDisplayName(item);
    const canCancel = item.status === INVITATION_STATUS.PENDING;

    return (
      <View style={styles.invitationItem}>
        <View style={styles.guestInfo}>
          <Text style={styles.guestName}>{guestName}</Text>
          {item.guestEmail && item.guestData?.displayName && (
            <Text style={styles.guestEmail}>{item.guestEmail}</Text>
          )}
          <Text style={styles.invitationDate}>
            Invited {item.invitedAt.toLocaleDateString()}
          </Text>
          {item.respondedAt && (
            <Text style={styles.responseDate}>
              Responded {item.respondedAt.toLocaleDateString()}
            </Text>
          )}
          {item.message && (
            <Text style={styles.invitationMessage}>Message: "{item.message}"</Text>
          )}
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelInvitation(item.id, guestName)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Get counts for filters
  const pendingCount = invitations.filter(inv => inv.status === INVITATION_STATUS.PENDING).length;
  const acceptedCount = invitations.filter(inv => inv.status === INVITATION_STATUS.ACCEPTED).length;
  const declinedCount = invitations.filter(inv => inv.status === INVITATION_STATUS.DECLINED).length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading guest information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with stats */}
      <View style={styles.header}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{acceptedCount}</Text>
            <Text style={styles.statLabel}>Attending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{invitations.length}</Text>
            <Text style={styles.statLabel}>Total Invited</Text>
          </View>
        </View>

        <VibeButton
          title="+ Invite More"
          onPress={onInvitePress}
          style={styles.inviteButton}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All', invitations.length)}
        {renderFilterButton('pending', 'Pending', pendingCount)}
        {renderFilterButton('accepted', 'Accepted', acceptedCount)}
        {renderFilterButton('declined', 'Declined', declinedCount)}
      </View>

      {/* Guest list */}
      {filteredInvitations.length > 0 ? (
        <FlatList
          data={filteredInvitations}
          renderItem={renderInvitationItem}
          keyExtractor={(item) => item.id}
          style={styles.invitationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.vibeBlue}
              colors={[theme.colors.vibeBlue]}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeFilter === 'all' 
              ? "No invitations sent yet. Tap 'Invite More' to get started!" 
              : `No ${activeFilter} invitations`
            }
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  loadingText: {
    color: theme.colors.gray,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  statsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  statItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  statNumber: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: theme.colors.gray,
    fontSize: 12,
    marginTop: 2,
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.darkGray,
  },
  activeFilter: {
    backgroundColor: theme.colors.vibeBlue,
  },
  filterText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterText: {
    color: theme.colors.white,
  },
  invitationsList: {
    flex: 1,
    padding: 16,
  },
  invitationItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.darkGray,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  guestInfo: {
    flex: 1,
    marginRight: 12,
  },
  guestName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  guestEmail: {
    color: theme.colors.gray,
    fontSize: 14,
    marginTop: 2,
  },
  invitationDate: {
    color: theme.colors.gray,
    fontSize: 12,
    marginTop: 4,
  },
  responseDate: {
    color: theme.colors.gray,
    fontSize: 12,
    marginTop: 2,
  },
  invitationMessage: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    color: theme.colors.black,
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: theme.colors.vibeRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: theme.colors.gray,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
});