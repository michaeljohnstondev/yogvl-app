import { useState, useEffect } from 'react';
import { 
  createGroup, 
  getUserGroups, 
  updateGroup, 
  addMemberToGroup, 
  removeMemberFromGroup,
  deleteGroup 
} from '../../../services/groupService';
import { getEmojiForText } from '../../../lib/emojiUtils';
import { useVibeAlert } from '../../../components/ui/VibeAlertContext';

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

  const selectGroup = (group, appUsers, localSelectedUsers, setLocalSelectedUsers, maxLimit) => {
    const groupMembers = appUsers.filter(user => group.members.includes(user.id));
    const newSelected = [...localSelectedUsers];
    
    groupMembers.forEach(member => {
      if (!newSelected.some(u => u.id === member.id)) {
        if (!maxLimit || newSelected.length < maxLimit) {
          newSelected.push(member);
        }
      }
    });
    
    setLocalSelectedUsers(newSelected);
    vibeAlert.success('Group Added', `Added ${group.name} (${groupMembers.length} people) to your selection!`);
  };

  const removeFromGroup = async (groupId, userId, appUsers) => {
    try {
      await removeMemberFromGroup(groupId, userId);
      
      setCustomGroups(prev => prev.map(group => 
        group.id === groupId 
          ? { ...group, members: group.members.filter(id => id !== userId) }
          : group
      ));
      
      const user = appUsers.find(u => u.id === userId);
      const group = customGroups.find(g => g.id === groupId);
      vibeAlert.success('Removed', `${user?.name} removed from ${group?.name}`);
    } catch (error) {
      console.error('Failed to remove member:', error);
      vibeAlert.error('Error', 'Failed to remove member. Please try again.');
    }
  };

  const addToGroup = async (groupId, userId, appUsers) => {
    try {
      await addMemberToGroup(groupId, userId);
      
      setCustomGroups(prev => prev.map(group => 
        group.id === groupId 
          ? { ...group, members: [...group.members, userId] }
          : group
      ));
      
      const user = appUsers.find(u => u.id === userId);
      const group = customGroups.find(g => g.id === groupId);
      vibeAlert.success('Added', `${user?.name} added to ${group?.name}! ${group?.emoji}`);
    } catch (error) {
      console.error('Failed to add member:', error);
      vibeAlert.error('Error', 'Failed to add member. Please try again.');
    }
  };

  const showAddToGroupOptions = (group, appUsers) => {
    const availableUsers = appUsers.filter(user => !group.members.includes(user.id));
    
    if (availableUsers.length === 0) {
      vibeAlert.info('No Available Users', 'All users are already in this group.');
      return;
    }

    // For now, just show info about available users since vibeAlert doesn't support action buttons
    const userNames = availableUsers.slice(0, 3).map(u => u.name).join(', ');
    const moreCount = availableUsers.length > 3 ? ` and ${availableUsers.length - 3} more` : '';
    vibeAlert.info(`Add to ${group.name}`, `Available users: ${userNames}${moreCount}. Use the group management modal to add members.`);
  };

  const handleCreateGroup = async (groupName) => {
    if (!groupName.trim()) {
      vibeAlert.error('Error', 'Please enter a group name');
      return false;
    }

    try {
      const groupData = {
        name: groupName.trim(),
        emoji: getEmojiForText(groupName),
        members: [],
        isPrivate: true
      };
      
      const newGroup = await createGroup(groupData);
      setCustomGroups(prev => [...prev, newGroup]);
      vibeAlert.success('Created', `"${newGroup.name}" group created! Start adding people to it.`);
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
      setCustomGroups(prev => prev.filter(group => group.id !== groupId));
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
    showAddToGroupOptions,
    handleCreateGroup,
    handleDeleteGroup,
  };
};