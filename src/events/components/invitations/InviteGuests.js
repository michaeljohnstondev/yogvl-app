// FILE: components/invitations/InviteGuests.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import VibeInput from '../../../components/ui/VibeInput';
import VibeButton from '../../../components/ui/VibeButton';
import QRCodeGenerator from '../../../components/ui/QRCodeGenerator';
import theme from '../../../theme/themes';
import { getDeviceContacts, hasContactPermission } from '../../../lib/contactService';

export default function InviteGuests({ 
  onInviteUsers,
  onInviteContacts,
  onInvitePhoneContacts,
  selectedUsers = [],
  selectedContacts = [],
  selectedPhoneContacts = [],
  eventId,
  inviteCode,
  studioId,
  style 
}) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'phone', or 'qr'
  const [searchQuery, setSearchQuery] = useState('');

  // Mock friends data - replace with actual user search
  const [friends] = useState([
    { id: '1', name: 'Alex Johnson', email: 'alex@example.com', avatar: '👤' },
    { id: '2', name: 'Sarah Chen', email: 'sarah@example.com', avatar: '👤' },
    { id: '3', name: 'Mike Wilson', email: 'mike@example.com', avatar: '👤' },
  ]);

  const [localSelectedUsers, setLocalSelectedUsers] = useState(selectedUsers);
  const [localSelectedPhoneContacts, setLocalSelectedPhoneContacts] = useState(selectedPhoneContacts);

  // Real device contacts state
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter phone contacts based on search query
  const filteredPhoneContacts = phoneContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.phone && contact.phone.includes(searchQuery))
  );

  // Load device contacts when phone tab is accessed
  useEffect(() => {
    if (activeTab === 'phone' && !contactsLoaded && !loadingContacts) {
      loadDeviceContacts();
    }
  }, [activeTab]);

  const loadDeviceContacts = async () => {
    setLoadingContacts(true);
    try {
      const contacts = await getDeviceContacts();
      setPhoneContacts(contacts);
      setContactsLoaded(true);
    } catch (error) {
      console.error('Failed to load device contacts:', error);
      Alert.alert('Error', 'Failed to load your contacts. Please try again.');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Handle user selection
  const toggleUserSelection = (user) => {
    const isSelected = localSelectedUsers.some(u => u.id === user.id);
    let updated;
    
    if (isSelected) {
      updated = localSelectedUsers.filter(u => u.id !== user.id);
    } else {
      updated = [...localSelectedUsers, user];
    }
    
    setLocalSelectedUsers(updated);
    onInviteUsers && onInviteUsers(updated);
  };

  // Handle phone contact selection
  const togglePhoneContactSelection = (contact) => {
    const isSelected = localSelectedPhoneContacts.some(c => c.id === contact.id);
    let updated;
    
    if (isSelected) {
      updated = localSelectedPhoneContacts.filter(c => c.id !== contact.id);
    } else {
      updated = [...localSelectedPhoneContacts, contact];
    }
    
    setLocalSelectedPhoneContacts(updated);
    onInvitePhoneContacts && onInvitePhoneContacts(updated);
  };


  // Remove phone contact
  const removePhoneContact = (contactId) => {
    const updated = localSelectedPhoneContacts.filter(c => c.id !== contactId);
    setLocalSelectedPhoneContacts(updated);
    onInvitePhoneContacts && onInvitePhoneContacts(updated);
  };

  // Render friend item
  const renderFriendItem = ({ item }) => {
    const isSelected = localSelectedUsers.some(u => u.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.selectedFriendItem]}
        onPress={() => toggleUserSelection(item)}
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
        </View>
      </TouchableOpacity>
    );
  };

  // Render phone contact item
  const renderPhoneContactItem = ({ item }) => {
    const isSelected = localSelectedPhoneContacts.some(c => c.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.selectedFriendItem]}
        onPress={() => togglePhoneContactSelection(item)}
      >
        <View style={styles.friendInfo}>
          <Text style={styles.friendAvatar}>{item.avatar}</Text>
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.name}</Text>
            <Text style={styles.friendEmail}>{item.phone}</Text>
          </View>
        </View>
        <View style={styles.selectionIndicator}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };


  // Render selected phone contact item
  const renderSelectedPhoneContactItem = ({ item }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactDetail}>{item.phone}</Text>
        <Text style={styles.inviteTypeText}>Will receive SMS invitation</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removePhoneContact(item.id)}
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
      <Text style={styles.title}>Invite Guests</Text>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton('friends', 'App')}
        {renderTabButton('phone', 'Phone')}
        {renderTabButton('qr', 'QR Code')}
      </View>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <View style={styles.tabContent}>
          {/* Search */}
          <VibeInput
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />

          {/* Friends List */}
          <View style={styles.friendsList}>
            {filteredFriends.length > 0 ? (
              filteredFriends.map((item) => (
                <View key={item.id}>
                  {renderFriendItem({ item })}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No friends found</Text>
            )}
          </View>
        </View>
      )}

      {/* Phone Contacts Tab */}
      {activeTab === 'phone' && (
        <View style={styles.tabContent}>
          {loadingContacts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
              <Text style={styles.loadingText}>Loading your contacts...</Text>
            </View>
          ) : (
            <>
              {/* Search */}
              <VibeInput
                placeholder="Search phone contacts..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />

              {/* Phone Contacts List */}
              <View style={styles.friendsList}>
                {filteredPhoneContacts.length > 0 ? (
                  filteredPhoneContacts.map((item) => (
                    <View key={item.id}>
                      {renderPhoneContactItem({ item })}
                    </View>
                  ))
                ) : contactsLoaded ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No contacts found</Text>
                    <Text style={styles.emptySubtext}>
                      Try searching or check your contact permissions
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Tap to load your contacts</Text>
                    <VibeButton
                      label="Load Contacts"
                      onPress={loadDeviceContacts}
                      style={styles.loadButton}
                    />
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      )}

      {/* QR Code Tab */}
      {activeTab === 'qr' && (
        <View style={styles.tabContent}>
          <Text style={styles.qrTitle}>Share with QR Codes</Text>
          
          {/* Event QR Code for App Users */}
          {inviteCode && (
            <View style={styles.qrSection}>
              <Text style={styles.qrSubtitle}>For App Users</Text>
              <QRCodeGenerator
                type="event"
                data={inviteCode}
                size={180}
                showShareButton={false}
              />
              <Text style={styles.qrDescription}>
                Scan to join event instantly
              </Text>
            </View>
          )}
          
          {/* App Download QR Code for New Users */}
          {studioId && eventId && (
            <View style={styles.qrSection}>
              <Text style={styles.qrSubtitle}>For New Users</Text>
              <QRCodeGenerator
                type="app-download"
                data={{ studioId, eventId }}
                size={180}
                showShareButton={false}
              />
              <Text style={styles.qrDescription}>
                Scan to download app & join event
              </Text>
            </View>
          )}
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
    marginBottom: 16,
    textAlign: 'center',
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
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderColor: theme.colors.vibeBlue,
  },
  tabText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  activeTabText: {
    color: theme.colors.vibeBlue,
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
    borderColor: theme.colors.vibeBlue,
    backgroundColor: theme.colors.vibeBackgroundBlue,
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
    borderColor: theme.colors.vibeBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Contacts Tab
  addContactForm: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
  },
  messageInput: {
    marginBottom: 16,
  },
  addButton: {
    marginVertical: 0,
  },
  selectedContacts: {
    marginTop: 20,
  },
  selectedTitle: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeGreen,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  contactDetail: {
    color: theme.colors.gray,
    fontSize: 14,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading state
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    marginTop: 16,
  },
  loadButton: {
    marginTop: 16,
    marginVertical: 0,
  },

  // QR Code Tab
  qrTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  qrSubtitle: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrDescription: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});