// FILE: lib/transactionUtils.js - Atomic Firebase Transaction Utilities

import {
  doc,
  getDoc,
  runTransaction,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Atomic array operation utility - ensures consistency when adding/removing items
 * @param {Object} params - Transaction parameters
 * @param {string} params.operation - 'add' or 'remove'
 * @param {string} params.documentPath - Full document path (collection/doc/subcollection/doc)
 * @param {string} params.arrayField - Array field name to modify
 * @param {string|string[]} params.items - Items to add/remove
 * @param {Object} [params.additionalUpdates] - Other fields to update
 * @param {Function} [params.validator] - Custom validation function
 * @returns {Promise<Object>} Transaction result
 */
export const atomicArrayOperation = async ({
  operation,
  documentPath,
  arrayField,
  items,
  additionalUpdates = {},
  validator = null
}) => {
  try {
    const itemsArray = Array.isArray(items) ? items : [items];

    return await runTransaction(db, async (transaction) => {
      // Parse document path
      const pathParts = documentPath.split('/');
      if (pathParts.length % 2 !== 0) {
        throw new Error('Invalid document path - must be collection/doc pairs');
      }

      const docRef = doc(db, ...pathParts);
      const docSnap = await transaction.get(docRef);

      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }

      const docData = docSnap.data();
      const currentArray = docData[arrayField] || [];

      // Custom validation if provided
      if (validator) {
        const validationResult = validator(docData, currentArray, itemsArray, operation);
        if (!validationResult.valid) {
          throw new Error(validationResult.error);
        }
      }

      // Prepare updates
      const updates = { ...additionalUpdates };

      if (operation === 'add') {
        // Check for duplicates when adding
        const newItems = itemsArray.filter(item => !currentArray.includes(item));
        if (newItems.length === 0) {
          throw new Error('All items already exist in array');
        }
        updates[arrayField] = arrayUnion(...newItems);
      } else if (operation === 'remove') {
        // Check items exist when removing
        const itemsToRemove = itemsArray.filter(item => currentArray.includes(item));
        if (itemsToRemove.length === 0) {
          throw new Error('No items to remove from array');
        }
        updates[arrayField] = arrayRemove(...itemsToRemove);
      } else {
        throw new Error('Invalid operation - must be "add" or "remove"');
      }

      transaction.update(docRef, updates);

      return {
        success: true,
        operation,
        items: itemsArray,
        updatedFields: Object.keys(updates)
      };
    });
  } catch (error) {
    console.error('[TransactionUtils] Atomic array operation failed:', error);
    throw error;
  }
};

/**
 * Atomic state transition utility - moves items between arrays
 * @param {Object} params - Transition parameters
 * @param {string} params.documentPath - Document path
 * @param {string} params.fromField - Source array field
 * @param {string} params.toField - Destination array field
 * @param {string|string[]} params.items - Items to move
 * @param {Object} [params.additionalUpdates] - Other updates
 * @param {Function} [params.validator] - Validation function
 * @returns {Promise<Object>} Transition result
 */
export const atomicStateTransition = async ({
  documentPath,
  fromField,
  toField,
  items,
  additionalUpdates = {},
  validator = null
}) => {
  try {
    const itemsArray = Array.isArray(items) ? items : [items];

    return await runTransaction(db, async (transaction) => {
      const pathParts = documentPath.split('/');
      const docRef = doc(db, ...pathParts);
      const docSnap = await transaction.get(docRef);

      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }

      const docData = docSnap.data();
      const fromArray = docData[fromField] || [];
      const toArray = docData[toField] || [];

      // Validation
      if (validator) {
        const validationResult = validator(docData, fromArray, toArray, itemsArray);
        if (!validationResult.valid) {
          throw new Error(validationResult.error);
        }
      }

      // Check items exist in source array
      const validItems = itemsArray.filter(item => fromArray.includes(item));
      if (validItems.length === 0) {
        throw new Error('No valid items to transition');
      }

      // Check items don't already exist in destination
      const duplicateItems = validItems.filter(item => toArray.includes(item));
      if (duplicateItems.length > 0) {
        throw new Error(`Items already exist in destination: ${duplicateItems.join(', ')}`);
      }

      // Perform atomic transition
      const updates = {
        [fromField]: arrayRemove(...validItems),
        [toField]: arrayUnion(...validItems),
        ...additionalUpdates
      };

      transaction.update(docRef, updates);

      return {
        success: true,
        transitioned: validItems,
        fromField,
        toField,
        fromCount: fromArray.length - validItems.length,
        toCount: toArray.length + validItems.length
      };
    });
  } catch (error) {
    console.error('[TransactionUtils] Atomic state transition failed:', error);
    throw error;
  }
};

