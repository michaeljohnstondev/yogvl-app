import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, BackHandler, TouchableOpacity } from 'react-native';
import VibeButton from '../components/ui/VibeButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import theme from '../theme/themes';

// Hooks
import { useInviteScreenState } from './invite/hooks/useInviteScreenState';
import { useContactManagement } from './invite/hooks/useContactManagement';
import { useGroupManagement } from './invite/hooks/useGroupManagement';
import { useSelectionHandlers } from './invite/hooks/useSelectionHandlers';
import { useUserInterests } from './invite/hooks/useUserInterests';

// Components
import InviteScreenHeader from './invite/components/InviteScreenHeader';
import TabSelector from './invite/components/TabSelector';
import AppUsersTab from './invite/components/tabs/AppUsersTab';
import PhoneContactsTab from './invite/components/tabs/PhoneContactsTab';
import ManualEntryTab from './invite/components/tabs/ManualEntryTab';
import SelectedItemsList from './invite/components/lists/SelectedItemsList';
import GroupManagementModal from './invite/components/groups/GroupManagementModal';
import CreateGroupModal from './invite/components/groups/CreateGroupModal';

// Utils
import { TABS, USER_TYPES } from './invite/utils/inviteScreenConstants';
import { calculateTotals, getThemeColors } from './invite/utils/inviteScreenUtils';
import styles from './invite/styles/inviteScreenStyles';

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
    source = 'unknown',
    onSave
  } = route.params || {};


  const isHostMode = type === USER_TYPES.HOSTS;
  const { themeColor, themeBgColor } = getThemeColors(isHostMode, theme);

  // Custom hooks
  const state = useInviteScreenState(selectedUsers, selectedContacts, selectedPhoneContacts);
  const contactManagement = useContactManagement(currentUserId, userData, state.activeTab);
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

  const userIds = useMemo(() => 
    contactManagement.appUsers.map(user => user.id), 
    [contactManagement.appUsers]
  );
  const studioId = userData?.userdata?.studios?.default?.studioId;
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
        if (onSave && !isExistingEvent) {
          // Call onSave with empty data to trigger guest list reopening, but don't actually save selections
          onSave({
            users: [], // Don't save current selections
            contacts: [],
            phoneContacts: [],
          }, { reopenGuestList: true, cancel: true });
        }
        // Always use goBack() to return to the previous screen properly
        navigation.goBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        backHandler.remove();
      };
    }, [navigation, isExistingEvent, eventId, onSave])
  );

  // Handle avatar/icon actions - using vibeAlert with action buttons
  const handleAvatarAction = (user) => {
    if (user.isFavorite) {
      // Favorites - show confirmation to remove
      vibeAlert.confirm(
        `Remove ${user.name} from favorites?`,
        'They will no longer be marked as a favorite.',
        () => handleRemoveFromFavorites(user),
        () => {} // onCancel - do nothing
      );
    } else if (user.isFollowing) {
      // Following - show options (use menu for vertical layout)
      vibeAlert.menu(
        `${user.name}`, 
        'You are following this person.',
        [
          { text: 'Add to Favorites', onPress: () => handleAddToFavorites(user) },
          { text: 'Unfollow', onPress: () => handleUnfollowUser(user) },
          { text: 'Cancel' }
        ]
      );
    } else {
      // Not following - show confirmation to follow
      vibeAlert.cyan(
        `Follow ${user.name}?`,
        'You\'ll see their events in your feed and they\'ll be notified.',
        [
          { text: 'Follow', onPress: () => handleFollowUser(user) },
          { text: 'Cancel' }
        ]
      );
    }
  };

  // Follow action handlers (replacing friend system)
  const handleFollowUser = async (user) => {
    try {
      const { followUser } = await import('../services/followService');
      await followUser(currentUserId, user.id, userData);
      // TODO: Update user in local state to reflect follow status
    } catch (error) {
      if (error.message === 'Already following this user') {
        vibeAlert.info('Already Following', `You are already following ${user.name}.`);
      } else {
        vibeAlert.error('Error', 'Failed to follow user. Please try again.');
      }
    }
  };

  const handleUnfollowUser = async (user) => {
    try {
      const { unfollowUser } = await import('../services/followService');
      await unfollowUser(currentUserId, user.id);
      // TODO: Update user in local state to reflect follow status
    } catch (error) {
      vibeAlert.error('Error', 'Failed to unfollow user. Please try again.');
    }
  };

  const handleAddToFavorites = async (user) => {
    try {
      const { addToFavorites } = await import('../services/friendService');
      await addToFavorites(currentUserId, user.id);
      
      // Update user in local state to reflect favorite status
      contactManagement.updateUserStatus(user.id, { isFavorite: true });
    } catch (error) {
      vibeAlert.error('Error', 'Failed to add to favorites. Please try again.');
    }
  };

  const handleRemoveFromFavorites = async (user) => {
    try {
      const { removeFromFavorites } = await import('../services/friendService');
      await removeFromFavorites(currentUserId, user.id);
      
      // Update user in local state to reflect favorite status
      contactManagement.updateUserStatus(user.id, { isFavorite: false });
    } catch (error) {
      vibeAlert.error('Error', 'Failed to remove from favorites. Please try again.');
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
      // Navigate back to EventDetail when we came from existing event
      navigation.navigate('EventDetail', { eventId });
    } else {
      // Batch for later (CreateEventScreen) - just call the onSave callback
      if (onSave) {
        onSave(selectedData, { reopenGuestList: false }); // Don't reopen guest list, stay on CreateEventScreen
      }
      navigation.goBack();
    }
  };

  // Handle sending invitations immediately for existing events
  const handleSendInvitations = async (selectedData) => {
    try {
      const { users, contacts, phoneContacts } = selectedData;
      const totalInvitations = users.length + contacts.length + phoneContacts.length;

      if (totalInvitations === 0) {
        vibeAlert.info('No Invitations', 'Please select people to invite.');
        return;
      }

      // Send guest invitations for app users
      if (users.length > 0) {
        const { sendGuestInvitation } = await import('../services/friendService');
        
        const invitationPromises = users.map(async (user) => {
          try {
            await sendGuestInvitation(
              currentUserId,
              user.id,
              eventId,
              userData,
              { title: eventTitle }, // Simplified event data
              source
            );
          } catch (error) {
          }
        });
        
        await Promise.all(invitationPromises);
      }

      // Handle manual contacts and phone contacts (could be SMS invites in the future)
      // For now, we'll just show success for app users
      vibeAlert.success(
        'Invitations Sent!', 
        `Sent ${totalInvitations} invitation${totalInvitations === 1 ? '' : 's'}! 📬`
      );
      
      // Still call onSave callback if provided for any additional handling
      if (onSave) {
        onSave(selectedData);
      }
    } catch (error) {
      vibeAlert.error('Error', 'Failed to send invitations. Please try again.');
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
  const limitText = maxLimit ? `${totalSelected} of ${maxLimit} ${type} added` : `${totalSelected} ${type} added`;

  return (
    <View style={styles.container}>
      <InviteScreenHeader
        title={title}
        onClose={() => {
          if (isExistingEvent) {
            navigation.navigate('EventDetail', { eventId });
          } else {
            // For CreateEventScreen, just reopen guest list WITHOUT saving changes
            if (onSave) {
              onSave({
                users: [], // Don't save current selections
                contacts: [],
                phoneContacts: [],
              }, { reopenGuestList: true, cancel: true });
            }
            navigation.goBack();
          }
        }}
      />

      {maxLimit && totalSelected > 0 && (
        <View style={styles.limitContainer}>
          <Text style={styles.limitText}>{limitText}</Text>
        </View>
      )}

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TabSelector 
          activeTab={state.activeTab} 
          setActiveTab={state.setActiveTab} 
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
              togglePhoneContactSelection={selectionHandlers.togglePhoneContactSelection}
              themeColor={themeColor}
              themeBgColor={themeBgColor}
              maxLimit={maxLimit}
              localSelectedUsers={state.localSelectedUsers}
              localSelectedContacts={state.localSelectedContacts}
            />
          )}

          {state.activeTab === TABS.MANUAL && (
            <ManualEntryTab
              contactName={state.contactName}
              setContactName={state.setContactName}
              contactEmail={state.contactEmail}
              setContactEmail={state.setContactEmail}
              contactPhone={state.contactPhone}
              setContactPhone={state.setContactPhone}
              personalMessage={state.personalMessage}
              setPersonalMessage={state.setPersonalMessage}
              handleAddContact={selectionHandlers.handleAddContact}
              clearManualForm={state.clearManualForm}
              isHostMode={isHostMode}
              type={type}
              maxLimit={maxLimit}
              localSelectedUsers={state.localSelectedUsers}
              localSelectedContacts={state.localSelectedContacts}
              localSelectedPhoneContacts={state.localSelectedPhoneContacts}
            />
          )}
        </View>

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
      </ScrollView>

      {/* Fixed bottom invite button */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <VibeButton
          label={isHostMode ? 'Add Co-Hosts' : 'Invite Guests'}
          onPress={handleSave}
          style={styles.inviteButton}
        />
      </View>

      <GroupManagementModal
        visible={state.showGroupModal}
        onClose={() => state.setShowGroupModal(false)}
        customGroups={groupManagement.customGroups}
        appUsers={contactManagement.appUsers}
        removeFromGroup={groupManagement.removeFromGroup}
        showAddToGroupOptions={groupManagement.showAddToGroupOptions}
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