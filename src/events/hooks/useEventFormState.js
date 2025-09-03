// hooks/useEventFormState.js
import { useState, useCallback, useMemo, useRef } from 'react';

/**
 * Default form data structure for event forms
 */
const DEFAULT_FORM_DATA = {
  title: '',
  location: '',
  address: '',
  details: '',
  maxGuests: '',
  inputHeight: 80,
  hasFee: false,
  entryFee: '',
  isPrivate: false,
  allowGuestInvites: false,
  showHostContact: false,
  hasRsvpDeadline: false,
  trackAttendance: true,
  attendanceType: 'casual', // 'strict' | 'casual'
  notificationSettings: {
    enabled: true,
    reminderTiming: '1hour',
    notifyOnJoin: true,
    notifyOnLeave: true,
    sendReminders: true,
    sendDayBefore: true,
    newComments: true,
    customMessage: ''
  },
};

/**
 * Reusable hook for managing event form state
 * @param {Object} initialData - Initial form data (for editing existing events)
 * @param {Object} options - Hook configuration options
 * @returns {Object} Hook interface with state, handlers, and utilities
 */
const useEventFormState = (initialData = {}, options = {}) => {
  const { enableDirtyTracking = false, onFormChange = () => {} } = options;

  // Use ref to ensure initialization happens only once (like componentDidMount)
  const hasInitialized = useRef(false);
  const stableInitialData = useRef(null);
  
  // Initialize only once, never again (componentDidMount behavior)
  if (!hasInitialized.current) {
    hasInitialized.current = true;
    stableInitialData.current = {
      ...DEFAULT_FORM_DATA,
      ...JSON.parse(JSON.stringify(initialData)), // Deep copy to prevent mutations
    };
  }

  // Form state - initialized with stable data that never changes
  const [formData, setFormData] = useState(stableInitialData.current);
  const [originalData, setOriginalData] = useState(stableInitialData.current);
  const [isDirty, setIsDirty] = useState(false);
  const [hasBeenModified, setHasBeenModified] = useState(false);

  // Update a single field
  const updateField = useCallback(
    (field, value) => {
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };

        // Track if form has been modified
        if (!hasBeenModified) {
          setHasBeenModified(true);
        }

        // Update dirty state if enabled
        if (enableDirtyTracking) {
          const isFormDirty =
            JSON.stringify(newData) !== JSON.stringify(originalData);
          setIsDirty(isFormDirty);
        }

        // Call onChange callback
        onFormChange(newData, field, value);

        return newData;
      });
    },
    [hasBeenModified, enableDirtyTracking, originalData, onFormChange]
  );

  // Update multiple fields at once
  const updateFields = useCallback(
    (updates) => {
      setFormData((prev) => {
        const newData = { ...prev, ...updates };

        if (!hasBeenModified) {
          setHasBeenModified(true);
        }

        if (enableDirtyTracking) {
          const isFormDirty =
            JSON.stringify(newData) !== JSON.stringify(originalData);
          setIsDirty(isFormDirty);
        }

        onFormChange(newData, 'bulk_update', updates);

        return newData;
      });
    },
    [hasBeenModified, enableDirtyTracking, originalData, onFormChange]
  );

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(stableInitialData.current);
    setOriginalData(stableInitialData.current);
    setIsDirty(false);
    setHasBeenModified(false);
    onFormChange(stableInitialData.current, 'reset', null);
  }, [onFormChange]); // No dependency on changing data

  // Replace entire form data (useful for templates)
  const replaceFormData = useCallback(
    (newFormData, markAsOriginal = false) => {
      const mergedData = { ...DEFAULT_FORM_DATA, ...newFormData };

      setFormData(mergedData);

      if (markAsOriginal) {
        setOriginalData(mergedData);
        setIsDirty(false);
        setHasBeenModified(false);
      } else {
        if (!hasBeenModified) {
          setHasBeenModified(true);
        }

        if (enableDirtyTracking) {
          const isFormDirty =
            JSON.stringify(mergedData) !== JSON.stringify(originalData);
          setIsDirty(isFormDirty);
        }
      }

      onFormChange(mergedData, 'replace', newFormData);
    },
    [hasBeenModified, enableDirtyTracking, originalData, onFormChange]
  );

  // Mark current state as saved (resets dirty flag)
  const markAsSaved = useCallback(() => {
    setOriginalData(formData);
    setIsDirty(false);
    onFormChange(formData, 'saved', null);
  }, [formData, onFormChange]);

  // Get field value safely
  const getFieldValue = useCallback(
    (field, defaultValue = '') => {
      return formData[field] !== undefined ? formData[field] : defaultValue;
    },
    [formData]
  );

  // Check if a specific field has been modified
  const isFieldDirty = useCallback(
    (field) => {
      return formData[field] !== originalData[field];
    },
    [formData, originalData]
  );

  // Get all dirty fields
  const getDirtyFields = useCallback(() => {
    const dirtyFields = [];
    Object.keys(formData).forEach((field) => {
      if (isFieldDirty(field)) {
        dirtyFields.push(field);
      }
    });
    return dirtyFields;
  }, [formData, isFieldDirty]);

  // Validation helpers
  const validateField = useCallback(
    (field, validator) => {
      const value = formData[field];
      return validator(value, formData);
    },
    [formData]
  );

  const validateForm = useCallback(
    (validators = {}) => {
      const errors = {};
      let isValid = true;

      Object.keys(validators).forEach((field) => {
        const validator = validators[field];
        const result = validateField(field, validator);

        if (result !== true) {
          errors[field] = result;
          isValid = false;
        }
      });

      return { isValid, errors };
    },
    [validateField]
  );

  // Form completion helpers
  const getFormCompletion = useCallback(() => {
    const requiredFields = ['title', 'location']; // Basic required fields
    const completedFields = requiredFields.filter(
      (field) => formData[field] && formData[field].trim().length > 0
    );

    return {
      completed: completedFields.length,
      total: requiredFields.length,
      percentage: Math.round(
        (completedFields.length / requiredFields.length) * 100
      ),
      isComplete: completedFields.length === requiredFields.length,
    };
  }, [formData]);

  // Field-specific helpers
  const toggleFee = useCallback(() => {
    updateField('hasFee', !formData.hasFee);
  }, [formData.hasFee, updateField]);

  const togglePrivacy = useCallback(() => {
    const newIsPrivate = !formData.isPrivate;
    const updates = {
      isPrivate: newIsPrivate,
      // Reset guest invites to false when making event public
      ...(newIsPrivate ? {} : { allowGuestInvites: false })
    };
    updateFields(updates);
  }, [formData.isPrivate, updateFields]);

  const toggleHostContact = useCallback(() => {
    updateField('showHostContact', !formData.showHostContact);
  }, [formData.showHostContact, updateField]);

  const toggleRsvpDeadline = useCallback(() => {
    updateField('hasRsvpDeadline', !formData.hasRsvpDeadline);
  }, [formData.hasRsvpDeadline, updateField]);


  // Legacy host management functions removed - now handled via invitation system

  const appendToDetails = useCallback(
    (text) => {
      const currentDetails = formData.details || '';
      const separator = currentDetails.match(/[.!?]$/) ? ' ' : '. ';
      const newDetails =
        currentDetails.length > 0 ? currentDetails + separator + text : text;
      updateField('details', newDetails);
    },
    [formData.details, updateField]
  );

  const updateInputHeight = useCallback(
    (height) => {
      updateField('inputHeight', Math.max(80, height));
    },
    [updateField]
  );

  return {
    // Core state
    formData,
    isDirty,
    hasBeenModified,

    // Core handlers
    updateField,
    updateFields,
    resetForm,
    replaceFormData,
    markAsSaved,

    // Field utilities
    getFieldValue,
    isFieldDirty,
    getDirtyFields,

    // Validation
    validateField,
    validateForm,

    // Form completion
    getFormCompletion,

    // Field-specific helpers
    toggleFee,
    togglePrivacy,
    toggleHostContact,
    toggleRsvpDeadline,
    appendToDetails,
    updateInputHeight,
  };
};

