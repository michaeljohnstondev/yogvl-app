import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { getDeviceContacts } from '../../../lib/contactService';
import { getStudioUsers } from '../../../services/userService';
import { TABS } from '../utils/inviteScreenConstants';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

export const useContactManagement = (
  currentUserId,
  userData,
  activeTab,
  eventId = null,
  studioId = null
) => {
  const vibeAlert = useVibeAlert();
  // Contact states
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // App users
  const [appUsers, setAppUsers] = useState([]);
  const [loadingAppUsers, setLoadingAppUsers] = useState(false);

  // Combined loading state to prevent premature interactions
  const [dataReady, setDataReady] = useState(false);

  // Uses event-level arrays for O(1) filtering performance

  // Load contacts when phone tab is selected
  useEffect(() => {
    if (activeTab === TABS.PHONE && !contactsLoaded && !loadingContacts) {
      loadDeviceContacts();
    }
  }, [activeTab]);

  // Load app users with proper filtering and set data ready state
  useEffect(() => {
    const initializeData = async () => {
      setDataReady(false);
      await loadAppUsers();
      setDataReady(true);
    };

    initializeData();
  }, [currentUserId, userData, eventId, studioId]);

  const loadAppUsers = async () => {
    if (!currentUserId || !userData?.userdata?.studios?.default?.studioId) {
      console.log(
        '[useContactManagement] Missing user data, skipping app users load'
      );
      return;
    }

    try {
      setLoadingAppUsers(true);
      const userStudio = userData.userdata.studios.default.studioId;
      const allUsers = await getStudioUsers(currentUserId, userStudio);

      // Use simple array-based filtering for event contexts
      if (eventId && studioId) {
        try {
          // Get event data to access the new invitation arrays
          const eventRef = doc(db, 'studios', studioId, 'events', eventId);
          const eventDoc = await getDoc(eventRef);

          if (eventDoc.exists()) {
            const eventData = eventDoc.data();

            // Get arrays with fallbacks
            const subscribers = eventData.subscribers || [];
            const invitations = eventData.invitations || [];
            const cohosts = eventData.cohosts || [];
            const hostId = eventData.createdBy;

            // Use simple event-level array - invitations contains user IDs directly
            const invitedUserIds = invitations;

            // Create Sets for O(1) lookup performance
            const subscribedSet = new Set(subscribers);
            const invitedSet = new Set(invitedUserIds);
            const cohostSet = new Set(cohosts);

            // Simple filtering logic using arrays
            const filteredUsers = allUsers.filter((user) => {
              if (!user.id) return false;
              if (user.id === hostId) return false;
              if (cohostSet.has(user.id)) return false;
              if (subscribedSet.has(user.id)) return false;
              if (invitedSet.has(user.id)) return false;
              return true;
            });

            setAppUsers(filteredUsers);
          } else {
            console.warn(`[useContactManagement] Event not found: ${eventId}`);
            // If event doesn't exist, show all users as fallback
            setAppUsers(allUsers);
          }
        } catch (eventError) {
          console.error(
            '[useContactManagement] Failed to load event data for filtering:',
            eventError
          );
          // Fallback to showing all users if event data can't be loaded
          setAppUsers(allUsers);
        }
      } else {
        // For non-event contexts, use all users
        setAppUsers(allUsers);
      }
    } catch (error) {
      console.error('[useContactManagement] Failed to load app users:', error);
      vibeAlert.error('Error', 'Failed to load app users. Please try again.');
      setAppUsers([]);
    } finally {
      setLoadingAppUsers(false);
    }
  };

  const loadDeviceContacts = async () => {
    setLoadingContacts(true);
    try {
      const contacts = await getDeviceContacts();
      setPhoneContacts(contacts);
      setContactsLoaded(true);
    } catch (error) {
      console.error('Failed to load device contacts:', error);
      vibeAlert.error(
        'Error',
        'Failed to load your contacts. Please try again.'
      );
    } finally {
      setLoadingContacts(false);
    }
  };

  const updateUserStatus = (userId, statusUpdates) => {
    setAppUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, ...statusUpdates } : user
      )
    );
  };

  return {
    // App users with unified filtering
    appUsers,
    loadingAppUsers,
    loadAppUsers,
    updateUserStatus,

    // Combined data ready state to prevent premature interactions
    dataReady,

    // Phone contacts
    phoneContacts,
    loadingContacts,
    contactsLoaded,
    loadDeviceContacts,
  };
};
