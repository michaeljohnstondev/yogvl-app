import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import FriendsBucket from './FriendsBucket';
import FriendsList from './FriendsList';
import InviteFriendsSelector from './InviteFriendsSelector';
import VibeButton from './VibeButton';

export default forwardRef(function AdditionalHostsSelector({ 
  selectedHostIds = [], 
  onSelectionChange,
  maxHosts = 10,
  event, // Pass event data for invite messages
  onBucketExpand, // Callback when a bucket is expanded for scrolling
  onInviteExpansion, // Callback to track invite section expansion
  onSelectedTextContactsChange // Callback when text contacts are selected for event creation flow
}, ref) {
  const [expandedBuckets, setExpandedBuckets] = useState({});
  const [activeTab, setActiveTab] = useState('app'); // 'app', 'phone', 'manual'

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    closeAllInviteSections: () => {
      // Close all expanded invite buckets
      if (expandedBuckets.appFriends || expandedBuckets.phoneContacts) {
        setExpandedBuckets({});
        // Notify parent that invite sections are closed
        if (onInviteExpansion) {
          onInviteExpansion('appFriends', false);
          onInviteExpansion('inviteText', false);
        }
      }
    }
  }));

  // Mock data for now - this will come from APIs later
  const mockFriends = [
    { id: '1', name: 'Alex Johnson', email: 'alex@email.com' },
    { id: '2', name: 'Sam Wilson', phone: '555-0123' },
    { id: '3', name: 'Jordan Lee', email: 'jordan@email.com' },
    { id: '4', name: 'Taylor Brown', phone: '555-0456' },
    { id: '5', name: 'Casey Davis', email: 'casey@email.com' },
  ];

  const mockPhoneContacts = [
    { id: 'p1', name: 'Mom', phone: '555-MOM1' },
    { id: 'p2', name: 'John Neighbor', phone: '555-NEIG' },
    { id: 'p3', name: 'Dr. Smith', phone: '555-DOC1' },
  ];

  const toggleBucket = (bucketKey) => {
    const wasExpanded = expandedBuckets[bucketKey];
    const willBeExpanded = !wasExpanded;
    
    setExpandedBuckets(prev => ({
      ...prev,
      [bucketKey]: !prev[bucketKey]
    }));

    // Notify parent of invite section expansion state
    if (onInviteExpansion) {
      const inviteKey = bucketKey === 'appFriends' ? 'appFriends' : 'inviteText';
      onInviteExpansion(inviteKey, willBeExpanded);
    }

    // If bucket is being expanded (not collapsed), trigger scroll
    if (willBeExpanded && onBucketExpand) {
      // Reduced delay for faster response
      setTimeout(() => {
        onBucketExpand(bucketKey);
      }, 50);
    }
  };

  const handleSelection = (friendId) => {
    const isCurrentlySelected = selectedHostIds.includes(friendId);
    let newSelectedIds;
    
    if (isCurrentlySelected) {
      // Remove from selection
      newSelectedIds = selectedHostIds.filter(id => id !== friendId);
    } else {
      // Add to selection (if not at max)
      if (selectedHostIds.length < maxHosts) {
        newSelectedIds = [...selectedHostIds, friendId];
      } else {
        return; // Max reached, don't select
      }
    }
    
    onSelectionChange(newSelectedIds);
  };


  return (
    <View style={styles.container}>
      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <VibeButton
          label="App Friends"
          variant="toggle"
          color="blue"
          onPress={() => setActiveTab('app')}
          style={[
            styles.toggleButton,
            activeTab === 'app' && styles.activeToggleButton
          ]}
        />
        <VibeButton
          label="Phone Contacts"
          variant="toggle"
          color="blue"
          onPress={() => setActiveTab('phone')}
          style={[
            styles.toggleButton,
            activeTab === 'phone' && styles.activeToggleButton
          ]}
        />
        <VibeButton
          label="Manual Add"
          variant="toggle"
          color="blue"
          onPress={() => setActiveTab('manual')}
          style={[
            styles.toggleButton,
            activeTab === 'manual' && styles.activeToggleButton
          ]}
        />
      </View>

      {/* Content based on active tab */}
      <View style={styles.contentContainer}>
        {activeTab === 'app' && (
          <FriendsList
            friends={mockFriends}
            selectedIds={selectedHostIds}
            onSelect={handleSelection}
            maxSelections={maxHosts}
            searchPlaceholder="Search app friends..."
            emptyMessage="No app friends yet"
          />
        )}

        {activeTab === 'phone' && (
          <InviteFriendsSelector
            event={event} // Can be null during creation
            context="host"
            maxInvites={5}
            onInvitesSent={(contacts, context) => {
              console.log(`Sent ${context} invites to:`, contacts);
            }}
            onBucketExpand={onBucketExpand}
            onSelectedContactsChange={onSelectedTextContactsChange}
          />
        )}

        {activeTab === 'manual' && (
          <View style={styles.manualAddContainer}>
            {/* Manual add functionality will go here */}
          </View>
        )}
      </View>
    </View>
  );
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    marginVertical: 0,
  },
  activeToggleButton: {
    // Additional styling for active state if needed
  },
  contentContainer: {
    flex: 1,
  },
  manualAddContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});