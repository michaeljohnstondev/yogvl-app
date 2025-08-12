// FILE: hooks/useEventTemplates.js - ALL TEMPLATE LOGIC HERE

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../../../auth/firebase';

export const useEventTemplates = (currentUserId) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Load templates from user document
  useEffect(() => {
    const loadTemplates = async () => {
      if (!currentUserId) {
        setTemplates([]);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUserId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setTemplates(userData.templates || []);
        } else {
          setTemplates([]);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [currentUserId]);

  // Low-level save function with undefined value cleaning
  const saveTemplate = async (templateData) => {
    if (!currentUserId) throw new Error('User not logged in');

    try {
      // Deep clean the data to remove undefined values
      const cleanData = (obj) => {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined && value !== null) {
            if (
              typeof value === 'object' &&
              !Array.isArray(value) &&
              !(value instanceof Date)
            ) {
              const cleanedNested = cleanData(value);
              if (Object.keys(cleanedNested).length > 0) {
                cleaned[key] = cleanedNested;
              }
            } else {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      };

      const cleanedTemplateData = cleanData(templateData);

      // Add debugging
      console.log('Original template data:', templateData);
      console.log('Cleaned template data:', cleanedTemplateData);

      const template = {
        id: Date.now().toString(),
        ...cleanedTemplateData,
        createdAt: new Date().toISOString(),
      };

      console.log('Final template to save:', template);

      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        templates: arrayUnion(template),
      });

      setTemplates((prev) => [...prev, template]);
      return template;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  };

  // High-level save function with UI logic
  const saveAsTemplate = async (formData) => {
    const finalTemplateName =
      templateName.trim() || formData.title || 'Untitled Template';

    if (!finalTemplateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    try {
      // Create template data with explicit defaults and type checking
      const templateData = {
        name: String(finalTemplateName.trim()),
        title: String(formData.title || ''),
        location: String(formData.location || ''),
        details: String(formData.details || ''),
        maxGuests: String(formData.maxGuests || ''),
        hasFee: Boolean(formData.hasFee),
        entryFee: String(formData.entryFee || ''),
        feeDescription: String(formData.feeDescription || ''),
      };

      // Only add date/time if they exist and are valid
      if (
        formData.date &&
        formData.date instanceof Date &&
        !isNaN(formData.date.getTime())
      ) {
        templateData.date = formData.date.toISOString();
      }

      if (
        formData.time &&
        formData.time instanceof Date &&
        !isNaN(formData.time.getTime())
      ) {
        templateData.time = formData.time.toISOString();
      }

      console.log('About to save template data:', templateData);

      await saveTemplate(templateData);
      Alert.alert('Success', 'Template saved successfully!');
      setShowSaveTemplate(false);
      setTemplateName('');
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  // Show save template modal with pre-populated name
  const showSaveTemplateModal = (eventTitle = '') => {
    setTemplateName(eventTitle);
    setShowSaveTemplate(true);
  };

  // Hide save template modal
  const hideSaveTemplateModal = () => {
    setShowSaveTemplate(false);
    setTemplateName('');
  };

  // Apply template to form data
  const applyTemplate = (template) => {
    return {
      title: template.title || '',
      location: template.location || '',
      details: template.details || '',
      maxGuests: template.maxGuests || '',
      hasFee: Boolean(template.hasFee),
      entryFee: template.entryFee || '',
      feeDescription: template.feeDescription || '',
      date: template.date ? new Date(template.date) : new Date(),
      time: template.time ? new Date(template.time) : new Date(),
      // Set selection flags based on whether valid dates exist
      dateSelected: Boolean(template.date),
      timeSelected: Boolean(template.time),
      inputHeight: 80, // Reset to default
    };
  };

  // Delete template
  const deleteTemplate = async (templateId) => {
    if (!currentUserId) throw new Error('User not logged in');

    try {
      const templateToDelete = templates.find((t) => t.id === templateId);
      if (!templateToDelete) throw new Error('Template not found');

      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        templates: arrayRemove(templateToDelete),
      });

      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  };

  return {
    // Data
    templates,
    loading,

    // Save template UI state
    templateName,
    setTemplateName,
    showSaveTemplate,

    // Functions
    saveAsTemplate, // Main function to call from UI
    showSaveTemplateModal,
    hideSaveTemplateModal,
    applyTemplate,
    deleteTemplate,
  };
};
