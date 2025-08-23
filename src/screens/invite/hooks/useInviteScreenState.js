import { useState, useEffect } from 'react';
import { TABS } from '../utils/inviteScreenConstants';

export const useInviteScreenState = (selectedUsers, selectedContacts, selectedPhoneContacts) => {
  const [activeTab, setActiveTab] = useState(TABS.APP);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');

  // Filter toggles
  const [showFavorites, setShowFavorites] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showLocalNode, setShowLocalNode] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState([]);

  // Group states
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Local selections
  const [localSelectedUsers, setLocalSelectedUsers] = useState(selectedUsers);
  const [localSelectedContacts, setLocalSelectedContacts] = useState(selectedContacts);
  const [localSelectedPhoneContacts, setLocalSelectedPhoneContacts] = useState(selectedPhoneContacts);

  const clearManualForm = () => {
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setPersonalMessage('');
  };

  const resetGroupModal = () => {
    setNewGroupName('');
    setShowCreateGroupModal(false);
  };

  return {
    // Tab state
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    
    // Manual form state
    contactName,
    setContactName,
    contactEmail,
    setContactEmail,
    contactPhone,
    setContactPhone,
    personalMessage,
    setPersonalMessage,
    clearManualForm,
    
    // Filter states
    showFavorites,
    setShowFavorites,
    showFriends,
    setShowFriends,
    showLocalNode,
    setShowLocalNode,
    selectedInterests,
    setSelectedInterests,
    
    // Group states
    selectedGroup,
    setSelectedGroup,
    showGroupModal,
    setShowGroupModal,
    showCreateGroupModal,
    setShowCreateGroupModal,
    newGroupName,
    setNewGroupName,
    resetGroupModal,
    
    // Selection states
    localSelectedUsers,
    setLocalSelectedUsers,
    localSelectedContacts,
    setLocalSelectedContacts,
    localSelectedPhoneContacts,
    setLocalSelectedPhoneContacts,
  };
};