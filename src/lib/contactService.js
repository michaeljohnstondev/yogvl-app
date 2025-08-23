// FILE: lib/contactService.js - Device Contact Access Service

import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';

/**
 * Request permission to access device contacts
 */
export const requestContactPermission = async () => {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting contact permission:', error);
    return false;
  }
};

/**
 * Get all contacts from device
 */
export const getDeviceContacts = async () => {
  try {
    // Check if we have permission
    const { status } = await Contacts.getPermissionsAsync();
    
    if (status !== 'granted') {
      const permissionGranted = await requestContactPermission();
      if (!permissionGranted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your contacts to invite people from your phone.',
          [{ text: 'OK' }]
        );
        return [];
      }
    }

    // Fetch contacts with specific fields
    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.MiddleName,
      ],
      sort: Contacts.SortTypes.FirstName,
    });

    // Transform contacts to our format
    const transformedContacts = data
      .filter(contact => {
        // Only include contacts with at least a name and a phone number or email
        const hasName = contact.name || contact.firstName || contact.lastName;
        const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
        const hasEmail = contact.emails && contact.emails.length > 0;
        return hasName && (hasPhone || hasEmail);
      })
      .map(contact => {
        // Get the best name available
        let displayName = contact.name;
        if (!displayName && (contact.firstName || contact.lastName)) {
          displayName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        }
        if (!displayName) {
          displayName = 'Unknown Contact';
        }

        // Get primary phone number
        const primaryPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0
          ? contact.phoneNumbers[0].number
          : null;

        // Get primary email
        const primaryEmail = contact.emails && contact.emails.length > 0
          ? contact.emails[0].email
          : null;

        return {
          id: `contact_${contact.id}`,
          name: displayName,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: primaryPhone,
          email: primaryEmail,
          avatar: getContactAvatar(displayName),
          originalContact: contact, // Keep reference to original contact
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort by name

    return transformedContacts;
  } catch (error) {
    console.error('Error fetching device contacts:', error);
    Alert.alert(
      'Error',
      'Failed to load contacts from your device. Please try again.',
      [{ text: 'OK' }]
    );
    return [];
  }
};

/**
 * Get a simple avatar emoji based on contact name
 */
const getContactAvatar = (name) => {
  if (!name) return '👤';
  
  const lowerName = name.toLowerCase();
  
  // Family relations
  if (lowerName.includes('mom') || lowerName.includes('mother') || lowerName.includes('mama')) return '👩';
  if (lowerName.includes('dad') || lowerName.includes('father') || lowerName.includes('papa')) return '👨';
  if (lowerName.includes('brother') || lowerName.includes('bro')) return '👨';
  if (lowerName.includes('sister') || lowerName.includes('sis')) return '👩';
  if (lowerName.includes('wife') || lowerName.includes('husband')) return '💑';
  
  // Professional titles
  if (lowerName.includes('dr.') || lowerName.includes('doctor')) return '👨‍⚕️';
  if (lowerName.includes('prof') || lowerName.includes('teacher')) return '👨‍🏫';
  if (lowerName.includes('boss') || lowerName.includes('manager')) return '👨‍💼';
  if (lowerName.includes('lawyer') || lowerName.includes('attorney')) return '👨‍⚖️';
  if (lowerName.includes('mechanic') || lowerName.includes('repair')) return '👨‍🔧';
  
  // Default based on first letter
  const firstLetter = name.charAt(0).toLowerCase();
  const avatars = ['👤', '👨', '👩', '🙂', '😊'];
  const index = firstLetter.charCodeAt(0) % avatars.length;
  return avatars[index];
};

/**
 * Check if contacts permission is granted
 */
export const hasContactPermission = async () => {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking contact permission:', error);
    return false;
  }
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format US phone numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Return original if can't format
  return phoneNumber;
};