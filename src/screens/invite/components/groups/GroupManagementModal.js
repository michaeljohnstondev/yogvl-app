import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import CloseButton from '../../../../components/ui/CloseButton';
import { useVibeAlert } from '../../../../components/ui/VibeAlertContext';
import styles from '../../styles/inviteScreenStyles';

const GroupManagementModal = ({
  visible,
  onClose,
  customGroups,
  appUsers,
  removeFromGroup,
  showAddToGroupOptions,
  handleDeleteGroup,
  onCreateNewGroup
}) => {
  const vibeAlert = useVibeAlert();
  
  const confirmDeleteGroup = (groupId, groupName) => {
    vibeAlert.confirm(
      'Delete Group',
      `Are you sure you want to delete "${groupName}"? This action cannot be undone.`,
      () => handleDeleteGroup(groupId),
      () => {} // onCancel - do nothing
    );
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.groupModalContainer}>
        <View style={styles.groupModalHeader}>
          <Text style={styles.groupModalTitle}>Manage Groups</Text>
          <CloseButton onPress={onClose} />
        </View>

        <ScrollView style={styles.groupModalContent}>
          {customGroups.map(group => (
            <View key={group.id} style={styles.groupManageItem}>
              <View style={styles.groupManageHeader}>
                <Text style={styles.groupManageName}>{group.emoji} {group.name}</Text>
                <View style={styles.groupActions}>
                  <Text style={styles.groupMemberCount}>{group.members.length} members</Text>
                  {group.isOwner && (
                    <TouchableOpacity 
                      onPress={() => confirmDeleteGroup(group.id, group.name)}
                      style={styles.deleteGroupButton}
                    >
                      <Text style={styles.deleteGroupText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <View style={styles.groupMembersList}>
                {group.members.map(memberId => {
                  const member = appUsers.find(user => user.id === memberId);
                  return member ? (
                    <View key={memberId} style={styles.groupMemberItem}>
                      <Text style={styles.groupMemberName}>{member.avatar} {member.name}</Text>
                      <TouchableOpacity 
                        onPress={() => removeFromGroup(group.id, memberId, appUsers)}
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
                onPress={() => showAddToGroupOptions(group, appUsers)}
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
    </Modal>
  );
};

export default GroupManagementModal;