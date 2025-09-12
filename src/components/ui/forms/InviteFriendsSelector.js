import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Linking, 
  Platform 
} from 'react-native';
import * as Contacts from 'expo-contacts';
import VibeButton from './VibeButton';
import FriendsBucket from './FriendsBucket';
import FriendsList from './FriendsList';
import { FormatDate } from '../../../lib/formatDate';
import theme from '../../../theme/themes';

export default function InviteFriendsSelector({ 
  event,
  context = 'host', // 'host' for co-hosting, 'attend' for event sharing
  maxInvites = 10,
  onInvitesSent,
  onBucketExpand, // Callback when bucket is expanded for scrolling
  onSelectedContactsChange // Callback when selected contacts change for event creation flow
}) {
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [hasContactsPermission, setHasContactsPermission] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState({});
  const [selectedContactIds, setSelectedContactIds] = useState([]); // Multi-select for batch texting

  // Notify parent when selected contacts change
  useEffect(() => {
    if (onSelectedContactsChange) {
      const selectedContacts = phoneContacts.filter(contact => 
        selectedContactIds.includes(contact.id)
      );
      onSelectedContactsChange(selectedContacts);
    }
  }, [selectedContactIds, phoneContacts, onSelectedContactsChange]);

  const loadPhoneContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        setHasContactsPermission(true);
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        // Filter contacts that have phone numbers and format them
        const formattedContacts = data
          .filter(contact => 
            contact.name && 
            contact.phoneNumbers && 
            contact.phoneNumbers.length > 0
          )
          .map(contact => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phoneNumbers[0].number,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setPhoneContacts(formattedContacts);
      } else {
        Alert.alert(
          'Permission Required',
          'Please allow access to contacts to invite friends via text message.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const toggleBucket = (bucketKey) => {
    const wasExpanded = expandedBuckets[bucketKey];
    
    // Open menu immediately for better UX
    setExpandedBuckets(prev => ({
      ...prev,
      [bucketKey]: !prev[bucketKey]
    }));

    // Load contacts asynchronously after menu opens
    if (bucketKey === 'phoneContacts' && !wasExpanded && phoneContacts.length === 0) {
      // Don't wait for contacts to load before opening menu
      setTimeout(() => {
        loadPhoneContacts();
      }, 50); // Small delay to let UI update first
    }

    // If bucket is being expanded (not collapsed), trigger scroll
    if (!wasExpanded && onBucketExpand) {
      // Reduced delay for faster response
      setTimeout(() => {
        onBucketExpand('inviteText');
      }, 50);
    }
  };

  const handleContactSelection = (contactId) => {
    const isCurrentlySelected = selectedContactIds.includes(contactId);
    
    if (isCurrentlySelected) {
      // Remove from selection
      setSelectedContactIds(prev => prev.filter(id => id !== contactId));
    } else if (selectedContactIds.length < maxInvites) {
      // Add to selection
      setSelectedContactIds(prev => [...prev, contactId]);
    }
  };


  const generateInviteMessage = () => {
    const appStoreUrl = 'https://apps.apple.com/app/your-app-name/id123456789';
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.yourapp.name';

    // Handle event creation (partial data) vs event detail (full data)
    const eventTitle = event?.title || 'my upcoming event';
    const eventLocation = event?.location || 'an awesome location';
    const eventDate = event?.utcDateTime || event?.date;
    
    const dateText = eventDate 
      ? FormatDate(eventDate, event?.eventTimeZone)
      : 'soon (details coming!)';

    if (context === 'host') {
      return `Hey! I'm hosting "${eventTitle}" and would love your help as a co-host! 

📅 When: ${dateText}
📍 Where: ${eventLocation}

Join as a co-host by downloading our app:
iPhone: ${appStoreUrl}
Android: ${playStoreUrl}

Let's make this event amazing together! 🎉`;
    } else {
      return `Hey! Thought you might be interested in this event: "${eventTitle}"

📅 When: ${dateText}
📍 Where: ${eventLocation}

📱 Download our app to check it out:
iPhone: ${appStoreUrl}
Android: ${playStoreUrl}

Let me know if you're going! 🎉`;
    }
  };


  return (
    <View style={styles.container}>
      <FriendsBucket
        title="Invite via Text"
        memberCount={phoneContacts.length}
        isExpanded={expandedBuckets.phoneContacts}
        onToggle={() => toggleBucket('phoneContacts')}
        showMemberCount={false}
      >
        {hasContactsPermission ? (
          <FriendsList
            friends={isLoadingContacts ? [] : phoneContacts}
            selectedIds={selectedContactIds}
            onSelect={handleContactSelection}
            maxSelections={maxInvites}
            searchPlaceholder="Search contacts..."
            emptyMessage={isLoadingContacts ? "Loading contacts..." : "No contacts with phone numbers found"}
            forceShowSearch={true} // Always show search bar
          />
        ) : (
          <Text style={styles.permissionText}>
            Grant contacts permission to invite friends via text message.
          </Text>
        )}
      </FriendsBucket>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 20,
  },
});