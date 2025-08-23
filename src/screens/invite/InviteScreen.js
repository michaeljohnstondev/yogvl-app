import React, { useCallback } from 'react';
import { View, Text, ScrollView, BackHandler } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { useVibeAlert } from '../../components/ui/VibeAlertContext';
import theme from '../../theme/themes';

// Hooks
import { useInviteScreenState } from './hooks/useInviteScreenState';
import { useContactManagement } from './hooks/useContactManagement';
import { useGroupManagement } from './hooks/useGroupManagement';
import { useSelectionHandlers } from './hooks/useSelectionHandlers';

// Components
import InviteScreenHeader from './components/InviteScreenHeader';
import TabSelector from './components/TabSelector';
import AppUsersTab from './components/tabs/AppUsersTab';
import PhoneContactsTab from './components/tabs/PhoneContactsTab';
import ManualEntryTab from './components/tabs/ManualEntryTab';
import SelectedItemsList from './components/lists/SelectedItemsList';
import GroupManagementModal from './components/groups/GroupManagementModal';
import CreateGroupModal from './components/groups/CreateGroupModal';

// Utils
import { TABS, USER_TYPES } from './utils/inviteScreenConstants';
import { calculateTotals, getThemeColors } from './utils/inviteScreenUtils';
import styles from './styles/inviteScreenStyles';

export default function InviteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();
  
  // Route parameters
  const { 
    type = USER_TYPES.GUESTS,
    selectedUsers = [],
    selectedContacts = [], 
    selectedPhoneContacts = [],
    maxLimit = null,
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

  // Calculate totals
  const totalSelected = calculateTotals(
    state.localSelectedUsers, 
    state.localSelectedContacts, 
    state.localSelectedPhoneContacts
  );

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        console.log('[InviteScreen] Android back button pressed');
        navigation.goBack();
        return true;
      };

      console.log('[InviteScreen] Setting up back handler');
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        console.log('[InviteScreen] Removing back handler');
        backHandler.remove();
      };
    }, [navigation])
  );

  // Handle avatar/icon actions
  const handleAvatarAction = (user) => {
    let title = '';
    let message = '';
    let actions = [];

    if (user.isFavorite) {
      title = `${user.name}`;
      message = 'This person is in your favorites.';
      actions = [
        { text: 'Remove from Favorites', onPress: () => handleRemoveFromFavorites(user) },
        { text: 'Cancel', style: 'cancel' }
      ];
    } else if (user.isFriend) {
      title = `${user.name}`;
      message = 'This person is your friend.';
      actions = [
        { text: 'Add to Favorites', onPress: () => handleAddToFavorites(user) },
        { text: 'Remove Friend', onPress: () => handleRemoveFriend(user), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ];
    } else {
      title = `${user.name}`;
      message = 'Send a friend request to this person?';
      actions = [
        { text: 'Send Friend Request', onPress: () => handleSendFriendRequest(user) },
        { text: 'Cancel', style: 'cancel' }
      ];
    }

    // Since vibeAlert doesn't support action buttons, we'll show info for now
    vibeAlert.info(title, message);
  };

  // Friend action handlers
  const handleAddToFavorites = (user) => {
    vibeAlert.success('Added to Favorites', `${user.name} has been added to your favorites! ⭐`);
  };

  const handleRemoveFromFavorites = (user) => {
    vibeAlert.success('Removed from Favorites', `${user.name} has been removed from your favorites.`);
  };

  const handleSendFriendRequest = async (user) => {
    try {
      const { sendFriendRequest } = await import('../../services/friendService');
      await sendFriendRequest(currentUserId, user.id, userData);
      vibeAlert.success('Friend Request Sent', `Friend request sent to ${user.name}! They will be notified. 👫`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      vibeAlert.error('Error', 'Failed to send friend request. Please try again.');
    }
  };

  const handleRemoveFriend = (user) => {
    vibeAlert.success('Friend Removed', `${user.name} has been removed from your friends list.`);
  };

  // Save and return
  const handleSave = () => {
    if (onSave) {
      onSave({
        users: state.localSelectedUsers,
        contacts: state.localSelectedContacts,
        phoneContacts: state.localSelectedPhoneContacts,
      });
    }
    navigation.goBack();
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
    console.log('Create new group button pressed');
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
  const saveButtonText = isHostMode ? 'Add' : 'Save';
  const limitText = maxLimit ? `${totalSelected} of ${maxLimit} ${type} added` : `${totalSelected} ${type} added`;

  return (
    <View style={styles.container}>
      <InviteScreenHeader
        title={title}
        onClose={() => navigation.goBack()}
        onSave={handleSave}
        saveButtonText={saveButtonText}
      />

      {maxLimit && totalSelected > 0 && (
        <View style={styles.limitContainer}>
          <Text style={styles.limitText}>{limitText}</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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