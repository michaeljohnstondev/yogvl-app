// FILE: components/CreateEventForm.js

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Components
import VibeButton from '../../components/ui/VibeButton';
import VibeButtonPlain from '../../components/ui/VibeButtonPlain';
import VibeSeparator from '../../components/ui/VibeSeparator';
import VibeInput from '../../components/ui/VibeInput';
import VibeDropdown from '../../components/ui/VibeDropdown';
import ReliabilityWarning from './attendees/ReliabilityWarning';
import {
  TemplateSelectionModal,
  SaveTemplateModal,
} from '../templates/TemplateModals';

// Sections
import { What } from './what/What';
import { When } from './when/When';
import { Where } from './where/Where';
import { Who } from './who/Who';
import { Details } from './details/Details';
import { AdditionalSettings } from './additionalSettings/AdditionalSettings';
import GuestListViewer from './guests/GuestListViewer';
import NotificationButton from './notificationSettings/NotificationButton';
// NotificationSettings is now a screen, not a component

// Theme
import theme from '../../theme/themes';

export default function CreateEventForm({
  // Data
  formData,
  userData,
  isLoading,
  templatesLoading,
  isCreating,
  showTemplateModal,
  showSaveTemplate,
  templates,
  templateName,
  vibeAlert,

  // Handlers
  onInputChange,
  onInputFocus,
  onSuggestionSelect,
  hideSuggestions,
  getFieldData,
  updateField,
  updateInputHeight,
  togglePrivacy,
  toggleRsvpDeadline,
  toggleHostContact,
  toggleFee,

  // Actions
  onShowTemplateModal,
  onCloseTemplateModal,
  onShowSaveTemplate,
  onHideSaveTemplateModal,
  onApplyTemplate,
  onDeleteTemplate,
  onSaveAsTemplate,
  setTemplateName,
  onCreate,

  // DateTime
  PickerRow,
  DateTimePickerModals,
  dateTimeValues,

  // Invitation tracking
  onSelectedTextContactsChange,
  onGuestInvitationChange,
  onCohostInvitationChange,
  // Current invitation counts for UI display
  selectedGuestCount,
  selectedCohostCount,

  // Edit mode
  isEditMode = false,
  // Current attendees/cohosts (for edit mode display)
  currentAttendees = [],
  currentCohosts = [],
}) {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const sectionRefs = useRef({});
  const fieldRefs = useRef({}); // Individual field references
  const currentFocusedField = useRef(null); // Track currently focused field
  const fieldHeights = useRef({}); // Track field heights for growth detection

  // Refs to control section expansion
  const whoSectionRef = useRef(null);
  const detailsSectionRef = useRef(null);
  const additionalSectionRef = useRef(null);
  const inviteSectionsRef = useRef(null); // For invite sections (both app and text)

  // Track expansion state of sections for dynamic scrolling
  const [expandedSections, setExpandedSections] = useState({
    who: false, // Guest settings
    details: false, // Additional details
    additional: false, // Additional settings
    appFriends: false, // Invite via App
    inviteText: false, // Invite via Text
  });

  // Track selected text contacts for guest list display
  const [selectedTextContacts, setSelectedTextContacts] = useState([]);
  const [shouldReopenGuestList, setShouldReopenGuestList] = useState(false);
  const guestListTriggerRef = useRef(null);

  // Notification settings - now uses navigation instead of modal

  // Handle reopening guest list modal after returning from InviteScreen
  useEffect(() => {
    if (shouldReopenGuestList && guestListTriggerRef.current) {
      // Small delay to ensure the screen transition is complete
      const timer = setTimeout(() => {
        guestListTriggerRef.current.reopenModal?.();
        setShouldReopenGuestList(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldReopenGuestList]);

  // Handle text contacts change
  const handleTextContactsChange = useCallback(
    (contacts) => {
      setSelectedTextContacts(contacts);
      onSelectedTextContactsChange && onSelectedTextContactsChange(contacts);
    },
    [onSelectedTextContactsChange]
  );

  // Notification settings handlers
  const handleManageNotifications = useCallback(() => {
    navigation.navigate('EventNotificationSettings', {
      notificationSettings: formData.notificationSettings,
      userDefaults: userData?.userdata?.settings?.notifications,
      currentUserId: userData?.uid,
      eventDateTime: dateTimeValues?.event?.value,
      onUpdateSettings: updateField,
      userContext: 'hosting', // User is hosting this event
    });
  }, [navigation, formData.notificationSettings, userData, dateTimeValues, updateField]);

  // Navigation handlers for beautiful InviteScreen
  const openGuestInvitations = () => {
    navigation.navigate('Invite', {
      type: 'guests',
      selectedUsers: formData.invitedUsers || [],
      selectedContacts: formData.invitedContacts || [],
      selectedPhoneContacts: formData.invitedPhoneContacts || [],
      maxLimit: null,
      eventTitle: formData.title,
      onSave: ({ users, contacts, phoneContacts }, options = {}) => {
        // Check if this is a cancel operation - don't save anything, just reopen modal
        if (options.cancel) {
          if (options.reopenGuestList) {
            setShouldReopenGuestList(true);
          }
          return;
        }

        // When adding guests, don't remove anyone from host lists
        // Hosts have higher priority than guests
        const guestUserIds = users.map(u => u.id);
        const guestContactIds = [...contacts, ...phoneContacts].map(c => c.id);
        
        // Filter out guests who are already hosts (hosts take priority)
        const existingHostUserIds = (formData.additionalHostUsers || []).map(u => u.id);
        const existingHostContactIds = [
          ...(formData.additionalHostContacts || []),
          ...(formData.additionalHostPhoneContacts || [])
        ].map(c => c.id);
        
        const filteredGuestUsers = users.filter(u => !existingHostUserIds.includes(u.id));
        const filteredGuestContacts = contacts.filter(c => !existingHostContactIds.includes(c.id));
        const filteredGuestPhoneContacts = phoneContacts.filter(c => !existingHostContactIds.includes(c.id));
        
        // Update guest fields (only non-hosts)
        updateField('invitedUsers', filteredGuestUsers);
        updateField('invitedContacts', filteredGuestContacts);
        updateField('invitedPhoneContacts', filteredGuestPhoneContacts);
        
        // Host fields remain unchanged
        
        // Update text contacts for guest list display
        const allTextContacts = [...filteredGuestContacts, ...filteredGuestPhoneContacts];
        handleTextContactsChange(allTextContacts);

        // Call the guest invitation change callback
        if (onGuestInvitationChange) {
          onGuestInvitationChange({
            users: filteredGuestUsers,
            contacts: filteredGuestContacts,
            phoneContacts: filteredGuestPhoneContacts,
          });
        }

        // Check if we should reopen the guest list modal
        if (options.reopenGuestList) {
          setShouldReopenGuestList(true);
        }
      },
    });
  };

  const openHostInvitations = () => {
    navigation.navigate('Invite', {
      type: 'hosts',
      selectedUsers: formData.additionalHostUsers || [],
      selectedContacts: formData.additionalHostContacts || [],
      selectedPhoneContacts: formData.additionalHostPhoneContacts || [],
      maxLimit: 10,
      eventTitle: formData.title,
      onSave: ({ users, contacts, phoneContacts }, options = {}) => {
        // Check if this is a cancel operation - don't save anything, just reopen modal
        if (options.cancel) {
          if (options.reopenGuestList) {
            setShouldReopenGuestList(true);
          }
          return;
        }

        // Remove any selected hosts from guest lists to prevent duplicates
        const hostUserIds = users.map(u => u.id);
        const hostContactIds = [...contacts, ...phoneContacts].map(c => c.id);
        
        const filteredGuestUsers = (formData.invitedUsers || []).filter(u => !hostUserIds.includes(u.id));
        const filteredGuestContacts = (formData.invitedContacts || []).filter(c => !hostContactIds.includes(c.id));
        const filteredGuestPhoneContacts = (formData.invitedPhoneContacts || []).filter(c => !hostContactIds.includes(c.id));
        
        // Update host fields
        updateField('additionalHostUsers', users);
        updateField('additionalHostContacts', contacts);
        updateField('additionalHostPhoneContacts', phoneContacts);
        
        // Update guest fields (removing duplicates)
        updateField('invitedUsers', filteredGuestUsers);
        updateField('invitedContacts', filteredGuestContacts);
        updateField('invitedPhoneContacts', filteredGuestPhoneContacts);
        
        // Update text contacts for guest list display (removing hosts from text contacts)
        const allTextContacts = [...filteredGuestContacts, ...filteredGuestPhoneContacts];
        handleTextContactsChange(allTextContacts);

        // Call the co-host invitation change callback
        if (onCohostInvitationChange) {
          onCohostInvitationChange({
            users: users,
            contacts: contacts,
            phoneContacts: phoneContacts,
          });
        }

        // Update guest invitation callback as well (since guest lists were filtered)
        if (onGuestInvitationChange) {
          onGuestInvitationChange({
            users: filteredGuestUsers,
            contacts: filteredGuestContacts,
            phoneContacts: filteredGuestPhoneContacts,
          });
        }

        // Check if we should reopen the guest list modal
        if (options.reopenGuestList) {
          setShouldReopenGuestList(true);
        }
      },
    });
  };

  // Handle back button - close expanded sections before navigating back
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {

        // Check if any sections are expanded
        const hasExpandedSections = Object.values(expandedSections).some(
          (isExpanded) => isExpanded
        );

        if (hasExpandedSections) {
          // Close all expanded sections by calling their close methods
          if (whoSectionRef.current?.closeSection) {
            whoSectionRef.current.closeSection();
          }
          if (detailsSectionRef.current?.closeSection) {
            detailsSectionRef.current.closeSection();
          }
          if (additionalSectionRef.current?.closeSection) {
            additionalSectionRef.current.closeSection();
          }
          if (inviteSectionsRef.current?.closeAllInviteSections) {
            inviteSectionsRef.current.closeAllInviteSections();
          }

          // After closing sections, focus first empty required field
          focusFirstEmptyRequiredFieldOnBack();

          return true; // Prevent default back navigation
        }

        return false; // Allow normal back navigation
      }
    );

    return () => backHandler.remove();
  }, [
    expandedSections.who,
    expandedSections.details,
    expandedSections.additional,
    expandedSections.appFriends,
    expandedSections.inviteText,
  ]);

  // Enhanced input focus handler
  const handleInputFocus = (fieldName, scrollOptions, ...args) => {
    // Track the currently focused field
    currentFocusedField.current = fieldName;

    // Only close invite sections for actual input fields, not buttons
    const inputFields = [
      'title',
      'location',
      'address',
      'maxGuests',
      'details',
      'rsvpDeadline',
      'entryFee',
    ];
    if (
      inputFields.includes(fieldName) &&
      inviteSectionsRef.current?.closeAllInviteSections
    ) {
      inviteSectionsRef.current.closeAllInviteSections();
    }

    // If scrollOptions is not an object, it's probably part of the original args
    let actualScrollOptions = undefined;
    let actualArgs = args;

    if (
      scrollOptions &&
      typeof scrollOptions === 'object' &&
      scrollOptions.targetPosition
    ) {
      actualScrollOptions = scrollOptions;
    } else {
      // scrollOptions is actually part of the original args
      actualArgs = [scrollOptions, ...args];
      actualScrollOptions = undefined;
    }

    // Call the original focus handler
    onInputFocus(fieldName, ...actualArgs);

    // Scroll to the section containing this input, using provided options
    scrollToSection(fieldName, actualScrollOptions);
  };

  // Helper function to infer section from field name patterns
  const inferSectionFromFieldName = (fieldName) => {
    // Pattern-based section inference for new fields
    const patterns = [
      { section: 'what', patterns: ['title', 'name', 'event'] },
      { section: 'where', patterns: ['location', 'address', 'venue', 'place'] },
      {
        section: 'who',
        patterns: ['guest', 'host', 'private', 'public', 'invite'],
      },
      {
        section: 'details',
        patterns: [
          'detail',
          'description',
          'info',
          'bring',
          'provided',
          'parking',
          'dress',
          'age',
          'requirement',
        ],
      },
      {
        section: 'additional',
        patterns: ['contact', 'fee', 'rsvp', 'deadline', 'setting'],
      },
    ];

    const lowerFieldName = fieldName.toLowerCase();
    for (const { section, patterns } of patterns) {
      if (patterns.some((pattern) => lowerFieldName.includes(pattern))) {
        return section;
      }
    }

    return 'details'; // Default fallback section
  };

  // Manual scroll distances - we'll hardcode these based on testing
  const getManualScrollDistance = (fieldName) => {
    // Define exact scroll distances for each field based on section states
    const scrollDistances = {
      // What section
      title: {
        whoOpen: false,
        detailsOpen: false,
        additionalOpen: false,
        distance: 0, // Perfect as is - no scroll needed
      },

      // Where section
      location: {
        whoOpen: false,
        detailsOpen: false,
        additionalOpen: false,
        distance: 0, // Perfect as is - no scroll needed
      },
      address: {
        whoOpen: false,
        detailsOpen: false,
        additionalOpen: false,
        distance: 120, // Scroll up 120px more
      },

      // Who section (only when expanded)
      who: {
        whoOpen: false,
        detailsOpen: false,
        additionalOpen: false,
        distance: 10, // Perfect scroll for "Add Guest Settings" button
      },
      maxGuests: {
        whoOpen: true,
        detailsOpen: false,
        additionalOpen: false,
        distance: 120, // Moderate scroll for max guests field
      },
      appFriends: {
        whoOpen: true,
        detailsOpen: false,
        additionalOpen: false,
        distance: 110, // Scroll down 110px when App Friends expands
      },
      phoneContacts: {
        whoOpen: true,
        detailsOpen: false,
        additionalOpen: false,
        distance: 150, // Scroll down 150px when Invite via Text expands
      },
      inviteText: {
        whoOpen: true,
        detailsOpen: false,
        additionalOpen: false,
        distance: 220, // Scroll down 220px when Invite via Text expands
      },

      // Details section (only when expanded)
      details: {
        whoOpen: false,
        detailsOpen: true,
        additionalOpen: false,
        distance: 0, // Single consolidated details field
      },

      // Additional section (only when expanded)
      rsvpDeadline: {
        whoOpen: false,
        detailsOpen: false,
        additionalOpen: true,
        distance: 0, // TODO: Test and set exact distance
      },
      entryFee: {
        whoOpen: false,
        detailsOpen: false,
        additionalOpen: true,
        distance: 0, // TODO: Test and set exact distance
      },

      // Section expansions
      detailsSection: {
        whoOpen: false,
        detailsOpen: false,
        additionalOpen: false,
        distance: 0, // TODO: Test and set exact distance
      },
      additionalSection: {
        whoOpen: false,
        detailsOpen: false,
        additionalOpen: false,
        distance: 0, // TODO: Test and set exact distance
      },
    };

    const fieldConfig = scrollDistances[fieldName];
    if (!fieldConfig) {
      return 100; // Default fallback
    }

    // TODO: After testing, we'll add multiple configurations per field based on section states
    // For now, just return the base distance
    const distance = fieldConfig.distance;
    return distance;
  };

  // Calculate dynamic offset based on manual testing
  const calculateDynamicOffset = (targetSection, fieldName) => {
    return getManualScrollDistance(fieldName);
  };

  // Handlers to update section expansion state
  const handleSectionExpansion = useCallback((sectionKey, isExpanded) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: isExpanded,
    }));
  }, []);

  // Handler for invite section expansions
  const handleInviteExpansion = useCallback((sectionKey, isExpanded) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: isExpanded,
    }));
  }, []);

  // Find and focus the first empty required field (only for back button)
  const focusFirstEmptyRequiredFieldOnBack = () => {
    const requiredFields = [
      { name: 'title', value: formData.title },
      { name: 'location', value: formData.location },
      // Add other required fields as needed
    ];

    // Find the first empty required field
    const emptyField = requiredFields.find(
      (field) => !field.value || field.value.trim() === ''
    );

    if (emptyField) {
      // Check if field is at the top of the form (always visible)
      const topFields = ['title', 'location'];
      if (topFields.includes(emptyField.name)) {
        // Scroll to top immediately - no delay
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        // Field might be hidden, scroll to it
        setTimeout(() => {
          scrollToSection(emptyField.name);
        }, 300);
      }
    }
  };

  // Dynamic scroll using manual distances (temporarily bypassing measureLayout)
  const scrollToField = (fieldName, options = {}) => {
    // Force use of manual scroll distances for testing
    scrollToSectionFallback(fieldName);
  };

  // Fallback section-based scrolling (improved version of old method)
  const scrollToSectionFallback = (fieldName) => {
    const sectionMap = {
      title: 'what',
      location: 'where',
      address: 'where',
      who: 'who',
      maxGuests: 'who',
      appFriends: 'who',
      phoneContacts: 'who',
      inviteText: 'who',
      details: 'details',
      detailsSection: 'details', // For scrolling to section, not field
      rsvpDeadline: 'additional',
      contactInfo: 'additional',
      entryFee: 'additional',
      additionalSection: 'additional', // For scrolling to section, not field
    };

    const sectionKey = sectionMap[fieldName] || fieldName;

    if (sectionKey && sectionRefs.current[sectionKey]) {
      const offset = calculateDynamicOffset(sectionKey, fieldName);

      sectionRefs.current[sectionKey].measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y + offset,
            animated: true,
          });
        },
        () => {}
      );
    }
  };

  // Main scroll function (use field-level if available, fallback to section)
  const scrollToSection = (fieldName, options) => {
    scrollToField(fieldName, options);
  };

  const setSectionRef = (sectionKey) => (ref) => {
    sectionRefs.current[sectionKey] = ref;
  };

  // Helper to set individual field refs
  const setFieldRef = (fieldName) => (ref) => {
    fieldRefs.current[fieldName] = ref;
  };

  // Enhanced input height handler that accounts for growth
  const handleInputHeight = (fieldName, height) => {
    const previousHeight = fieldHeights.current[fieldName] || 0;
    fieldHeights.current[fieldName] = height;

    // Call the original height handler
    if (updateInputHeight) {
      updateInputHeight(fieldName, height);
    }

    // If this field is currently focused and has grown significantly, re-scroll
    // Skip auto-scroll for maxGuests to avoid keyboard conflicts
    if (
      currentFocusedField.current === fieldName &&
      height > previousHeight + 20 &&
      fieldName !== 'maxGuests'
    ) {
      // Delay to allow layout to settle
      setTimeout(() => {
        scrollToSection(fieldName, {
          targetPosition: 'visible',
          animated: true,
        });
      }, 100);
    }
  };

  // Handle input blur to clear focused field tracking
  const handleInputBlur = (fieldName, originalBlurHandler) => {
    if (currentFocusedField.current === fieldName) {
      currentFocusedField.current = null;
    }
    if (originalBlurHandler) {
      originalBlurHandler();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{isEditMode ? 'Edit Event' : 'Create Event'}</Text>
            <Pressable
              style={styles.useTemplateButton}
              onPress={onShowTemplateModal}
            >
              <Text style={styles.useTemplateButtonText}>📋</Text>
            </Pressable>
          </View>

          <ReliabilityWarning userData={userData} context="create" />

          {(isLoading || templatesLoading) && (
            <Text style={styles.loadingText}>Loading...</Text>
          )}

          {/* WHAT SECTION */}
          <View ref={setSectionRef('what')} style={styles.sectionContainer}>
            <What
              formData={formData}
              onInputChange={onInputChange}
              onInputFocus={handleInputFocus}
              onSuggestionSelect={onSuggestionSelect}
              hideSuggestions={hideSuggestions}
              getFieldData={getFieldData}
              updateField={updateField}
              togglePrivacy={togglePrivacy}
              styles={styles}
              setFieldRef={setFieldRef}
            />
          </View>

          {/* WHEN SECTION */}
          <View ref={setSectionRef('when')} style={styles.sectionContainer}>
            <When
              PickerRow={PickerRow}
              styles={styles}
              dateTimeValues={dateTimeValues}
            />
          </View>

          {/* WHERE SECTION */}
          <View ref={setSectionRef('where')} style={styles.sectionContainer}>
            <Where
              formData={formData}
              onInputChange={onInputChange}
              onInputFocus={handleInputFocus}
              hideSuggestions={hideSuggestions}
              getFieldData={getFieldData}
              updateField={updateField}
              styles={styles}
              setFieldRef={setFieldRef}
            />
          </View>


          {/* WHO SECTION */}
          <View ref={setSectionRef('who')} style={styles.sectionContainer}>
            <Who
              ref={whoSectionRef}
              formData={formData}
              updateField={updateField}
              styles={styles}
              setFieldRef={setFieldRef}
              PickerRow={PickerRow}
              handleInputFocus={handleInputFocus}
              userData={userData}
              selectedTextContacts={selectedTextContacts}
              selectedGuestCount={selectedGuestCount}
              selectedCohostCount={selectedCohostCount}
              currentAttendees={currentAttendees}
              currentCohosts={currentCohosts}
              openGuestInvitations={openGuestInvitations}
              openHostInvitations={openHostInvitations}
              guestListTriggerRef={guestListTriggerRef}
            />
          </View>

          {/* DETAILS SECTION */}
          <View ref={setSectionRef('details')} style={styles.sectionContainer}>
            <Details
              ref={detailsSectionRef}
              formData={formData}
              onInputChange={onInputChange}
              onInputFocus={handleInputFocus}
              onSuggestionSelect={onSuggestionSelect}
              hideSuggestions={hideSuggestions}
              getFieldData={getFieldData}
              updateField={updateField}
              updateInputHeight={handleInputHeight}
              styles={styles}
              onExpansionChange={(isExpanded) =>
                handleSectionExpansion('details', isExpanded)
              }
              setFieldRef={setFieldRef}
            />
          </View>

          {/* ADDITIONAL SETTINGS SECTION */}
          <View
            ref={setSectionRef('additional')}
            style={styles.sectionContainer}
          >
            <AdditionalSettings
              ref={additionalSectionRef}
              formData={formData}
              toggleHostContact={toggleHostContact}
              toggleFee={toggleFee}
              updateField={updateField}
              styles={styles}
              onExpansionChange={(isExpanded) =>
                handleSectionExpansion('additional', isExpanded)
              }
              onInputFocus={handleInputFocus}
              setFieldRef={setFieldRef}
            />
          </View>
          {/* Notification Settings */}
          <NotificationButton onPress={handleManageNotifications} />

          {/* Separator */}
          <VibeSeparator />

          {/* Save Template Button */}
          <VibeButton
            label="SAVE AS TEMPLATE"
            onPress={onShowSaveTemplate}
            style={styles.saveTemplateButton}
          />

          {/* Create Button */}
          <VibeButton
            label={
              isCreating 
                ? (isEditMode ? 'UPDATING...' : 'CREATING...') 
                : (isEditMode ? 'UPDATE EVENT' : 'CREATE EVENT')
            }
            onPress={onCreate}
            style={[styles.createButton, isCreating && styles.disabledButton]}
            disabled={isCreating}
          />

          <Text style={styles.helpText}>
            <Text style={styles.asterisk}>*</Text> Required fields{'\n'}
            You will be automatically subscribed to your event{'\n'}
          </Text>
        </ScrollView>

        {DateTimePickerModals}

        {/* Notification Settings - now handled via navigation */}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    marginBottom: 0,
  },
  useTemplateButton: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  useTemplateButtonText: {
    fontSize: 30,
    color: '#888888',
  },

  // Sections
  sectionContainer: {
    marginBottom: 0,
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border || 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 0,
    fontFamily: theme.fonts.main,
  },

  // Inputs
  label: {
    marginTop: 20,
    marginBottom: 5,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: theme.fonts.main,
  },
  asterisk: {
    color: theme.colors.vibePink,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 0,
  },

  // Buttons
  saveTemplateButton: {
    marginTop: 20,
    marginBottom: 5,
  },
  createButton: {
    marginTop: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue || '#00C6FF',
    alignItems: 'center',
  },
  toggleButtonText: {
    color: theme.colors.vibeBlue || '#00C6FF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },

  // Text
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
    fontFamily: theme.fonts.main,
  },
  helpText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    fontFamily: theme.fonts.main,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
    marginBottom: 10,
  },
  guestListViewer: {
    marginVertical: 8,
  },
});
