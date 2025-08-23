import { useState, useEffect } from 'react';
import { getDeviceContacts } from '../../../lib/contactService';
import { getStudioUsers } from '../../../services/userService';
import { TABS } from '../utils/inviteScreenConstants';
import { useVibeAlert } from '../../../components/ui/VibeAlertContext';

export const useContactManagement = (currentUserId, userData, activeTab) => {
  const vibeAlert = useVibeAlert();
  // Contact states
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // App users
  const [appUsers, setAppUsers] = useState([]);
  const [loadingAppUsers, setLoadingAppUsers] = useState(false);

  // Load contacts when phone tab is selected
  useEffect(() => {
    if (activeTab === TABS.PHONE && !contactsLoaded && !loadingContacts) {
      loadDeviceContacts();
    }
  }, [activeTab]);

  // Load app users on component mount
  useEffect(() => {
    loadAppUsers();
  }, [currentUserId, userData]);

  const loadAppUsers = async () => {
    if (!currentUserId || !userData?.userdata?.studios?.default?.studioId) {
      console.log('[InviteScreen] Missing user data, skipping app users load');
      return;
    }

    try {
      setLoadingAppUsers(true);
      const userStudio = userData.userdata.studios.default.studioId;
      const users = await getStudioUsers(currentUserId, userStudio);
      setAppUsers(users);
      console.log(`[InviteScreen] Loaded ${users.length} app users`);
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
    
    // Phone contacts
    phoneContacts,
    loadingContacts,
    contactsLoaded,
    loadDeviceContacts,
  };
};