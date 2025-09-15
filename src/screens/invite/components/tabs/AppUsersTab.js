import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { VibeInput } from '../../../../components/ui';
import UserListItem from '../lists/UserListItem';
import GroupFilterSection from '../groups/GroupFilterSection';
import FilterSection from './FilterSection';
import { filterAndSortAppUsers } from '../../utils/inviteScreenUtils';
import styles from '../../styles/inviteScreenStyles';

const AppUsersTab = ({
  // Data
  appUsers,
  loadingAppUsers,
  searchQuery,
  setSearchQuery,
  localSelectedUsers,

  // Group data
  customGroups,
  groupsLoading,
  selectedGroup,
  setSelectedGroup,
  setShowGroupModal,
  selectGroup,

  // Filter state
  showFavorites,
  setShowFavorites,
  showFriends,
  setShowFriends,
  showLocalNode,
  setShowLocalNode,
  selectedInterests,
  setSelectedInterests,
  userInterestsMap,
  eventTitle,

  // Selection
  toggleUserSelection,
  handleAvatarAction,

  // UI state
  themeColor,
  themeBgColor,
  maxLimit,
  localSelectedContacts,
  localSelectedPhoneContacts,

  // Event subscribers
  eventSubscribers = [],
  loadingSubscribers = false,
  hasEventId = false,
}) => {
  const filteredAppUsers = filterAndSortAppUsers(
    appUsers,
    searchQuery,
    selectedGroup,
    showFavorites,
    showFriends,
    showLocalNode,
    selectedInterests,
    userInterestsMap
  );

  const totalSelected =
    localSelectedUsers.length +
    localSelectedContacts.length +
    localSelectedPhoneContacts.length;
  const hasReachedLimit = maxLimit && totalSelected >= maxLimit;

  if (loadingAppUsers) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Loading app users...</Text>
      </View>
    );
  }

  return (
    <View>
      <GroupFilterSection
        customGroups={customGroups}
        groupsLoading={groupsLoading}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        setShowGroupModal={setShowGroupModal}
        selectGroup={selectGroup}
        appUsers={appUsers}
        localSelectedUsers={localSelectedUsers}
        maxLimit={maxLimit}
        themeColor={themeColor}
        themeBgColor={themeBgColor}
        eventTitle={eventTitle}
        selectedInterests={selectedInterests}
        setSelectedInterests={setSelectedInterests}
        showFavorites={showFavorites}
        setShowFavorites={setShowFavorites}
        showFriends={showFriends}
        setShowFriends={setShowFriends}
        showLocalNode={showLocalNode}
        setShowLocalNode={setShowLocalNode}
      />

      <VibeInput
        placeholder="Search app users..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
      />

      {/* Show info about filtered subscribers */}
      {hasEventId && eventSubscribers.length > 0 && !loadingSubscribers && (
        <View style={styles.subscriberFilterInfo}>
          <Text style={styles.subscriberFilterText}>
            {eventSubscribers.length} user
            {eventSubscribers.length === 1 ? '' : 's'} already attending this
            event {eventSubscribers.length === 1 ? 'is' : 'are'} hidden
          </Text>
        </View>
      )}

      <View style={styles.itemsList}>
        {filteredAppUsers.map((item) => {
          // Check if user is already subscribed or invited - these should be filtered out by useContactManagement
          // but we add this as a safety check to prevent showing users who shouldn't be invited
          const isAlreadySubscribed = eventSubscribers.includes(item.id);
          const isAlreadyInvited = item.ineligibilityReason === 'already_invited';
          const isAlreadyParticipating = item.ineligibilityReason === 'already_participating';

          // Skip rendering this user if they're already subscribed, invited, or participating
          if (isAlreadySubscribed || isAlreadyInvited || isAlreadyParticipating) {
            return null;
          }

          const isSelected = localSelectedUsers.some((u) => u.id === item.id);
          const canSelect = !isSelected && !hasReachedLimit;

          return (
            <View key={item.id}>
              <UserListItem
                item={item}
                isSelected={isSelected}
                canSelect={canSelect}
                themeColor={themeColor}
                themeBgColor={themeBgColor}
                onPress={() => toggleUserSelection(item)}
                onAvatarPress={() => handleAvatarAction(item)}
              />
            </View>
          );
        })}
        {filteredAppUsers.length === 0 && !loadingAppUsers && (
          <Text style={styles.emptyText}>No users found</Text>
        )}
      </View>
    </View>
  );
};

export default AppUsersTab;
