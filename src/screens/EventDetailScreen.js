import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// Components
import VibeButton from '../components/VibeButton';
import VibeInput from '../components/VibeInput';
import VibeButtonPlain from '../components/VibeButtonPlain';
import ReliabilityWarning from '../components/ReliabilityWarning';
import EventTipsModal, { useEventTips } from '../components/EventTipsModal';
import VibeTimePicker from '../components/VibeTimePicker';
import VibeAutoComplete from '../components/VibeAutoComplete';
import VibeSegmentedControl from '../components/VibeSegmentedControl';
import {
  TemplateSelectionModal,
  SaveTemplateModal,
} from '../components/TemplateModals';

// Hooks
import { useSuggestions, filterSuggestions } from '../hooks/useSuggestions';
import { useEventTemplates } from '../hooks/useEventTemplates';

// Firebase
import { db } from '../firebase';
import {
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
} from 'firebase/firestore';

// Utils and Context
import { useAuth } from '../AuthContext';
import {
  validateEventForm,
  formatEventForStorage,
} from '../utils/eventFormValidation';
import { getUserEventPermissions } from '../utils/eventUtils';
import theme from '../themes/themes';

// Custom Hook for Form State (copied from CreateEventScreen)
const useFormState = (initialData = {}) => {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    location: initialData.location || '',
    details: initialData.details || '',
    maxGuests: initialData.maxGuests || '',
    date: initialData.date || new Date(),
    time: initialData.time || new Date(),
    dateSelected: !!initialData.date,
    timeSelected: !!initialData.time,
    inputHeight: 80,
    hasFee: initialData.hasFee || false,
    entryFee: initialData.entryFee || '',
    feeDescription: initialData.feeDescription || '',
  });

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      title: initialData.title || '',
      location: initialData.location || '',
      details: initialData.details || '',
      maxGuests: initialData.maxGuests || '',
      date: initialData.date || new Date(),
      time: initialData.time || new Date(),
      dateSelected: !!initialData.date,
      timeSelected: !!initialData.time,
      inputHeight: 80,
      hasFee: initialData.hasFee || false,
      entryFee: initialData.entryFee || '',
      feeDescription: initialData.feeDescription || '',
    });
  }, [initialData]);

  return { formData, updateField, resetForm };
};

