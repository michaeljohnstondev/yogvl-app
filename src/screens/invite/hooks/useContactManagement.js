import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { getDeviceContacts } from '../../../lib/contactService';
import { getStudioUsers } from '../../../services/userService';
import { TABS } from '../utils/inviteScreenConstants';
import { useVibeAlert } from '../../../components/ui/VibeAlertContext';

export const useContactManagement = (currentUserId, userData, activeTab, eventId = null, studioId = null) => {
  const vibeAlert = useVibeAlert();
  // Contact states
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // App users
  const [appUsers, setAppUsers] = useState([]);
  const [loadingAppUsers, setLoadingAppUsers] = useState(false);
  
  // Event subscribers (to filter out from app users)
  const [eventSubscribers, setEventSubscribers] = useState([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Load contacts when phone tab is selected
  useEffect(() => {
    if (activeTab === TABS.PHONE && !contactsLoaded && !loadingContacts) {
      loadDeviceContacts();
    }
  }, [activeTab]);

  // Load app users on component mount and when subscribers change
  useEffect(() => {
    loadAppUsers();
  }, [currentUserId, userData, eventSubscribers]);

  // Load event subscribers when eventId and studioId are provided
  useEffect(() => {
    if (eventId && studioId) {
      loadEventSubscribers();
    }
  }, [eventId, studioId]);

  const loadEventSubscribers = async () => {
    if (!eventId || !studioId) {
      return;
    }

    try {
      setLoadingSubscribers(true);
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        const subscribers = eventData.subscribers || [];
        setEventSubscribers(subscribers);
        console.log(`[InviteScreen] Found ${subscribers.length} existing subscribers for event ${eventId}`);
      } else {
        console.log(`[InviteScreen] Event ${eventId} not found in studio ${studioId}`);
        setEventSubscribers([]);
      }
    } catch (error) {
      console.error('[InviteScreen] Failed to load event subscribers:', error);
      setEventSubscribers([]);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const loadAppUsers = async () => {
    if (!currentUserId || !userData?.userdata?.studios?.default?.studioId) {
      console.log('[InviteScreen] Missing user data, skipping app users load');
      return;
    }

    try {
      setLoadingAppUsers(true);
      const userStudio = userData.userdata.studios.default.studioId;
      const allUsers = await getStudioUsers(currentUserId, userStudio);
      
      // Filter out users who are already subscribed to the event
      let filteredUsers = allUsers;
      if (eventId && eventSubscribers.length > 0) {
        filteredUsers = allUsers.filter(user => !eventSubscribers.includes(user.id));
        console.log(`[InviteScreen] Filtered out ${allUsers.length - filteredUsers.length} already subscribed users`);
      }
      
      setAppUsers(filteredUsers);
      console.log(`[InviteScreen] Loaded ${filteredUsers.length} available users (${allUsers.length} total)`);
    } catch (error) {
      console.error('[InviteScreen] Failed to load app users:', error);
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
      vibeAlert.error('Error', 'Failed to load your contacts. Please try again.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const updateUserStatus = (userId, statusUpdates) => {
    setAppUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { ...user, ...statusUpdates }
          : user
      )
    );
  };

  return {
    // App users
    appUsers,
    loadingAppUsers,
    loadAppUsers,
    updateUserStatus,
    
    // Event subscribers
    eventSubscribers,
    loadingSubscribers,
    loadEventSubscribers,
    
    // Phone contacts
    phoneContacts,
    loadingContacts,
    contactsLoaded,
    loadDeviceContacts,
  };
};