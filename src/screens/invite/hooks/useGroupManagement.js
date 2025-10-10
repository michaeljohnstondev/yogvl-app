import { useState, useEffect } from 'react';
import {
  createGroup,
  getUserGroups,
  updateGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  deleteGroup,
} from '../../../services/groupService';
import { getEmojiForText } from '../../../lib/emojiUtils';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

export const useGroupManagement = () => {
  const vibeAlert = useVibeAlert();
  const [customGroups, setCustomGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Load user groups on component mount
  useEffect(() => {
    loadUserGroups();
  }, []);

  const loadUserGroups = async () => {
    try {
      setGroupsLoading(true);
      const groups = await getUserGroups();
      setCustomGroups(groups);
      console.log('Loaded user groups:', groups.length);
    } catch (error) {
      console.error('Failed to load groups:', error);
      vibeAlert.error('Error', 'Failed to load your groups. Please try again.');
      setCustomGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const selectGroup = (
    group,
    appUsers,
    localSelectedUsers,
    setLocalSelectedUsers,
    maxLimit
  ) => {
    const groupMembers = appUsers.filter((user) =>
      group.members.includes(user.id)
    );
    const newSelected = [...localSelectedUsers];

    groupMembers.forEach((member) => {
      if (!newSelected.some((u) => u.id === member.id)) {
        if (!maxLimit || newSelected.length < maxLimit) {
          newSelected.push(member);
        }
      }
    });

    setLocalSelectedUsers(newSelected);
    const groupDisplay = group.emoji ? `${group.emoji} ${group.name}` : group.name;
    vibeAlert.success(
      'Group Added',
      `Added ${groupDisplay} (${groupMembers.length} people) to your selection!`
    );
  };

  const removeFromGroup = async (groupId, userId, appUsers) => {
    try {
      await removeMemberFromGroup(groupId, userId);

      setCustomGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, members: group.members.filter((id) => id !== userId) }
            : group
        )
      );

      const user = appUsers.find((u) => u.id === userId);
      const group = customGroups.find((g) => g.id === groupId);
      vibeAlert.success('Removed', `${user?.name} removed from ${group?.name}`);
    } catch (error) {
      console.error('Failed to remove member:', error);
      vibeAlert.error('Error', 'Failed to remove member. Please try again.');
    }
  };

  const addToGroup = async (groupId, userId, appUsers) => {
    try {
      await addMemberToGroup(groupId, userId);

      setCustomGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, members: [...group.members, userId] }
            : group
        )
      );

      const user = appUsers.find((u) => u.id === userId);
      const group = customGroups.find((g) => g.id === groupId);
      const groupDisplay = group?.emoji ? `${group.emoji} ${group.name}` : group?.name;
      vibeAlert.success(
        'Added',
        `${user?.name} added to ${groupDisplay}!`
      );
    } catch (error) {
      console.error('Failed to add member:', error);
      vibeAlert.error('Error', 'Failed to add member. Please try again.');
    }
  };

  const getAvailableUsers = (group, appUsers) => {
    return appUsers.filter(
      (user) => !group.members.includes(user.id)
    );
  };

  const addMultipleMembersToGroup = async (groupId, users) => {
    if (!users || users.length === 0) {
      vibeAlert.error('Error', 'Please select at least one person to add');
      return false;
    }

    try {
      // Add all users in parallel
      const addPromises = users.map((user) => addMemberToGroup(groupId, user.id));
      await Promise.all(addPromises);

      // Update local state with all new members
      setCustomGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? {
                ...group,
                members: [...group.members, ...users.map((u) => u.id)],
              }
            : group
        )
      );

      const group = customGroups.find((g) => g.id === groupId);
      const userCount = users.length;
      const groupDisplay = group?.emoji ? `${group.emoji} ${group.name}` : group?.name;
      vibeAlert.success(
        'Added',
        `${userCount} ${userCount === 1 ? 'person' : 'people'} added to ${groupDisplay}!`
      );
      return true;
    } catch (error) {
      console.error('Failed to add members:', error);
      vibeAlert.error('Error', 'Failed to add members. Please try again.');
      return false;
    }
  };

  const handleCreateGroup = async (groupName) => {
    if (!groupName.trim()) {
      vibeAlert.error('Error', 'Please enter a group name');
      return false;
    }

    try {
      const trimmedName = groupName.trim();

      // Check if the name already starts with an emoji
      // Emojis are typically in the range U+1F300 to U+1F9FF and other ranges
      const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
      const startsWithEmoji = emojiRegex.test(trimmedName);

      const groupData = {
        name: trimmedName,
        emoji: startsWithEmoji ? '' : getEmojiForText(trimmedName), // Don't add emoji if name already has one
        members: [],
        isPrivate: true,
      };

      const newGroup = await createGroup(groupData);
      setCustomGroups((prev) => [...prev, newGroup]);
      vibeAlert.success(
        'Created',
        `"${newGroup.name}" group created! Start adding people to it.`
      );
      return true;
    } catch (error) {
      console.error('Failed to create group:', error);
      vibeAlert.error('Error', `Failed to create group: ${error.message}`);
      return false;
    }
  };

  const handleDeleteGroup = async (groupId) => {
    // Since vibeAlert doesn't support action buttons, we'll need to handle confirmation differently
    // For now, we'll require the UI component to handle the confirmation
    try {
      await deleteGroup(groupId);
      setCustomGroups((prev) => prev.filter((group) => group.id !== groupId));
      vibeAlert.success('Deleted', 'Group has been deleted.');
    } catch (error) {
      console.error('Failed to delete group:', error);
      vibeAlert.error('Error', 'Failed to delete group. Please try again.');
    }
  };

  return {
    customGroups,
    groupsLoading,
    loadUserGroups,
    selectGroup,
    removeFromGroup,
    addToGroup,
    getAvailableUsers,
    addMultipleMembersToGroup,
    handleCreateGroup,
    handleDeleteGroup,
  };
};
