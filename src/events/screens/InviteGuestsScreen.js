// FILE: screens/InviteGuestsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { getEventInvitations } from '../services/invitations';
import { useAuth } from '../../auth/AuthContext';
import { VibeView } from '../../components/ui/base';
import QRCodeGenerator from '../../components/ui/utils/QRCodeGenerator';
import theme from '../../theme/themes';

export default function InviteGuestsScreen({ navigation, route }) {
  const { eventId, eventTitle, inviteCode, studioId } = route.params;
  const { currentUserId, userData } = useAuth();

  // UI State
  const [activeTab, setActiveTab] = useState('invite'); // 'invite' or 'manage'

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

  // Format invitation status
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return theme.colors.vibeYellow;
      case 'accepted':
        return theme.colors.vibeGreen;
      case 'declined':
        return theme.colors.vibeRed;
      case 'expired':
        return theme.colors.gray;
      default:
        return theme.colors.gray;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'declined':
        return 'Declined';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
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
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) },
        ]}
      >
        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
      </View>
    </View>
  );

  return (
    <VibeView>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invite' && styles.activeTab]}
          onPress={() => setActiveTab('invite')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'invite' && styles.activeTabText,
            ]}
          >
            Send Invites
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
          onPress={() => setActiveTab('manage')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'manage' && styles.activeTabText,
            ]}
          >
            Manage Invites
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'invite' ? (
          <>
            {/* QR Code Section */}
            <View style={styles.qrContainer}>
              <Text style={styles.sectionTitle}>Share with QR Codes</Text>

              {/* Event QR Code for App Users */}
              {inviteCode && (
                <View style={styles.qrSection}>
                  <Text style={styles.qrSubtitle}>For App Users</Text>
                  <QRCodeGenerator
                    type="event"
                    data={inviteCode}
                    size={200}
                    showShareButton={false}
                  />
                  <Text style={styles.qrDescription}>
                    Scan to join event instantly
                  </Text>
                </View>
              )}

              {/* App Download QR Code for New Users */}
              {studioId && (
                <View style={styles.qrSection}>
                  <Text style={styles.qrSubtitle}>For New Users</Text>
                  <QRCodeGenerator
                    type="app-download"
                    data={{ studioId, eventId }}
                    size={200}
                    showShareButton={false}
                  />
                  <Text style={styles.qrDescription}>
                    Scan to download app & join event
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          // Manage Invitations Tab
          <View style={styles.manageContainer}>
            <View style={styles.manageHeader}>
              <Text style={styles.sectionTitle}>Sent Invitations</Text>
              <TouchableOpacity
                onPress={loadInvitations}
                disabled={isLoadingInvitations}
              >
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
                No invitations sent yet. Use the "Send Invites" tab to invite
                guests!
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </VibeView>
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
  qrContainer: {
    marginBottom: 24,
    paddingTop: 8,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.darkGray,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue + '20',
  },
  qrSubtitle: {
    color: theme.colors.vibeBlue,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrDescription: {
    color: theme.colors.gray,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});
