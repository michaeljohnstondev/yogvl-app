// FILE: components/invitations/InviteHosts.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { VibeInput, VibeButton } from '../../../components/ui';
import theme from '../../../theme/themes';

export default function InviteHosts({
  onInviteUsers,
  onInviteContacts,
  onInvitePhoneContacts,
  selectedUsers = [],
  selectedContacts = [],
  selectedPhoneContacts = [],
  maxHosts = 10,
  style,
}) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'contacts', or 'phone'
  const [searchQuery, setSearchQuery] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Mock friends data - replace with actual user search
  const [friends] = useState([
    { id: '1', name: 'Alex Johnson', email: 'alex@example.com', avatar: '👤' },
    { id: '2', name: 'Sarah Chen', email: 'sarah@example.com', avatar: '👤' },
    { id: '3', name: 'Mike Wilson', email: 'mike@example.com', avatar: '👤' },
    {
      id: '4',
      name: 'Jordan Smith',
      email: 'jordan@example.com',
      avatar: '👤',
    },
  ]);

  const [localSelectedUsers, setLocalSelectedUsers] = useState(selectedUsers);
  const [localSelectedContacts, setLocalSelectedContacts] =
    useState(selectedContacts);
  const [localSelectedPhoneContacts, setLocalSelectedPhoneContacts] = useState(
    selectedPhoneContacts
  );

  // Mock phone contacts for hosts
  const [phoneContacts] = useState([
    {
      id: 'host_phone_1',
      name: 'Business Partner',
      phone: '(555) 123-9999',
      avatar: '👔',
    },
    {
      id: 'host_phone_2',
      name: 'Team Lead Sarah',
      phone: '(555) 456-7890',
      avatar: '👩‍💼',
    },
    {
      id: 'host_phone_3',
      name: 'Co-organizer Mike',
      phone: '(555) 789-0123',
      avatar: '👨‍💼',
    },
  ]);

  // Filter friends based on search query
  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalHosts =
    localSelectedUsers.length +
    localSelectedContacts.length +
    localSelectedPhoneContacts.length;

  // Handle user selection
  const toggleUserSelection = (user) => {
    const isSelected = localSelectedUsers.some((u) => u.id === user.id);
    let updated;

    if (isSelected) {
      updated = localSelectedUsers.filter((u) => u.id !== user.id);
    } else {
      if (totalHosts >= maxHosts) {
        Alert.alert(
          'Maximum Hosts Reached',
          `You can only add up to ${maxHosts} additional hosts.`
        );
        return;
      }
      updated = [...localSelectedUsers, user];
    }

    setLocalSelectedUsers(updated);
    onInviteUsers && onInviteUsers(updated);
  };

  // Handle contact invitation
  const handleAddContact = () => {
    if (!contactName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!contactEmail.trim() && !contactPhone.trim()) {
      Alert.alert('Error', 'Please enter either an email or phone number');
      return;
    }

    if (totalHosts >= maxHosts) {
      Alert.alert(
        'Maximum Hosts Reached',
        `You can only add up to ${maxHosts} additional hosts.`
      );
      return;
    }

    const contact = {
      id: `host_contact_${Date.now()}`,
      name: contactName.trim(),
      email: contactEmail.trim() || null,
      phone: contactPhone.trim() || null,
      role: 'co-host',
    };

    const updated = [...localSelectedContacts, contact];
    setLocalSelectedContacts(updated);
    onInviteContacts && onInviteContacts(updated);

    // Clear form
    setContactName('');
    setContactEmail('');
    setContactPhone('');

    Alert.alert('Success', `${contact.name} added as co-host`);
  };

  // Remove contact
  const removeContact = (contactId) => {
    const updated = localSelectedContacts.filter((c) => c.id !== contactId);
    setLocalSelectedContacts(updated);
    onInviteContacts && onInviteContacts(updated);
  };

  // Remove user
  const removeUser = (userId) => {
    const updated = localSelectedUsers.filter((u) => u.id !== userId);
    setLocalSelectedUsers(updated);
    onInviteUsers && onInviteUsers(updated);
  };

  // Render friend item
  const renderFriendItem = ({ item }) => {
    const isSelected = localSelectedUsers.some((u) => u.id === item.id);
    const canSelect = !isSelected && totalHosts < maxHosts;

    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          isSelected && styles.selectedFriendItem,
          !canSelect && !isSelected && styles.disabledFriendItem,
        ]}
        onPress={() => toggleUserSelection(item)}
        disabled={!canSelect && !isSelected}
      >
        <View style={styles.friendInfo}>
          <Text style={styles.friendAvatar}>{item.avatar}</Text>
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.name}</Text>
            <Text style={styles.friendEmail}>{item.email}</Text>
          </View>
        </View>
        <View style={styles.selectionIndicator}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
          {!canSelect && !isSelected && (
            <Text style={styles.maxReached}>Max</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render selected user item
  const renderSelectedUser = ({ item }) => (
    <View style={styles.hostItem}>
      <View style={styles.hostInfo}>
        <Text style={styles.hostName}>{item.name}</Text>
        <Text style={styles.hostDetail}>{item.email}</Text>
        <Text style={styles.hostRole}>Co-Host</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeUser(item.id)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  // Render contact item
  const renderContactItem = ({ item }) => (
    <View style={styles.hostItem}>
      <View style={styles.hostInfo}>
        <Text style={styles.hostName}>{item.name}</Text>
        {item.email && <Text style={styles.hostDetail}>{item.email}</Text>}
        {item.phone && <Text style={styles.hostDetail}>{item.phone}</Text>}
        <Text style={styles.hostRole}>Co-Host</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeContact(item.id)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  // Render tab button
  const renderTabButton = (tab, label) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive && styles.activeTab]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <Text style={styles.title}>Add Co-Hosts</Text>

      {/* Host limit indicator */}
      <Text style={styles.limitText}>
        {totalHosts} of {maxHosts} co-hosts added
      </Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton('friends', 'App')}
        {renderTabButton('phone', 'Phone')}
        {renderTabButton('contacts', 'Manual')}
      </View>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <View style={styles.tabContent}>
          {/* Search */}
          <VibeInput
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />

          {/* Friends List */}
          <View style={styles.friendsList}>
            {filteredFriends.length > 0 ? (
              filteredFriends.map((item) => (
                <View key={item.id}>{renderFriendItem({ item })}</View>
              ))
            ) : (
              <Text style={styles.emptyText}>No users found</Text>
            )}
          </View>
        </View>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <View style={styles.tabContent}>
          {/* Add Contact Form */}
          <View style={styles.addContactForm}>
            <VibeInput
              placeholder="Name *"
              value={contactName}
              onChangeText={setContactName}
              style={styles.input}
            />

            <VibeInput
              placeholder="Email address"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              style={styles.input}
            />

            <VibeInput
              placeholder="Phone number"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <VibeButton
              label="Add Co-Host"
              onPress={handleAddContact}
              style={styles.addButton}
              disabled={totalHosts >= maxHosts}
            />

            {totalHosts >= maxHosts && (
              <Text style={styles.maxReachedText}>
                Maximum number of co-hosts reached
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Selected Hosts */}
      {(localSelectedUsers.length > 0 || localSelectedContacts.length > 0) && (
        <View style={styles.selectedHosts}>
          <Text style={styles.selectedTitle}>Co-Hosts:</Text>

          {/* Selected Users */}
          {localSelectedUsers.map((item) => (
            <View key={item.id}>{renderSelectedUser({ item })}</View>
          ))}

          {/* Selected Contacts */}
          {localSelectedContacts.map((item) => (
            <View key={item.id}>{renderContactItem({ item })}</View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
    textAlign: 'center',
  },
  limitText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.vibeBackgroundOrange,
    borderColor: theme.colors.vibeOrange,
  },
  tabText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  activeTabText: {
    color: theme.colors.vibeOrange,
  },

  // Tab Content
  tabContent: {
    minHeight: 200,
  },

  // Friends Tab
  searchInput: {
    marginBottom: 16,
  },
  friendsList: {
    minHeight: 150,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  selectedFriendItem: {
    borderColor: theme.colors.vibeOrange,
    backgroundColor: theme.colors.vibeBackgroundOrange,
  },
  disabledFriendItem: {
    opacity: 0.5,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    fontSize: 24,
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  friendEmail: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.vibeOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: theme.colors.vibeOrange,
    fontSize: 16,
    fontWeight: 'bold',
  },
  maxReached: {
    color: theme.colors.gray,
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Contacts Tab
  addContactForm: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
  },
  addButton: {
    marginVertical: 0,
  },
  maxReachedText: {
    color: theme.colors.vibeRed,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginTop: 8,
  },

  // Selected Hosts
  selectedHosts: {
    marginTop: 20,
  },
  selectedTitle: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 12,
  },
  hostItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeOrange,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  hostDetail: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
  },
  hostRole: {
    color: theme.colors.vibeOrange,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  removeButton: {
    padding: 8,
    borderRadius: 4,
  },
  removeButtonText: {
    color: theme.colors.vibeRed,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Empty state
  emptyText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
