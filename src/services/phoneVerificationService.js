// FILE: services/phoneVerificationService.js - Phone Number Verification Service

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { normalizePhoneNumber } from './phoneAccessService';

/**
 * Update user's verified phone number
 * This should be called after successful phone verification (SMS, etc.)
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Verified phone number
 * @returns {Promise<Object>} Result with auto-subscription info
 */
export const updateVerifiedPhone = async (userId, phoneNumber) => {
  try {
    if (!userId || !phoneNumber) {
      throw new Error('User ID and phone number are required');
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new Error('Invalid phone number format');
    }

    const userRef = doc(db, 'users', userId);

    // Update user document with verified phone
    await updateDoc(userRef, {
      'userdata.contactInfo.verifiedPhone': normalizedPhone,
      'userdata.contactInfo.phoneVerified': true,
      'userdata.metadata.updatedAt': new Date(),
    });

    // Auto-subscribe to events they were invited to by this phone
    const { autoSubscribeToInvitedEvents } = await import(
      './phoneAccessService'
    );
    const autoSubResult = await autoSubscribeToInvitedEvents(
      userId,
      normalizedPhone
    );

    console.log(`Phone ${normalizedPhone} verified for user ${userId}`);

    return {
      success: true,
      verifiedPhone: normalizedPhone,
      subscribedEvents: autoSubResult.subscribedEvents || [],
      totalEventsFound: autoSubResult.totalFound || 0,
    };
  } catch (error) {
    console.error('Error updating verified phone:', error);
    throw error;
  }
};

/**
 * Check if a phone number is already verified by another user
 * @param {string} phoneNumber - Phone number to check
 * @param {string} excludeUserId - User ID to exclude from check (current user)
 * @returns {Promise<boolean>} Whether phone is already verified by another user
 */
export const isPhoneAlreadyVerified = async (
  phoneNumber,
  excludeUserId = null
) => {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return false;
    }

    // Note: This would require a query across all users to check for verified phones
    // For now, we'll assume phones can be verified by multiple users (family members, etc.)
    // In production, you might want to enforce unique verified phones

    return false; // Allow multiple users to verify the same phone for now
  } catch (error) {
    console.error('Error checking if phone is verified:', error);
    return false;
  }
};

/**
 * Get user's phone verification status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Phone verification info
 */
export const getPhoneVerificationStatus = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const contactInfo = userData.userdata?.contactInfo || {};

    return {
      hasPhone: !!contactInfo.phoneNumber,
      displayPhone: contactInfo.phoneNumber || null,
      verifiedPhone: contactInfo.verifiedPhone || null,
      isVerified: contactInfo.phoneVerified || false,
      needsVerification:
        !!contactInfo.phoneNumber && !contactInfo.phoneVerified,
      phoneMatches:
        contactInfo.phoneNumber &&
        contactInfo.verifiedPhone &&
        normalizePhoneNumber(contactInfo.phoneNumber) ===
          normalizePhoneNumber(contactInfo.verifiedPhone),
    };
  } catch (error) {
    console.error('Error getting phone verification status:', error);
    throw error;
  }
};

/**
 * Unverify phone number (for privacy/security purposes)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const unverifyPhone = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'userdata.contactInfo.verifiedPhone': null,
      'userdata.contactInfo.phoneVerified': false,
      'userdata.metadata.updatedAt': new Date(),
    });

    console.log(`Phone unverified for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error unverifying phone:', error);
    throw error;
  }
};

/**
 * Send phone verification code (placeholder - integrate with SMS service)
 * @param {string} phoneNumber - Phone number to verify
 * @returns {Promise<Object>} Verification session info
 */
export const sendVerificationCode = async (phoneNumber) => {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new Error('Invalid phone number format');
    }

    // This is a placeholder - in production, integrate with:
    // - Firebase Phone Auth
    // - Twilio Verify API
    // - AWS SNS
    // - or similar SMS verification service

    console.log(`Sending verification code to ${normalizedPhone}`);

    // For development/testing, just return success
    return {
      success: true,
      phoneNumber: normalizedPhone,
      sessionId: `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: 'Verification code sent (development mode)',
    };
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw error;
  }
};

/**
 * Verify phone verification code (placeholder)
 * @param {string} sessionId - Verification session ID
 * @param {string} code - Verification code entered by user
 * @returns {Promise<boolean>} Whether code is valid
 */
export const verifyCode = async (sessionId, code) => {
  try {
    // This is a placeholder - in production, verify with your SMS service

    console.log(`Verifying code ${code} for session ${sessionId}`);

    // For development/testing, accept any 6-digit code
    const isValidFormat = /^\d{6}$/.test(code);

    if (!isValidFormat) {
      return false;
    }

    // In production, this would check against the actual sent code
    return true; // Accept all properly formatted codes in development
  } catch (error) {
    console.error('Error verifying code:', error);
    return false;
  }
};
