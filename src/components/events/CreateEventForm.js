// FILE: components/CreateEventForm.js

import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';

// Components
import VibeButton from '../vibeComponents/VibeButton';
import VibeButtonPlain from '../vibeComponents/VibeButtonPlain';
import ReliabilityWarning from './attendees/ReliabilityWarning';
import EventTipsModal from './EventTipsModal';
import {
  TemplateSelectionModal,
  SaveTemplateModal,
} from './templates/TemplateModals';

// Sections
import { What } from './what/What';
import { When } from './when/When';
import { Where } from './where/Where';
import { Who } from './who/Who';
import { Details } from './details/Details';
import { AdditionalSettings } from './additionalSettings/AdditionalSettings';

// Theme
import theme from '../../themes/themes';

export default function CreateEventForm({
  // Data
  formData,
  userData,
  isLoading,
  templatesLoading,
  isCreating,
  showTips,
  showTemplateModal,
  showSaveTemplate,
  templates,
  templateName,

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
  onShowTipsManually,
  onCloseTips,
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
}) {
  const scrollViewRef = useRef(null);
  const sectionRefs = useRef({});

  // Enhanced input focus handler
  const handleInputFocus = (fieldName, ...args) => {
    // Call the original focus handler
    onInputFocus(fieldName, ...args);

    // Scroll to the section containing this input
    scrollToSection(fieldName);
  };

  const scrollToSection = (fieldName) => {
    const sectionMap = {
      // What section
      title: 'what',
      description: 'what',

      // Where section
      location: 'where',
      locationDetails: 'where',

      // Details section
      additionalInfo: 'details',
      requirements: 'details',
      tags: 'details',

      // Additional settings section
      contactInfo: 'additional',
      fee: 'additional',
    };

    const sectionKey = sectionMap[fieldName];
    if (sectionKey && sectionRefs.current[sectionKey]) {
      sectionRefs.current[sectionKey].measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current?.scrollTo({
            y: y - 20, // Add small offset from top
            animated: true,
          });
        },
        () => {} // Error callback
      );
    }
  };

  const setSectionRef = (sectionKey) => (ref) => {
    sectionRefs.current[sectionKey] = ref;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Event</Text>
          <Pressable style={styles.helpButton} onPress={onShowTipsManually}>
            <Text style={styles.helpButtonText}>💡</Text>
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
            togglePrivacy={togglePrivacy}
            styles={styles}
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
          />
        </View>

        {/* WHO SECTION */}
        <View ref={setSectionRef('who')} style={styles.sectionContainer}>
          <Who formData={formData} updateField={updateField} styles={styles} />
        </View>

        {/* DETAILS SECTION */}
        <View ref={setSectionRef('details')} style={styles.sectionContainer}>
          <Details
            formData={formData}
            onInputChange={onInputChange}
            onInputFocus={handleInputFocus}
            onSuggestionSelect={onSuggestionSelect}
            hideSuggestions={hideSuggestions}
            getFieldData={getFieldData}
            updateField={updateField}
            updateInputHeight={updateInputHeight}
            styles={styles}
          />
        </View>

        {/* ADDITIONAL SETTINGS SECTION */}
        <View ref={setSectionRef('additional')} style={styles.sectionContainer}>
          <AdditionalSettings
            formData={formData}
            PickerRow={PickerRow}
            toggleRsvpDeadline={toggleRsvpDeadline}
            toggleHostContact={toggleHostContact}
            toggleFee={toggleFee}
            updateField={updateField}
            styles={styles}
            dateTimeValues={dateTimeValues}
          />
        </View>

        {/* Template Buttons */}
        <View style={styles.templateButtons}>
          <VibeButtonPlain
            label="Use Template"
            onPress={onShowTemplateModal}
            style={styles.templateButton}
          />

          <VibeButtonPlain
            label="Save Template"
            onPress={onShowSaveTemplate}
            style={styles.templateButton}
          />
        </View>

        {/* Create Button */}
        <VibeButton
          label={isCreating ? 'CREATING...' : 'CREATE EVENT'}
          onPress={onCreate}
          style={[styles.createButton, isCreating && styles.disabledButton]}
          disabled={isCreating}
        />

        <Text style={styles.helpText}>
          * Required fields{'\n'}
          You will be automatically subscribed to your event{'\n'}
        </Text>
      </ScrollView>

      {DateTimePickerModals}

      <EventTipsModal type="create" visible={showTips} onClose={onCloseTips} />

      <TemplateSelectionModal
        visible={showTemplateModal}
        onClose={onCloseTemplateModal}
        templates={templates}
        onSelectTemplate={onApplyTemplate}
        onDeleteTemplate={onDeleteTemplate}
      />

      <SaveTemplateModal
        visible={showSaveTemplate}
        onClose={onHideSaveTemplateModal}
        templateName={templateName}
        setTemplateName={setTemplateName}
        onSave={onSaveAsTemplate}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 15,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 198, 255, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.alertButton,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  helpButtonText: {
    fontSize: 18,
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
  inputContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 20,
  },

  // Buttons
  templateButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  templateButton: {
    flex: 1,
  },
  createButton: {
    marginTop: 30,
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
});
