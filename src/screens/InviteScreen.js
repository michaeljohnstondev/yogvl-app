import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, BackHandler, Linking, Platform } from 'react-native';
import { VibeButton } from '../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import theme from '../theme/themes';

// Hooks
import { useInviteScreenState } from './invite/hooks/useInviteScreenState';
import { useContactManagement } from './invite/hooks/useContactManagement';
import { useGroupManagement } from './invite/hooks/useGroupManagement';
import { useSelectionHandlers } from './invite/hooks/useSelectionHandlers';
import { useUserInterests } from './invite/hooks/useUserInterests';

// Components
import ScreenHeader from '../components/ui/layout/ScreenHeader';
import { VibeSegmentedControl } from '../components/ui/base';
import AppUsersTab from './invite/components/tabs/AppUsersTab';
import PhoneContactsTab from './invite/components/tabs/PhoneContactsTab';
import QRCodeTab from './invite/components/tabs/QRCodeTab';
import SelectedItemsList from './invite/components/lists/SelectedItemsList';
import GroupManagementModal from './invite/components/groups/GroupManagementModal';
import CreateGroupModal from './invite/components/groups/CreateGroupModal';

// Utils
import { TABS, USER_TYPES } from './invite/utils/inviteScreenConstants';
import {
  calculateTotals,
  getThemeColors,
} from './invite/utils/inviteScreenUtils';
import styles from './invite/styles/inviteScreenStyles';
import { addFavorite, removeFavorite } from '../services/favoriteService';