/**
 * Batch document updates across multiple collections
 * @param {Array} operations - Array of operation objects
 * @param {Object} operation.documentPath - Document path
 * @param {Object} operation.updates - Updates to apply
 * @param {Function} [operation.validator] - Validation function
 * @returns {Promise<Object>} Batch result
 */
export const atomicBatchUpdate = async (operations) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const results = [];

      // Read phase - get all documents first
      const documentData = {};
      for (const operation of operations) {
        const { documentPath } = operation;
        const pathParts = documentPath.split('/');
        const docRef = doc(db, ...pathParts);
        const docSnap = await transaction.get(docRef);

        documentData[documentPath] = {
          ref: docRef,
          exists: docSnap.exists(),
          data: docSnap.exists() ? docSnap.data() : null
        };
      }

      // Validation phase
      for (const operation of operations) {
        const { documentPath, validator } = operation;
        const docInfo = documentData[documentPath];

        if (!docInfo.exists) {
          throw new Error(`Document not found: ${documentPath}`);
        }

        if (validator) {
          const validationResult = validator(docInfo.data);
          if (!validationResult.valid) {
            throw new Error(`Validation failed for ${documentPath}: ${validationResult.error}`);
          }
        }
      }

      // Write phase - apply all updates
      for (const operation of operations) {
        const { documentPath, updates } = operation;
        const docInfo = documentData[documentPath];

        transaction.update(docInfo.ref, {
          ...updates,
          lastUpdated: Timestamp.now()
        });

        results.push({
          documentPath,
          updatedFields: Object.keys(updates)
        });
      }

      return {
        success: true,
        operationsCount: operations.length,
        results
      };
    });
  } catch (error) {
    console.error('[TransactionUtils] Atomic batch update failed:', error);
    throw error;
  }
};

/**
 * Common validation functions for reuse
 */
export const validators = {
  /**
   * Validates invitation-to-subscription transition
   */
  invitationToSubscription: (eventData, invitations, subscribers, userIds) => {
    const userId = Array.isArray(userIds) ? userIds[0] : userIds;

    if (!invitations.includes(userId)) {
      return { valid: false, error: 'User not found in invitations' };
    }

    if (subscribers.includes(userId)) {
      return { valid: false, error: 'User already subscribed' };
    }

    // Check event capacity
    if (eventData.maxGuests && subscribers.length >= eventData.maxGuests) {
      return { valid: false, error: 'Event is at capacity' };
    }

    return { valid: true };
  },

  /**
   * Validates user permissions for event operations
   */
  eventPermissions: (eventData, userId, requiredRole = 'host') => {
    const isCreator = eventData.createdBy === userId;
    const isCohost = eventData.cohosts?.includes(userId);

    switch (requiredRole) {
      case 'host':
        return { valid: isCreator, error: 'Only event creator can perform this action' };
      case 'host_or_cohost':
        return {
          valid: isCreator || isCohost,
          error: 'Only event creator or cohosts can perform this action'
        };
      case 'attendee':
        const isSubscriber = eventData.subscribers?.includes(userId);
        return {
          valid: isCreator || isCohost || isSubscriber,
          error: 'Only event attendees can perform this action'
        };
      default:
        return { valid: false, error: 'Invalid role specified' };
    }
  }
};

/**
 * Error handling wrapper for transaction operations
 * @param {Function} transactionFn - Transaction function to wrap
 * @param {string} operationName - Name for logging
 * @returns {Function} Wrapped transaction function
 */
export const withTransactionErrorHandling = (transactionFn, operationName) => {
  return async (...args) => {
    try {
      return await transactionFn(...args);
    } catch (error) {
      console.error(`[TransactionUtils] ${operationName} failed:`, error);

      // Transform Firebase errors to user-friendly messages
      if (error.code === 'failed-precondition') {
        throw new Error('Operation failed due to concurrent modification. Please try again.');
      }

      if (error.code === 'aborted') {
        throw new Error('Operation was aborted due to conflict. Please try again.');
      }

      if (error.code === 'deadline-exceeded') {
        throw new Error('Operation timed out. Please try again.');
      }

      throw error;
    }
  };
};

export default {
  atomicArrayOperation,
  atomicStateTransition,
  atomicBatchUpdate,
  validators,
  withTransactionErrorHandling
};