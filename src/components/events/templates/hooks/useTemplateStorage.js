// FILE: hooks/useTemplateStorage.js - FIXED for Array Field

import { useState, useCallback } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../auth/firebase';

/**
 * Core template storage operations (Firebase CRUD)
 * WORKS WITH: users/{userId}.templates (array field)
 */
export const useTemplateStorage = (userId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user document reference
  const getUserDocRef = useCallback(() => {
    if (!userId) {
      throw new Error('User ID is required for template operations');
    }
    return doc(db, 'users', userId);
  }, [userId]);

  // Load all templates for user
  const loadTemplates = useCallback(async () => {
    if (!userId) return [];

    setLoading(true);
    setError(null);

    try {
      const userDocRef = getUserDocRef();
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log('User document does not exist');
        return [];
      }

      const userData = userDoc.data();
      const templates = userData.templates || [];

      // Convert Firestore timestamps to Date objects
      const processedTemplates = templates.map((template) => ({
        ...template,
        createdAt:
          template.createdAt?.toDate?.() || new Date(template.createdAt),
        updatedAt:
          template.updatedAt?.toDate?.() || new Date(template.updatedAt),
      }));

      // Sort by most recent first
      processedTemplates.sort((a, b) => b.updatedAt - a.updatedAt);

      return processedTemplates;
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, getUserDocRef]);

  // Save new template
  const saveTemplate = useCallback(
    async (templateData) => {
      if (!userId) throw new Error('User ID required');

      setLoading(true);
      setError(null);

      try {
        const userDocRef = getUserDocRef();

        // Create template with unique ID and timestamps
        const templateWithMeta = {
          ...templateData,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Add to templates array
        await updateDoc(userDocRef, {
          templates: arrayUnion(templateWithMeta),
        });

        return {
          ...templateWithMeta,
          createdAt: templateWithMeta.createdAt.toDate(),
          updatedAt: templateWithMeta.updatedAt.toDate(),
        };
      } catch (err) {
        console.error('Error saving template:', err);
        setError('Failed to save template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userId, getUserDocRef]
  );

  // Update existing template
  const updateTemplate = useCallback(
    async (templateId, updates) => {
      if (!userId) throw new Error('User ID required');

      setLoading(true);
      setError(null);

      try {
        // First, load current templates
        const currentTemplates = await loadTemplates();

        // Find and update the specific template
        const updatedTemplates = currentTemplates.map((template) => {
          if (template.id === templateId) {
            return {
              ...template,
              ...updates,
              updatedAt: Timestamp.now(),
            };
          }
          return template;
        });

        // Replace entire templates array
        const userDocRef = getUserDocRef();
        await updateDoc(userDocRef, {
          templates: updatedTemplates,
        });

        console.log(`✅ Template updated in users/${userId}.templates`);

        const updatedTemplate = updatedTemplates.find(
          (t) => t.id === templateId
        );
        return {
          ...updatedTemplate,
          updatedAt: updatedTemplate.updatedAt.toDate(),
        };
      } catch (err) {
        console.error('Error updating template:', err);
        setError('Failed to update template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userId, getUserDocRef, loadTemplates]
  );

  // Delete template
  const deleteTemplate = useCallback(
    async (templateId) => {
      if (!userId) throw new Error('User ID required');

      setLoading(true);
      setError(null);

      try {
        // Load current templates
        const currentTemplates = await loadTemplates();

        // Find the template to remove
        const templateToRemove = currentTemplates.find(
          (t) => t.id === templateId
        );

        if (!templateToRemove) {
          throw new Error('Template not found');
        }

        // Remove from array using arrayRemove
        const userDocRef = getUserDocRef();
        await updateDoc(userDocRef, {
          templates: arrayRemove(templateToRemove),
        });

        console.log(`✅ Template deleted from users/${userId}.templates`);
        return templateId;
      } catch (err) {
        console.error('Error deleting template:', err);
        setError('Failed to delete template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userId, getUserDocRef, loadTemplates]
  );

  return {
    loading,
    error,
    loadTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
