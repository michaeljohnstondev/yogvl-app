// FILE: services/reportingService.js - Reporting System

import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  Timestamp,
} from '../lib/firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * DATABASE STRUCTURE:
 *
 * /studios/{studioId}/admin/{reportId}
 * {
 *   id: string,
 *   type: 'user' | 'event',
 *   reportedBy: string, // userId of reporter
 *   reportedAt: Timestamp,
 *   reason: string,
 *   status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
 *   studioId: string,
 *
 *   // For user reports
 *   reportedUser?: {
 *     id: string,
 *     userData: object, // Full user data snapshot
 *   },
 *
 *   // For event reports
 *   reportedEvent?: {
 *     id: string,
 *     eventData: object, // Full event data snapshot
 *   }
 * }
 */

/**
 * Report a user for inappropriate content
 */
export const reportUser = async (
  reporterId,
  targetUserId,
  reason = 'Inappropriate content'
) => {
  try {
    if (!reporterId || !targetUserId) {
      throw new Error('Missing required parameters for user report');
    }

    // Get the full user data to include in the report
    const userRef = doc(db, 'users', targetUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('Reported user not found');
    }

    const userData = userDoc.data();

    // Use the reported user's studio, not the reporter's studio
    const reportedUserStudio = userData?.userdata?.studios?.default?.studioId;
    console.log(
      `[reportingService] Reported user studio: ${reportedUserStudio}`
    );
    console.log(
      `[reportingService] Full user data structure:`,
      userData?.userdata?.studios
    );

    if (!reportedUserStudio) {
      console.error(
        '[reportingService] Reported user has no studio association:',
        userData
      );
      throw new Error('Reported user has no studio association');
    }

    // Get reporter info
    const reporterRef = doc(db, 'users', reporterId);
    const reporterDoc = await getDoc(reporterRef);
    const reporterData = reporterDoc.exists() ? reporterDoc.data() : null;

    // Create report data
    const reportData = {
      type: 'user',
      reportedBy: reporterId,
      reporterInfo: {
        name: reporterData?.userdata?.contactInfo?.firstName || 'Unknown',
        email:
          reporterData?.userdata?.contactInfo?.email ||
          reporterData?.email ||
          'Unknown',
      },
      reportedAt: Timestamp.now(),
      reason,
      status: 'pending',
      studioId: reportedUserStudio,
      reportedUser: {
        id: targetUserId,
        userData: userData,
        reportedInfo: {
          name:
            `${userData?.userdata?.contactInfo?.firstName || ''} ${userData?.userdata?.contactInfo?.lastName || ''}`.trim() ||
            'Unknown User',
          email:
            userData?.userdata?.contactInfo?.email ||
            userData?.email ||
            'Unknown',
        },
      },
    };

    // Add to reported user's studio admin collection
    const adminCollectionRef = collection(
      db,
      'studios',
      reportedUserStudio,
      'admin'
    );
    const reportDoc = await addDoc(adminCollectionRef, reportData);

    console.log(
      `[reportingService] User report created: ${reportDoc.id} in studio: ${reportedUserStudio}`
    );

    return {
      success: true,
      reportId: reportDoc.id,
      message: 'User reported successfully. Our team will review this report.',
    };
  } catch (error) {
    console.error('[reportingService] Error reporting user:', error);
    throw error;
  }
};

/**
 * Report an event for inappropriate content
 */
export const reportEvent = async (
  reporterId,
  eventId,
  eventStudioId,
  reason = 'Inappropriate content'
) => {
  try {
    if (!reporterId || !eventId || !eventStudioId) {
      throw new Error('Missing required parameters for event report');
    }

    // Get the full event data to include in the report (event's studio ID is passed correctly)
    const eventRef = doc(db, 'studios', eventStudioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Reported event not found');
    }

    const eventData = eventDoc.data();
    console.log(`[reportingService] Event studio ID: ${eventStudioId}`);
    console.log(`[reportingService] Event data studioId:`, eventData?.studioId);

    // Get reporter info
    const reporterRef = doc(db, 'users', reporterId);
    const reporterDoc = await getDoc(reporterRef);
    const reporterData = reporterDoc.exists() ? reporterDoc.data() : null;

    // Get event creator info
    const creatorRef = doc(db, 'users', eventData.createdBy);
    const creatorDoc = await getDoc(creatorRef);
    const creatorData = creatorDoc.exists() ? creatorDoc.data() : null;

    // Create report data
    const reportData = {
      type: 'event',
      reportedBy: reporterId,
      reporterInfo: {
        name: reporterData?.userdata?.contactInfo?.firstName || 'Unknown',
        email:
          reporterData?.userdata?.contactInfo?.email ||
          reporterData?.email ||
          'Unknown',
      },
      reportedAt: Timestamp.now(),
      reason,
      status: 'pending',
      studioId: eventStudioId,
      reportedEvent: {
        id: eventId,
        eventData: eventData,
        creatorInfo: {
          id: eventData.createdBy,
          name:
            `${creatorData?.userdata?.contactInfo?.firstName || ''} ${creatorData?.userdata?.contactInfo?.lastName || ''}`.trim() ||
            'Unknown User',
          email:
            creatorData?.userdata?.contactInfo?.email ||
            creatorData?.email ||
            'Unknown',
        },
      },
    };

    // Add to event's studio admin collection
    const adminCollectionRef = collection(
      db,
      'studios',
      eventStudioId,
      'admin'
    );
    const reportDoc = await addDoc(adminCollectionRef, reportData);

    console.log(
      `[reportingService] Event report created: ${reportDoc.id} in studio: ${eventStudioId}`
    );

    return {
      success: true,
      reportId: reportDoc.id,
      message: 'Event reported successfully. Our team will review this report.',
    };
  } catch (error) {
    console.error('[reportingService] Error reporting event:', error);
    throw error;
  }
};

/**
 * Update report status (for admin use)
 */
export const updateReportStatus = async (
  studioId,
  reportId,
  status,
  adminNotes = ''
) => {
  try {
    const reportRef = doc(db, 'studios', studioId, 'admin', reportId);

    await setDoc(
      reportRef,
      {
        status,
        adminNotes,
        reviewedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
      },
      { merge: true }
    );

    console.log(
      `[reportingService] Report ${reportId} status updated to: ${status}`
    );

    return { success: true };
  } catch (error) {
    console.error('[reportingService] Error updating report status:', error);
    throw error;
  }
};

/**
 * Get all reports for a studio (for admin use)
 */
export const getStudioReports = async (studioId, limit = 50) => {
  try {
    const {
      getDocs,
      collection,
      query,
      orderBy,
      limit: firestoreLimit,
    } = await import('../lib/firebase/firestore');

    console.log(`[getStudioReports] Querying path: /studios/${studioId}/admin`);
    const adminCollectionRef = collection(db, 'studios', studioId, 'admin');
    const q = query(
      adminCollectionRef,
      orderBy('reportedAt', 'desc'),
      firestoreLimit(limit)
    );

    const snapshot = await getDocs(q);
    console.log(
      `[getStudioReports] Found ${snapshot.docs.length} documents in /studios/${studioId}/admin`
    );

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[reportingService] Error getting studio reports:', error);
    throw error;
  }
};
