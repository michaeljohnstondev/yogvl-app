import { addDoc, collection, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../auth/services/firebase';

export async function saveEventTemplate(userId, template) {
  console.log('[TEMPLATE SAVE] Starting save for userId:', userId);
  console.log('[TEMPLATE SAVE] Template data:', template);
  
  if (!userId) throw new Error('Missing user');
  
  try {
    // Ensure user document exists first
    const userDocRef = doc(db, 'users', userId);
    console.log('[TEMPLATE SAVE] Checking if user doc exists...');
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('[TEMPLATE SAVE] User doc does not exist, creating...');
      // Create user document if it doesn't exist
      await setDoc(userDocRef, {
        templates: [],
        createdAt: serverTimestamp(),
      });
      console.log('[TEMPLATE SAVE] User doc created successfully');
    } else {
      console.log('[TEMPLATE SAVE] User doc already exists');
    }
    
    const clean = {
      name: template.name || 'Untitled Template',
      payload: template.payload,        // full form snapshot
      createdAt: serverTimestamp(),
      version: 1,
    };
    
    console.log('[TEMPLATE SAVE] Saving to subcollection:', `users/${userId}/eventTemplates`);
    console.log('[TEMPLATE SAVE] Clean template data:', clean);
    
    const result = await addDoc(collection(db, `users/${userId}/eventTemplates`), clean);
    console.log('[TEMPLATE SAVE] Successfully saved with ID:', result.id);
    
    return result;
  } catch (error) {
    console.error('[TEMPLATE SAVE] Error during save:', error);
    throw error;
  }
}