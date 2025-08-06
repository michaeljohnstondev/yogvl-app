import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';

export const useEventTemplates = (userId) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const templatesQuery = query(
        collection(db, 'event_templates'),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(templatesQuery);
      const templateList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTemplates(templateList);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const deleteTemplate = async (templateId) => {
    try {
      await deleteDoc(doc(db, 'event_templates', templateId));
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      Alert.alert('Error', 'Failed to delete template');
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return { templates, loading, loadTemplates, deleteTemplate };
};
