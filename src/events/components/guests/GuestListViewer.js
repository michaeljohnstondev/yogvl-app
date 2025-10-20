// FILE: components/guests/GuestListViewer.js

import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  BackHandler,
} from 'react-native';
import { VibeButton, CloseButton } from '../../../components/ui';
import ScreenHeader from '../../../components/ui/layout/ScreenHeader';
import theme from '../../../theme/themes';

const GuestListViewer = forwardRef(
  (
    {
      hosts = [],
      selectedTextContacts = [],
      invitedGuests = [],
      pendingInvitations = [], // NEW: Array of pending invitation objects {userId, type}
      currentUser = null,
      onInvitePress,
      onAddHostPress, // New prop for adding hosts
      selectedGuestCount, // Override for guest count display
      selectedCohostCount, // Override for cohost count display
      showGuestCount = true,
      showHostCount = true,
      compactView = false,
      style,
    },
    ref
  ) => {
    const [showModal, setShowModal] = useState(false);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      reopenModal: () => setShowModal(true),
      isModalOpen: () => {
        console.log(
          '[GuestListViewer] isModalOpen called, showModal:',
          showModal
        );
        return showModal;
      },
      closeModal: () => {
        console.log('[GuestListViewer] closeModal called');
        setShowModal(false);
      },
    }));

    // Debug logging (disabled - too verbose)
    // console.log('[GuestListViewer] Props received:', {
    //   hostsCount: hosts?.length || 0,
    //   invitedGuestsCount: invitedGuests?.length || 0,
    //   selectedGuestCount,
    //   selectedCohostCount,
    //   currentUser: currentUser?.id || 'none'
    // });

    // Combine all hosts including the creator
    const allHosts = [
      currentUser && {
        id: currentUser.id || 'current',
        name:
          currentUser.displayName ||
          (currentUser.userdata?.contactInfo?.firstName &&
          currentUser.userdata?.contactInfo?.lastName
            ? `${currentUser.userdata.contactInfo.firstName} ${currentUser.userdata.contactInfo.lastName}`
            : currentUser.userdata?.contactInfo?.firstName) ||
          currentUser.firstName ||
          currentUser.name ||
          'You',
        email: currentUser.email,
        role: 'creator',
        isYou: true,
      },
      // Add current cohosts
      ...(hosts || []).map((host) => ({
        id: host.id,
        name:
          host.userdata?.contactInfo?.displayName ||
          host.displayName ||
          `${host.userdata?.contactInfo?.firstName || ''} ${host.userdata?.contactInfo?.lastName || ''}`.trim() ||
          host.firstName ||
          host.name ||
          'Unknown Host',
        email: host.userdata?.contactInfo?.email || host.email,
        role: 'cohost',
        isYou: host.id === currentUser?.id,
      })),
    ].filter(Boolean);

    // Use invitedGuests passed as prop, fallback to selectedTextContacts for backward compatibility
    const guests =
      invitedGuests.length > 0
        ? invitedGuests.map((guest, index) => ({
            id: guest.id || `guest_${index}`,
            name:
              guest.userdata?.contactInfo?.displayName ||
              guest.displayName ||
              guest.userdata?.contactInfo?.firstName ||
              guest.firstName ||
              guest.name ||
              guest.userdata?.contactInfo?.email ||
              guest.email ||
              'Unknown Guest',
            email: guest.userdata?.contactInfo?.email || guest.email,
            phone: guest.userdata?.contactInfo?.phone || guest.phone,
            role: 'guest',
            isYou: false,
          }))
        : selectedTextContacts.map((contact, index) => ({
            id: contact.id || `contact_${index}`,
            name:
              contact.name ||
              contact.displayName ||
              contact.firstName ||
              contact.lastName ||
              (contact.firstName && contact.lastName
                ? `${contact.firstName} ${contact.lastName}`
                : null) ||
              'Unknown Contact',
            phone: contact.phone,
            role: 'guest',
            isTextInvite: true,
          }));

    // Mark all current attendees as accepted (subscribers)
    const acceptedAttendees = [...allHosts, ...guests].map(attendee => ({
      ...attendee,
      status: 'accepted'
    }));

    // Add pending invitations (TODO: parent component should pass user data for pending invites)
    // For now, this is just a placeholder for future enhancement
    const pendingAttendees = pendingInvitations.map((inv, index) => ({
      id: inv.userId || `pending_${index}`,
      name: 'Pending User', // TODO: fetch user data
      role: inv.type === 'cohost' ? 'cohost' : 'guest',
      status: 'pending'
    }));

    // Combine all attendees and sort by: status (accepted first), then role
    const allAttendees = [...acceptedAttendees, ...pendingAttendees].sort((a, b) => {
      // First, sort by status: accepted (0) before pending (1)
      const statusOrder = { accepted: 0, pending: 1 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Within same status, sort by role: creator -> cohost -> guest
      const roleOrder = { creator: 0, cohost: 1, guest: 2 };
      return roleOrder[a.role] - roleOrder[b.role];
    });

    // Use override counts when available (for editing mode), otherwise calculate from arrays
    const actualHostCount =
      selectedCohostCount !== undefined
        ? selectedCohostCount + 1
        : allHosts.length; // +1 for creator
    const actualGuestCount =
      selectedGuestCount !== undefined ? selectedGuestCount : guests.length;
    const totalPeople = actualHostCount + actualGuestCount;

    // Always show the viewer, even when empty
    const displayText =
      totalPeople === 0
        ? 'No people added yet'
        : `${totalPeople} ${totalPeople === 1 ? 'total' : 'total'}`;

    // Unified render for all attendees (hosts and guests)
    const renderAttendeeItem = ({ item, index }) => {
      const isHost = item.role === 'creator' || item.role === 'cohost';
      const isCreator = item.role === 'creator';
      const isPending = item.status === 'pending';

      return (
        <View style={[styles.personItem, index === 0 && styles.firstItem]}>
          <View style={styles.personInfo}>
            <Text style={[styles.personName, item.isYou && styles.youText]}>
              {item.name}
              {item.isYou ? ' (You)' : ''}
              {isPending ? ' (Pending)' : ''}
            </Text>
            <Text
              style={[
                isHost ? styles.roleText : styles.inviteTypeText,
                isCreator && styles.creatorRole,
                item.role === 'cohost' && styles.cohostRole,
              ]}
            >
              {isCreator && 'Event Creator'}
              {item.role === 'cohost' && (isPending ? 'Invited as Co-Host' : 'Co-Host')}
              {item.role === 'guest' && (
                isPending
                  ? 'Invitation Pending'
                  : (item.isTextInvite
                    ? 'Will receive SMS invitation'
                    : 'Invited via app')
              )}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                isCreator && styles.creatorDot,
                item.role === 'cohost' && styles.cohostDot,
                item.role === 'guest' && styles.guestDot,
                isPending && styles.pendingDot,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isCreator && styles.creatorStatusText,
                item.role === 'cohost' && styles.cohostStatusText,
                item.role === 'guest' && styles.guestStatusText,
                isPending && styles.pendingStatusText,
              ]}
            >
              {isPending ? 'Pending' : (isCreator ? 'Host' : item.role === 'cohost' ? 'Co-Host' : 'Guest')}
            </Text>
          </View>
        </View>
      );
    };

    return (
      <>
        {/* Compact viewer button */}
        <TouchableOpacity
          style={[styles.viewerButton, style]}
          onPress={() => setShowModal(true)}
        >
          <View style={styles.viewerContent}>
            <View style={styles.viewerLeft}>
              <Text style={styles.viewerTitle}>Guest List</Text>
              <Text style={styles.viewerCount}>{displayText}</Text>
            </View>

            <View style={styles.viewerRight}>
              <View style={styles.peopleIcons}>
                <View style={styles.iconGroup}>
                  <Text style={styles.iconEmoji}>👑</Text>
                  <Text style={[styles.iconCount, styles.cohostCount]}>
                    {actualHostCount}
                  </Text>
                </View>
                <View style={styles.iconGroup}>
                  <Text style={styles.iconEmoji}>👥</Text>
                  <Text style={[styles.iconCount, styles.guestCount]}>
                    {actualGuestCount}
                  </Text>
                </View>
              </View>
              <Text style={styles.viewText}>View →</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Full modal viewer */}
        <Modal
          visible={showModal}
          animationType="none"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            console.log('[GuestListViewer] Modal onRequestClose called');
            setShowModal(false);
          }}
        >
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.headerWrapper}>
              <ScreenHeader
                title="Guest List"
                showCloseButton={true}
                onClose={() => setShowModal(false)}
              />
              <Text style={styles.countText}>{totalPeople}</Text>
            </View>

            {/* Unified Attendees List */}
            <View style={styles.contentContainer}>
              {allAttendees.length > 0 ? (
                <FlatList
                  data={allAttendees}
                  renderItem={renderAttendeeItem}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={styles.emptyText}>No attendees yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add co-hosts and guests using the buttons below
                  </Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <VibeButton
                label="Add Co-Hosts"
                onPress={() => {
                  setShowModal(false);
                  onAddHostPress && onAddHostPress();
                }}
                style={[styles.addHostActionButton, { marginVertical: 0 }]}
              />

              <VibeButton
                label={
                  actualGuestCount === 0 ? 'Invite Guests' : 'Add More Guests'
                }
                onPress={() => {
                  console.log(
                    'Invite button pressed, onInvitePress:',
                    onInvitePress
                  );
                  setShowModal(false);
                  onInvitePress && onInvitePress();
                }}
                style={[styles.inviteButton, { marginVertical: 0 }]}
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }
);