// Validation helpers for common use cases
export const eventFormValidators = {
  title: (value) => {
    if (!value || value.trim().length === 0) {
      return 'Event name is required';
    }
    if (value.trim().length > 100) {
      return 'Event name must be 100 characters or less';
    }
    return true;
  },

  location: (value) => {
    if (!value || value.trim().length === 0) {
      return 'Location is required';
    }
    if (value.trim().length > 200) {
      return 'Location must be 200 characters or less';
    }
    return true;
  },

  address: (value) => {
    if (value && value.trim().length > 300) {
      return 'Address must be 300 characters or less';
    }
    return true;
  },

  maxGuests: (value) => {
    if (value && value.trim().length > 0) {
      const num = parseInt(value);
      if (isNaN(num) || num < 1) {
        return 'Max guests must be a positive number';
      }
      if (num > 9999) {
        return 'Max guests cannot exceed 9999';
      }
    }
    return true;
  },

  entryFee: (value, formData) => {
    if (formData.hasFee) {
      if (!value || value.trim().length === 0) {
        return 'Entry fee amount is required for paid events';
      }
      const feeValue = parseFloat(value.replace(/[$,]/g, ''));
      if (isNaN(feeValue) || feeValue < 0) {
        return 'Entry fee must be a valid amount';
      }
      if (feeValue > 10000) {
        return 'Entry fee cannot exceed $10,000';
      }
    }
    return true;
  },
};

export default useEventFormState;
