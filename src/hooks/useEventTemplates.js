// hooks/useEventTemplates.js - REFACTORED VERSION
import { useState, useEffect } from 'react';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export const useEventTemplates = (currentUserId) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Save new template
  const saveTemplate = async (templateData) => {
    if (!currentUserId) throw new Error('User not logged in');

    try {
      const template = {
        id: Date.now().toString(), // Simple ID generation
        ...templateData,
        createdAt: new Date().toISOString(),
      };

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
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
  };
};

// --------------------------------------------------

// Updated CreateEventScreen.js - TEMPLATE SAVE FUNCTION
// Replace your existing saveAsTemplate function with this:

const saveAsTemplate = async () => {
  if (!templateName.trim()) {
    Alert.alert('Error', 'Please enter a template name');
    return;
  }

  try {
    const templateData = {
      name: templateName.trim(),
      title: formData.title,
      location: formData.location,
      details: formData.details,
      maxGuests: formData.maxGuests,
      hasFee: formData.hasFee || false,
      entryFee: formData.entryFee || '',
      feeDescription: formData.feeDescription || '',
      // Don't save date/time - those should be fresh each time
    };

    await saveTemplate(templateData);
    Alert.alert('Success', 'Template saved successfully!');
    setShowSaveTemplate(false);
    setTemplateName('');
  } catch (error) {
    console.error('Error saving template:', error);
    Alert.alert('Error', 'Failed to save template');
  }
};

// --------------------------------------------------

// MIGRATION SCRIPT (run this once to move existing templates)
// You can run this in your app or in Firebase console

const migrateTemplates = async () => {
  try {
    console.log('Starting template migration...');

    // Get all templates from event_templates collection
    const templatesSnapshot = await getDocs(collection(db, 'event_templates'));
    const userTemplates = {};

    // Group templates by user
    templatesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userId = data.createdBy;

      if (!userTemplates[userId]) {
        userTemplates[userId] = [];
      }

      userTemplates[userId].push({
        id: doc.id,
        name: data.name,
        title: data.title,
        location: data.location,
        details: data.details,
        maxGuests: data.maxGuests,
        hasFee: data.hasFee || false,
        entryFee: data.entryFee || '',
        feeDescription: data.feeDescription || '',
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });

    // Update each user document with their templates
    const updatePromises = Object.entries(userTemplates).map(
      async ([userId, templates]) => {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { templates });
        console.log(`Updated ${templates.length} templates for user ${userId}`);
      }
    );

    await Promise.all(updatePromises);
    console.log('Migration completed successfully!');

    // Optional: Delete the old event_templates collection
    // (You should do this manually in Firebase Console after verifying migration worked)
  } catch (error) {
    console.error('Migration failed:', error);
  }
};