export default GuestListViewer;

const styles = StyleSheet.create({
  // Compact viewer
  viewerButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark transparent blacklight
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 3,
    borderColor: theme.colors.vibeTurquoise,
  },
  viewerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewerLeft: {
    flex: 1,
  },
  viewerTitle: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  viewerCount: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  viewerRight: {
    alignItems: 'flex-end',
  },
  peopleIcons: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  iconCount: {
    color: theme.colors.vibePurple,
    fontSize: 12,
    fontWeight: '600',
  },
  viewText: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerWrapper: {
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    backgroundColor: theme.colors.background,
  },
  modalTitle: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    flex: 1,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark transparent blacklight
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  activeTab: {
    borderWidth: 3,
  },
  tabText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  activeBlueTab: {
    borderColor: theme.colors.vibeBlue,
  },

  // Content
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  list: {
    flex: 1,
  },
  personItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
    padding: 16,
    marginBottom: 8,
  },
  firstItem: {
    marginTop: 16,
  },
  countText: {
    position: 'absolute',
    right: 20,
    top: 25,
    color: theme.colors.vibeBlue,
    fontSize: 20,
    fontFamily: theme.fonts.comicBold,
    zIndex: 100,
  },
  personInfo: {
    flex: 1,
    marginRight: 12,
  },
  personName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  youText: {
    color: theme.colors.vibeGreen,
    fontWeight: 'bold',
  },
  personDetail: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  creatorRole: {
    color: theme.colors.gray,
  },
  cohostRole: {
    color: theme.colors.gray,
  },
  inviteTypeText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: theme.fonts.main,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  creatorDot: {
    backgroundColor: theme.colors.gray,
  },
  cohostDot: {
    backgroundColor: theme.colors.gray,
  },
  guestDot: {
    backgroundColor: theme.colors.gray,
  },
  statusText: {
    color: theme.colors.gray,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  creatorStatusText: {
    color: theme.colors.gray,
  },
  cohostStatusText: {
    color: theme.colors.gray,
  },
  guestStatusText: {
    color: theme.colors.gray,
  },
  pendingDot: {
    backgroundColor: theme.colors.vibeOrange,
  },
  pendingStatusText: {
    color: theme.colors.vibeOrange,
  },

  // Empty states
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Action buttons
  actionButtons: {
    padding: 20,
    paddingTop: 10,
    gap: 0,
    backgroundColor: theme.colors.background,
  },
  inviteButton: {
    marginVertical: 0,
  },
  addHostButton: {
    marginTop: 16,
    borderColor: theme.colors.vibePurple,
  },
  addHostActionButton: {
    marginVertical: 0,
  },

  // Color overrides for buttons
  purpleButton: {
    // Purple for co-host related buttons
    backgroundColor: theme.colors.vibeBackgroundPurple,
    borderWidth: 2,
    borderColor: theme.colors.vibePurple,
  },

  // Icon count colors
  cohostCount: {
    color: theme.colors.vibeBlue,
  },
  guestCount: {
    color: theme.colors.vibeBlue,
  },
});
