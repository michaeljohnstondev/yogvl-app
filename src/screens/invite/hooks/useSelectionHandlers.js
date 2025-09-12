import { hasReachedLimit, createManualContact } from '../utils/inviteScreenUtils';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

export const useSelectionHandlers = (
  maxLimit,
  type,
  isHostMode,
  localSelectedUsers,
  setLocalSelectedUsers,
  localSelectedContacts,
  setLocalSelectedContacts,
  localSelectedPhoneContacts,
  setLocalSelectedPhoneContacts
) => {
  const vibeAlert = useVibeAlert();
  const toggleUserSelection = (user) => {
    const isSelected = localSelectedUsers.some(u => u.id === user.id);
    let updated;
    
    if (isSelected) {
      updated = localSelectedUsers.filter(u => u.id !== user.id);
    } else {
      const totalSelected = localSelectedUsers.length + localSelectedContacts.length + localSelectedPhoneContacts.length;
      if (hasReachedLimit(totalSelected, maxLimit)) {
        vibeAlert.warning('Limit Reached', `You can only add up to ${maxLimit} ${type}.`);
        return;
      }
      updated = [...localSelectedUsers, user];
    }
    
    setLocalSelectedUsers(updated);
  };

  const togglePhoneContactSelection = (contact) => {
    const isSelected = localSelectedPhoneContacts.some(c => c.id === contact.id);
    let updated;
    
    if (isSelected) {
      updated = localSelectedPhoneContacts.filter(c => c.id !== contact.id);
    } else {
      const totalSelected = localSelectedUsers.length + localSelectedContacts.length + localSelectedPhoneContacts.length;
      if (hasReachedLimit(totalSelected, maxLimit)) {
        vibeAlert.warning('Limit Reached', `You can only add up to ${maxLimit} ${type}.`);
        return;
      }
      updated = [...localSelectedPhoneContacts, contact];
    }
    
    setLocalSelectedPhoneContacts(updated);
  };

  const handleAddContact = (contactName, contactEmail, contactPhone, personalMessage, clearManualForm) => {
    if (!contactName.trim()) {
      vibeAlert.error('Error', 'Please enter a name');
      return;
    }

    if (!contactEmail.trim() && !contactPhone.trim()) {
      vibeAlert.error('Error', 'Please enter either an email or phone number');
      return;
    }

    const totalSelected = localSelectedUsers.length + localSelectedContacts.length + localSelectedPhoneContacts.length;
    if (hasReachedLimit(totalSelected, maxLimit)) {
      vibeAlert.warning('Limit Reached', `You can only add up to ${maxLimit} ${type}.`);
      return;
    }

    const contact = createManualContact(contactName, contactEmail, contactPhone, personalMessage, isHostMode);
    const updated = [...localSelectedContacts, contact];
    setLocalSelectedContacts(updated);

    clearManualForm();

    const entity = isHostMode ? 'co-host' : 'guest';
    vibeAlert.success('Success', `${contact.name} added as ${entity}`);
  };

  const removeUser = (userId) => {
    setLocalSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const removeContact = (contactId) => {
    setLocalSelectedContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const removePhoneContact = (contactId) => {
    setLocalSelectedPhoneContacts(prev => prev.filter(c => c.id !== contactId));
  };

  return {
    toggleUserSelection,
    togglePhoneContactSelection,
    handleAddContact,
    removeUser,
    removeContact,
    removePhoneContact,
  };
};