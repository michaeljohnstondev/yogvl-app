// FILE: components/guests/GuestListViewer.js

import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  BackHandler,
} from 'react-native';
import VibeButton from '../../../components/ui/VibeButton';
import CloseButton from '../../../components/ui/CloseButton';
import theme from '../../../theme/themes';

const GuestListViewer = forwardRef(({
  hosts = [],
  selectedTextContacts = [],
  invitedGuests = [],
  currentUser = null,
  onInvitePress,
  onAddHostPress, // New prop for adding hosts
  selectedGuestCount, // Override for guest count display
  selectedCohostCount, // Override for cohost count display  
  showGuestCount = true,
  showHostCount = true,
  compactView = false,
  style,
}, ref) => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('hosts'); // 'hosts' or 'guests'

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    reopenModal: () => setShowModal(true),
    isModalOpen: () => {
      console.log('[GuestListViewer] isModalOpen called, showModal:', showModal);
      return showModal;
    },
    closeModal: () => {
      console.log('[GuestListViewer] closeModal called');
      setShowModal(false);
    },
  }));



  // Combine all hosts including the creator
  const allHosts = [
    currentUser && {
      id: currentUser.id || 'current',
      name:
        currentUser.displayName ||
        (currentUser.userdata?.contactInfo?.firstName && currentUser.userdata?.contactInfo?.lastName 
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
    ...(hosts || []).map(host => ({
      id: host.id,
      name: host.userdata?.contactInfo?.displayName || 
            host.displayName || 
            `${host.userdata?.contactInfo?.firstName || ''} ${host.userdata?.contactInfo?.lastName || ''}`.trim() ||
            host.firstName ||
            host.name ||
            'Unknown Host',
      email: host.userdata?.contactInfo?.email || host.email,
      role: 'cohost',
      isYou: host.id === currentUser?.id,
    }))
  ].filter(Boolean);

  // Use invitedGuests passed as prop, fallback to selectedTextContacts for backward compatibility
  const guests =
    invitedGuests.length > 0
      ? invitedGuests.map((guest, index) => ({
          id: guest.id || `guest_${index}`,
          name:
            guest.displayName ||
            guest.firstName ||
            guest.name ||
            guest.email ||
            'Unknown Guest',
          email: guest.email,
          phone: guest.phone,
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
          status: 'invited_via_text',
          isTextInvite: true,
        }));

  // Use override counts when available (for editing mode), otherwise calculate from arrays
  const actualHostCount = selectedCohostCount !== undefined ? selectedCohostCount + 1 : allHosts.length; // +1 for creator
  const actualGuestCount = selectedGuestCount !== undefined ? selectedGuestCount : guests.length;
  const totalPeople = actualHostCount + actualGuestCount;

  // Always show the viewer, even when empty
  const displayText =
    totalPeople === 0
      ? 'No people added yet'
      : `${totalPeople} ${totalPeople === 1 ? 'total' : 'total'}`;

  // Render host item
  const renderHostItem = ({ item }) => (
    <View style={styles.personItem}>
      <View style={styles.personInfo}>
        <Text style={[styles.personName, item.isYou && styles.youText]}>
          {item.name}{item.isYou ? ' (You)' : ''}
        </Text>
        <Text style={[styles.roleText, item.role === 'creator' ? styles.creatorRole : styles.cohostRole]}>
          {item.role === 'creator' ? 'Event Creator' : 'Co-Host'}
        </Text>
      </View>
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, item.role === 'creator' ? styles.creatorDot : styles.cohostDot]} />
        <Text style={[styles.statusText, item.role === 'creator' ? styles.creatorStatusText : styles.cohostStatusText]}>
          {item.role === 'creator' ? 'Host' : 'Co-Host'}
        </Text>
      </View>
    </View>
  );

  // Render guest item
  const renderGuestItem = ({ item }) => (
    <View style={styles.personItem}>
      <View style={styles.personInfo}>
        <Text style={styles.personName}>{item.name}</Text>
        <Text style={styles.inviteTypeText}>
          {item.isTextInvite
            ? 'Will receive SMS invitation'
            : 'Invited via app'}
        </Text>
      </View>
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, styles.guestDot]} />
        <Text style={[styles.statusText, styles.guestStatusText]}>Guest</Text>
      </View>
    </View>
  );

  // Render tab button
  const renderTabButton = (tab, label, count) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tabButton, 
          isActive && styles.activeTab,
          isActive && styles.activeBlueTab
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[
          styles.tabText, 
          isActive && styles.activeTabText,
          isActive && { color: theme.colors.vibeBlue }
        ]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Guest List</Text>
            <CloseButton onPress={() => setShowModal(false)} />
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {renderTabButton('hosts', 'Hosts', actualHostCount)}
            {renderTabButton('guests', 'Guests', actualGuestCount)}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {activeTab === 'hosts' ? (
              <>
                {allHosts.length > 0 ? (
                  <FlatList
                    data={allHosts}
                    renderItem={renderHostItem}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👑</Text>
                    <Text style={styles.emptyText}>No co-hosts added</Text>
                    <Text style={styles.emptySubtext}>
                      Add co-hosts to help manage your event
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {guests.length > 0 ? (
                  <FlatList
                    data={guests}
                    renderItem={renderGuestItem}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👥</Text>
                    <Text style={styles.emptyText}>No guests invited yet</Text>
                    <Text style={styles.emptySubtext}>
                      Add guests using the invite section below
                    </Text>
                  </View>
                )}
              </>
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
              label={actualGuestCount === 0 ? 'Invite Guests' : 'Add More Guests'}
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
});

export default GuestListViewer;

const styles = StyleSheet.create({
  // Compact viewer
  viewerButton: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
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
    backgroundColor: theme.colors.inputBackground,
    alignItems: 'center',
  },
  activeTab: {
    borderWidth: 2,
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
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
    padding: 16,
    marginBottom: 8,
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
