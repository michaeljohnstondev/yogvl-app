// FILE: screens/InvitationsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { getUserInvitations } from '../services/invitations';
import { useAuth } from '../../auth/AuthContext';
import InvitationCard from '../components/guests/InvitationCard';
import VibeScreen from '../../components/ui/base/VibeScreen';
import theme from '../../theme/themes';

export default function InvitationsScreen({ navigation }) {
  const { currentUserId } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('pending'); // 'all', 'pending', 'responded'

  // Load user's invitations
  useEffect(() => {
    if (currentUserId) {
      loadInvitations();
    }
  }, [currentUserId]);

  const loadInvitations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);
      const userInvitations = await getUserInvitations(currentUserId);
      setInvitations(userInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
      // Don't show alert here as it might be annoying on screen load
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInvitations();
    setIsRefreshing(false);
  }, [loadInvitations]);

  // Handle invitation response
  const handleInvitationResponse = useCallback((response) => {
    // Refresh the list after responding
    loadInvitations();
  }, [loadInvitations]);

  // Filter invitations based on active filter
  const filteredInvitations = invitations.filter(invitation => {
    switch (activeFilter) {
      case 'pending':
        return invitation.status === 'pending';
      case 'responded':
        return invitation.status === 'accepted' || invitation.status === 'declined';
      case 'all':
      default:
        return true;
    }
  });

  // Get counts for filter tabs
  const pendingCount = invitations.filter(inv => inv.status === 'pending').length;
  const respondedCount = invitations.filter(inv => 
    inv.status === 'accepted' || inv.status === 'declined'
  ).length;

  // Render filter button
  const renderFilterButton = (filter, label, count) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilter]}
        onPress={() => setActiveFilter(filter)}
      >
        <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
          {label} {count > 0 && `(${count})`}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render invitation item
  const renderInvitationItem = ({ item }) => (
    <InvitationCard
      invitation={item}
      currentUserId={currentUserId}
      onResponse={handleInvitationResponse}
    />
  );

  // Render empty state
  const renderEmptyState = () => {
    let message = '';
    switch (activeFilter) {
      case 'pending':
        message = "No pending invitations.\nWhen someone invites you to an event, it will appear here.";
        break;
      case 'responded':
        message = "No responded invitations.\nInvitations you've accepted or declined will appear here.";
        break;
      case 'all':
      default:
        message = "No invitations yet.\nWhen someone invites you to an event, it will appear here.";
        break;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📮</Text>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <VibeScreen
        title="Invitations"
        subtitle="Event invitations you've received"
        onBack={() => navigation.goBack()}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      </VibeScreen>
    );
  }

  return (
    <VibeScreen
      title="Invitations"
      subtitle="Event invitations you've received"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        {/* Filter tabs */}
        <View style={styles.filterContainer}>
          {renderFilterButton('pending', 'Pending', pendingCount)}
          {renderFilterButton('responded', 'Responded', respondedCount)}
          {renderFilterButton('all', 'All', invitations.length)}
        </View>

        {/* Invitations list */}
        {filteredInvitations.length > 0 ? (
          <FlatList
            data={filteredInvitations}
            renderItem={renderInvitationItem}
            keyExtractor={(item) => item.id}
            style={styles.invitationsList}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.vibeBlue}
                colors={[theme.colors.vibeBlue]}
              />
            }
          />
        ) : (
          <ScrollView
            style={styles.emptyScrollView}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.vibeBlue}
                colors={[theme.colors.vibeBlue]}
              />
            }
          >
            {renderEmptyState()}
          </ScrollView>
        )}
      </View>
    </VibeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.gray,
    fontSize: 16,
    fontStyle: 'italic',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.darkGray,
  },
  activeFilter: {
    backgroundColor: theme.colors.vibeBlue,
  },
  filterText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterText: {
    color: theme.colors.white,
  },
  invitationsList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyScrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: theme.colors.gray,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
});