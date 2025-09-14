import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
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

  // Event subscribers (to filter out from app users)
  const [eventSubscribers, setEventSubscribers] = useState([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Pending invitations (to filter out from app users)
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  // Load contacts when phone tab is selected
  useEffect(() => {
    if (activeTab === TABS.PHONE && !contactsLoaded && !loadingContacts) {
      loadDeviceContacts();
    }
  }, [activeTab]);

  // Load app users on component mount and when subscribers/invitations change
  useEffect(() => {
    loadAppUsers();
  }, [currentUserId, userData, eventSubscribers, pendingInvitations]);

  // Load event subscribers and pending invitations when eventId and studioId are provided
  useEffect(() => {
    if (eventId && studioId) {
      loadEventSubscribers();
      loadPendingInvitations();
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
        console.log(
          `[InviteScreen] Found ${subscribers.length} existing subscribers for event ${eventId}`
        );
      } else {
        console.log(
          `[InviteScreen] Event ${eventId} not found in studio ${studioId}`
        );
        setEventSubscribers([]);
      }
    } catch (error) {
      console.error('[InviteScreen] Failed to load event subscribers:', error);
      setEventSubscribers([]);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const loadPendingInvitations = async () => {
    if (!eventId) {
      return;
    }

    try {
      setLoadingInvitations(true);

      // Query for pending invitations to this event
      const invitationsRef = collection(db, 'invitations');
      const q = query(
        invitationsRef,
        where('eventId', '==', eventId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      const invitedUserIds = [];

      querySnapshot.forEach((doc) => {
        const invitation = doc.data();
        if (invitation.guestId) {
          invitedUserIds.push(invitation.guestId);
        }
      });

      setPendingInvitations(invitedUserIds);
      console.log(
        `[InviteScreen] Found ${invitedUserIds.length} pending invitations for event ${eventId}`
      );
    } catch (error) {
      console.error(
        '[InviteScreen] Failed to load pending invitations:',
        error
      );
      setPendingInvitations([]);
    } finally {
      setLoadingInvitations(false);
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

      // Filter out users who are already subscribed to the event or have pending invitations
      let filteredUsers = allUsers;
      if (eventId) {
        const excludedUserIds = [...eventSubscribers, ...pendingInvitations];
        if (excludedUserIds.length > 0) {
          filteredUsers = allUsers.filter(
            (user) => !excludedUserIds.includes(user.id)
          );
          const subscribedCount = eventSubscribers.length;
          const invitedCount = pendingInvitations.length;
          console.log(
            `[InviteScreen] Filtered out ${subscribedCount} subscribed users and ${invitedCount} pending invitations`
          );
        }
      }

      setAppUsers(filteredUsers);
      console.log(
        `[InviteScreen] Loaded ${filteredUsers.length} available users (${allUsers.length} total)`
      );
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
    // App users
    appUsers,
    loadingAppUsers,
    loadAppUsers,
    updateUserStatus,

    // Event subscribers
    eventSubscribers,
    loadingSubscribers,
    loadEventSubscribers,

    // Pending invitations
    pendingInvitations,
    loadingInvitations,
    loadPendingInvitations,

    // Phone contacts
    phoneContacts,
    loadingContacts,
    contactsLoaded,
    loadDeviceContacts,
  };
};
