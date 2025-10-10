import React, { useState, useMemo } from 'react';
import { View, Text, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { VibeInput, VibeButton, CloseButton } from '../../../../components/ui';
import { VibeAlertProvider } from '../../../../components/ui/base/VibeAlertContext';
import UserListItem from '../lists/UserListItem';
import styles from '../../styles/inviteScreenStyles';
import theme from '../../../../theme/themes';

const AddToGroupModal = ({
  visible,
  onClose,
  group,
  availableUsers,
  onAddMembers,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;

    const query = searchQuery.toLowerCase();
    return availableUsers.filter((user) =>
      user.name?.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  // Toggle user selection
  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Handle add selected users
  const handleAddSelected = async () => {
    if (selectedUsers.length === 0 || isAdding) return;

    setIsAdding(true);
    try {
      await onAddMembers(group.id, selectedUsers);

      // Reset and close
      setSelectedUsers([]);
      setSearchQuery('');
      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  // Handle close without saving
  const handleClose = () => {
    setSelectedUsers([]);
    setSearchQuery('');
    onClose();
  };

  if (!group) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <VibeAlertProvider>
        <View style={styles.addToGroupModalContainer}>
        {/* Header */}
        <View style={styles.addToGroupModalHeader}>
          <Text style={styles.addToGroupModalTitle}>
            Add to {group.emoji} {group.name}
          </Text>
          <CloseButton onPress={handleClose} />
        </View>

        {/* Search Bar */}
        <View style={styles.addToGroupSearchContainer}>
          <VibeInput
            placeholder="Search people..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.addToGroupSearchInput}
          />
        </View>

        {/* Selected Count */}
        {selectedUsers.length > 0 && (
          <View style={styles.addToGroupSelectedCount}>
            <Text style={styles.addToGroupSelectedText}>
              {selectedUsers.length} selected
            </Text>
          </View>
        )}

        {/* User List */}
        <ScrollView
          style={styles.addToGroupModalContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? 'No users found'
                  : 'All users are already in this group'}
              </Text>
            </View>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUsers.some((u) => u.id === user.id);
              return (
                <UserListItem
                  key={user.id}
                  item={user}
                  isSelected={isSelected}
                  canSelect={true}
                  themeColor={theme.colors.vibeBlue}
                  themeBgColor={theme.colors.vibeBackgroundBlue}
                  onPress={() => toggleUserSelection(user)}
                  onAvatarPress={() => {}} // No avatar action in this context
                />
              );
            })
          )}
        </ScrollView>

        {/* Add Button */}
        {!isLoading && filteredUsers.length > 0 && (
          <View style={styles.addToGroupModalFooter}>
            <VibeButton
              label={isAdding ? 'Adding...' : `Add ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : 'Selected'}`}
              onPress={handleAddSelected}
              disabled={selectedUsers.length === 0 || isAdding}
              style={styles.addToGroupButton}
            />
          </View>
        )}
      </View>
      </VibeAlertProvider>
    </Modal>
  );
};

export default AddToGroupModal;
