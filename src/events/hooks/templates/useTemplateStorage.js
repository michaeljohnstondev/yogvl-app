// FILE: hooks/useTemplateStorage.js - FIXED for Array Field

import { useState, useCallback } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';

/**
 * Core template storage operations (Firebase CRUD)
 * WORKS WITH: users/{userId}.templates (array field)
 */
export const useTemplateStorage = (userId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user templates collection reference
  const getTemplatesCollectionRef = useCallback(() => {
    if (!userId) {
      throw new Error('User ID is required for template operations');
    }
    return collection(db, 'users', userId, 'eventTemplates');
  }, [userId]);

  // Load all templates for user
  const loadTemplates = useCallback(async () => {
    if (!userId) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const templatesRef = getTemplatesCollectionRef();
      const q = query(templatesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      console.log(
        `[TEMPLATE STORAGE] Loaded ${querySnapshot.docs.length} templates for user ${userId}`
      );

      const templates = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        templates.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        });
      });

      return templates;
    } catch (err) {
      console.error('[TEMPLATE STORAGE] Error loading templates:', err);
      setError('Failed to load templates');
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, getTemplatesCollectionRef]);

  // Save new template
  const saveTemplate = useCallback(
    async (templateData) => {
      if (!userId) throw new Error('User ID required');

      setLoading(true);
      setError(null);

      try {
        const templatesRef = getTemplatesCollectionRef();

        // Create template with timestamps
        const templateWithMeta = {
          ...templateData,
          userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Add to eventTemplates subcollection
        const docRef = await addDoc(templatesRef, templateWithMeta);

        return {
          id: docRef.id,
          ...templateWithMeta,
          createdAt: templateWithMeta.createdAt.toDate(),
          updatedAt: templateWithMeta.updatedAt.toDate(),
        };
      } catch (err) {
        console.error('[TEMPLATE STORAGE] Error saving template:', err);
        setError('Failed to save template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userId, getTemplatesCollectionRef]
  );

  // Update existing template
  const updateTemplate = useCallback(
    async (templateId, updates) => {
      if (!userId) throw new Error('User ID required');

      setLoading(true);
      setError(null);

      try {
        const templateRef = doc(
          db,
          'users',
          userId,
          'eventTemplates',
          templateId
        );

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now(),
        };

        await updateDoc(templateRef, updateData);

        return {
          id: templateId,
          ...updates,
          updatedAt: updateData.updatedAt.toDate(),
        };
      } catch (err) {
        console.error('Error updating template:', err);
        setError('Failed to update template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  // Delete template
  const deleteTemplate = useCallback(
    async (templateId) => {
      if (!userId) throw new Error('User ID required');

      setLoading(true);
      setError(null);

      try {
        const templateRef = doc(
          db,
          'users',
          userId,
          'eventTemplates',
          templateId
        );
        await deleteDoc(templateRef);
        return templateId;
      } catch (err) {
        console.error('Error deleting template:', err);
        setError('Failed to delete template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userId]
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