// Main Component
export default function EditEventScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { currentUserId, userData } = useAuth();
  const { showTips, closeTips, showTipsManually } = useEventTips('edit');

  // Event loading state
  const [eventData, setEventData] = useState(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  // Initialize form with event data
  const { formData, updateField, resetForm } = useFormState(eventData);
  const { suggestions, isLoading, loadSuggestions } = useSuggestions();
  const { templates, deleteTemplate } = useEventTemplates(currentUserId);

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Suggestion visibility state
  const [suggestionVisibility, setSuggestionVisibility] = useState({
    title: false,
    location: false,
    details: false,
  });

  // Load event data
  useEffect(() => {
    const loadEvent = async () => {
      try {
        setIsLoadingEvent(true);
        const eventDoc = await getDoc(doc(db, 'events', eventId));

        if (!eventDoc.exists()) {
          Alert.alert('Error', 'Event not found', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }

        const data = eventDoc.data();

        // Check permissions
        const permissions = getUserEventPermissions(currentUserId, userData, {
          ...data,
          id: eventId,
        });
        if (!permissions.canEdit) {
          Alert.alert(
            'Error',
            'You do not have permission to edit this event',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        // Convert Firestore timestamp to Date
        const eventDateTime = data.eventTimestamp?.toDate() || new Date();

        const eventInfo = {
          title: data.title || '',
          location: data.location || '',
          details: data.details || data.desc || '', // handle both field names
          maxGuests: data.maxGuests?.toString() || '',
          date: eventDateTime,
          time: eventDateTime,
          hasFee: data.hasFee || false,
          entryFee: data.entryFee || '',
          feeDescription: data.feeDescription || '',
        };

        setEventData(eventInfo);
      } catch (error) {
        console.error('Error loading event:', error);
        Alert.alert('Error', 'Failed to load event data', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsLoadingEvent(false);
      }
    };

    loadEvent();
    loadSuggestions();
  }, [eventId, currentUserId, userData, navigation, loadSuggestions]);

  // Filtered suggestions
  const filteredSuggestions = useMemo(
    () => ({
      title: filterSuggestions(formData.title, suggestions.titles),
      location: filterSuggestions(formData.location, suggestions.locations),
      details: filterSuggestions(formData.details, suggestions.details),
    }),
    [formData.title, formData.location, formData.details, suggestions]
  );

  // Template save function
  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    try {
      const templateData = {
        name: templateName,
        title: formData.title,
        location: formData.location,
        details: formData.details,
        maxGuests: formData.maxGuests,
        hasFee: formData.hasFee || false,
        entryFee: formData.entryFee || '',
        feeDescription: formData.feeDescription || '',
        createdBy: currentUserId,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'event_templates'), templateData);

      Alert.alert('Success', 'Template saved successfully!');
      setShowSaveTemplate(false);
      setTemplateName('');
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  // Load template function
  const loadFromTemplate = (template) => {
    updateField('title', template.title);
    updateField('location', template.location);
    updateField('details', template.details);
    updateField('maxGuests', template.maxGuests);
    updateField('hasFee', template.hasFee || false);
    updateField('entryFee', template.entryFee || '');
    updateField('feeDescription', template.feeDescription || '');
    // Keep current date/time

    Alert.alert(
      'Template Loaded',
      `"${template.name}" has been loaded. Date and time remain unchanged.`
    );
  };

  // Input handlers
  const handleInputChange = useCallback(
    (field, value) => {
      updateField(field, value);

      if (['title', 'location'].includes(field) && !isLoading) {
        setSuggestionVisibility((prev) => ({
          ...prev,
          [field]: true,
        }));
      }

      if (field === 'details' && value.length < 5 && !isLoading) {
        setSuggestionVisibility((prev) => ({ ...prev, details: true }));
      } else if (field === 'details' && value.length >= 5) {
        setSuggestionVisibility((prev) => ({ ...prev, details: false }));
      }
    },
    [updateField, isLoading]
  );

  // Suggestion handlers
  const handleSuggestionSelect = useCallback(
    (field, suggestion) => {
      if (field === 'details' && formData.details.length > 0) {
        const separator = formData.details.match(/[.!?]$/) ? ' ' : '. ';
        updateField('details', formData.details + separator + suggestion);
      } else {
        updateField(field, suggestion);
      }
      setSuggestionVisibility((prev) => ({ ...prev, [field]: false }));
    },
    [formData.details, updateField]
  );

  const hideSuggestions = useCallback((field) => {
    setTimeout(() => {
      setSuggestionVisibility((prev) => ({ ...prev, [field]: false }));
    }, 150);
  }, []);

  // Date/Time handlers
  const handleDateConfirm = useCallback(
    (selectedDate) => {
      updateField('date', selectedDate);
      updateField('dateSelected', true);
      setShowDatePicker(false);
    },
    [updateField]
  );

  const handleTimeConfirm = useCallback(
    (selectedTime) => {
      updateField('time', selectedTime);
      updateField('timeSelected', true);
      setShowTimePicker(false);
    },
    [updateField]
  );

  // Save event handler
  const handleSave = useCallback(async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to edit events.');
      return;
    }

    const validation = validateEventForm(formData);
    if (!validation.isValid) {
      Alert.alert('Error', validation.message);
      return;
    }

    setIsSaving(true);

    try {
      const updatedEventData = formatEventForStorage(formData, currentUserId);
      updatedEventData.updatedAt = Timestamp.now();
      updatedEventData.eventTimestamp = Timestamp.fromDate(
        updatedEventData.eventTimestamp
      );

      await updateDoc(doc(db, 'events', eventId), updatedEventData);

      Alert.alert('Success!', 'Event updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [currentUserId, formData, eventId, navigation]);

  // Show loading screen while event loads
  if (isLoadingEvent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>✏️ Edit Event</Text>
          <Pressable style={styles.helpButton} onPress={showTipsManually}>
            <Text style={styles.helpButtonText}>💡</Text>
          </Pressable>
        </View>

        <ReliabilityWarning userData={userData} context="edit" />

        {isLoading && (
          <Text style={styles.loadingText}>Loading suggestions...</Text>
        )}

        {/* Event Name */}
        <Text style={styles.label}>Event Name *</Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.title}
            onChangeText={(text) => handleInputChange('title', text)}
            onFocus={() =>
              !isLoading &&
              setSuggestionVisibility((prev) => ({ ...prev, title: true }))
            }
            onBlur={() => hideSuggestions('title')}
            placeholder="Enter event name"
            maxLength={100}
          />
          <VibeAutoComplete
            suggestions={filteredSuggestions.title}
            onSelect={(suggestion) =>
              handleSuggestionSelect('title', suggestion)
            }
            visible={suggestionVisibility.title && !isLoading}
          />
        </View>

        {/* Date & Time */}
        <Text style={styles.label}>When *</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <VibeButtonPlain
              label={
                formData.dateSelected
                  ? formData.date.toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '📅 Date'
              }
              onPress={() => setShowDatePicker(true)}
              style={!formData.dateSelected && styles.unselectedButton}
            />
          </View>
          <View style={styles.flex}>
            <VibeButtonPlain
              label={
                formData.timeSelected
                  ? formData.time.toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '⏰ Time'
              }
              onPress={() => setShowTimePicker(true)}
              style={!formData.timeSelected && styles.unselectedButton}
            />
          </View>
        </View>

        {/* Location */}
        <Text style={styles.label}>Location *</Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
            onFocus={() =>
              !isLoading &&
              setSuggestionVisibility((prev) => ({ ...prev, location: true }))
            }
            onBlur={() => hideSuggestions('location')}
            placeholder="Enter event location"
            maxLength={200}
          />
          <VibeAutoComplete
            suggestions={filteredSuggestions.location}
            onSelect={(suggestion) =>
              handleSuggestionSelect('location', suggestion)
            }
            visible={suggestionVisibility.location && !isLoading}
          />
        </View>

        {/* Max Guests */}
        <Text style={styles.label}>Max Guests (optional)</Text>
        <VibeInput
          value={formData.maxGuests}
          onChangeText={(text) => updateField('maxGuests', text)}
          keyboardType="numeric"
          maxLength={4}
          placeholder="Enter max guests"
        />

        {/* Entry Fee */}
        <Text style={styles.label}>Entry Fee</Text>
        <VibeSegmentedControl
          options={[
            { value: false, label: 'Free', icon: '🆓' },
            { value: true, label: 'Paid', icon: '💰' },
          ]}
          selectedValue={formData.hasFee}
          onSelect={(value) => updateField('hasFee', value)}
        />

        {/* Show fee inputs if paid is selected */}
        {formData.hasFee && (
          <>
            <Text style={styles.label}>Entry Fee Amount *</Text>
            <VibeInput
              value={formData.entryFee}
              onChangeText={(text) => updateField('entryFee', text)}
              placeholder="$10.00"
              keyboardType="numeric"
            />

            <Text style={styles.label}>What's Included? (optional)</Text>
            <VibeInput
              value={formData.feeDescription}
              onChangeText={(text) => updateField('feeDescription', text)}
              placeholder="Food, drinks, materials, etc."
              maxLength={200}
            />
          </>
        )}

        {/* Details */}
        <Text style={styles.label}>Details</Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.details}
            onChangeText={(text) => handleInputChange('details', text)}
            onFocus={() =>
              !isLoading &&
              formData.details.length < 5 &&
              setSuggestionVisibility((prev) => ({ ...prev, details: true }))
            }
            onBlur={() => hideSuggestions('details')}
            multiline
            placeholder="Add any additional details about your event..."
            style={{
              minHeight: 80,
              textAlignVertical: 'top',
              height: Math.max(80, formData.inputHeight),
            }}
            onContentSizeChange={(e) =>
              updateField('inputHeight', e.nativeEvent.contentSize.height)
            }
            maxLength={500}
          />
          <VibeAutoComplete
            suggestions={filteredSuggestions.details}
            onSelect={(suggestion) =>
              handleSuggestionSelect('details', suggestion)
            }
            visible={suggestionVisibility.details && !isLoading}
          />
        </View>

        {/* Template Buttons */}
        <View style={styles.templateButtons}>
          <VibeButtonPlain
            label="📋 Use Template"
            onPress={() => setShowTemplateModal(true)}
            style={styles.templateButton}
          />

          <VibeButtonPlain
            label="💾 Save as Template"
            onPress={() => setShowSaveTemplate(true)}
            style={styles.templateButton}
          />
        </View>

        {/* Save Button */}
        <VibeButton
          label={isSaving ? 'SAVING...' : 'SAVE CHANGES'}
          onPress={handleSave}
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          disabled={isSaving}
        />

        <Text style={styles.helpText}>
          * Required fields{'\n'}
          💡 Use templates to quickly update similar events
        </Text>
      </ScrollView>

      {/* Modals */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={formData.date}
        minimumDate={new Date()}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />

      <VibeTimePicker
        visible={showTimePicker}
        initialTime={formData.time}
        onConfirm={handleTimeConfirm}
        onClose={() => setShowTimePicker(false)}
      />

      <EventTipsModal type="edit" visible={showTips} onClose={closeTips} />

      {/* Template Modals */}
      <TemplateSelectionModal
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={templates}
        onSelectTemplate={loadFromTemplate}
        onDeleteTemplate={deleteTemplate}
      />

      <SaveTemplateModal
        visible={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        templateName={templateName}
        setTemplateName={setTemplateName}
        onSave={saveAsTemplate}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 10,
    fontFamily: theme.fonts.main,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  templateButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  templateButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  unselectedButton: {
    opacity: 0.7,
  },
  helpText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    fontFamily: theme.fonts.main,
  },
});
