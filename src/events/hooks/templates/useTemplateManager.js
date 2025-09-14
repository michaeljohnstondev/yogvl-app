// FILE: hooks/useTemplateManager.js

import { useState, useCallback, useEffect } from 'react';
import { useTemplateStorage } from './useTemplateStorage';
import { saveEventTemplate } from '../../services/templates';
import {
  formToTemplate,
  templateToForm,
  validateTemplateData,
  generateTemplatePreview,
} from '../../lib/templateTransforms';

/**
 * High-level template management (integrates with forms)
 */
export const useTemplateManager = (userId) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Modal states
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Storage operations
  const {
    loading,
    error,
    loadTemplates: loadFromStorage,
    saveTemplate: saveToStorage,
    updateTemplate: updateInStorage,
    deleteTemplate: deleteFromStorage,
  } = useTemplateStorage(userId);

  // Load templates on mount
  useEffect(() => {
    if (userId) {
      refreshTemplates();
    }
  }, [userId]);

  // Refresh templates from storage
  const refreshTemplates = useCallback(async () => {
    try {
      const loadedTemplates = await loadFromStorage();
      setTemplates(loadedTemplates);
    } catch (err) {
      console.error('Failed to refresh templates:', err);
    }
  }, [loadFromStorage]);

  // Save form data as template (isolated - no state writes)
  const saveAsTemplate = useCallback(
    async (formData, name) => {
      try {
        // Validate inputs
        if (!name || name.trim().length === 0) {
          throw new Error('Template name is required');
        }

        // Check for duplicate names
        const nameExists = templates.some(
          (t) => t.name.toLowerCase() === name.trim().toLowerCase()
        );

        if (nameExists) {
          throw new Error('A template with this name already exists');
        }

        // Convert form to template
        const templateData = formToTemplate(formData, name.trim());

        // Validate template data
        const validation = validateTemplateData(templateData);
        if (!validation.isValid) {
          throw new Error(validation.errors[0]);
        }

        // Save using storage hook (consistent with loading)
        const template = {
          name: name.trim(),
          payload: formData, // full form snapshot
        };

        await saveToStorage(template);

        // Don't refresh templates immediately - causes form clearing
        // Templates will refresh on next modal open

        return { success: true, name: name.trim() };
      } catch (err) {
        console.error('Error saving template:', err);
        throw err;
      }
    },
    [templates, userId, saveToStorage]
  );

  // Apply template to form
  const applyTemplate = useCallback((template, currentFormData = {}) => {
    try {
      setSelectedTemplate(template);
      return templateToForm(template, {
        preserveExisting: false,
        currentFormData,
      });
    } catch (err) {
      console.error('Error applying template:', err);
      throw new Error('Failed to apply template');
    }
  }, []);

  // Delete template
  const deleteTemplate = useCallback(
    async (templateId) => {
      try {
        await deleteFromStorage(templateId);
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } catch (err) {
        console.error('Error deleting template:', err);
        throw err;
      }
    },
    [deleteFromStorage]
  );

  // Modal controls
  const openSelectionModal = useCallback(() => {
    setShowSelectionModal(true);
  }, []);

  const closeSelectionModal = useCallback(() => {
    setShowSelectionModal(false);
  }, []);

  const openSaveModal = useCallback((suggestedName = '') => {
    setTemplateName(suggestedName);
    setShowSaveModal(true);
  }, []);

  const closeSaveModal = useCallback(() => {
    setShowSaveModal(false);
    setTemplateName('');
  }, []);

  // Get template preview
  const getTemplatePreview = useCallback((template) => {
    return generateTemplatePreview(template);
  }, []);

  return {
    // Data
    templates,
    selectedTemplate,
    loading,
    error,

    // Modal state
    showSelectionModal,
    showSaveModal,
    templateName,
    setTemplateName,

    // Actions
    refreshTemplates,
    saveAsTemplate,
    applyTemplate,
    deleteTemplate,
    getTemplatePreview,

    // Modal controls
    openSelectionModal,
    closeSelectionModal,
    openSaveModal,
    closeSaveModal,
  };
};
