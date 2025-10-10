import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { CloseButton } from '../../../../components/ui';
import { VibeAlertProvider, useVibeAlert } from '../../../../components/ui/base/VibeAlertContext';
import AddToGroupModal from './AddToGroupModal';
import styles from '../../styles/inviteScreenStyles';

const GroupManagementModal = ({
  visible,
  onClose,
  customGroups,
  appUsers,
  removeFromGroup,
  getAvailableUsers,
  addMultipleMembersToGroup,
  handleDeleteGroup,
  onCreateNewGroup,
}) => {
  const vibeAlert = useVibeAlert();
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false);
  const [selectedGroupForAdding, setSelectedGroupForAdding] = useState(null);

  const confirmDeleteGroup = (groupId, groupName) => {
    vibeAlert.confirm(
      'Delete Group',
      `Are you sure you want to delete "${groupName}"? This action cannot be undone.`,
      () => handleDeleteGroup(groupId),
      () => {} // onCancel - do nothing
    );
  };

  const handleOpenAddToGroup = (group) => {
    setSelectedGroupForAdding(group);
    setShowAddToGroupModal(true);
  };

  const handleCloseAddToGroup = () => {
    setShowAddToGroupModal(false);
    setSelectedGroupForAdding(null);
  };

  const handleAddMembers = async (groupId, users) => {
    const success = await addMultipleMembersToGroup(groupId, users);
    if (success) {
      handleCloseAddToGroup();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <VibeAlertProvider>
        <View style={styles.groupModalContainer}>
        <View style={styles.groupModalHeader}>
          <Text style={styles.groupModalTitle}>Manage Groups</Text>
          <CloseButton onPress={onClose} />
        </View>

        <ScrollView style={styles.groupModalContent}>
          {customGroups.map((group) => (
            <View key={group.id} style={styles.groupManageItem}>
              <View style={styles.groupManageHeader}>
                <Text style={styles.groupManageName}>
                  {group.emoji} {group.name}
                </Text>
                <View style={styles.groupActions}>
                  <Text style={styles.groupMemberCount}>
                    {group.members.length} members
                  </Text>
                  <TouchableOpacity
                    onPress={() => confirmDeleteGroup(group.id, group.name)}
                    style={styles.deleteGroupButton}
                  >
                    <Text style={styles.deleteGroupText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.groupMembersList}>
                {group.members.map((memberId) => {
                  const member = appUsers.find((user) => user.id === memberId);
                  return member ? (
                    <View key={memberId} style={styles.groupMemberItem}>
                      <Text style={styles.groupMemberName}>
                        {member.avatar} {member.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          removeFromGroup(group.id, memberId, appUsers)
                        }
                        style={styles.removeMemberButton}
                      >
                        <Text style={styles.removeMemberText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })}
              </View>

              <TouchableOpacity
                style={styles.addToGroupButton}
                onPress={() => handleOpenAddToGroup(group)}
              >
                <Text style={styles.addToGroupText}>+ Add People</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={onCreateNewGroup}
          >
            <Text style={styles.createGroupText}>+ Create New Group</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Add To Group Modal */}
      <AddToGroupModal
        visible={showAddToGroupModal}
        onClose={handleCloseAddToGroup}
        group={selectedGroupForAdding}
        availableUsers={
          selectedGroupForAdding
            ? getAvailableUsers(selectedGroupForAdding, appUsers)
            : []
        }
        onAddMembers={handleAddMembers}
      />
      </VibeAlertProvider>
    </Modal>
  );
};

export default GroupManagementModal;