export default function InviteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();
  const insets = useSafeAreaInsets();

  // Route parameters
  const {
    type = USER_TYPES.GUESTS,
    selectedUsers = [],
    selectedContacts = [],
    selectedPhoneContacts = [],
    maxLimit = null,
    eventTitle = null,
    eventId = null, // If eventId exists, we're coming from an existing event
    inviteCode = null,
    studioId: routeStudioId = null,
    source = 'unknown',
    inviteType = null, // Type of invitation for event dispatching
    eventDateTime = null, // Event datetime for SMS message
    eventLocation = null, // Event location for SMS message
    onSave, // Keep for backward compatibility
  } = route.params || {};

  const isHostMode = type === USER_TYPES.HOSTS;
  const { themeColor, themeBgColor } = getThemeColors(isHostMode, theme);

  // Debug logging for route params
  console.log('[InviteScreen] Route params received:', {
    eventTitle,
    eventId,
    eventDateTime: eventDateTime ? 'received' : 'missing',
    eventLocation: eventLocation ? 'received' : 'missing',
    studioId: routeStudioId,
  });

  // Helper function to handle invite completion
  const handleInviteComplete = useCallback((selectedData, options = {}) => {
    console.log('[InviteScreen] handleInviteComplete called with:', { inviteType, selectedData, options });

    // Try to dispatch navigation event first (new approach)
    if (inviteType && navigation.getParent) {
      try {
        const parentNavigator = navigation.getParent();
        console.log('[InviteScreen] Parent navigator:', parentNavigator ? 'found' : 'not found');
        if (parentNavigator) {
          console.log('[InviteScreen] Emitting inviteComplete event with type:', inviteType);
          parentNavigator.emit({
            type: 'inviteComplete',
            data: {
              inviteType,
              users: selectedData.users || [],
              contacts: selectedData.contacts || [],
              phoneContacts: selectedData.phoneContacts || [],
              options
            }
          });
          console.log('[InviteScreen] Event emitted successfully');
        }
      } catch (error) {
        console.log('[InviteScreen] Navigation event dispatch failed, falling back to onSave:', error);
      }
    } else {
      console.log('[InviteScreen] No inviteType or getParent not available');
    }

    // Fallback to onSave for backward compatibility
    if (onSave) {
      console.log('[InviteScreen] Calling onSave callback');
      onSave(selectedData, options);
    }
  }, [inviteType, navigation, onSave]);

  // Get studioId before using it in hooks
  const studioId = userData?.userdata?.studios?.default?.studioId;

  // Custom hooks
  const state = useInviteScreenState(
    selectedUsers,
    selectedContacts,
    selectedPhoneContacts
  );
  const contactManagement = useContactManagement(
    currentUserId,
    userData,
    state.activeTab,
    eventId,
    routeStudioId || studioId
  );
  const groupManagement = useGroupManagement();
  const selectionHandlers = useSelectionHandlers(
    maxLimit,
    type,
    isHostMode,
    state.localSelectedUsers,
    state.setLocalSelectedUsers,
    state.localSelectedContacts,
    state.setLocalSelectedContacts,
    state.localSelectedPhoneContacts,
    state.setLocalSelectedPhoneContacts
  );

  const userIds = useMemo(
    () => contactManagement.appUsers.map((user) => user.id),
    [contactManagement.appUsers]
  );
  const userInterests = useUserInterests(userIds, studioId);

  // Calculate totals
  const totalSelected = calculateTotals(
    state.localSelectedUsers,
    state.localSelectedContacts,
    state.localSelectedPhoneContacts
  );

  // Handle Android back button - cancel without saving
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // For CreateEventScreen, just reopen guest list WITHOUT saving changes
        if (!isExistingEvent) {
          // Call handleInviteComplete with empty data to trigger guest list reopening, but don't actually save selections
          handleInviteComplete(
            {
              users: [], // Don't save current selections
              contacts: [],
              phoneContacts: [],
            },
            { reopenGuestList: true, cancel: true }
          );
        }
        // Always use goBack() to return to the previous screen properly
        navigation.goBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => {
        backHandler.remove();
      };
    }, [navigation, isExistingEvent, eventId, onSave])
  );

  // Handle avatar/icon actions - toggle favorite status
  const handleAvatarAction = async (user) => {
    try {
      if (user.isFavorite) {
        // Remove from favorites
        await removeFavorite(currentUserId, user.id);
        // Update local state to reflect change
        contactManagement.updateUserStatus(user.id, {
          isFavorite: false,
        });
      } else {
        // Add to favorites
        await addFavorite(currentUserId, user.id);
        // Update local state to reflect change
        contactManagement.updateUserStatus(user.id, {
          isFavorite: true,
        });
      }
    } catch (error) {
      console.error('[InviteScreen] Error toggling favorite:', error);
      vibeAlert.error('Error', 'Failed to update favorite status');
    }
  };

  // Save and return
  const handleSave = async () => {
    const selectedData = {
      users: state.localSelectedUsers,
      contacts: state.localSelectedContacts,
      phoneContacts: state.localSelectedPhoneContacts,
    };

    if (isExistingEvent) {
      // Send invitations immediately for existing events
      await handleSendInvitations(selectedData);
      // Navigate back to EventDetail and clear navigation stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'EventDetail', params: { eventId } }],
      });
    } else {
      // Batch for later (CreateEventScreen) - dispatch event or call callback
      handleInviteComplete(selectedData, { reopenGuestList: false }); // Don't reopen guest list, stay on CreateEventScreen
      // Remove this screen from navigation stack
      navigation.pop();
    }
  };

  // Helper function to generate SMS invite message with event details
  const generateInviteMessage = useCallback(() => {
    console.log('[InviteScreen] Generating SMS with:', {
      eventTitle,
      eventDateTime: eventDateTime ? eventDateTime.toString() : 'missing',
      eventLocation,
      eventId,
    });

    let message = `You're invited to ${eventTitle || 'an event'}!\n`;

    // Add event details if available
    if (eventDateTime) {
      try {
        const eventDate = eventDateTime.toDate ? eventDateTime.toDate() : new Date(eventDateTime);

        // Validate the date is valid
        if (!isNaN(eventDate.getTime())) {
          const dateStr = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          message += `\n📅 ${dateStr} at ${timeStr}`;
        } else {
          console.warn('[InviteScreen] Invalid eventDateTime:', eventDateTime);
        }
      } catch (error) {
        console.error('[InviteScreen] Error formatting eventDateTime:', error);
      }
    } else {
      console.warn('[InviteScreen] No eventDateTime provided for SMS');
    }

    if (eventLocation) {
      message += `\n📍 ${eventLocation}`;
    }

    // Add app download link
    // TODO: Replace with actual App Store URL once available
    message += `\n\nDownload The Yo app: https://apps.apple.com/app/the-yo`;

    console.log('[InviteScreen] Generated SMS message:', message);

    return message;
  }, [eventId, eventTitle, eventDateTime, eventLocation]);

  // Handle sending invitations immediately for existing events
  const handleSendInvitations = async (selectedData) => {
    try {
      const { sendGuestInvitation } = await import(
        '../services/shared/guestInvitationsService'
      );

      const { users = [], contacts = [], phoneContacts = [] } = selectedData;
      const totalInvitations = users.length + contacts.length + phoneContacts.length;

      if (totalInvitations === 0) {
        vibeAlert.info('No Invitations', 'Please select people to invite.');
        return;
      }

      let successfulInvitations = 0;
      let alreadyInvitedCount = 0;
      const errors = [];

      // Send guest invitations for app users
      if (users.length > 0) {
        const invitationPromises = users.map(async (user) => {
          try {
            await sendGuestInvitation(
              currentUserId,
              user.id,
              eventId,
              routeStudioId || studioId,
              userData,
              { title: eventTitle },
              source
            );
            successfulInvitations++;
          } catch (error) {
            console.error(`Failed to send invitation to ${user.name}:`, error);
            if (
              error.message?.includes('already been invited') ||
              error.message?.includes('already attending')
            ) {
              alreadyInvitedCount++;
            } else {
              errors.push({
                userId: user.id,
                userName: user.name,
                error: error.message,
              });
            }
          }
        });

        await Promise.all(invitationPromises);
      }

      // Send SMS invitations for phone contacts
      if (phoneContacts.length > 0) {
        try {
          // Generate SMS message
          const inviteMessage = generateInviteMessage();
          const phoneNumbers = phoneContacts
            .map((contact) => contact.phone)
            .join(',');

          // Build SMS URL based on platform
          const smsUrl =
            Platform.OS === 'ios'
              ? `sms:${phoneNumbers}&body=${inviteMessage}` // No encoding on iOS
              : `sms:${phoneNumbers}?body=${encodeURIComponent(inviteMessage)}`; // Encode on Android

          // Open SMS app with pre-filled message
          await Linking.openURL(smsUrl);

          // Add to successful count
          successfulInvitations += phoneContacts.length;

          console.log(`[InviteScreen] Opened SMS app to invite ${phoneContacts.length} phone contact(s)`);
        } catch (error) {
          console.error('[InviteScreen] Failed to open SMS app:', error);
          vibeAlert.warning(
            'SMS Error',
            'Unable to open SMS app for phone invitations. Please try again.'
          );
        }
      }

      // Refresh invitation data to update the UI
      if (contactManagement.loadPendingInvitations) {
        await contactManagement.loadPendingInvitations();
      }

      // Display formatted messages
      if (successfulInvitations > 0) {
        vibeAlert.success(
          'Invitations Sent!',
          `Sent ${successfulInvitations} invitation${successfulInvitations === 1 ? '' : 's'}! 📬`
        );
      }

      if (alreadyInvitedCount > 0) {
        vibeAlert.info(
          'Some Already Invited',
          `${alreadyInvitedCount} user${alreadyInvitedCount === 1 ? ' was' : 's were'} already invited or attending this event.`
        );
      }

      if (errors.length > 0) {
        vibeAlert.warning(
          'Some Invitations Failed',
          `${errors.length} invitation${errors.length === 1 ? '' : 's'} could not be sent. Please try again.`
        );
      }

      // Still call callback if provided for any additional handling
      handleInviteComplete(selectedData);
    } catch (error) {
      console.error('[InviteScreen] Error sending invitations:', error);
      vibeAlert.error(
        'Error',
        'Failed to send invitations. Please try again.'
      );
    }
  };

  // Group management handlers
  const handleSelectGroup = (group) => {
    groupManagement.selectGroup(
      group,
      contactManagement.appUsers,
      state.localSelectedUsers,
      state.setLocalSelectedUsers,
      maxLimit
    );
  };

  const createNewGroup = () => {
    state.setNewGroupName('');
    state.setShowCreateGroupModal(true);
  };

  const handleCreateGroup = async (groupName) => {
    const success = await groupManagement.handleCreateGroup(groupName);
    if (success) {
      state.resetGroupModal();
    }
    return success;
  };

  const title = isHostMode ? 'Add Co-Hosts' : 'Invite Guests';
  const saveButtonText = isHostMode ? 'Add' : 'Invite'; // Unified "Invite" button text
  const isExistingEvent = !!eventId; // Track whether to batch (false) or send immediately (true)
  const limitText = maxLimit
    ? `${totalSelected} of ${maxLimit} ${type} added`
    : `${totalSelected} ${type} added`;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        showCloseButton={true}
        onClose={() => {
          if (isExistingEvent) {
            navigation.navigate('EventDetail', { eventId });
          } else {
            // For CreateEventScreen, just reopen guest list WITHOUT saving changes
            handleInviteComplete(
              {
                users: [], // Don't save current selections
                contacts: [],
                phoneContacts: [],
              },
              { reopenGuestList: true, cancel: true }
            );
            navigation.goBack();
          }
        }}
      />

      {/* REMOVED: Counter showing "X of Y hosts added" per user request
      {maxLimit && totalSelected > 0 && (
        <View style={styles.limitContainer}>
          <Text style={styles.limitText}>{limitText}</Text>
        </View>
      )}
      */}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VibeSegmentedControl
          options={[
            { value: TABS.APP, label: 'App' },
            { value: TABS.PHONE, label: 'Phone' },
            { value: TABS.QR, label: 'QR' },
          ]}
          selectedValue={state.activeTab}
          onSelect={state.setActiveTab}
          style={{ marginVertical: 12 }}
        />

        <View style={styles.tabContent}>
          {state.activeTab === TABS.APP && (
            <AppUsersTab
              appUsers={contactManagement.appUsers}
              loadingAppUsers={contactManagement.loadingAppUsers}
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              localSelectedUsers={state.localSelectedUsers}
              customGroups={groupManagement.customGroups}
              groupsLoading={groupManagement.groupsLoading}
              selectedGroup={state.selectedGroup}
              setSelectedGroup={state.setSelectedGroup}
              setShowGroupModal={state.setShowGroupModal}
              selectGroup={handleSelectGroup}
              showFavorites={state.showFavorites}
              setShowFavorites={state.setShowFavorites}
              showFriends={state.showFriends}
              setShowFriends={state.setShowFriends}
              showLocalNode={state.showLocalNode}
              setShowLocalNode={state.setShowLocalNode}
              selectedInterests={state.selectedInterests}
              setSelectedInterests={state.setSelectedInterests}
              userInterestsMap={userInterests.userInterestsMap}
              eventTitle={eventTitle}
              toggleUserSelection={selectionHandlers.toggleUserSelection}
              handleAvatarAction={handleAvatarAction}
              themeColor={themeColor}
              themeBgColor={themeBgColor}
              maxLimit={maxLimit}
              localSelectedContacts={state.localSelectedContacts}
              localSelectedPhoneContacts={state.localSelectedPhoneContacts}
              eventSubscribers={contactManagement.eventSubscribers}
              loadingSubscribers={contactManagement.loadingSubscribers}
              hasEventId={!!eventId}
              currentUserId={currentUserId}
            />
          )}

          {state.activeTab === TABS.PHONE && (
            <PhoneContactsTab
              phoneContacts={contactManagement.phoneContacts}
              loadingContacts={contactManagement.loadingContacts}
              contactsLoaded={contactManagement.contactsLoaded}
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              localSelectedPhoneContacts={state.localSelectedPhoneContacts}
              loadDeviceContacts={contactManagement.loadDeviceContacts}
              togglePhoneContactSelection={
                selectionHandlers.togglePhoneContactSelection
              }
              themeColor={themeColor}
              themeBgColor={themeBgColor}
              maxLimit={maxLimit}
              localSelectedUsers={state.localSelectedUsers}
              localSelectedContacts={state.localSelectedContacts}
            />
          )}

          {state.activeTab === TABS.QR && (
            <QRCodeTab
              eventId={eventId}
              inviteCode={inviteCode}
              studioId={routeStudioId || studioId}
              isHostMode={isHostMode}
            />
          )}
        </View>

        {/* HIDDEN: Selected items list removed per user request
        {state.activeTab !== TABS.QR && (
          <SelectedItemsList
            localSelectedUsers={state.localSelectedUsers}
            localSelectedPhoneContacts={state.localSelectedPhoneContacts}
            localSelectedContacts={state.localSelectedContacts}
            removeUser={selectionHandlers.removeUser}
            removePhoneContact={selectionHandlers.removePhoneContact}
            removeContact={selectionHandlers.removeContact}
            isHostMode={isHostMode}
            themeColor={themeColor}
          />
        )}
        */}
      </ScrollView>

      {/* Hide invite button when QR tab is active - QR codes handle invitations */}
      {state.activeTab !== TABS.QR && (
        <View
          style={[
            styles.bottomButtonContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <VibeButton
            label={isHostMode ? 'Add Co-Hosts' : 'Invite Guests'}
            onPress={handleSave}
            style={styles.inviteButton}
          />
        </View>
      )}

      <GroupManagementModal
        visible={state.showGroupModal}
        onClose={() => state.setShowGroupModal(false)}
        customGroups={groupManagement.customGroups}
        appUsers={contactManagement.appUsers}
        removeFromGroup={groupManagement.removeFromGroup}
        getAvailableUsers={groupManagement.getAvailableUsers}
        addMultipleMembersToGroup={groupManagement.addMultipleMembersToGroup}
        handleDeleteGroup={groupManagement.handleDeleteGroup}
        onCreateNewGroup={createNewGroup}
      />

      <CreateGroupModal
        visible={state.showCreateGroupModal}
        onClose={state.resetGroupModal}
        newGroupName={state.newGroupName}
        setNewGroupName={state.setNewGroupName}
        onCreateGroup={handleCreateGroup}
      />
    </View>
  );
}
