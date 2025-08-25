// FILE: screens/InviteGuestsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { sendUserInvitation, sendEmailInvitation, getEventInvitations } from '../services/invitations';
import { useAuth } from '../../auth/AuthContext';
import VibeScreen from '../../components/ui/VibeScreen';
import VibeButton from '../../components/ui/VibeButton';
import VibeInput from '../../components/ui/VibeInput';
import theme from '../../theme/themes';

export default function InviteGuestsScreen({ navigation, route }) {
  const { eventId, eventTitle } = route.params;
  const { currentUserId, userData } = useAuth();
  
  // UI State
  const [activeTab, setActiveTab] = useState('invite'); // 'invite' or 'manage'
  const [inviteMethod, setInviteMethod] = useState('email'); // 'email' or 'user'
  
  // Invitation Form
  const [emailInput, setEmailInput] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  // Search Results
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Existing Invitations
  const [invitations, setInvitations] = useState([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  // Load existing invitations
  useEffect(() => {
    if (activeTab === 'manage') {
      loadInvitations();
    }
  }, [activeTab]);

  const loadInvitations = useCallback(async () => {
    if (!eventId) return;
    
    setIsLoadingInvitations(true);
    try {
      const eventInvitations = await getEventInvitations(eventId);
      setInvitations(eventInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
      Alert.alert('Error', 'Failed to load invitations');
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [eventId]);

  // Search users (mock implementation - replace with actual user search)
  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // TODO: Implement actual user search in Firebase
      // For now, return mock results
      const mockResults = [
        { id: 'user1', displayName: 'John Doe', email: 'john@example.com' },
        { id: 'user2', displayName: 'Jane Smith', email: 'jane@example.com' },
      ].filter(user => 
        user.displayName.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      
      setSearchResults(mockResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce user search
  useEffect(() => {
    if (inviteMethod === 'user') {
      const timer = setTimeout(() => {
        searchUsers(userSearchInput);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [userSearchInput, inviteMethod, searchUsers]);

  // Send email invitation
  const handleSendEmailInvitation = useCallback(async () => {
    if (!emailInput.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    try {
      await sendEmailInvitation({
        eventId,
        hostId: currentUserId,
        guestEmail: emailInput.trim(),
        message: messageInput.trim(),
      });

      Alert.alert(
        'Invitation Sent!',
        `Invitation sent to ${emailInput.trim()}`,
        [{ text: 'OK', onPress: () => {
          setEmailInput('');
          setMessageInput('');
          // Refresh invitations if on manage tab
          if (activeTab === 'manage') {
            loadInvitations();
          }
        }}]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  }, [emailInput, messageInput, eventId, currentUserId, activeTab, loadInvitations]);

  // Send user invitation
  const handleSendUserInvitation = useCallback(async (guestId) => {
    setIsInviting(true);
    try {
      await sendUserInvitation({
        eventId,
        hostId: currentUserId,
        guestId,
        message: messageInput.trim(),
        source: 'invite_guests_screen',
      });

      Alert.alert(
        'Invitation Sent!',
        'Invitation sent successfully',
        [{ text: 'OK', onPress: () => {
          setUserSearchInput('');
          setMessageInput('');
          setSearchResults([]);
          // Refresh invitations if on manage tab
          if (activeTab === 'manage') {
            loadInvitations();
          }
        }}]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  }, [eventId, currentUserId, messageInput, activeTab, loadInvitations]);

  // Format invitation status
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return theme.colors.vibeYellow;
      case 'accepted': return theme.colors.vibeGreen;
      case 'declined': return theme.colors.vibeRed;
      case 'expired': return theme.colors.gray;
      default: return theme.colors.gray;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'declined': return 'Declined';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  // Render invitation item
  const renderInvitationItem = ({ item }) => (
    <View style={styles.invitationItem}>
      <View style={styles.invitationInfo}>
        <Text style={styles.invitationGuest}>
          {item.guestData?.displayName || item.guestEmail || 'Unknown Guest'}
        </Text>
        {item.guestEmail && (
          <Text style={styles.invitationEmail}>{item.guestEmail}</Text>
        )}
        <Text style={styles.invitationDate}>
          Invited {item.invitedAt.toLocaleDateString()}
        </Text>
        {item.message && (
          <Text style={styles.invitationMessage}>"{item.message}"</Text>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
      </View>
    </View>
  );

  // Render user search result
  const renderUserResult = ({ item }) => (
    <TouchableOpacity
      style={styles.userResult}
      onPress={() => handleSendUserInvitation(item.id)}
      disabled={isInviting}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <VibeButton
        title="Invite"
        onPress={() => handleSendUserInvitation(item.id)}
        disabled={isInviting}
        style={styles.inviteButton}
      />
    </TouchableOpacity>
  );

  return (
    <VibeScreen
      title="Invite Guests"
      subtitle={`Event: ${eventTitle}`}
      onBack={() => navigation.goBack()}
    >
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invite' && styles.activeTab]}
          onPress={() => setActiveTab('invite')}
        >
          <Text style={[styles.tabText, activeTab === 'invite' && styles.activeTabText]}>
            Send Invites
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
          onPress={() => setActiveTab('manage')}
        >
          <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>
            Manage Invites
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'invite' ? (
          <>
            {/* Invite Method Selector */}
            <View style={styles.methodContainer}>
              <Text style={styles.sectionTitle}>Invite Method</Text>
              <View style={styles.methodSelector}>
                <TouchableOpacity
                  style={[styles.methodTab, inviteMethod === 'email' && styles.activeMethodTab]}
                  onPress={() => setInviteMethod('email')}
                >
                  <Text style={[styles.methodTabText, inviteMethod === 'email' && styles.activeMethodTabText]}>
                    📧 Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodTab, inviteMethod === 'user' && styles.activeMethodTab]}
                  onPress={() => setInviteMethod('user')}
                >
                  <Text style={[styles.methodTabText, inviteMethod === 'user' && styles.activeMethodTabText]}>
                    👤 Find Users
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Email Invitation Form */}
            {inviteMethod === 'email' && (
              <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Email Invitation</Text>
                <VibeInput
                  placeholder="Enter email address"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
                <VibeInput
                  placeholder="Optional message (e.g., 'Hope you can make it!')"
                  value={messageInput}
                  onChangeText={setMessageInput}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.messageInput]}
                />
                <VibeButton
                  title={isInviting ? "Sending..." : "Send Invitation"}
                  onPress={handleSendEmailInvitation}
                  disabled={isInviting || !emailInput.trim()}
                  style={styles.sendButton}
                />
              </View>
            )}

            {/* User Search and Invitation */}
            {inviteMethod === 'user' && (
              <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Find and Invite Users</Text>
                <VibeInput
                  placeholder="Search by name or email"
                  value={userSearchInput}
                  onChangeText={setUserSearchInput}
                  style={styles.input}
                />
                
                {messageInput !== undefined && (
                  <VibeInput
                    placeholder="Optional message (e.g., 'Hope you can make it!')"
                    value={messageInput}
                    onChangeText={setMessageInput}
                    multiline
                    numberOfLines={3}
                    style={[styles.input, styles.messageInput]}
                  />
                )}

                {/* Search Results */}
                {userSearchInput.trim().length > 0 && (
                  <View style={styles.searchResults}>
                    {isSearching ? (
                      <Text style={styles.searchingText}>Searching...</Text>
                    ) : searchResults.length > 0 ? (
                      <FlatList
                        data={searchResults}
                        renderItem={renderUserResult}
                        keyExtractor={(item) => item.id}
                        style={styles.resultsList}
                        scrollEnabled={false}
                      />
                    ) : (
                      <Text style={styles.noResultsText}>No users found</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          // Manage Invitations Tab
          <View style={styles.manageContainer}>
            <View style={styles.manageHeader}>
              <Text style={styles.sectionTitle}>Sent Invitations</Text>
              <TouchableOpacity onPress={loadInvitations} disabled={isLoadingInvitations}>
                <Text style={styles.refreshText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>

            {isLoadingInvitations ? (
              <Text style={styles.loadingText}>Loading invitations...</Text>
            ) : invitations.length > 0 ? (
              <FlatList
                data={invitations}
                renderItem={renderInvitationItem}
                keyExtractor={(item) => item.id}
                style={styles.invitationsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <Text style={styles.noInvitationsText}>
                No invitations sent yet. Use the "Send Invites" tab to invite guests!
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </VibeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: theme.colors.darkGray,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.vibeBlue,
  },
  tabText: {
    color: theme.colors.gray,
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.white,
  },
  sectionTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  methodContainer: {
    marginBottom: 24,
  },
  methodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.darkGray,
    borderRadius: 8,
    padding: 4,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeMethodTab: {
    backgroundColor: theme.colors.vibePurple,
  },
  methodTabText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontWeight: '600',
  },
  activeMethodTabText: {
    color: theme.colors.white,
  },
  formContainer: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  messageInput: {
    minHeight: 80,
  },
  sendButton: {
    marginTop: 8,
  },
  searchResults: {
    marginTop: 16,
  },
  searchingText: {
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noResultsText: {
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultsList: {
    maxHeight: 300,
  },
  userResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: theme.colors.darkGray,
    borderRadius: 8,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: theme.colors.gray,
    fontSize: 14,
    marginTop: 2,
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
  },
  manageContainer: {
    flex: 1,
  },
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshText: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  noInvitationsText: {
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  invitationsList: {
    flex: 1,
  },
  invitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.darkGray,
    borderRadius: 8,
    marginBottom: 12,
  },
  invitationInfo: {
    flex: 1,
    marginRight: 12,
  },
  invitationGuest: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  invitationEmail: {
    color: theme.colors.gray,
    fontSize: 14,
    marginTop: 2,
  },
  invitationDate: {
    color: theme.colors.gray,
    fontSize: 12,
    marginTop: 4,
  },
  invitationMessage: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: {
    color: theme.colors.black,
    fontSize: 12,
    fontWeight: '600',
  },
});